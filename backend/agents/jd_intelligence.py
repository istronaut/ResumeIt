import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import pymupdf as fitz
import httpx

from backend.config import IDEAL_PROFILE_FILE
from backend.models.schemas import IdealProfile
from backend.agents.llm_router import llm_router

logger = logging.getLogger("jd_intelligence")


class JDIntelligenceAgent:
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extracts text from a JD PDF file using PyMuPDF (fitz)."""
        doc = fitz.open(pdf_path)
        text_chunks = []
        for page in doc:
            text_chunks.append(page.get_text())
        return "\n".join(text_chunks)

    async def search_company_info(self, company_name: str) -> Dict[str, str]:
        """Performs background web search for company culture, tech stack, engineering values."""
        if not company_name or len(company_name) < 2:
            return {"culture": "Modern fast-paced engineering driven team.", "values": "Clean code, scalability, test coverage"}

        search_info = {"culture": "", "values": ""}
        try:
            # DuckDuckGo instant answer / HTML search fallback
            url = f"https://html.duckduckgo.com/html/?q={company_name}+engineering+culture+values+tech+stack"
            headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    text = res.text[:3000]
                    search_info["culture"] = f"Extracted web context for {company_name}: {text[:200]}..."
        except Exception as e:
            logger.warning(f"Web lookup for {company_name} skipped: {e}")

        if not search_info["culture"]:
            search_info["culture"] = f"Leading engineering company focused on reliability, performance, and modern architecture for {company_name}."

        return search_info

    async def analyze_jd(
        self,
        jd_text: str,
        company_name: Optional[str] = None,
        role_title: Optional[str] = None,
        enable_web_research: bool = True
    ) -> IdealProfile:
        """Parses JD text + optional web research to output ideal candidate profile."""

        web_context = {}
        if enable_web_research and company_name:
            web_context = await self.search_company_info(company_name)

        prompt = f"""
Analyze the following Job Description (JD) text and synthesize an ideal candidate profile.

Target Company (if known): {company_name or 'Not specified'}
Target Role (if known): {role_title or 'Not specified'}
Web Context / Culture Notes: {web_context.get('culture', '')}

Job Description Text:
{jd_text[:4000]}

Extracted items required:
- company_name: Exact or inferred company name
- role_title: Exact or inferred job title
- key_skills_hierarchy: List of top 8-12 technical skills required, ordered by priority
- domain_focus: Core technical domains (e.g. Distributed Systems, Frontend UI, Database Performance, DevOps, Cloud)
- expected_bullet_tone: Preferred bullet point tone (e.g., High-impact metric driven, architectural focus)
- role_keywords: Critical ATS keywords to highlight
- culture_values: Key engineering culture values
        """

        system_prompt = "You are an executive tech recruiter and resume strategist. Respond strictly in valid JSON matching the schema."

        llm_response, provider = await llm_router.generate_structured(
            prompt=prompt,
            system_prompt=system_prompt,
            response_model=IdealProfile
        )

        if isinstance(llm_response, IdealProfile):
            profile = llm_response
        else:
            # Fallback construct
            profile = IdealProfile(
                company_name=company_name or "Target Company",
                role_title=role_title or "Software Engineer",
                key_skills_hierarchy=["Python", "Go", "FastAPI", "React", "Docker", "PostgreSQL", "System Design"],
                domain_focus=["Backend Engineering", "System Design", "Distributed Systems"],
                expected_bullet_tone="Metric-driven, technical action verbs with quantitative impact",
                role_keywords=["concurrency", "scalability", "latency", "REST API", "microservices", "unit testing"],
                culture_values=["Ownership", "High Concurrency", "Quality"]
            )

        # Save to ideal_profile.json
        with open(IDEAL_PROFILE_FILE, "w", encoding="utf-8") as f:
            json.dump(profile.model_dump(), f, indent=2)

        return profile


jd_intelligence_agent = JDIntelligenceAgent()
