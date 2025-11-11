from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List

import holidays
from fastapi import HTTPException, status

SUPPORTED_COUNTRIES = set(holidays.list_supported_countries())


def _normalize_country(country: str) -> str:
    normalized = country.strip()
    if not normalized:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Country is required.")
    if normalized not in SUPPORTED_COUNTRIES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported country. Provide ISO code such as 'US', 'GB', 'IN'."
            ),
        )
    return normalized


def get_holidays(country: str, start: date, end: date) -> List[Dict[str, str]]:
    if start > end:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date",
        )

    normalized_country = _normalize_country(country.upper())
    try:
        calendar = holidays.country_holidays(normalized_country)
    except NotImplementedError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Holidays not available for the requested country.",
        ) from exc

    cursor = start
    results: List[Dict[str, str]] = []
    while cursor <= end:
        name = calendar.get(cursor)
        if name:
            results.append({
                "date": cursor.isoformat(),
                "name": name,
            })
        cursor += timedelta(days=1)

    return results