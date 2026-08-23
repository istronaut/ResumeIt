import json
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
import pymupdf as fitz
import httpx

from backend.config import IDEAL_PROFILE_FILE
from backend.models.schemas import IdealProfile
from backend.agents.llm_router import llm_router

logger = logging.getLogger("jd_intelligence")


COMMON_TECH_KEYWORDS = [
    "Python", "Java", "Go", "Golang", "C++", "C#", "TypeScript", "JavaScript", "Rust", "SQL",
    "FastAPI", "React", "Next.js", "Vue", "Node.js", "Express", "Django", "Flask", "Spring",
    "PostgreSQL", "Postgres", "MySQL", "Redis", "MongoDB", "Elasticsearch", "Vector DB",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Linux", "Git", "CI/CD", "Terraform",
    "Kafka", "RabbitMQ", "WebRTC", "WebSockets", "REST", "gRPC", "GraphQL", "Microservices",
    "System Design", "Distributed Systems", "Multithreading", "PyTorch", "TensorFlow", "OpenAI"
]


class JDIntelligenceAgent:
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extracts raw text from a JD PDF file using PyMuPDF (fitz)."""
        doc = fitz.open(pdf_path)
        text_chunks = []
        for page in doc:
            text = page.get_text()
            if text and text.strip():
                text_chunks.append(text)
        return "\n".join(text_chunks)

    def extract_heuristics_from_text(self, text: str, user_company: Optional[str] = None, user_role: Optional[str] = None) -> IdealProfile:
        """Rule-based heuristic fallback parser to extract company, role, and skills directly from text."""
        comp_name = user_company if user_company and user_company.strip() else ""
        role_title = user_role if user_role and user_role.strip() else ""

        # 1. Search for Company Name in text if not provided
        if not comp_name:
            comp_match = re.search(r'(?:About|at|Company|Organization|Join|Team at):\s*([A-Z][A-Za-z0-9\s,\.]{2,30})', text, re.IGNORECASE)
            if comp_match:
                comp_name = comp_match.group(1).strip()
            else:
                at_match = re.search(r'\bat\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\b', text)
                if at_match:
                    comp_name = at_match.group(1).strip()

        # 2. Search for Role Title in text if not provided
        if not role_title:
            role_match = re.search(r'(?:Role|Title|Position|Job Title):\s*([A-Z][A-Za-z0-9\s,/]{2,40})', text, re.IGNORECASE)
            if role_match:
                role_title = role_match.group(1).strip()
            else:
                role_candidates = re.findall(r'(?:Senior|Junior|Lead|Principal|Staff)?\s*(?:Software|Backend|Frontend|Full Stack|Systems|DevOps|Data|AI|ML)\s*(?:Engineer|Developer|Architect)', text, re.IGNORECASE)
                if role_candidates:
                    role_title = role_candidates[0].strip()

        # Defaults if text has no obvious header
        if not comp_name:
            comp_name = "Target Company"
        if not role_title:
            role_title = "Software Engineer"

        # 3. Extract tech skills present in text
        text_lower = text.lower()
        found_skills = []
        for kw in COMMON_TECH_KEYWORDS:
            if re.search(r'\b' + re.escape(kw.lower()) + r'\b', text_lower):
                found_skills.append(kw)

        if not found_skills:
            found_skills = ["Python", "System Design", "Git", "Docker", "PostgreSQL"]

        domains = []
        if any(k in found_skills for k in ["React", "TypeScript", "Next.js", "Vue"]):
            domains.append("Frontend Development")
        if any(k in found_skills for k in ["FastAPI", "Go", "Node.js", "Django", "PostgreSQL", "Redis"]):
            domains.append("Backend Engineering")
        if any(k in found_skills for k in ["Docker", "Kubernetes", "AWS", "CI/CD"]):
            domains.append("DevOps & Cloud")
        if any(k in found_skills for k in ["Distributed Systems", "Kafka", "Multithreading"]):
            domains.append("System Design")

        return IdealProfile(
            company_name=comp_name,
            role_title=role_title,
            key_skills_hierarchy=found_skills[:10],
            domain_focus=domains if domains else ["Backend Engineering"],
            expected_bullet_tone="Metric-driven, technical action verbs with quantitative impact",
            role_keywords=found_skills[:8],
            culture_values=["Technical Excellence", "Reliability", "Scalability"]
        )

    async def search_company_info(self, company_name: str) -> Dict[str, str]:
        """Performs background web search for company culture, tech stack, engineering values."""
        if not company_name or len(company_name) < 2 or company_name == "Target Company":
            return {"culture": "Modern fast-paced engineering driven team.", "values": "Clean code, scalability"}

        search_info = {"culture": "", "values": ""}
        try:
            url = f"https://html.duckduckgo.com/html/?q={company_name}+engineering+culture+values+tech+stack"
            headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    text = res.text[:3000]
                    search_info["culture"] = f"Web context for {company_name}: {text[:200]}..."
        except Exception:
            pass

        if not search_info["culture"]:
            search_info["culture"] = f"Engineering team focused on reliability and performance at {company_name}."

        return search_info

    async def analyze_jd(
        self,
        jd_text: str,
        company_name: Optional[str] = None,
        role_title: Optional[str] = None,
        enable_web_research: bool = True
    ) -> IdealProfile:
        """Parses JD text + optional web research to output ideal candidate profile."""

        # Compute heuristic extraction as fallback baseline
        heuristic_profile = self.extract_heuristics_from_text(jd_text, company_name, role_title)

        user_specified_company = company_name.strip() if company_name and company_name.strip() else ""
        user_specified_role = role_title.strip() if role_title and role_title.strip() else ""

        effective_company = user_specified_company or heuristic_profile.company_name

        web_context = {}
        if enable_web_research and effective_company and effective_company != "Target Company":
            web_context = await self.search_company_info(effective_company)

        company_prompt_hint = f"User explicitly specified company: {user_specified_company}" if user_specified_company else "Extract the exact company name from the JD text."
        role_prompt_hint = f"User explicitly specified role: {user_specified_role}" if user_specified_role else "Extract the exact job role title from the JD text."

        prompt = f"""
Analyze the following Job Description (JD) text and extract the target company, role title, skills hierarchy, ATS keywords, domain focus, culture values, and engineering bullet tone.

Company Directive: {company_prompt_hint}
Role Directive: {role_prompt_hint}
Web Context / Culture Notes: {web_context.get('culture', '')}

Job Description Text:
{jd_text[:4000]}

Respond ONLY with valid JSON matching this structure:
{{
  "company_name": "Exact company name extracted from text or provided directive",
  "role_title": "Exact job role title extracted from text or provided directive",
  "key_skills_hierarchy": ["Skill 1", "Skill 2", ...],
  "domain_focus": ["Backend", "DevOps", ...],
  "expected_bullet_tone": "Metric-driven, technical action verbs",
  "role_keywords": ["keyword 1", ...],
  "culture_values": ["Value 1", ...]
}}
        """

        system_prompt = "You are an executive tech recruiter and resume strategist. Respond strictly in valid JSON."

        try:
            llm_response, provider = await llm_router.generate_structured(
                prompt=prompt,
                system_prompt=system_prompt,
                response_model=IdealProfile
            )

            if isinstance(llm_response, IdealProfile):
                profile = llm_response
                logger.info(f"Successfully analyzed JD with LLM provider: {provider}")
                if not profile.company_name or profile.company_name == "Target Company":
                    profile.company_name = user_specified_company or "Target Company"
                if not profile.role_title or profile.role_title == "Software Engineer":
                    profile.role_title = user_specified_role or "Software Engineer"
            else:
                raise RuntimeError(f"LLM returned invalid profile format: {llm_response}")
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            raise RuntimeError(f"No LLM provider available for JD analysis: {e}")

        # Save to ideal_profile.json
        with open(IDEAL_PROFILE_FILE, "w", encoding="utf-8") as f:
            json.dump(profile.model_dump(), f, indent=2)

        return profile


jd_intelligence_agent = JDIntelligenceAgent()

