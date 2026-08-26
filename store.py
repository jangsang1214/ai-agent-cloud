import json
from pathlib import Path
from datetime import datetime, timezone

SAFE_ROOT = Path(__file__).resolve().parent

def record(kind, data):
    # Runtime memory is local and intentionally simple.
    # Do not put secrets or credentials here.
    path = SAFE_ROOT / "runtime"
    path.mkdir(parents=True, exist_ok=True)
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "kind": kind,
        "data": data,
    }
    target = path / f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{kind}.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(target)
