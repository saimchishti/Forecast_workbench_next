from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from .file_ops import read_json, write_json

HISTORY_FILENAME = "config_history.json"


def build_history_path(config_root: Path) -> Path:
    return config_root / HISTORY_FILENAME


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "config"


def next_config_path(env_dir: Path, timestamp: datetime, name: str) -> Path:
    slug = slugify(name)
    filename = f"project_config_{slug}_{timestamp.strftime('%Y%m%dT%H%M%SZ')}.yaml"
    return env_dir / filename


def load_history(history_path: Path) -> List[Dict]:
    return read_json(history_path, default=[])


def append_history_entry(history_path: Path, entry: Dict) -> List[Dict]:
    history = load_history(history_path)
    history.append(entry)
    write_json(history_path, history)
    return history