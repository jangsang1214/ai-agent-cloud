import subprocess

def git(args, cwd="."):
    p = subprocess.run(
        ["git", *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        timeout=120,
    )
    return p.returncode, p.stdout, p.stderr

def current_state(cwd="."):
    result = {}
    for key, args in {
        "branch":["branch","--show-current"],
        "status":["status","--short"],
        "remote":["remote","-v"],
        "log":["log","-5","--oneline"],
    }.items():
        result[key] = git(args, cwd)
    return result
