from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
VALIDATED_DIR = BASE_DIR / "data" / "validated"
RAW_FILE = VALIDATED_DIR / "validated_raw_data.csv"
DEFAULT_VALUE_COLUMN = "sales_qty"
DEFAULT_DATE_COLUMN = "date"
DEFAULT_ID_COLUMN = "series_id"

_GRANULARITY_FREQ = {
    "daily": "D",
    "weekly": "W-MON",
    "monthly": "MS",
}


def _resolve_dataset_path(granularity: str) -> Path:
    normalized = (granularity or "daily").lower()
    file_map = {
        "daily": VALIDATED_DIR / "daily_data.csv",
        "weekly": VALIDATED_DIR / "weekly_data.csv",
        "monthly": VALIDATED_DIR / "monthly_data.csv",
    }
    candidate = file_map.get(normalized, RAW_FILE)
    if candidate.is_file():
        return candidate
    if RAW_FILE.is_file():
        return RAW_FILE
    raise FileNotFoundError(f"No validated datasets found for granularity='{granularity}'.")


def load_data(granularity: str = "daily") -> pd.DataFrame:
    path = _resolve_dataset_path(granularity)
    df = pd.read_csv(path)
    if DEFAULT_DATE_COLUMN in df.columns:
        df[DEFAULT_DATE_COLUMN] = pd.to_datetime(df[DEFAULT_DATE_COLUMN], errors="coerce")
    return df


def get_data_head(df: pd.DataFrame, limit: int = 10) -> List[Dict[str, str | float | int | None]]:
    limit = max(1, limit)
    preview = df.head(limit).copy()
    if DEFAULT_DATE_COLUMN in preview.columns:
        preview[DEFAULT_DATE_COLUMN] = preview[DEFAULT_DATE_COLUMN].astype(str)
    return preview.to_dict(orient="records")


def _numeric_columns(df: pd.DataFrame, preferred: Tuple[str, ...] | None = None) -> List[str]:
    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    if preferred:
        preferred_cols = [col for col in preferred if col in numeric_cols]
        if preferred_cols:
            return preferred_cols
    return numeric_cols


def basic_summary(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    numeric_cols = _numeric_columns(
        df,
        preferred=("sales_qty", "sales_value", "price", "inventory_qty", "cogs_per_line"),
    )
    summary: Dict[str, Dict[str, float]] = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if series.empty:
            continue
        summary[col] = {
            "count": int(series.count()),
            "mean": float(series.mean()),
            "median": float(series.median()),
            "std": float(series.std(ddof=0)),
            "min": float(series.min()),
            "max": float(series.max()),
        }
    return summary


def missing_summary(df: pd.DataFrame) -> Dict[str, int]:
    return {col: int(total) for col, total in df.isna().sum().items()}


def outlier_info(df: pd.DataFrame, column: str = DEFAULT_VALUE_COLUMN) -> Dict[str, float | int]:
    if column not in df.columns:
        raise ValueError(f"Column '{column}' missing for outlier analysis.")
    series = df[column].dropna()
    if series.empty:
        return {"column": column, "outliers": 0, "lower_bound": None, "upper_bound": None}
    q1, q3 = np.percentile(series, [25, 75])
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    mask = (series < lower) | (series > upper)
    return {
        "column": column,
        "outliers": int(mask.sum()),
        "lower_bound": float(lower),
        "upper_bound": float(upper),
    }


def correlation_summary(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    numeric = df.select_dtypes(include=np.number)
    if numeric.empty:
        return {}
    return numeric.corr().round(3).replace({np.nan: None}).to_dict()


def _value_column(df: pd.DataFrame) -> str:
    if DEFAULT_VALUE_COLUMN in df.columns:
        return DEFAULT_VALUE_COLUMN
    numeric_cols = _numeric_columns(df)
    if not numeric_cols:
        raise ValueError("No numeric columns found for timeseries aggregation.")
    return numeric_cols[0]


def _granularity_freq(granularity: str) -> str:
    return _GRANULARITY_FREQ.get((granularity or "daily").lower(), "D")


def timeseries_summary(
    df: pd.DataFrame,
    granularity: str = "daily",
    date_col: str = DEFAULT_DATE_COLUMN,
) -> List[Dict[str, float | str]]:
    if date_col not in df.columns:
        raise ValueError(f"Column '{date_col}' missing for time-series analysis.")
    working = df.dropna(subset=[date_col]).copy()
    working[date_col] = pd.to_datetime(working[date_col], errors="coerce")
    working = working.dropna(subset=[date_col])
    value_col = _value_column(working)
    freq = _granularity_freq(granularity)
    grouped = (
        working.set_index(date_col)
        .sort_index()
        .resample(freq)[value_col]
        .sum()
        .reset_index()
        .rename(columns={value_col: "value"})
    )
    if grouped.empty:
        return []
    window = {"D": 7, "W-MON": 4, "MS": 3}.get(freq, 7)
    grouped["rolling_mean"] = grouped["value"].rolling(window, min_periods=1).mean()
    grouped["rolling_std"] = grouped["value"].rolling(window, min_periods=1).std(ddof=0)
    grouped["rolling_var"] = grouped["value"].rolling(window, min_periods=1).var(ddof=0)
    grouped["date"] = grouped[date_col].dt.date.astype(str)
    return grouped[["date", "value", "rolling_mean", "rolling_std", "rolling_var"]].fillna(0).to_dict(
        orient="records"
    )


def series_coverage_summary(
    df: pd.DataFrame,
    id_col: str = DEFAULT_ID_COLUMN,
    date_col: str = DEFAULT_DATE_COLUMN,
) -> List[Dict[str, str | int]]:
    if id_col not in df.columns or date_col not in df.columns:
        return []
    working = df.dropna(subset=[id_col, date_col]).copy()
    if working.empty:
        return []
    working[date_col] = pd.to_datetime(working[date_col], errors="coerce")
    working = working.dropna(subset=[date_col])
    if working.empty:
        return []
    coverage = (
        working.groupby(id_col)[date_col]
        .agg(["min", "max", "nunique"])
        .rename(columns={"nunique": "observations"})
    )
    results = []
    for idx, row in coverage.iterrows():
        start = row["min"].date()
        end = row["max"].date()
        span_days = (end - start).days + 1
        results.append(
            {
                "series_id": idx,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "observations": int(row["observations"]),
                "span_days": int(span_days),
            }
        )
    return results


def trend_curves(
    df: pd.DataFrame,
    granularity: str = "daily",
    date_col: str = DEFAULT_DATE_COLUMN,
) -> List[Dict[str, float | str]]:
    if date_col not in df.columns:
        return []
    working = df.dropna(subset=[date_col]).copy()
    working[date_col] = pd.to_datetime(working[date_col], errors="coerce")
    working = working.dropna(subset=[date_col])
    if working.empty:
        return []
    value_col = _value_column(working)
    agg_series = None
    if granularity == "daily":
        working["label"] = working[date_col].dt.day_name()
        order = list(range(7))
        working["order"] = working[date_col].dt.dayofweek
        agg_series = (
            working.groupby(["order", "label"])[value_col]
            .mean()
            .reset_index()
            .sort_values("order")
        )
    elif granularity == "weekly":
        working["order"] = working[date_col].dt.isocalendar().week.astype(int)
        working["label"] = working["order"].astype(str).str.zfill(2)
        agg_series = (
            working.groupby(["order", "label"])[value_col]
            .mean()
            .reset_index()
            .sort_values("order")
        )
    else:
        working["order"] = working[date_col].dt.month
        working["label"] = working[date_col].dt.month_name().str[:3]
        agg_series = (
            working.groupby(["order", "label"])[value_col]
            .mean()
            .reset_index()
            .sort_values("order")
        )
    return [{"label": row["label"], "value": float(row[value_col])} for _, row in agg_series.iterrows()]


def distribution_summary(
    df: pd.DataFrame,
    column: str = DEFAULT_VALUE_COLUMN,
    bins: int = 20,
) -> Dict[str, List[float | int]]:
    if column not in df.columns:
        raise ValueError(f"Column '{column}' missing for distribution analysis.")
    series = df[column].dropna()
    if series.empty:
        return {"bins": [], "counts": []}
    counts, edges = np.histogram(series, bins=bins)
    return {"bins": edges.tolist(), "counts": counts.astype(int).tolist()}
