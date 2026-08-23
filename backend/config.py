import os
from pathlib import Path
from dotenv import load_dotenv

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(ROOT_DIR / ".env")
STORAGE_DIR = BASE_DIR / "storage"
TEMPLATES_DIR = STORAGE_DIR / "templates"
OUTPUT_DIR = STORAGE_DIR / "output"
UPLOADS_DIR = STORAGE_DIR / "uploads"

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# File Paths for JSON Stores
PROJECTS_FILE = STORAGE_DIR / "projects.json"
WORKEXP_FILE = STORAGE_DIR / "workexp.json"
EXTRACURRICULARS_FILE = STORAGE_DIR / "extracurriculars.json"
ACHIEVEMENTS_FILE = STORAGE_DIR / "achievements.json"
CERTIFICATES_FILE = STORAGE_DIR / "certificates.json"
METADATA_TRACKER_FILE = STORAGE_DIR / "metadata_tracker.json"
RESUMES_HISTORY_FILE = STORAGE_DIR / "resumes_history.json"
IDEAL_PROFILE_FILE = STORAGE_DIR / "ideal_profile.json"
PROFILE_FILE = STORAGE_DIR / "profile.json"
DB_FILE = STORAGE_DIR / "resumeit.db"

# System Binaries & LLM Settings
PDFLATEX_PATH = os.getenv("PDFLATEX_PATH", "/usr/bin/pdflatex")
XELATEX_PATH = os.getenv("XELATEX_PATH", "/usr/bin/xelatex")

# Provider Settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
NVIDIA_NIM_API_KEY = os.getenv("NVIDIA_NIM_API_KEY", "").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2").strip()
