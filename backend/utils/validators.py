from __future__ import annotations

from typing import Iterable, List

ALLOWED_GRANULARITIES = {"daily": 1, "weekly": 7, "monthly": 30}
AVAILABLE_DATA_FREQUENCIES = {"daily", "weekly"}


def validate_core_rules(
    horizon_days: int,
    lead_time_days: int,
    granularity: str,
    promo_calendar_path: str,
) -> List[str]:
    errors: List[str] = []

    if horizon_days < lead_time_days:
        errors.append("Forecast horizon must be greater than or equal to lead time.")

    if granularity not in ALLOWED_GRANULARITIES:
        errors.append("Granularity must be one of: daily, weekly, monthly.")

    if not promo_calendar_path:
        errors.append("Promo calendar file is required.")

    return errors


def build_guardrail_warnings(
    granularity: str,
    calendar_alignment_warning: str | None,
    data_frequency_exists: bool,
) -> List[str]:
    warnings: List[str] = []

    if calendar_alignment_warning:
        warnings.append(calendar_alignment_warning)

    if not data_frequency_exists:
        warnings.append(
            "Historical data has not been ingested for the selected granularity."
        )

    if granularity == "monthly":
        warnings.append("Monthly cadence relies on aggregated data that may lag by 2 weeks.")

    return warnings


def frequency_exists(granularity: str) -> bool:
    return granularity in AVAILABLE_DATA_FREQUENCIES