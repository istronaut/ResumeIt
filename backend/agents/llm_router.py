import json
import logging
from typing import Type, TypeVar, Optional, Tuple, Any
import httpx
from pydantic import BaseModel

from backend.config import (
    GEMINI_API_KEY,
    NVIDIA_NIM_API_KEY,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
)

logger = logging.getLogger("llm_router")
T = TypeVar("T", bound=BaseModel)


class LLMRouter:
    def __init__(self):
        self.gemini_key = GEMINI_API_KEY
        self.nvidia_key = NVIDIA_NIM_API_KEY
        self.ollama_url = OLLAMA_BASE_URL.rstrip("/")
        self.ollama_model = OLLAMA_MODEL

    async def check_status(self) -> dict:
        """Checks availability of Gemini, NVIDIA NIM, and local Ollama."""
        status = {
            "gemini": bool(self.gemini_key),
            "nvidia_nim": bool(self.nvidia_key),
            "ollama": False,
        }
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    status["ollama"] = True
        except Exception:
            status["ollama"] = False

        return status

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: str = "You are an expert resume optimization assistant. Respond ONLY with valid JSON.",
        response_model: Optional[Type[T]] = None,
    ) -> Tuple[Any, str]:
        """Tries Gemini -> NVIDIA NIM -> Ollama in order. Enforces valid JSON / Pydantic schema."""

        json_schema_hint = ""
        if response_model:
            json_schema_hint = f"\nReturn valid JSON matching this schema:\n{json.dumps(response_model.model_json_schema(), indent=2)}"

        full_system = f"{system_prompt}{json_schema_hint}"

        # 1. Try Gemini API
        if self.gemini_key:
            try:
                res, provider = await self._call_gemini(prompt, full_system)
                if response_model:
                    parsed = self._parse_to_model(res, response_model)
                    return parsed, provider
                return res, provider
            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}. Falling back to NVIDIA NIM...")

        # 2. Try NVIDIA NIM API
        if self.nvidia_key:
            try:
                res, provider = await self._call_nvidia_nim(prompt, full_system)
                if response_model:
                    parsed = self._parse_to_model(res, response_model)
                    return parsed, provider
                return res, provider
            except Exception as e:
                logger.warning(f"NVIDIA NIM call failed: {e}. Falling back to Ollama...")

        # 3. Fallback to Local Ollama
        try:
            res, provider = await self._call_ollama(prompt, full_system)
            if response_model:
                parsed = self._parse_to_model(res, response_model)
                return parsed, provider
            return res, provider
        except Exception as e:
            logger.error(f"All LLM providers failed (Gemini, NVIDIA, Ollama): {e}")

        # If LLM calls fail completely, construct fallback model instance if requested
        if response_model:
            try:
                return response_model(), "fallback_default"
            except Exception:
                pass
        return {"error": "All LLM providers exhausted"}, "none"

    async def _call_gemini(self, prompt: str, system_prompt: str) -> Tuple[dict, str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\nTask:\n{prompt}"}],
                }
            ],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text), "google_gemini"

    async def _call_nvidia_nim(self, prompt: str, system_prompt: str) -> Tuple[dict, str]:
        url = "https://integrate.api.nvidia.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.nvidia_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "meta/llama-3.1-70b-instruct",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return json.loads(text), "nvidia_nim"

    async def _call_ollama(self, prompt: str, system_prompt: str) -> Tuple[dict, str]:
        url_generate = f"{self.ollama_url}/api/generate"
        payload = {
            "model": self.ollama_model,
            "prompt": f"{system_prompt}\n\nUser Request:\n{prompt}",
            "format": "json",
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                resp = await client.post(url_generate, json=payload)
                resp.raise_for_status()
                data = resp.json()
                text = data.get("response", "")
                return json.loads(text), "local_ollama"
            except Exception as e:
                # Fallback to /api/chat
                url_chat = f"{self.ollama_url}/api/chat"
                chat_payload = {
                    "model": self.ollama_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "format": "json",
                    "stream": False,
                }
                resp = await client.post(url_chat, json=chat_payload)
                resp.raise_for_status()
                data = resp.json()
                text = data["message"]["content"]
                return json.loads(text), "local_ollama"

    def _parse_to_model(self, data: dict, model_cls: Type[T]) -> T:
        if isinstance(data, dict):
            return model_cls.model_validate(data)
        elif isinstance(data, str):
            return model_cls.model_validate_json(data)
        raise ValueError(f"Unable to parse output {data} into {model_cls}")


llm_router = LLMRouter()
