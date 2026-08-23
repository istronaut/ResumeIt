import json
import logging
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional

from backend.config import (
    DB_FILE,
    PROJECTS_FILE,
    WORKEXP_FILE,
    EXTRACURRICULARS_FILE,
    ACHIEVEMENTS_FILE,
    CERTIFICATES_FILE,
    METADATA_TRACKER_FILE,
    RESUMES_HISTORY_FILE,
    IDEAL_PROFILE_FILE,
    PROFILE_FILE,
)

logger = logging.getLogger("database")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db_and_storage():
    """
    Checks for storage .json files; if missing, creates empty initial default files.
    Creates single-table SQLite database (resume_jd_records) for storing JD PDFs (BLOB),
    compiled TeX files (TEXT), metadata, and timestamp.
    """
    # 1. Check and initialize empty JSON files if missing
    list_files = [
        PROJECTS_FILE,
        WORKEXP_FILE,
        EXTRACURRICULARS_FILE,
        ACHIEVEMENTS_FILE,
        CERTIFICATES_FILE,
        RESUMES_HISTORY_FILE,
    ]
    dict_files = [
        METADATA_TRACKER_FILE,
        IDEAL_PROFILE_FILE,
        PROFILE_FILE,
    ]

    for file_path in list_files:
        if not file_path.exists():
            logger.info(f"Initializing missing storage file: {file_path.name}")
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)

    for file_path in dict_files:
        if not file_path.exists():
            logger.info(f"Initializing missing storage file: {file_path.name}")
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump({}, f, indent=2)

    # 2. Initialize SQLite Database single table
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS resume_jd_records (
                    uuid TEXT PRIMARY KEY,
                    company_name TEXT,
                    role_title TEXT,
                    jd_pdf BLOB,
                    tex_content TEXT,
                    pdf_filename TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        logger.info(f"Database initialized cleanly at {DB_FILE}")
    except Exception as e:
        logger.error(f"Error initializing SQLite database: {e}")
        raise
    finally:
        conn.close()


def save_record(
    uuid_str: str,
    company_name: Optional[str] = "",
    role_title: Optional[str] = "",
    jd_pdf_bytes: Optional[bytes] = None,
    tex_content: Optional[str] = "",
    pdf_filename: Optional[str] = "",
) -> Dict[str, Any]:
    """
    Inserts or replaces a record in the single SQLite table `resume_jd_records`.
    Stores uuid, company/role metadata, JD PDF binary (BLOB), TeX content (TEXT), and creation date.
    """
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO resume_jd_records 
                (uuid, company_name, role_title, jd_pdf, tex_content, pdf_filename)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    uuid_str,
                    company_name or "",
                    role_title or "",
                    jd_pdf_bytes,
                    tex_content or "",
                    pdf_filename or "",
                ),
            )
        logger.info(f"Saved SQLite record {uuid_str} for company '{company_name}', role '{role_title}'")
        return {
            "uuid": uuid_str,
            "company_name": company_name,
            "role_title": role_title,
            "has_jd_pdf": jd_pdf_bytes is not None and len(jd_pdf_bytes) > 0,
            "tex_content_len": len(tex_content or ""),
            "pdf_filename": pdf_filename,
        }
    finally:
        conn.close()


def get_all_records() -> List[Dict[str, Any]]:
    """Retrieves all tracked history records from SQLite database."""
    conn = get_db_connection()
    try:
        cursor = conn.execute(
            """
            SELECT uuid, company_name, role_title, length(jd_pdf) as jd_pdf_size, tex_content, pdf_filename, created_at
            FROM resume_jd_records
            ORDER BY created_at DESC
            """
        )
        rows = cursor.fetchall()
        results = []
        for row in rows:
            results.append({
                "uuid": row["uuid"],
                "company_name": row["company_name"],
                "role_title": row["role_title"],
                "has_jd_pdf": bool(row["jd_pdf_size"] and row["jd_pdf_size"] > 0),
                "jd_pdf_size": row["jd_pdf_size"] or 0,
                "tex_content": row["tex_content"],
                "pdf_filename": row["pdf_filename"],
                "created_at": row["created_at"],
            })
        return results
    finally:
        conn.close()


def get_record(uuid_str: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single record by UUID including the raw binary PDF BLOB and TeX content."""
    conn = get_db_connection()
    try:
        cursor = conn.execute(
            """
            SELECT uuid, company_name, role_title, jd_pdf, tex_content, pdf_filename, created_at
            FROM resume_jd_records
            WHERE uuid = ?
            """,
            (uuid_str,),
        )
        row = cursor.fetchone()
        if row:
            return {
                "uuid": row["uuid"],
                "company_name": row["company_name"],
                "role_title": row["role_title"],
                "jd_pdf": row["jd_pdf"],
                "tex_content": row["tex_content"],
                "pdf_filename": row["pdf_filename"],
                "created_at": row["created_at"],
            }
        return None
    finally:
        conn.close()
