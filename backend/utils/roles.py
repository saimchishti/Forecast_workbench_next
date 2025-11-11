from __future__ import annotations

from fastapi import HTTPException, status

ROLE_LEVELS = {"viewer": 0, "editor": 1, "approver": 2}


def normalize_role(role: str | None) -> str:
    role = (role or "viewer").lower()
    if role not in ROLE_LEVELS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Unknown role provided.")
    return role


def ensure_min_role(role: str, minimum: str) -> None:
    if ROLE_LEVELS[role] < ROLE_LEVELS[minimum]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to perform this action.",
        )