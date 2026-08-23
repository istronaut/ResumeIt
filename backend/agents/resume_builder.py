import json
import logging
import os
import re
import subprocess
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.config import (
    TEMPLATES_DIR,
    OUTPUT_DIR,
    PROJECTS_FILE,
    WORKEXP_FILE,
    EXTRACURRICULARS_FILE,
    ACHIEVEMENTS_FILE,
    CERTIFICATES_FILE,
    RESUMES_HISTORY_FILE,
    IDEAL_PROFILE_FILE,
    PROFILE_FILE,
    PDFLATEX_PATH,
)
from backend.models.schemas import ResumeGenerateRequest, ResumeHistoryItem

logger = logging.getLogger("resume_builder")


class ResumeBuilderAgent:
    @staticmethod
    def escape_latex(text: str) -> str:
        """Safely escapes LaTeX special characters (% _ & $ # { } ~ ^ \\) while preserving LaTeX commands."""
        if not text:
            return ""
        
        # If already formatted as a full LaTeX macro line (e.g. \resumeItem), return as is or escape safely
        text = str(text)
        
        # Replacements mapping
        replacements = [
            ("\\", r"\textbackslash{}"),
            ("&", r"\&"),
            ("%", r"\%"),
            ("$", r"\$"),
            ("#", r"\#"),
            ("_", r"\_"),
            ("{", r"\{"),
            ("}", r"\}"),
            ("~", r"\textasciitilde{}"),
            ("^", r"\textasciicircum{}"),
        ]
        
        # Protect intentional LaTeX formatting commands if present
        # First substitute macros to placeholders
        protected = {}
        def protect(match):
            key = f"__LATEX_CMD_{len(protected)}__"
            protected[key] = match.group(0)
            return key

        # Protect \href{...}{...}, \textbf{...}, \underline{...}, etc.
        text = re.sub(r'\\(href|textbf|textit|underline|raisebox|faPhone|faEnvelope|faLinkedin|faGithub|faGlobe)\{[^}]*\}', protect, text)

        for orig, repl in replacements:
            text = text.replace(orig, repl)

        # Restore protected macros
        for key, val in protected.items():
            text = text.replace(key, val)

        return text

    def load_json_store(self, file_path: Path) -> List[Dict[str, Any]]:
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
            except Exception:
                pass
        return []

    def load_json_dict_store(self, file_path: Path) -> Dict[str, Any]:
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
            except Exception:
                pass
        return {}

    def save_history(self, history_item: ResumeHistoryItem):
        history = self.load_json_store(RESUMES_HISTORY_FILE)
        history.insert(0, history_item.model_dump())
        with open(RESUMES_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)

    def generate_latex_code(self, req: ResumeGenerateRequest) -> str:
        """Generates LaTeX source code by filling the parametrized template_1.tex."""
        template_path = TEMPLATES_DIR / req.template_name
        if not template_path.exists():
            template_path = Path("/home/ishaan/Code/ResumeIt/template_1.tex")
            if not template_path.exists():
                raise FileNotFoundError(f"Template not found: {req.template_name}")

        with open(template_path, "r", encoding="utf-8") as f:
            template_content = f.read()

        # Load data stores
        projects_data = self.load_json_store(PROJECTS_FILE)
        workexp_data = self.load_json_store(WORKEXP_FILE)
        extracurriculars_data = self.load_json_store(EXTRACURRICULARS_FILE)
        achievements_data = self.load_json_store(ACHIEVEMENTS_FILE)
        certificates_data = self.load_json_store(CERTIFICATES_FILE)
        profile_data = self.load_json_dict_store(PROFILE_FILE)

        # Filter Projects based on selected_project_ids or pick top projects
        selected_projects = []
        if req.selected_project_ids:
            selected_projects = [p for p in projects_data if p.get("id") in req.selected_project_ids]
        else:
            selected_projects = projects_data

        # Filter Experience
        selected_workexp = []
        if req.selected_workexp_ids:
            selected_workexp = [w for w in workexp_data if w.get("id") in req.selected_workexp_ids]
        else:
            selected_workexp = workexp_data

        # Filter Achievements
        selected_achievements = achievements_data
        if req.selected_achievement_ids:
            selected_achievements = [a for a in achievements_data if a.get("id") in req.selected_achievement_ids]

        # Build Header Section LaTeX
        full_name = self.escape_latex(profile_data.get("full_name", ""))
        phone = self.escape_latex(profile_data.get("phone", ""))
        email = self.escape_latex(profile_data.get("email", ""))
        linkedin_url = profile_data.get("linkedin_url", "")
        linkedin_handle = self.escape_latex(profile_data.get("linkedin_handle", "") or "LinkedIn")
        github_url = profile_data.get("github_url", "")
        github_handle = self.escape_latex(profile_data.get("github_handle", "") or "GitHub")
        portfolio_url = profile_data.get("portfolio_url", "")
        portfolio_handle = self.escape_latex(profile_data.get("portfolio_handle", "") or "Portfolio")

        header_items = []
        if phone:
            phone_clean = re.sub(r'[^\d+]', '', phone)
            header_items.append(f"\\href{{tel:{phone_clean}}}{{\\raisebox{{-0.2\\height}}\\faPhone\\ \\underline{{{phone}}}}}")
        if email:
            header_items.append(f"\\href{{mailto:{email}}}{{\\raisebox{{-0.2\\height}}\\faEnvelope\\ \\underline{{{email}}}}}")
        if linkedin_url:
            header_items.append(f"\\href{{{linkedin_url}}}{{\\raisebox{{-0.2\\height}}\\faLinkedin\\ \\underline{{{linkedin_handle}}}}}")
        if github_url:
            header_items.append(f"\\href{{{github_url}}}{{\\raisebox{{-0.2\\height}}\\faGithub\\ \\underline{{{github_handle}}}}}")
        if portfolio_url:
            header_items.append(f"\\href{{{portfolio_url}}}{{\\raisebox{{-0.2\\height}}\\faGlobe\\ \\underline{{{portfolio_handle}}}}}")

        display_name = full_name if full_name else "FIRST LAST"
        joined_links = " ~ $\\vert$ ~ \n  ".join(header_items) if header_items else "\\normalsize Phone $\\vert$ Email $\\vert$ LinkedIn $\\vert$ GitHub"

        header_block = f"""\\begin{{center}}
  \\LARGE \\textbf{{{display_name}}} \\\\ \\vspace{{5pt}}
  \\normalsize
  {joined_links}
\\end{{center}}"""

        # Build Education Section LaTeX
        education_data = profile_data.get("education", [])
        education_block = ""
        if education_data:
            edu_lines = [r"\section{Education}", r"\resumeSubHeadingListStart"]
            for edu in education_data:
                inst = self.escape_latex(edu.get("institution", ""))
                loc = self.escape_latex(edu.get("location", ""))
                deg = self.escape_latex(edu.get("degree", ""))
                gpa = edu.get("gpa")
                if gpa:
                    deg = f"{deg}, GPA: {self.escape_latex(str(gpa))}"
                dates = self.escape_latex(edu.get("date_range", ""))
                edu_lines.append(f"\\resumeSubheading{{{inst}}}{{{loc}}}{{{deg}}}{{{dates}}}")
            edu_lines.append(r"\resumeSubHeadingListEnd")
            education_block = "\n".join(edu_lines)

        # Build Skills Section LaTeX
        skills_data = profile_data.get("skills", {})
        skills_block = ""
        if skills_data:
            sk_lines = [r"\section{Skills Summary}", r"\resumeSubHeadingListStart"]
            for cat, val in skills_data.items():
                cat_escaped = self.escape_latex(cat)
                val_escaped = self.escape_latex(val)
                sk_lines.append(f"\\resumeItem{{{cat_escaped}}}{{{val_escaped}}}")
                sk_lines.append(r"\vspace{-2pt}")
            sk_lines.append(r"\resumeSubHeadingListEnd")
            skills_block = "\n".join(sk_lines)

        # Build Experience Section LaTeX
        experience_block = ""
        if selected_workexp:
            exp_lines = [r"\section{Experience}", r"\resumeSubHeadingListStart"]
            for item in selected_workexp:
                comp = self.escape_latex(item.get("company", ""))
                url = item.get("company_url", "")
                comp_latex = f"\\href{{{url}}}{{{comp}}}" if url else comp
                loc = self.escape_latex(item.get("location", ""))
                role = self.escape_latex(item.get("role", ""))
                dates = self.escape_latex(item.get("date_range", ""))

                exp_lines.append(f"\\resumeSubheading{{{comp_latex}}}{{{loc}}}{{{role}}}{{{dates}}}")
                exp_lines.append(r"\resumeItemListStart")
                for bullet in item.get("bullet_points", []):
                    b_text = self.escape_latex(bullet)
                    exp_lines.append(f"\\resumeItemWithoutTitle{{{b_text}}}")
                exp_lines.append(r"\resumeItemListEnd")
            exp_lines.append(r"\resumeSubHeadingListEnd")
            experience_block = "\n".join(exp_lines)

        # Build Projects Section LaTeX
        projects_block = ""
        if selected_projects:
            proj_lines = [r"\section{Projects}", r"\resumeSubHeadingListStart"]
            for proj in selected_projects:
                title = self.escape_latex(proj.get("title", ""))
                link = proj.get("link", "")
                title_latex = f"\\href{{{link}}}{{{title}}}" if link else title
                tech_stack = ", ".join(self.escape_latex(t) for t in proj.get("tech_stack", []))

                proj_lines.append(f"\\resumeSubheading{{{title_latex}}}{{}}{{{tech_stack}}}{{}}")
                proj_lines.append(r"\resumeItemListStart")
                for bullet in proj.get("bullet_points", []):
                    b_text = self.escape_latex(bullet)
                    proj_lines.append(f"\\resumeItemWithoutTitle{{{b_text}}}")
                proj_lines.append(r"\resumeItemListEnd")
            proj_lines.append(r"\resumeSubHeadingListEnd")
            projects_block = "\n".join(proj_lines)

        # Build Achievements Section LaTeX
        achievements_block = ""
        if selected_achievements:
            ach_lines = [r"\section{Achievements}", r"\resumeSubHeadingListStart"]
            for ach in selected_achievements:
                title = self.escape_latex(ach.get("title", ""))
                desc = self.escape_latex(ach.get("description", ""))
                date = self.escape_latex(ach.get("date", ""))
                
                date_suffix = f", {date}" if date else ""
                ach_lines.append(f"\\item \\textbf{{{title}{date_suffix}}} \\\\ {desc} \\vspace{{-2pt}}")
            ach_lines.append(r"\resumeSubHeadingListEnd")
            achievements_block = "\n".join(ach_lines)

        # Build Certificates Section LaTeX
        cert_block = ""
        if req.include_certificates and certificates_data:
            cert_lines = [r"\section{Certifications}", r"\resumeSubHeadingListStart"]
            for c in certificates_data:
                ctitle = self.escape_latex(c.get("title", ""))
                issuer = self.escape_latex(c.get("issuer", ""))
                instructor = self.escape_latex(c.get("instructor", ""))
                date = self.escape_latex(c.get("issue_date", ""))
                
                instr_str = f" (Instructor/Institution: {instructor})" if instructor else ""
                cert_lines.append(f"\\item \\textbf{{{ctitle}}} -- {issuer}{instr_str} \\hfill {{{date}}} \\vspace{{-2pt}}")
            cert_lines.append(r"\resumeSubHeadingListEnd")
            cert_block = "\n".join(cert_lines)

        # Build Extracurriculars Section LaTeX
        extra_block = ""
        if req.include_extracurriculars and extracurriculars_data:
            extra_lines = [r"\section{Extracurricular Activities}", r"\resumeSubHeadingListStart"]
            for ex in extracurriculars_data:
                org = self.escape_latex(ex.get("organization", ""))
                role = self.escape_latex(ex.get("role", ""))
                loc = self.escape_latex(ex.get("location", ""))
                dates = self.escape_latex(ex.get("date_range", ""))
                extra_lines.append(f"\\resumeSubheading{{{org}}}{{{loc}}}{{{role}}}{{{dates}}}")
                extra_lines.append(r"\resumeItemListStart")
                for bullet in ex.get("bullet_points", []):
                    b_text = self.escape_latex(bullet)
                    extra_lines.append(f"\\resumeItemWithoutTitle{{{b_text}}}")
                extra_lines.append(r"\resumeItemListEnd")
            extra_lines.append(r"\resumeSubHeadingListEnd")
            extra_block = "\n".join(extra_lines)

        # Substitute placeholders in template_1.tex
        latex_out = template_content
        latex_out = latex_out.replace("((HEADER_SECTION))", header_block)
        latex_out = latex_out.replace("((EDUCATION_SECTION))", education_block)
        latex_out = latex_out.replace("((SKILLS_SECTION))", skills_block)
        latex_out = latex_out.replace("((EXPERIENCE_SECTION))", experience_block)
        latex_out = latex_out.replace("((PROJECTS_SECTION))", projects_block)
        latex_out = latex_out.replace("((ACHIEVEMENTS_SECTION))", achievements_block)
        latex_out = latex_out.replace("((CERTIFICATIONS_SECTION))", cert_block)
        latex_out = latex_out.replace("((EXTRACURRICULARS_SECTION))", extra_block)

        # Fallback for templates without explicit placeholders
        if r"\section{Experience}" in latex_out and r"\section{Projects}" in latex_out:
            exp_regex = r"\\section\{Experience\}.*?(?=\\section\{Projects\}|\\section\{Achievements\}|\\end\{document\})"
            latex_out = re.sub(exp_regex, lambda m: (experience_block + "\n\n") if experience_block else "", latex_out, flags=re.DOTALL)

            proj_regex = r"\\section\{Projects\}.*?(?=\\section\{Achievements\}|\\section\{Education\}|\\end\{document\})"
            latex_out = re.sub(proj_regex, lambda m: (projects_block + "\n\n") if projects_block else "", latex_out, flags=re.DOTALL)

            ach_and_certs = (achievements_block + ("\n\n" + cert_block if cert_block else "")).strip()
            if ach_and_certs:
                ach_and_certs += "\n\n"
            latex_out = re.sub(r"\\section\{Achievements\}.*?\\end\{document\}", lambda m: ach_and_certs + r"\end{document}", latex_out, flags=re.DOTALL)

        return latex_out

    def compile_pdf(self, req: ResumeGenerateRequest) -> ResumeHistoryItem:
        """Generates LaTeX code, saves file, invokes pdflatex command, returns ResumeHistoryItem."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        company_clean = (req.target_company or "Company").replace(" ", "_").lower()
        base_name = f"resume_{company_clean}_{timestamp}"

        tex_path = OUTPUT_DIR / f"{base_name}.tex"
        pdf_path = OUTPUT_DIR / f"{base_name}.pdf"

        latex_code = self.generate_latex_code(req)

        # Write .tex file
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_code)

        # Execute pdflatex in OUTPUT_DIR
        cmd = [
            PDFLATEX_PATH,
            "-interaction=nonstopmode",
            "-output-directory", str(OUTPUT_DIR),
            str(tex_path)
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if res.returncode != 0:
                logger.warning(f"pdflatex returned non-zero code {res.returncode}. Log snippet: {res.stdout[-500:]}")
        except Exception as e:
            logger.error(f"pdflatex subprocess failed: {e}")

        # Check if PDF generated
        if not pdf_path.exists():
            raise RuntimeError(f"PDF compilation failed for {tex_path}. Check LaTeX syntax.")

        history_item = ResumeHistoryItem(
            id=str(uuid.uuid4())[:8],
            company_name=req.target_company or "Target Company",
            role_title=req.target_role or "Software Engineer",
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            template_name=req.template_name,
            selected_project_ids=req.selected_project_ids or [],
            latex_file=str(tex_path.name),
            pdf_file=str(pdf_path.name)
        )

        self.save_history(history_item)
        try:
            from backend.database import save_record
            save_record(
                uuid_str=history_item.id,
                company_name=history_item.company_name,
                role_title=history_item.role_title,
                jd_pdf_bytes=None,
                tex_content=latex_code,
                pdf_filename=history_item.pdf_file,
            )
        except Exception as e:
            logger.error(f"Error logging record to SQLite: {e}")

        return history_item


resume_builder_agent = ResumeBuilderAgent()
