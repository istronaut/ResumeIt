import json
import logging
import uuid
from typing import Dict, Any, List
from backend.config import PROJECTS_FILE
from backend.models.schemas import ProjectItem, CategoryScores
from backend.agents.llm_router import llm_router

logger = logging.getLogger("project_rater")


class ProjectRater:
    def load_projects(self) -> List[Dict[str, Any]]:
        if PROJECTS_FILE.exists():
            try:
                with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def save_projects(self, projects: List[Dict[str, Any]]):
        with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
            json.dump(projects, f, indent=2)

    def _deterministic_category_score(self, category: str, tech_stack: List[str], languages: List[str], deps: Dict[str, Any]) -> int:
        """Fallback deterministic heuristic scoring (1 to 5)."""
        cat = category.lower()
        score = 1

        tech_str = " ".join(t.lower() for t in tech_stack + languages + deps.get("npm", []) + deps.get("python", []))

        if cat == "frontend":
            if any(k in tech_str for k in ["react", "vue", "angular", "next", "typescript", "three", "css", "tailwind", "vite"]):
                score += 2
            if any(k in tech_str for k in ["webassembly", "three.js", "gsap", "cypress", "webrtc"]):
                score += 2
        elif cat == "backend":
            if any(k in tech_str for k in ["fastapi", "express", "go", "gin", "node", "django", "flask", "actix", "spring", "python"]):
                score += 2
            if any(k in tech_str for k in ["async", "multithreading", "concurrent", "grpc", "websocket", "hmac"]):
                score += 2
        elif cat == "system_design":
            if any(k in tech_str for k in ["distributed", "microservices", "pubsub", "queue", "webrtc", "ast", "stream"]):
                score += 2
            if any(k in tech_str for k in ["redis", "kafka", "rabbitmq", "concurrency", "load testing", "k6"]):
                score += 2
        elif cat == "database":
            if any(k in tech_str for k in ["postgres", "mysql", "mongodb", "redis", "sqlite", "vector", "orm", "sql"]):
                score += 2
            if any(k in tech_str for k in ["indexing", "sharding", "acid", "row-level", "migration"]):
                score += 2
        elif cat == "devops":
            if deps.get("docker") or "docker" in tech_str or "ci/cd" in tech_str or "actions" in tech_str:
                score += 2
            if any(k in tech_str for k in ["kubernetes", "terraform", "nginx", "prometheus", "grafana"]):
                score += 2
        elif cat == "architecture":
            if len(languages) > 1 or len(tech_stack) >= 4:
                score += 2
            if any(k in tech_str for k in ["clean", "domain", "hexagonal", "modular", "ast", "compiler", "cryptography"]):
                score += 2
        elif cat == "cloud":
            if any(k in tech_str for k in ["aws", "gcp", "azure", "s3", "lambda", "cloudflare", "vercel", "docker"]):
                score += 2
            if any(k in tech_str for k in ["container", "serverless", "cdn"]):
                score += 1

        return min(5, max(1, score))

    async def rate_and_formulate_project(self, repo_data: Dict[str, Any]) -> ProjectItem:
        """Rates codebase data using LLM with deterministic fallback, clamped to 1-5 via Pydantic."""
        repo_name = repo_data.get("repo_name", "Untitled Project")
        repo_path = repo_data.get("repo_path", "")
        tech_stack = repo_data.get("tech_stack", [])
        languages = repo_data.get("languages", [])
        ast_summary = repo_data.get("ast_summary", {})
        deps = repo_data.get("dependencies", {})

        prompt = f"""
Analyze the following parsed codebase metadata and formulate a deterministic rating (1 to 5 scale) across 7 categories (frontend, backend, system_design, database, devops, architecture, cloud).
Also formulate 2-3 metric-driven, context-rich bullet points following the formula: (Action Verb + Technical Context + Tech Stack Used + Quantitative Impact).

Repository Name: {repo_name}
Languages: {", ".join(languages)}
Tech Stack / Dependencies: {", ".join(tech_stack[:15])}
AST Summary: Python Files={ast_summary.get('total_python_files', 0)}, Classes={ast_summary.get('sample_classes', [])}, Functions={ast_summary.get('sample_functions', [])}
Docker Enabled: {deps.get('docker', False)}
        """

        system_prompt = "You are a senior principal engineer and tech resume evaluator. Return strictly valid JSON."

        # Compute heuristic fallback scores
        heuristic_scores = CategoryScores(
            frontend=self._deterministic_category_score("frontend", tech_stack, languages, deps),
            backend=self._deterministic_category_score("backend", tech_stack, languages, deps),
            system_design=self._deterministic_category_score("system_design", tech_stack, languages, deps),
            database=self._deterministic_category_score("database", tech_stack, languages, deps),
            devops=self._deterministic_category_score("devops", tech_stack, languages, deps),
            architecture=self._deterministic_category_score("architecture", tech_stack, languages, deps),
            cloud=self._deterministic_category_score("cloud", tech_stack, languages, deps),
        )

        bullets_fallback = [
            f"Architected {repo_name} using {', '.join(tech_stack[:4])}; optimized core workflows reducing latency and execution overhead.",
            f"Engineered high-throughput system modules with {languages[0] if languages else 'modern tools'}; implemented unit testing and validated architecture benchmarks."
        ]

        llm_response, provider = await llm_router.generate_structured(
            prompt=prompt,
            system_prompt=system_prompt,
            response_model=None
        )

        raw_scores = None
        if isinstance(llm_response, dict):
            raw_scores = llm_response.get("category_scores") or llm_response.get("ratings") or llm_response.get("categories")
            if not raw_scores:
                for k in ["rating", "Rating", "ratings", "Ratings", "categoryScores", "categories"]:
                    if isinstance(llm_response.get(k), dict):
                        raw_scores = llm_response.get(k)
                        break
            if not raw_scores and any(k.lower() in ["frontend", "backend", "system_design"] for k in llm_response.keys()):
                raw_scores = llm_response

        if not raw_scores or not isinstance(raw_scores, dict):
            raise RuntimeError(f"No LLM provider available for repository rating. LLM output: {llm_response}")

        def parse_score(keys: list, default: int = 3) -> int:
            lower_dict = {str(k).lower(): v for k, v in raw_scores.items()}
            for k in keys:
                if k.lower() in lower_dict:
                    try:
                        return min(5, max(1, int(lower_dict[k.lower()])))
                    except (ValueError, TypeError):
                        pass
            return default

        category_scores = CategoryScores(
            frontend=parse_score(["frontend"]),
            backend=parse_score(["backend"]),
            system_design=parse_score(["system_design", "systemdesign", "system_design_score"]),
            database=parse_score(["database"]),
            devops=parse_score(["devops"]),
            architecture=parse_score(["architecture"]),
            cloud=parse_score(["cloud"]),
        )

        raw_bullets = llm_response.get("bullet_points") or llm_response.get("bulletPoints") or llm_response.get("metrics") or llm_response.get("bullets")
        bullets = []
        if isinstance(raw_bullets, list):
            for b in raw_bullets:
                if isinstance(b, str):
                    bullets.append(b)
                elif isinstance(b, dict):
                    verb = b.get("actionVerb") or b.get("action_verb") or b.get("verb") or "Engineered"
                    ctx = b.get("technicalContext") or b.get("technical_context") or b.get("context") or "system modules"
                    tech = b.get("techStackUsed") or b.get("tech_stack_used") or b.get("techStack") or b.get("tech_stack") or ", ".join(tech_stack[:3])
                    impact = b.get("quantitativeImpact") or b.get("quantitative_impact") or b.get("impact") or ""
                    bullets.append(f"{verb} {ctx} using {tech}; {impact}".strip("; "))
        if not bullets:
            bullets = [f"Engineered {repo_name} system modules using {', '.join(tech_stack[:4])}."]

        # Check if project already exists in storage
        existing_projects = self.load_projects()
        project_id = str(uuid.uuid4())[:8]

        for p in existing_projects:
            if p.get("repo_path") == repo_path or p.get("title") == repo_name:
                project_id = p.get("id", project_id)
                break

        project_item = ProjectItem(
            id=project_id,
            title=repo_name,
            repo_path=repo_path,
            tech_stack=tech_stack if tech_stack else languages,
            category_scores=category_scores,
            bullet_points=bullets,
            tags=languages + [f"Rating:{category_scores.backend}/5 Backend", f"Provider:{provider}"],
            description=f"Automated project rating derived from AST parsing & LLM ({provider})."
        )

        # Upsert into projects.json
        updated_projects = [p for p in existing_projects if p.get("id") != project_id]
        updated_projects.append(project_item.model_dump())
        self.save_projects(updated_projects)

        return project_item


project_rater = ProjectRater()
