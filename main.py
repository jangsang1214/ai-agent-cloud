import argparse
import json
import os
from pathlib import Path

from ai_team.prompts import SYSTEM_PROMPT
from tools.project_scan import scan
from tools.git import current_state
from tools.terminal import run

def load_dotenv():
    path = Path(".env")
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k and k not in os.environ:
            os.environ[k] = v

def call_model(prompt):
    load_dotenv()
    from openai import OpenAI
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    model = os.environ.get("OPENAI_MODEL", "gpt-5.6")
    response = client.responses.create(
        model=model,
        instructions=SYSTEM_PROMPT,
        input=prompt,
    )
    return response.output_text

def discover(project):
    state = current_state(project)
    files = scan(project)
    return {
        "git": state,
        "files": files,
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default=".")
    parser.add_argument("--task", default=None)
    parser.add_argument("--discover", action="store_true")
    parser.add_argument("--run", dest="command", default=None)
    args = parser.parse_args()

    project = str(Path(args.project).resolve())

    print("\n=== AI APP DEVELOPMENT TEAM V3 ===\n")

    if args.discover:
        data = discover(project)
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    if args.run:
        result = run(args.run, project)
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        print(f"\nexit_code={result.returncode}")
        return

    if args.task:
        context = discover(project)
        prompt = f"""
PROJECT CONTEXT:
{json.dumps(context, ensure_ascii=False, indent=2)}

USER TASK:
{args.task}

First return:
1. Understanding
2. Acceptance criteria
3. Risks
4. Exact files likely affected
5. Test plan
Do not claim implementation or tests that have not happened.
"""
        print(call_model(prompt))
        return

    print("Commands:")
    print("  python main.py --discover")
    print('  python main.py --task "분석만 하고 계획을 세워줘"')
    print('  python main.py --run "pytest"')

if __name__ == "__main__":
    main()
