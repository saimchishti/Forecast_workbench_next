from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


def ensure_directory(path: Path) -> Path:
    """Create directory (and parents) if missing."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path: Path, data: Any) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def append_audit_log(path: Path, action: str, role: str, env: str) -> None:
    ensure_directory(path.parent)
    timestamp = datetime.utcnow().isoformat() + "Z"
    line = f"{timestamp} | env={env} | role={role} | {action}\n"
    with path.open("a", encoding="utf-8") as log_file:
        log_file.write(line)