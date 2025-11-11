"""Helpers for aligning uploaded CSV column names to canonical schema."""

from __future__ import annotations

from typing import Dict, Tuple

import pandas as pd

CanonicalMap = Dict[str, Tuple[str, ...]]


CANONICAL_COLUMNS: CanonicalMap = {
    "date": (
        "date",
        "order_date",
        "transaction_date",
        "day",
        "timestamp",
    ),
    "series_id": (
        "series_id",
        "restaurant_id",
        "restaurant",
        "store_id",
        "store",
        "location_id",
        "site_id",
    ),
    "item_id": (
        "item_id",
        "sku",
        "product_id",
        "menu_item",
    ),
    "sales_qty": (
        "sales_qty",
        "salesquantity",
        "qty",
        "units",
        "quantity",
        "sales",
        "demand",
        "orders",
        "volume",
    ),
    "sales_value": (
        "sales_value",
        "amount",
        "revenue",
        "gmv",
        "net_sales",
        "sales_amt",
    ),
    "price": (
        "price",
        "unit_price",
        "avg_price",
        "selling_price",
    ),
    "inventory_level": (
        "inventory_level",
        "inventory",
        "stock",
        "on_hand",
    ),
}


def _normalize(name: str) -> str:
    return str(name).strip().lower().replace(" ", "_")


def _match_canonical(column: str) -> str | None:
    normalized = _normalize(column)
    for canonical, synonyms in CANONICAL_COLUMNS.items():
        if normalized == canonical or normalized in synonyms:
            return canonical

    for canonical, synonyms in CANONICAL_COLUMNS.items():
        for synonym in synonyms:
            if synonym in normalized:
                return canonical
    return None


def standardize_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, Dict[str, str]]:
    """
    Renames columns in-place to canonical names where possible.

    Returns a copy of the dataframe and the rename mapping so other layers
    can report what changed during ingestion.
    """
    rename_map: Dict[str, str] = {}
    taken: set[str] = set()

    for original in df.columns:
        canonical = _match_canonical(original)
        if canonical and canonical not in taken:
            rename_map[original] = canonical
            taken.add(canonical)

    standardized = df.rename(columns=rename_map).copy()
    return standardized, rename_map
