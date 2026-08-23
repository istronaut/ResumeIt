import ast
import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional

from backend.config import METADATA_TRACKER_FILE


class RepoIndexer:
    IGNORE_DIRS = {
        ".git", "node_modules", "venv", ".venv", "__pycache__", "build", "dist",
        ".target", ".idea", ".vscode", "coverage", ".next", ".cache", "storage",
        "output", "uploads", "brain", ".system_generated"
    }

    IGNORE_EXTS = {
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz",
        ".exe", ".bin", ".pyc", ".lock", ".svg", ".ttf", ".woff", ".eot"
    }

    def load_tracker(self) -> Dict[str, Any]:
        if METADATA_TRACKER_FILE.exists():
            try:
                with open(METADATA_TRACKER_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def save_tracker(self, data: Dict[str, Any]):
        with open(METADATA_TRACKER_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def compute_repo_hash(self, repo_path: str) -> Dict[str, str]:
        """Computes SHA256 content hashes for all relevant source files in the repository."""
        path = Path(repo_path)
        file_hashes = {}

        if not path.exists():
            raise FileNotFoundError(f"Path does not exist: {repo_path}")

        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in self.IGNORE_DIRS]
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in self.IGNORE_EXTS:
                    continue

                full_path = Path(root) / file
                rel_path = str(full_path.relative_to(path))

                try:
                    hasher = hashlib.sha256()
                    with open(full_path, "rb") as f:
                        while chunk := f.read(8192):
                            hasher.update(chunk)
                    file_hashes[rel_path] = hasher.hexdigest()
                except Exception:
                    continue

        return file_hashes

    def parse_python_ast(self, file_path: Path) -> Dict[str, Any]:
        """Parses Python file using AST module to extract functions, classes, decorators."""
        info = {"functions": [], "classes": [], "imports": [], "async_functions": []}
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                tree = ast.parse(f.read(), filename=str(file_path))

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    info["functions"].append(node.name)
                elif isinstance(node, ast.AsyncFunctionDef):
                    info["async_functions"].append(node.name)
                elif isinstance(node, ast.ClassDef):
                    info["classes"].append(node.name)
                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        info["imports"].append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        info["imports"].append(node.module)
        except Exception:
            pass
        return info

    def parse_dependencies(self, repo_path: Path) -> Dict[str, List[str]]:
        deps = {
            "npm": [],
            "python": [],
            "cargo": [],
            "go": [],
            "docker": False,
        }

        # Check package.json
        pkg_json = repo_path / "package.json"
        if pkg_json.exists():
            try:
                with open(pkg_json, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    deps["npm"].extend(list(data.get("dependencies", {}).keys()))
                    deps["npm"].extend(list(data.get("devDependencies", {}).keys()))
            except Exception:
                pass

        # Check requirements.txt
        req_txt = repo_path / "requirements.txt"
        if req_txt.exists():
            try:
                with open(req_txt, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            pkg = line.split("==")[0].split(">=")[0].strip()
                            deps["python"].append(pkg)
            except Exception:
                pass

        # Check Cargo.toml
        cargo_toml = repo_path / "Cargo.toml"
        if cargo_toml.exists():
            try:
                with open(cargo_toml, "r", encoding="utf-8") as f:
                    for line in f:
                        if "[dependencies]" in line:
                            break
                        deps["cargo"].append("cargo_project")
            except Exception:
                pass

        # Check go.mod
        go_mod = repo_path / "go.mod"
        if go_mod.exists():
            deps["go"].append("go_module")

        # Check Dockerfile / docker-compose
        if (repo_path / "Dockerfile").exists() or (repo_path / "docker-compose.yml").exists():
            deps["docker"] = True

        return deps

    def scan_repository(self, repo_path: str, force_reindex: bool = False) -> Dict[str, Any]:
        """Main scanner method: checks content hashes, parses AST & deps, saves metadata."""
        path = Path(repo_path).resolve()
        repo_name = path.name

        tracker = self.load_tracker()
        file_hashes = self.compute_repo_hash(str(path))
        
        # Combined hash for quick comparison
        combined_hash_input = "".join(sorted(f"{k}:{v}" for k, v in file_hashes.items()))
        master_hash = hashlib.sha256(combined_hash_input.encode("utf-8")).hexdigest()

        # Check if already cached in tracker
        if not force_reindex and str(path) in tracker:
            cached = tracker[str(path)]
            if cached.get("master_hash") == master_hash:
                cached["skipped_due_to_hash_match"] = True
                return cached

        # Perform fresh indexing
        ast_summary = {"total_files": len(file_hashes), "python_ast": {}, "languages": set()}
        tech_stack = set()

        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in self.IGNORE_DIRS]
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in self.IGNORE_EXTS:
                    continue

                full_path = Path(root) / file
                rel_path = str(full_path.relative_to(path))

                if ext == ".py":
                    ast_summary["languages"].add("Python")
                    ast_summary["python_ast"][rel_path] = self.parse_python_ast(full_path)
                elif ext in [".js", ".jsx", ".ts", ".tsx"]:
                    ast_summary["languages"].add("JavaScript/TypeScript")
                elif ext == ".rs":
                    ast_summary["languages"].add("Rust")
                elif ext == ".go":
                    ast_summary["languages"].add("Go")
                elif ext in [".cpp", ".c", ".h", ".hpp"]:
                    ast_summary["languages"].add("C/C++")
                elif ext == ".java":
                    ast_summary["languages"].add("Java")
                elif ext == ".sql":
                    ast_summary["languages"].add("SQL")

        deps = self.parse_dependencies(path)
        
        # Consolidate tech stack keywords
        tech_stack.update(ast_summary["languages"])
        tech_stack.update(deps["npm"][:10])
        tech_stack.update(deps["python"][:10])
        if deps["docker"]:
            tech_stack.add("Docker")

        parsed_data = {
            "repo_name": repo_name,
            "repo_path": str(path),
            "master_hash": master_hash,
            "file_count": len(file_hashes),
            "file_hashes": file_hashes,
            "languages": list(ast_summary["languages"]),
            "tech_stack": list(tech_stack),
            "ast_summary": {
                "total_python_files": len(ast_summary["python_ast"]),
                "sample_classes": [cls for file_ast in ast_summary["python_ast"].values() for cls in file_ast["classes"]][:15],
                "sample_functions": [fn for file_ast in ast_summary["python_ast"].values() for fn in file_ast["functions"]][:20],
            },
            "dependencies": deps,
            "skipped_due_to_hash_match": False,
        }

        # Update tracker
        tracker[str(path)] = parsed_data
        self.save_tracker(tracker)

        return parsed_data


repo_indexer = RepoIndexer()
