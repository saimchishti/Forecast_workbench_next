"""Frequency aggregation helpers for validated datasets."""

from __future__ import annotations

from pathlib import Path
from typing import Dict

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
VALIDATED_DIR = BASE_DIR / "data" / "validated"


def aggregate_data(
    df: pd.DataFrame,
    id_col: str = "series_id",
    date_col: str = "date",
) -> Dict[str, object]:
    if df.empty:
        raise ValueError("Continuous dataset is empty, cannot aggregate.")

    if id_col not in df.columns or date_col not in df.columns:
        raise ValueError(f"Columns '{id_col}' and '{date_col}' are required for aggregation.")

    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    if df[date_col].isna().all():
        raise ValueError("Date column could not be parsed for aggregation.")

    df["week"] = df[date_col].dt.to_period("W").apply(lambda period: period.start_time)
    df["month"] = df[date_col].dt.to_period("M").apply(lambda period: period.start_time)

    aggregations = {
        "sales_qty": "sum",
    }
    if "price" in df.columns:
        aggregations["price"] = "mean"

    agg_week = df.groupby([id_col, "week"]).agg(aggregations).reset_index()
    agg_month = df.groupby([id_col, "month"]).agg(aggregations).reset_index()

    VALIDATED_DIR.mkdir(parents=True, exist_ok=True)

    daily_path = VALIDATED_DIR / "daily_data.csv"
    weekly_path = VALIDATED_DIR / "weekly_data.csv"
    monthly_path = VALIDATED_DIR / "monthly_data.csv"

    df.to_csv(daily_path, index=False)
    agg_week.rename(columns={"week": date_col}, inplace=True)
    agg_month.rename(columns={"month": date_col}, inplace=True)
    agg_week.to_csv(weekly_path, index=False)
    agg_month.to_csv(monthly_path, index=False)

    return {
        "status": "success",
        "daily_rows": len(df),
        "weekly_rows": len(agg_week),
        "monthly_rows": len(agg_month),
        "output_files": {
            "daily": str(daily_path.relative_to(BASE_DIR)),
            "weekly": str(weekly_path.relative_to(BASE_DIR)),
            "monthly": str(monthly_path.relative_to(BASE_DIR)),
        },
    }
