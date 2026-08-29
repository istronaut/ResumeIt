import json
import logging
import re
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


def clean_and_parse_json(text: str) -> Any:
    """Strips markdown code blocks and extracts valid JSON objects/arrays."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise


class LLMRouter:
    def __init__(self):
        self.gemini_key = GEMINI_API_KEY
        self.nvidia_key = NVIDIA_NIM_API_KEY
        self.ollama_url = OLLAMA_BASE_URL.rstrip("/")
        self.ollama_model = OLLAMA_MODEL
        self.active_provider = "auto"
        self.active_model = None

    async def check_status(self) -> dict:
        """Checks availability of Gemini, NVIDIA NIM, and local Ollama."""
        status = {
            "gemini": bool(self.gemini_key),
            "nvidia_nim": bool(self.nvidia_key),
            "ollama": False,
            "active_provider": self.active_provider,
            "active_model": self.active_model,
        }
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    status["ollama"] = True
        except Exception:
            status["ollama"] = False

        return status

    async def get_ollama_models(self) -> list:
        """Returns list of installed model names from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    models = res.json().get("models", [])
                    return [m.get("name") for m in models if m.get("name")]
        except Exception:
            pass
        return []

    async def _get_available_ollama_model(self, client: httpx.AsyncClient) -> str:
        """Returns configured model if present, or first available installed model from Ollama."""
        if self.active_model and self.active_provider == "local_ollama":
            return self.active_model
        try:
            res = await client.get(f"{self.ollama_url}/api/tags")
            if res.status_code == 200:
                models = res.json().get("models", [])
                model_names = [m.get("name") for m in models if m.get("name")]
                if self.ollama_model in model_names:
                    return self.ollama_model
                if model_names:
                    logger.info(f"Ollama model '{self.ollama_model}' not found, using installed model '{model_names[0]}'")
                    return model_names[0]
        except Exception as e:
            logger.warning(f"Failed to fetch Ollama tags: {e}")
        return self.ollama_model

    async def ping_provider(self, provider: str, model: Optional[str] = None) -> dict:
        """Pings selected provider/model and measures latency in milliseconds."""
        import time
        start_time = time.perf_counter()
        target_model = model

        try:
            if provider == "google_gemini":
                if not self.gemini_key:
                    return {"status": "offline", "error": "Gemini API Key missing in .env"}
                res, prov = await self._call_gemini("Ping test. Respond with valid JSON: {\"status\": \"ok\"}", "Respond strictly in JSON.")
                target_model = "gemini-3.6-flash"
            elif provider == "nvidia_nim":
                if not self.nvidia_key:
                    return {"status": "offline", "error": "NVIDIA NIM API Key missing in .env"}
                res, prov = await self._call_nvidia_nim("Ping test. Respond with valid JSON: {\"status\": \"ok\"}", "Respond strictly in JSON.")
                target_model = "nvidia/nemotron-3-ultra-550b-a55b"
            elif provider == "local_ollama":
                async with httpx.AsyncClient(timeout=10.0) as client:
                    if not target_model:
                        target_model = await self._get_available_ollama_model(client)
                    url = f"{self.ollama_url}/api/generate"
                    payload = {"model": target_model, "prompt": "Ping test", "stream": False}
                    resp = await client.post(url, json=payload)
                    resp.raise_for_status()
            elif provider == "auto":
                errors = []
                if self.gemini_key:
                    res = await self.ping_provider("google_gemini")
                    if res.get("status") == "online":
                        return res
                    errors.append(f"Gemini: {res.get('error')}")

                if self.nvidia_key:
                    res = await self.ping_provider("nvidia_nim")
                    if res.get("status") == "online":
                        return res
                    errors.append(f"NVIDIA: {res.get('error')}")

                res = await self.ping_provider("local_ollama", target_model)
                if res.get("status") == "online":
                    return res
                errors.append(f"Ollama: {res.get('error')}")

                return {"status": "offline", "error": "No LLM found. " + " | ".join(errors)}
            else:
                return {"status": "offline", "error": f"Unknown provider: {provider}"}

            elapsed_ms = round((time.perf_counter() - start_time) * 1000)
            return {
                "status": "online",
                "provider": provider,
                "model": target_model,
                "latency_ms": elapsed_ms,
                "message": "Model responding successfully"
            }
        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000)
            return {
                "status": "offline",
                "provider": provider,
                "model": target_model,
                "latency_ms": elapsed_ms,
                "error": str(e)
            }

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: str = "You are an expert resume optimization assistant. Respond ONLY with valid JSON.",
        response_model: Optional[Type[T]] = None,
    ) -> Tuple[Any, str]:
        """Tries Gemini -> NVIDIA NIM -> Ollama in order (or user active_provider). Enforces valid JSON / Pydantic schema."""

        json_schema_hint = ""
        if response_model:
            json_schema_hint = f"\nReturn valid JSON matching this schema:\n{json.dumps(response_model.model_json_schema(), indent=2)}"

        full_system = f"{system_prompt}{json_schema_hint}"

        # If user explicitly set an active provider (not "auto"), try that specific provider first
        if self.active_provider == "google_gemini" and self.gemini_key:
            try:
                res, provider = await self._call_gemini(prompt, full_system)
                if response_model:
                    return self._parse_to_model(res, response_model), provider
                return res, provider
            except Exception as e:
                logger.warning(f"Active provider google_gemini failed: {e}. Falling back to default chain...")

        elif self.active_provider == "nvidia_nim" and self.nvidia_key:
            try:
                res, provider = await self._call_nvidia_nim(prompt, full_system)
                if response_model:
                    return self._parse_to_model(res, response_model), provider
                return res, provider
            except Exception as e:
                logger.warning(f"Active provider nvidia_nim failed: {e}. Falling back to default chain...")

        elif self.active_provider == "local_ollama":
            try:
                res, provider = await self._call_ollama(prompt, full_system)
                if response_model:
                    return self._parse_to_model(res, response_model), provider
                return res, provider
            except Exception as e:
                logger.warning(f"Active provider local_ollama failed: {e}. Falling back to default chain...")

        # Standard Fallback Chain: 1. Gemini API
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

        # Strict: Do NOT return fake heuristic models. Raise exception when no LLM is available.
        raise RuntimeError("No LLM found. Please configure a valid API key for Gemini / NVIDIA NIM, or start local Ollama.")

    async def _call_gemini(self, prompt: str, system_prompt: str) -> Tuple[dict, str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={self.gemini_key}"
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
            return clean_and_parse_json(text), "google_gemini"

    async def _call_nvidia_nim(self, prompt: str, system_prompt: str) -> Tuple[dict, str]:
        url = "https://integrate.api.nvidia.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.nvidia_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "nvidia/nemotron-3-ultra-550b-a55b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return clean_and_parse_json(text), "nvidia_nim"

    async def _call_ollama(self, prompt: str, system_prompt: str) -> Tuple[dict, str]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            target_model = await self._get_available_ollama_model(client)
            url_generate = f"{self.ollama_url}/api/generate"
            payload = {
                "model": target_model,
                "prompt": f"{system_prompt}\n\nUser Request:\n{prompt}",
                "format": "json",
                "stream": False,
            }
            try:
                resp = await client.post(url_generate, json=payload)
                resp.raise_for_status()
                data = resp.json()
                text = data.get("response", "")
                return clean_and_parse_json(text), "local_ollama"
            except Exception:
                url_chat = f"{self.ollama_url}/api/chat"
                chat_payload = {
                    "model": target_model,
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
                return clean_and_parse_json(text), "local_ollama"

    def _parse_to_model(self, data: dict, model_cls: Type[T]) -> T:
        if isinstance(data, dict):
            return model_cls.model_validate(data)
        elif isinstance(data, str):
            return model_cls.model_validate_json(data)
        raise ValueError(f"Unable to parse output {data} into {model_cls}")


llm_router = LLMRouter()


