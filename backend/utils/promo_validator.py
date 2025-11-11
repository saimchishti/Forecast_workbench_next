from __future__ import annotations

import csv
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Dict, List, Tuple

REQUIRED_PROMO_COLUMNS = ["name", "start_date", "end_date", "type"]


def _parse_rows_from_reader(reader: csv.DictReader) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for row in reader:
        rows.append({key: (value or "").strip() for key, value in row.items()})
    return rows


def read_promo_calendar(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        return _parse_rows_from_reader(reader)


def rows_from_bytes(file_bytes: bytes) -> Tuple[List[Dict[str, str]], List[str]]:
    content = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(StringIO(content))
    fieldnames = reader.fieldnames or []
    missing_columns = [
        column for column in REQUIRED_PROMO_COLUMNS if column not in fieldnames
    ]
    return _parse_rows_from_reader(reader), missing_columns


def write_uploaded_calendar(temp_path: Path, file_bytes: bytes) -> None:
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path.write_bytes(file_bytes)


def validate_promo_rows(rows: List[Dict[str, str]]) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
    preview = rows[:5]
    invalid: List[Dict[str, str]] = []

    for row in rows:
        missing_columns = [col for col in REQUIRED_PROMO_COLUMNS if not row.get(col)]
        try:
            start = datetime.fromisoformat(row.get("start_date", ""))
            end = datetime.fromisoformat(row.get("end_date", ""))
            if start > end:
                missing_columns.append("date_order")
        except ValueError:
            missing_columns.append("date_format")

        if missing_columns:
            invalid.append({"row": row, "issues": missing_columns})

    return preview, invalid


def granularity_alignment_warning(rows: List[Dict[str, str]], granularity: str) -> str | None:
    if not rows:
        return "Promo calendar file could not be read for guardrail validation."

    if granularity == "daily":
        return None

    multiplier = {"weekly": 7, "monthly": 28}.get(granularity)
    if not multiplier:
        return None

    for row in rows:
        try:
            start = datetime.fromisoformat(row.get("start_date", ""))
            end = datetime.fromisoformat(row.get("end_date", ""))
        except ValueError:
            return "Promo calendar contains dates with invalid ISO format."

        delta_days = (end - start).days + 1
        if delta_days % multiplier != 0:
            return (
                "Promo durations do not align with the selected granularity."
            )
    return None