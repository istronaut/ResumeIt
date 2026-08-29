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
        """Parses JD text + optional web research to output ideal candidate profile using LLM."""

        user_specified_company = company_name.strip() if company_name and company_name.strip() else ""
        user_specified_role = role_title.strip() if role_title and role_title.strip() else ""

        effective_company = user_specified_company

        web_context = {}
        if enable_web_research and effective_company and effective_company != "Target Company":
            web_context = await self.search_company_info(effective_company)

        company_prompt_hint = f"User explicitly specified company: {user_specified_company}" if user_specified_company else "Extract the exact company name from the JD text."
        role_prompt_hint = f"User explicitly specified role: {user_specified_role}" if user_specified_role else "Extract the exact job role title from the JD text."

        prompt = f"""
Analyze the following Job Description (JD) text and output a comprehensive intelligence analysis matching this exact structure:

{{
  "metadata": {{
    "role_title": "Exact job role title extracted from text or provided directive",
    "company_name": "Exact company name extracted from text or provided directive (or null)",
    "seniority_level": "intern | entry | mid | senior | lead | staff",
    "location_type": "remote | hybrid | on-site",
    "primary_domain": "frontend | backend | fullstack | devops_sre | machine_learning | data_engineering | embedded_systems"
  }},
  "skills_taxonomy": {{
    "recommended_categories": ["Category 1", "Category 2", "Category 3"]
  }},
  "domain_weights": {{
    "backend": 0.5,
    "databases": 0.3,
    "devops": 0.2
  }},
  "ats_optimization": {{
    "exact_keywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
    "action_verbs": ["Architected", "Optimized", "Scaled"],
    "methodologies": ["Microservices", "CI/CD", "TDD"]
  }},
  "key_responsibilities": [
    "Concise functional expectation bullet point 1",
    "Concise functional expectation bullet point 2",
    "Concise functional expectation bullet point 3"
  ]
}}

Guidance for skills_taxonomy:
The "recommended_categories" field MUST specify 3 to 5 ideal skill category header/bucket names tailored for the LaTeX Skills summary section based on the specific role domain.
Examples of tailored skill taxonomy category buckets:
- Fullstack role: ["Languages", "Frontend Development", "Backend Engineering", "Cloud & Infrastructure"]
- Backend role: ["Programming Languages", "Frameworks & APIs", "Databases & Storage", "Testing & Infrastructure"]
- DevOps / SRE role: ["Cloud & Infrastructure", "CI/CD & Automation", "Containerization & Orchestration", "Monitoring & Scripting"]
- Machine Learning / Data Science role: ["ML Frameworks", "Languages", "Data Engineering & Pipeline", "Cloud & MLOps"]

Company Directive: {company_prompt_hint}
Role Directive: {role_prompt_hint}
Web Context / Culture Notes: {web_context.get('culture', '')}

Job Description Text:
{jd_text[:4000]}
"""

        system_prompt = "You are an executive tech recruiter, resume strategist, and ATS optimization system. Respond strictly in valid JSON matching the schema."

        try:
            llm_response, provider = await llm_router.generate_structured(
                prompt=prompt,
                system_prompt=system_prompt,
                response_model=IdealProfile
            )

            if isinstance(llm_response, IdealProfile):
                profile = llm_response
                logger.info(f"Successfully analyzed JD with LLM provider: {provider}")

                # Sync metadata to top-level fields for backwards compatibility
                if profile.metadata:
                    if user_specified_company:
                        profile.metadata.company_name = user_specified_company
                    if user_specified_role:
                        profile.metadata.role_title = user_specified_role

                    profile.company_name = profile.metadata.company_name or user_specified_company or "Target Company"
                    profile.role_title = profile.metadata.role_title or user_specified_role or "Software Engineer"
                else:
                    profile.company_name = user_specified_company or "Target Company"
                    profile.role_title = user_specified_role or "Software Engineer"

                if profile.ats_optimization and profile.ats_optimization.exact_keywords:
                    profile.key_skills_hierarchy = profile.ats_optimization.exact_keywords
                    profile.role_keywords = profile.ats_optimization.exact_keywords

                if profile.domain_weights:
                    profile.domain_focus = list(profile.domain_weights.keys())
            else:
                raise RuntimeError(f"LLM returned invalid profile format: {llm_response}")
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            raise RuntimeError(f"No LLM found: {e}")

        # Save to ideal_profile.json
        with open(IDEAL_PROFILE_FILE, "w", encoding="utf-8") as f:
            json.dump(profile.model_dump(), f, indent=2)

        return profile


jd_intelligence_agent = JDIntelligenceAgent()

