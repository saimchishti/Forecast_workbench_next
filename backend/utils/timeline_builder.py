"""Utilities for building continuous timelines for each time series."""

from __future__ import annotations

from pathlib import Path
from typing import Dict

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
CONTINUOUS_OUTPUT = BASE_DIR / "data" / "validated" / "continuous_data.csv"


def build_continuous_timeline(
    df: pd.DataFrame,
    id_col: str = "series_id",
    date_col: str = "date",
) -> Dict[str, int | str]:
    if df.empty:
        raise ValueError("Validated dataset is empty, cannot build timeline.")

    if id_col not in df.columns or date_col not in df.columns:
        raise ValueError(f"Required columns '{id_col}' or '{date_col}' are missing.")

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    if df[date_col].isna().all():
        raise ValueError("Date column could not be parsed for timeline construction.")

    frames: list[pd.DataFrame] = []
    missing_rows = 0

    for series_id, group in df.groupby(id_col):
        group = group.sort_values(date_col)
        full_dates = pd.date_range(group[date_col].min(), group[date_col].max(), freq="D")
        merged = pd.DataFrame({id_col: series_id, date_col: full_dates}).merge(
            group,
            on=[id_col, date_col],
            how="left",
        )
        missing_rows += int(merged.isna().any(axis=1).sum())
        frames.append(merged)

    combined = pd.concat(frames, ignore_index=True)
    CONTINUOUS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(CONTINUOUS_OUTPUT, index=False)

    return {
        "status": "success",
        "missing_dates_filled": missing_rows,
        "output_file": str(CONTINUOUS_OUTPUT.relative_to(BASE_DIR)),
    }
