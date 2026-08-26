from pathlib import Path

IGNORED = {
    ".git", ".venv", "node_modules", "__pycache__", ".next",
    "dist", "build", ".pytest_cache"
}

def scan(root="."):
    root = Path(root).resolve()
    files = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part in IGNORED for part in p.parts):
            continue
        if p.name in {".env"} or p.suffix in {".pem", ".key"}:
            files.append(str(p.relative_to(root)) + " [SENSITIVE: CONTENT NOT READ]")
        else:
            files.append(str(p.relative_to(root)))
    return files[:500]
