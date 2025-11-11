"""Data ingestion and validation helpers for restaurant sales CSV files."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

from utils.file_ops import ensure_directory, read_json
from utils.schema_standardizer import standardize_columns

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
VALIDATED_DIR = DATA_DIR / "validated"
VALIDATED_FILE = VALIDATED_DIR / "validated_raw_data.csv"
LATEST_UPLOAD_INFO = UPLOADS_DIR / "latest_upload.json"


@dataclass
class ValidationSummary:
    rows_before: int
    rows_after: int
    duplicates_removed: int
    missing_counts: Dict[str, int]
    detected_granularity: str
    output_file: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rows_before": self.rows_before,
            "rows_after": self.rows_after,
            "duplicates_removed": self.duplicates_removed,
            "missing_counts": self.missing_counts,
            "detected_granularity": self.detected_granularity,
            "output_file": self.output_file,
        }


def _latest_upload_path(upload_dir: Path) -> Path:
    files = sorted(upload_dir.glob("*.csv"), key=lambda p: p.stat().st_mtime)
    if not files:
        raise FileNotFoundError("No uploaded CSV files were found.")
    return files[-1]


def _resolve_target_file(filename: Optional[str]) -> Path:
    uploads_dir = ensure_directory(UPLOADS_DIR)

    if filename:
        candidate = Path(filename)
        if not candidate.is_absolute():
            candidate = uploads_dir / filename
        if not candidate.is_file():
            raise FileNotFoundError(f"File '{filename}' was not found in uploads directory.")
        return candidate

    info = read_json(LATEST_UPLOAD_INFO, default={})
    info_path = info.get("path")
    if info_path:
        candidate = Path(info_path)
        if not candidate.is_absolute():
            candidate = (BASE_DIR / info_path).resolve()
        if candidate.is_file():
            return candidate

    return _latest_upload_path(uploads_dir)


def _detect_granularity(dates: pd.Series) -> str:
    unique_dates = (
        pd.Series(pd.to_datetime(dates, errors="coerce"))
        .dropna()
        .sort_values()
        .drop_duplicates()
    )
    deltas = unique_dates.diff().dt.days.dropna()
    if deltas.empty:
        return "daily"

    gap = int(deltas.mode().iloc[0])
    if gap <= 1:
        return "daily"
    if gap <= 7:
        return "weekly"
    return "monthly"


def validate_data(filename: Optional[str] = None) -> Dict[str, Any]:
    validated_dir = ensure_directory(VALIDATED_DIR)
    target = _resolve_target_file(filename)

    df = pd.read_csv(target)
    if df.empty:
        raise ValueError("Uploaded CSV has no rows to validate.")

    rows_before = len(df)
    df.columns = [str(col).strip() for col in df.columns]
    df, _ = standardize_columns(df)

    if "date" not in df.columns:
        raise ValueError("Unable to detect a date column in the uploaded file.")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    if "series_id" not in df.columns:
        df["series_id"] = "single_series"
    series_col = df["series_id"].fillna("single_series")
    df["series_id"] = series_col.astype(str).str.strip().replace("", "single_series")

    if "sales_qty" not in df.columns:
        raise ValueError("Unable to detect a sales quantity column in the uploaded file.")
    df["sales_qty"] = pd.to_numeric(df["sales_qty"], errors="coerce")

    df = df.dropna(subset=["date", "sales_qty"])

    before_dedup = len(df)
    df = df.sort_values(["series_id", "date"])
    df = df.drop_duplicates(subset=["series_id", "date"])
    duplicates_removed = before_dedup - len(df)

    tracked_columns = [col for col in ("price", "inventory_level", "sales_qty", "series_id") if col in df.columns]
    missing_counts = {col: int(df[col].isna().sum()) for col in tracked_columns}

    detected_granularity = _detect_granularity(df["date"])

    output_path = validated_dir / VALIDATED_FILE.name
    df.to_csv(output_path, index=False)

    summary = ValidationSummary(
        rows_before=int(rows_before),
        rows_after=int(len(df)),
        duplicates_removed=int(duplicates_removed),
        missing_counts=missing_counts,
        detected_granularity=detected_granularity,
        output_file=str(output_path.relative_to(BASE_DIR)),
    )
    return summary.to_dict()
