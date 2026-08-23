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


class IdealProfile(BaseModel):
    company_name: str
    role_title: str
    key_skills_hierarchy: List[str] = []
    domain_focus: List[str] = []
    expected_bullet_tone: str = "Metric-driven, technical action verbs"
    role_keywords: List[str] = []
    culture_values: List[str] = []


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
