from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class CategoryScores(BaseModel):
    frontend: int = Field(default=3, ge=1, le=5, description="Frontend score (1-5)")
    backend: int = Field(default=3, ge=1, le=5, description="Backend score (1-5)")
    system_design: int = Field(default=3, ge=1, le=5, description="System design score (1-5)")
    database: int = Field(default=3, ge=1, le=5, description="Database score (1-5)")
    devops: int = Field(default=3, ge=1, le=5, description="DevOps score (1-5)")
    architecture: int = Field(default=3, ge=1, le=5, description="Architecture score (1-5)")
    cloud: int = Field(default=3, ge=1, le=5, description="Cloud score (1-5)")


class ProjectItem(BaseModel):
    id: str
    title: str
    repo_path: Optional[str] = None
    tech_stack: List[str] = []
    category_scores: CategoryScores = Field(default_factory=CategoryScores)
    bullet_points: List[str] = []
    tags: List[str] = []
    link: Optional[str] = None
    description: Optional[str] = None


class WorkExperienceItem(BaseModel):
    id: str
    company: str
    company_url: Optional[str] = None
    location: str
    role: str
    date_range: str
    bullet_points: List[str] = []


class ExtracurricularItem(BaseModel):
    id: str
    organization: str
    role: str
    location: Optional[str] = None
    date_range: str
    bullet_points: List[str] = []


class AchievementItem(BaseModel):
    id: str
    title: str
    description: str
    date: str = ""
    impact: Optional[str] = None


class CertificateItem(BaseModel):
    id: str
    title: str
    issuer: str
    instructor: Optional[str] = None  # e.g., Andrew Ng / University of Michigan
    issue_date: str = ""
    credential_url: Optional[str] = None


class JDMetadata(BaseModel):
    role_title: str
    company_name: Optional[str] = None
    seniority_level: str = Field(default="mid", description="intern | entry | mid | senior | lead | staff")
    location_type: str = Field(default="remote", description="remote | hybrid | on-site")
    primary_domain: str = Field(default="backend", description="frontend, backend, fullstack, devops_sre, machine_learning, data_engineering, embedded_systems")


class SkillsTaxonomy(BaseModel):
    recommended_categories: List[str] = Field(default_factory=list, description="Ordered 3-5 skill category headers for LaTeX Skills section")


class ATSOptimization(BaseModel):
    exact_keywords: List[str] = Field(default_factory=list, description="Critical technical terms extracted verbatim")
    action_verbs: List[str] = Field(default_factory=list, description="Strong verbs emphasized in JD")
    methodologies: List[str] = Field(default_factory=list, description="Workflows and architectures")


class IdealProfile(BaseModel):
    metadata: Optional[JDMetadata] = None
    skills_taxonomy: Optional[SkillsTaxonomy] = None
    domain_weights: Dict[str, float] = Field(default_factory=dict, description="Normalized weights summing to 1.0")
    ats_optimization: Optional[ATSOptimization] = None
    key_responsibilities: List[str] = Field(default_factory=list, description="3-5 concise bullet points capturing core functional expectations")

    # Legacy/convenience top-level fields for backwards-compatibility
    company_name: Optional[str] = "Target Company"
    role_title: Optional[str] = "Software Engineer"
    key_skills_hierarchy: List[str] = Field(default_factory=list)
    domain_focus: List[str] = Field(default_factory=list)
    expected_bullet_tone: str = "Metric-driven, technical action verbs"
    role_keywords: List[str] = Field(default_factory=list)
    culture_values: List[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    institution: str
    location: Optional[str] = None
    degree: str
    date_range: str = ""
    gpa: Optional[str] = None


class UserProfile(BaseModel):
    full_name: str = ""
    phone: str = ""
    email: str = ""
    linkedin_url: str = ""
    linkedin_handle: str = ""
    github_url: str = ""
    github_handle: str = ""
    portfolio_url: str = ""
    portfolio_handle: str = ""
    education: List[EducationItem] = []
    skills: Dict[str, str] = {}



class ResumeHistoryItem(BaseModel):
    id: str
    company_name: str
    role_title: str
    created_at: str
    template_name: str
    selected_project_ids: List[str] = []
    latex_file: str
    pdf_file: str


class RepoScanRequest(BaseModel):
    repo_path: str
    scan_mode: str = "single"  # "single" (current dir) or "batch" (subdirectories)


class JDAnalysisRequest(BaseModel):
    jd_text: Optional[str] = None
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    enable_web_research: bool = True


class ResumeGenerateRequest(BaseModel):
    template_name: str = "template_1.tex"
    target_company: Optional[str] = "Target Company"
    target_role: Optional[str] = "Software Engineer"
    selected_project_ids: Optional[List[str]] = None
    selected_workexp_ids: Optional[List[str]] = None
    selected_achievement_ids: Optional[List[str]] = None
    selected_certificate_ids: Optional[List[str]] = None
    selected_extracurricular_ids: Optional[List[str]] = None
    include_extracurriculars: bool = False
    include_certificates: bool = True


class LLMSelectRequest(BaseModel):
    provider: str
    model: Optional[str] = None


class LLMPingRequest(BaseModel):
    provider: str
    model: Optional[str] = None


class TeXCompileRequest(BaseModel):
    tex_content: str
    filename: Optional[str] = None
    target_company: Optional[str] = "Target Company"
    target_role: Optional[str] = "Software Engineer"


