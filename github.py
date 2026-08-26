import subprocess

def run_gh(args, cwd="."):
    p = subprocess.run(
        ["gh", *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        timeout=120,
    )
    return {
        "returncode": p.returncode,
        "stdout": p.stdout,
        "stderr": p.stderr,
    }

def status(cwd="."):
    return run_gh(["repo", "view"], cwd)

def create_pr(title, body, base="main", cwd="."):
    return run_gh(
        ["pr", "create", "--title", title, "--body", body, "--base", base],
        cwd,
    )
