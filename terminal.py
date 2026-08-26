import os
import subprocess
from dataclasses import dataclass

BLOCKED = [
    "rm -rf /",
    "git reset --hard",
    "git clean -fdx",
    "DROP DATABASE",
    "DROP TABLE",
    "terraform destroy",
]

@dataclass
class Result:
    command: str
    returncode: int
    stdout: str
    stderr: str

def run(command: str, cwd: str = ".") -> Result:
    upper = command.upper()
    for item in BLOCKED:
        if item.upper() in upper:
            return Result(command, 126, "", f"BLOCKED dangerous command: {item}")

    p = subprocess.run(
        command,
        cwd=cwd,
        shell=True,
        text=True,
        capture_output=True,
        timeout=300,
        env=os.environ.copy(),
    )
    return Result(command, p.returncode, p.stdout, p.stderr)
