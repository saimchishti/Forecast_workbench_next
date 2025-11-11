"""Utilities for deriving smart defaults from uploaded CSV files."""

from __future__ import annotations

from io import BytesIO
from typing import Literal, TypedDict

import pandas as pd


class SuggestedConfig(TypedDict):
    forecast_horizon_days: int
    lead_time_days: int
    granularity: Literal["daily", "weekly", "monthly"]
    hierarchy: str
    country: str


class AnalysisSummary(TypedDict):
    columns: list[str]
    date_column: str
    target_column: str | None
    start_date: str
    end_date: str
    frequency: Literal["daily", "weekly", "monthly"]
    hierarchy: str
    rows: int
    notes: str
    suggested_config: SuggestedConfig


def analyze_csv(file_bytes: bytes) -> AnalysisSummary:
    """Parse restaurant sales CSV bytes and infer cadence, hierarchy, and defaults."""
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    try:
        df = pd.read_csv(BytesIO(file_bytes))
    except Exception as exc:  # pragma: no cover - pandas parsing errors vary
        raise ValueError("Unable to read CSV file.") from exc

    if df.empty:
        raise ValueError("Uploaded file has no rows.")

    df.columns = [str(column).strip().lower() for column in df.columns]

    # Detect date column by matching name patterns
    date_col = next((col for col in df.columns if "date" in col), None)
    if date_col is None:
        raise ValueError("No date column found in CSV.")

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col]).sort_values(by=date_col)
    if df.empty:
        raise ValueError("Date column could not be parsed. Please check the format.")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    target_col = None
    for column in numeric_cols:
        if any(keyword in column for keyword in ("sale", "revenue", "amount", "gmv")):
            target_col = column
            break
    if target_col is None:
        target_col = numeric_cols[0] if numeric_cols else None

    has_location_signal = any(
        any(keyword in column for keyword in ("store", "city", "location"))
        for column in df.columns
    )
    hierarchy = "multi-location" if has_location_signal else "single-restaurant"

    deltas = df[date_col].diff().dt.days.dropna()
    avg_gap = int(deltas.mode().iloc[0]) if not deltas.empty else 1
    avg_gap = max(avg_gap, 1)

    if avg_gap <= 1:
        frequency: Literal["daily", "weekly", "monthly"] = "daily"
    elif avg_gap <= 7:
        frequency = "weekly"
    else:
        frequency = "monthly"

    suggested: SuggestedConfig = {
        "forecast_horizon_days": 14 if frequency == "daily" else 30,
        "lead_time_days": 2 if frequency == "daily" else 7,
        "granularity": frequency,
        "hierarchy": hierarchy,
        "country": "India",
    }

    rows = len(df)
    summary: AnalysisSummary = {
        "columns": df.columns.tolist(),
        "date_column": date_col,
        "target_column": target_col,
        "start_date": df[date_col].min().strftime("%Y-%m-%d"),
        "end_date": df[date_col].max().strftime("%Y-%m-%d"),
        "frequency": frequency,
        "hierarchy": hierarchy,
        "rows": rows,
        "notes": f"Detected {rows} rows with {frequency} cadence for a {hierarchy} setup.",
        "suggested_config": suggested,
    }
    return summary
