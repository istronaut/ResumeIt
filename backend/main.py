import json
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.config import (
    UPLOADS_DIR,
    OUTPUT_DIR,
    TEMPLATES_DIR,
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
from backend.models.schemas import (
    ProjectItem,
    WorkExperienceItem,
    ExtracurricularItem,
    AchievementItem,
    CertificateItem,
    IdealProfile,
    UserProfile,
    RepoScanRequest,
    JDAnalysisRequest,
    ResumeGenerateRequest,
    LLMSelectRequest,
    LLMPingRequest,
    TeXCompileRequest,
)
from backend.agents.llm_router import llm_router
from backend.agents.repo_indexer import repo_indexer
from backend.agents.project_rater import project_rater
from backend.agents.jd_intelligence import jd_intelligence_agent
from backend.agents.resume_builder import resume_builder_agent
from backend.database import init_db_and_storage, save_record, get_all_records, get_record

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="Context-Aware Automatic Resume Generator API", version="1.0.0")

# Startup hook to verify storage JSON files and initialize SQLite single table
@app.on_event("startup")
def startup_event():
    logger.info("Running startup checks: verifying storage JSON files & SQLite tracking database...")
    init_db_and_storage()

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper JSON file reader/writer
def read_json_file(file_path: Path, default: Any = None) -> Any:
    if default is None:
        default = []
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading {file_path}: {e}")
    return default


def write_json_file(file_path: Path, data: Any):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@app.get("/api/health")
async def health_check():
    provider_status = await llm_router.check_status()
    pdflatex_installed = os.path.exists(PDFLATEX_PATH)
    return {
        "status": "online",
        "system": "Arch Linux",
        "pdflatex_available": pdflatex_installed,
        "pdflatex_path": PDFLATEX_PATH,
        "llm_providers": provider_status,
        "active_provider": llm_router.active_provider,
        "active_model": llm_router.active_model,
    }


@app.get("/api/llm/models")
async def get_llm_models():
    status = await llm_router.check_status()
    ollama_models = await llm_router.get_ollama_models()
    return {
        "status": status,
        "active_provider": llm_router.active_provider,
        "active_model": llm_router.active_model,
        "ollama_models": ollama_models,
        "providers": [
            {
                "id": "auto",
                "name": "Auto (Fallback Chain)",
                "description": "Gemini -> NVIDIA NIM -> Local Ollama",
                "available": True,
                "model": "Auto-selected",
            },
            {
                "id": "google_gemini",
                "name": "Google Gemini",
                "description": "High intelligence, ultra-fast structural parsing",
                "available": bool(llm_router.gemini_key),
                "model": "gemini-3.6-flash",
            },
            {
                "id": "nvidia_nim",
                "name": "NVIDIA NIM Cloud",
                "description": "NVIDIA Nemotron-3 Ultra 550B Reasoning LLM",
                "available": bool(llm_router.nvidia_key),
                "model": "nvidia/nemotron-3-ultra-550b-a55b",
            },
            {
                "id": "local_ollama",
                "name": "Local Ollama Instance",
                "description": "Private local LLM running on localhost:11434",
                "available": status.get("ollama", False),
                "models": ollama_models,
            },
        ],
    }


@app.post("/api/llm/select")
async def select_llm_provider(req: LLMSelectRequest):
    llm_router.active_provider = req.provider
    if req.model:
        llm_router.active_model = req.model
    logger.info(f"LLM Provider set to '{llm_router.active_provider}', model '{llm_router.active_model}'")
    return {
        "message": "LLM selection updated",
        "active_provider": llm_router.active_provider,
        "active_model": llm_router.active_model,
    }


@app.post("/api/llm/ping")
async def ping_llm_provider(req: LLMPingRequest):
    result = await llm_router.ping_provider(req.provider, req.model)
    return result



# --- FILESYSTEM BROWSER & REPOSITORY INDEXER ---

@app.get("/api/fs/browse")
def browse_directory(path: Optional[str] = Query(None)):
    """Lists subdirectories for filesystem directory browsing."""
    try:
        target_path = Path(path).expanduser().resolve() if (path and path.strip()) else Path.home()
    except Exception:
        target_path = Path.home()

    if not target_path.exists() or not target_path.is_dir():
        target_path = Path.home()

    parent_path = str(target_path.parent) if target_path.parent != target_path else None

    subdirs = []
    try:
        for entry in os.scandir(target_path):
            try:
                if entry.is_dir() and not entry.name.startswith("."):
                    is_git = (Path(entry.path) / ".git").exists()
                    subdirs.append({
                        "name": entry.name,
                        "path": str(entry.path),
                        "is_git": is_git
                    })
            except Exception:
                continue
        subdirs.sort(key=lambda x: x["name"].lower())
    except Exception as e:
        logger.error(f"Error browsing directory {target_path}: {e}")

    return {
        "current_path": str(target_path),
        "parent_path": parent_path,
        "directories": subdirs
    }


@app.post("/api/indexer/scan")
async def scan_and_rate_repository(req: RepoScanRequest):
    """Scans local repo path or parent directory of subdirectories."""
    repo_path = req.repo_path.strip()
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=400, detail=f"Local path does not exist: {repo_path}")

    scan_mode = req.scan_mode or "single"
    
    try:
        if scan_mode == "batch":
            parent = Path(repo_path)
            if not parent.is_dir():
                raise HTTPException(status_code=400, detail=f"Target path is not a directory: {repo_path}")

            subdirs = [d for d in parent.iterdir() if d.is_dir() and not d.name.startswith(".")]
            if not subdirs:
                raise HTTPException(status_code=400, detail=f"No subdirectories found in {repo_path}")

            batch_results = []
            for sub in subdirs:
                try:
                    scan_result = repo_indexer.scan_repository(str(sub))
                    project_item = await project_rater.rate_and_formulate_project(scan_result)
                    batch_results.append({
                        "skipped_hash": scan_result.get("skipped_due_to_hash_match", False),
                        "project": project_item,
                        "scan_metadata": scan_result,
                    })
                except Exception as e:
                    logger.error(f"Error scanning subdirectory {sub}: {e}")

            if not batch_results:
                raise HTTPException(status_code=400, detail="Failed to scan any subdirectories.")

            return {
                "message": f"Batch scanned {len(batch_results)} subdirectories in {repo_path}",
                "scan_mode": "batch",
                "batch_results": batch_results,
                "project": batch_results[0]["project"],  # Return first project as primary highlight
                "count": len(batch_results)
            }
        else:
            scan_result = repo_indexer.scan_repository(repo_path)
            project_item = await project_rater.rate_and_formulate_project(scan_result)
            return {
                "message": "Repository scanned and rated successfully",
                "scan_mode": "single",
                "skipped_hash": scan_result.get("skipped_due_to_hash_match", False),
                "project": project_item,
                "scan_metadata": scan_result,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error scanning repo")
        raise HTTPException(status_code=500, detail=str(e))


# --- CRUD JSON DATA STORES ---

# Projects
@app.get("/api/projects")
def get_projects():
    return read_json_file(PROJECTS_FILE, [])


@app.post("/api/projects")
def upsert_project(project: ProjectItem):
    data = read_json_file(PROJECTS_FILE, [])
    updated = [p for p in data if p.get("id") != project.id]
    updated.append(project.model_dump())
    write_json_file(PROJECTS_FILE, updated)
    return project


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    data = read_json_file(PROJECTS_FILE, [])
    filtered = [p for p in data if p.get("id") != project_id]
    write_json_file(PROJECTS_FILE, filtered)
    return {"message": "Project deleted", "id": project_id}


# Work Experience
@app.get("/api/workexp")
def get_workexp():
    return read_json_file(WORKEXP_FILE, [])


@app.post("/api/workexp")
def upsert_workexp(item: WorkExperienceItem):
    data = read_json_file(WORKEXP_FILE, [])
    if not item.id:
        item.id = f"exp-{uuid.uuid4().hex[:6]}"
    updated = [w for w in data if w.get("id") != item.id]
    updated.append(item.model_dump())
    write_json_file(WORKEXP_FILE, updated)
    return item


@app.delete("/api/workexp/{item_id}")
def delete_workexp(item_id: str):
    data = read_json_file(WORKEXP_FILE, [])
    filtered = [w for w in data if w.get("id") != item_id]
    write_json_file(WORKEXP_FILE, filtered)
    return {"message": "Work experience deleted", "id": item_id}


# Achievements
@app.get("/api/achievements")
def get_achievements():
    return read_json_file(ACHIEVEMENTS_FILE, [])


@app.post("/api/achievements")
def upsert_achievement(item: AchievementItem):
    data = read_json_file(ACHIEVEMENTS_FILE, [])
    if not item.id:
        item.id = f"ach-{uuid.uuid4().hex[:6]}"
    updated = [a for a in data if a.get("id") != item.id]
    updated.append(item.model_dump())
    write_json_file(ACHIEVEMENTS_FILE, updated)
    return item


@app.delete("/api/achievements/{item_id}")
def delete_achievement(item_id: str):
    data = read_json_file(ACHIEVEMENTS_FILE, [])
    filtered = [a for a in data if a.get("id") != item_id]
    write_json_file(ACHIEVEMENTS_FILE, filtered)
    return {"message": "Achievement deleted", "id": item_id}


# Certificates (with Instructor/Teacher attribution)
@app.get("/api/certificates")
def get_certificates():
    return read_json_file(CERTIFICATES_FILE, [])


@app.post("/api/certificates")
def upsert_certificate(item: CertificateItem):
    data = read_json_file(CERTIFICATES_FILE, [])
    if not item.id:
        item.id = f"cert-{uuid.uuid4().hex[:6]}"
    updated = [c for c in data if c.get("id") != item.id]
    updated.append(item.model_dump())
    write_json_file(CERTIFICATES_FILE, updated)
    return item


@app.delete("/api/certificates/{item_id}")
def delete_certificate(item_id: str):
    data = read_json_file(CERTIFICATES_FILE, [])
    filtered = [c for c in data if c.get("id") != item_id]
    write_json_file(CERTIFICATES_FILE, filtered)
    return {"message": "Certificate deleted", "id": item_id}


# Extracurriculars
@app.get("/api/extracurriculars")
def get_extracurriculars():
    return read_json_file(EXTRACURRICULARS_FILE, [])


@app.post("/api/extracurriculars")
def upsert_extracurricular(item: ExtracurricularItem):
    data = read_json_file(EXTRACURRICULARS_FILE, [])
    if not item.id:
        item.id = f"extra-{uuid.uuid4().hex[:6]}"
    updated = [e for e in data if e.get("id") != item.id]
    updated.append(item.model_dump())
    write_json_file(EXTRACURRICULARS_FILE, updated)
    return item


@app.delete("/api/extracurriculars/{item_id}")
def delete_extracurricular(item_id: str):
    data = read_json_file(EXTRACURRICULARS_FILE, [])
    filtered = [e for e in data if e.get("id") != item_id]
    write_json_file(EXTRACURRICULARS_FILE, filtered)
    return {"message": "Extracurricular deleted", "id": item_id}


# Candidate Profile
@app.get("/api/profile")
def get_profile():
    return read_json_file(PROFILE_FILE, {})


@app.post("/api/profile")
def update_profile(profile: UserProfile):
    write_json_file(PROFILE_FILE, profile.model_dump())
    return profile



# --- JOB INTELLIGENCE & PDF PARSING ---

@app.post("/api/jd/upload")
async def upload_jd_pdf(
    file: UploadFile = File(...),
    company_name: Optional[str] = Form(None),
    role_title: Optional[str] = Form(None),
    enable_web_research: bool = Form(True)
):
    """Uploads JD PDF, extracts text using PyMuPDF (fitz), and analyzes ideal candidate profile."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_path = UPLOADS_DIR / f"{uuid.uuid4().hex[:8]}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        jd_bytes = file_path.read_bytes()
        record_id = uuid.uuid4().hex[:8]
        save_record(
            uuid_str=record_id,
            company_name=company_name or "",
            role_title=role_title or "",
            jd_pdf_bytes=jd_bytes,
            tex_content="",
            pdf_filename=file_path.name
        )

        jd_text = jd_intelligence_agent.extract_text_from_pdf(str(file_path))
        profile = await jd_intelligence_agent.analyze_jd(
            jd_text=jd_text,
            company_name=company_name,
            role_title=role_title,
            enable_web_research=enable_web_research
        )
        return {
            "message": "JD parsed successfully",
            "record_id": record_id,
            "extracted_text_snippet": jd_text[:500],
            "ideal_profile": profile
        }
    except Exception as e:
        logger.exception("Error processing JD PDF")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/jd/analyze")
async def analyze_jd_text(req: JDAnalysisRequest):
    """Analyzes raw JD text input and runs intelligence agent."""
    if not req.jd_text or len(req.jd_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Please provide a valid Job Description text.")

    try:
        profile = await jd_intelligence_agent.analyze_jd(
            jd_text=req.jd_text,
            company_name=req.company_name,
            role_title=req.role_title,
            enable_web_research=req.enable_web_research
        )
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jd/profile")
def get_ideal_profile():
    return read_json_file(IDEAL_PROFILE_FILE, {})


# --- TEMPLATES & RESUME BUILDER ---

@app.get("/api/templates")
def list_templates():
    templates = []
    if TEMPLATES_DIR.exists():
        for file in TEMPLATES_DIR.glob("*.tex"):
            templates.append(file.name)
    return {"templates": templates if templates else ["template_1.tex"]}


@app.post("/api/resume/generate")
def generate_resume(req: ResumeGenerateRequest):
    """Selects target projects/bullets, populates LaTeX template, compiles PDF, logs to history."""
    try:
        history_item = resume_builder_agent.compile_pdf(req)
        return {
            "message": "Resume compiled successfully",
            "history": history_item,
            "pdf_url": f"/api/resume/pdf/{history_item.pdf_file}",
            "tex_url": f"/api/resume/tex/{history_item.latex_file}",
        }
    except Exception as e:
        logger.exception("Resume generation failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resume/history")
def get_resume_history():
    return read_json_file(RESUMES_HISTORY_FILE, [])


@app.get("/api/resume/pdf/{filename}")
def stream_pdf(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found.")
    return FileResponse(path=file_path, media_type="application/pdf", content_disposition_type="inline")


@app.get("/api/resume/tex/{filename}")
def stream_tex(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="LaTeX source file not found.")
    return FileResponse(path=file_path, media_type="text/plain", content_disposition_type="inline")


@app.get("/api/templates/pdf/{filename}")
def stream_template_pdf(filename: str):
    try:
        pdf_path = resume_builder_agent.compile_template_pdf(filename)
        return FileResponse(path=pdf_path, media_type="application/pdf", content_disposition_type="inline")
    except Exception as e:
        logger.exception("Template PDF compilation failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/templates/tex/{filename}")
def stream_template_tex(filename: str):
    file_path = TEMPLATES_DIR / filename
    if not file_path.exists():
        file_path = Path("/home/ishaan/Code/ResumeIt/template_1.tex")
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Template file not found.")
    return FileResponse(path=file_path, media_type="text/plain", content_disposition_type="inline")


@app.post("/api/resume/compile-tex")
def compile_custom_tex(req: TeXCompileRequest):
    """Compiles user-edited raw LaTeX string into PDF."""
    try:
        history_item = resume_builder_agent.compile_raw_tex(req)
        return {
            "message": "LaTeX compiled successfully",
            "history": history_item,
            "pdf_url": f"/api/resume/pdf/{history_item.pdf_file}",
            "tex_url": f"/api/resume/tex/{history_item.latex_file}",
        }
    except Exception as e:
        logger.exception("Custom LaTeX compilation failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resume/download/{filename}")
def download_file(filename: str):
    """Downloads requested PDF or TeX file as attachment."""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        file_path = TEMPLATES_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Requested file '{filename}' not found.")

    media_type = "application/pdf" if filename.endswith(".pdf") else "text/plain"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# --- SQLITE SINGLE-TABLE RECORDS ENDPOINTS ---

@app.get("/api/records")
def list_sqlite_records():
    """Lists all tracking records stored in SQLite database single table `resume_jd_records`."""
    return get_all_records()


@app.get("/api/records/{uuid_str}")
def get_sqlite_record(uuid_str: str):
    """Retrieves a single record by UUID from SQLite database `resume_jd_records` table."""
    rec = get_record(uuid_str)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Record {uuid_str} not found.")
    return {
        "uuid": rec["uuid"],
        "company_name": rec["company_name"],
        "role_title": rec["role_title"],
        "has_jd_pdf": bool(rec["jd_pdf"] and len(rec["jd_pdf"]) > 0),
        "jd_pdf_bytes_len": len(rec["jd_pdf"]) if rec["jd_pdf"] else 0,
        "tex_content": rec["tex_content"],
        "pdf_filename": rec["pdf_filename"],
        "created_at": rec["created_at"],
    }

