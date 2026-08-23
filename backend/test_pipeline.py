import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import OUTPUT_DIR, PROJECTS_FILE, RESUMES_HISTORY_FILE, DB_FILE
from backend.database import init_db_and_storage, get_all_records, get_record
from backend.agents.repo_indexer import repo_indexer
from backend.agents.project_rater import project_rater
from backend.agents.jd_intelligence import jd_intelligence_agent
from backend.agents.resume_builder import resume_builder_agent
from backend.models.schemas import ResumeGenerateRequest


async def run_pipeline_test():
    print("=== 0. Testing Startup Check & SQLite Initialization ===")
    init_db_and_storage()
    assert DB_FILE.exists(), f"Database file {DB_FILE} was not created!"
    print(f"SQLite DB cleanly initialized at: {DB_FILE}")

    print("=== 1. Testing Repository Indexer & AST Parser ===")
    repo_path = "/home/ishaan/Code/ResumeIt"
    scan_res = repo_indexer.scan_repository(repo_path, force_reindex=True)
    print(f"Index Success! Total files hashed: {scan_res['file_count']}")
    print(f"Master SHA256 Hash: {scan_res['master_hash'][:16]}...")

    # Test skip on second scan
    rescan = repo_indexer.scan_repository(repo_path, force_reindex=False)
    print(f"Skip Hash Match Test: {rescan.get('skipped_due_to_hash_match')}")
    assert rescan.get("skipped_due_to_hash_match") is True, "Hash tracking failed to skip unchanged repo!"

    print("\n=== 2. Testing Project Rater & Metric Formulation ===")
    rated_proj = await project_rater.rate_and_formulate_project(scan_res)
    print(f"Rated Project Title: {rated_proj.title}")
    print(f"7 Category Scores (Clamped 1-5): {rated_proj.category_scores.model_dump()}")
    for cat, score in rated_proj.category_scores.model_dump().items():
        assert 1 <= score <= 5, f"Category {cat} score {score} out of 1-5 bound!"

    print("\n=== 3. Testing JD Intelligence Agent ===")
    sample_jd = """
    We are looking for a Senior Distributed Systems Engineer at Google Cloud.
    Requirements:
    - 5+ years experience in Python, Go, C++, FastAPI, and Kubernetes.
    - Deep knowledge of high concurrency, row-level database locking, low latency WebSockets, and WebAssembly.
    - Proven track record with metric-driven microservices optimization.
    """
    profile = await jd_intelligence_agent.analyze_jd(
        jd_text=sample_jd,
        company_name="Google Cloud",
        role_title="Senior Distributed Systems Engineer",
        enable_web_research=False
    )
    print(f"Ideal Profile Synthesized: {profile.company_name} | {profile.role_title}")
    print(f"Skills Hierarchy: {profile.key_skills_hierarchy[:5]}")

    print("\n=== 4. Testing Resume Builder & pdflatex Compilation ===")
    req = ResumeGenerateRequest(
        template_name="template_1.tex",
        target_company="Google Cloud",
        target_role="Senior Distributed Systems Engineer",
        selected_project_ids=[rated_proj.id],
        include_certificates=True
    )
    history_item = resume_builder_agent.compile_pdf(req)
    print(f"Generated PDF File: {history_item.pdf_file}")
    pdf_path = OUTPUT_DIR / history_item.pdf_file
    assert pdf_path.exists(), f"PDF compilation failed! {pdf_path} does not exist."
    print(f"PDF successfully compiled on Arch Linux! File size: {pdf_path.stat().st_size} bytes.")

    print("\n=== 5. Testing SQLite Single-Table Record Retrieval ===")
    records = get_all_records()
    assert len(records) > 0, "No records found in SQLite resume_jd_records table!"
    latest_rec = get_record(history_item.id)
    assert latest_rec is not None, f"Record with UUID {history_item.id} not found in SQLite table!"
    assert latest_rec["tex_content"] and len(latest_rec["tex_content"]) > 10, "TeX content missing in SQLite record!"
    print(f"Verified SQLite Record UUID: {latest_rec['uuid']}")
    print(f"TeX Content Length in DB: {len(latest_rec['tex_content'])} characters.")
    print(f"Creation Date in DB: {latest_rec['created_at']}")

    print("\n==========================================")
    print("ALL BACKEND PIPELINE TESTS PASSED 100% SUCCESS!")
    print("==========================================")


if __name__ == "__main__":
    asyncio.run(run_pipeline_test())

