from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
import threading
from pathlib import Path
from typing import Dict, List, Literal, Optional

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from utils.file_ops import append_audit_log, ensure_directory, read_json, write_json
from utils.promo_validator import (
    granularity_alignment_warning,
    read_promo_calendar,
    rows_from_bytes,
    validate_promo_rows,
    write_uploaded_calendar,
)
from utils.roles import ensure_min_role, normalize_role
from utils.holidays_handler import get_holidays
from utils.validators import (
    build_guardrail_warnings,
    frequency_exists,
    validate_core_rules,
)
from utils.versioning import (
    append_history_entry,
    build_history_path,
    load_history,
    next_config_path,
)
from utils.yaml_handler import dump_yaml, load_yaml
from utils import eda_tools
from utils.data_analyzer import analyze_csv
from utils.validator import validate_data as run_data_validation
from utils.timeline_builder import build_continuous_timeline
from utils.aggregator import aggregate_data as run_aggregation

BASE_DIR = Path(__file__).parent
CONFIG_ROOT = BASE_DIR / "configs"
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
VALIDATED_DIR = DATA_DIR / "validated"
VALIDATED_FILE = VALIDATED_DIR / "validated_raw_data.csv"
CONTINUOUS_FILE = VALIDATED_DIR / "continuous_data.csv"
AUDIT_LOG = CONFIG_ROOT / "audit.log"
HIERARCHY_PATH = CONFIG_ROOT / "hierarchy_mapping.json"
HISTORY_PATH = build_history_path(CONFIG_ROOT)
LATEST_UPLOAD_INFO = UPLOADS_DIR / "latest_upload.json"
UPLOAD_RETENTION_HOURS = 2
CLEANUP_INTERVAL_SECONDS = 900

for folder in [CONFIG_ROOT, CONFIG_ROOT / "dev", CONFIG_ROOT / "prod", DATA_DIR]:
    ensure_directory(folder)
ensure_directory(UPLOADS_DIR)
ensure_directory(VALIDATED_DIR)

DEFAULTS = {
    "forecast_horizon_days": 30,
    "lead_time_days": 7,
    "granularity": "weekly",
    "hierarchy": "restaurant > city > country",
    "country": "India",
    "config_version": "1.0",
}

ALLOWED_ENVS = {"dev", "prod"}


class ForecastMeta(BaseModel):
    name: str = Field(..., max_length=120)
    created_by: str = Field(..., max_length=120)
    notes: str | None = Field(default=None, max_length=500)


class ForecastDetail(BaseModel):
    horizon_days: int = Field(..., ge=1)
    lead_time_days: int = Field(..., ge=0)
    granularity: Literal["daily", "weekly", "monthly"]
    hierarchy: str = Field(..., max_length=120)
    country: str = Field(..., max_length=120)
    promo_calendar_path: str


class SaveConfigPayload(BaseModel):
    config_version: str = Field(default="1.0")
    meta: ForecastMeta
    forecast: ForecastDetail
    version_tag: str | None = Field(default=None, max_length=60)


class HierarchyMapping(BaseModel):
    restaurant_to_city: Dict[str, str]
    city_to_country: Dict[str, str]


class RollupRequest(BaseModel):
    restaurant_values: Dict[str, float]


cleanup_stop_event = threading.Event()
cleanup_thread: Optional[threading.Thread] = None


def _relative_to_base(path: Path) -> str:
    try:
        return str(path.relative_to(BASE_DIR))
    except ValueError:
        return str(path)


def _record_latest_upload(path: Path) -> None:
    payload = {
        "path": _relative_to_base(path),
        "timestamp": datetime.utcnow().isoformat(),
    }
    write_json(LATEST_UPLOAD_INFO, payload)


def _persist_upload(content: bytes, original_name: str | None, label: str) -> Path:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    suffix = Path(original_name or f"{label}.csv").suffix or ".csv"
    filename = f"{timestamp}_{label}{suffix}"
    destination = ensure_directory(UPLOADS_DIR) / filename
    destination.write_bytes(content)
    return destination


def _cleanup_old_uploads(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        now = datetime.utcnow()
        uploads_dir = ensure_directory(UPLOADS_DIR)
        cutoff = timedelta(hours=UPLOAD_RETENTION_HOURS)
        for file in uploads_dir.glob("*.csv"):
            try:
                modified_time = datetime.fromtimestamp(file.stat().st_mtime)
            except OSError:
                continue
            if now - modified_time > cutoff:
                try:
                    file.unlink()
                except OSError as exc:
                    print(f"Failed to remove {file}: {exc}")
        stop_event.wait(CLEANUP_INTERVAL_SECONDS)


def _start_cleanup_thread() -> None:
    global cleanup_thread
    if cleanup_thread and cleanup_thread.is_alive():
        return
    cleanup_stop_event.clear()
    cleanup_thread = threading.Thread(
        target=_cleanup_old_uploads,
        args=(cleanup_stop_event,),
        daemon=True,
        name="upload-cleanup-worker",
    )
    cleanup_thread.start()


def _stop_cleanup_thread() -> None:
    cleanup_stop_event.set()
    if cleanup_thread and cleanup_thread.is_alive():
        cleanup_thread.join(timeout=5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _start_cleanup_thread()
    try:
        yield
    finally:
        _stop_cleanup_thread()


app = FastAPI(title="Forecast Workbench API", version="0.3.0", lifespan=lifespan)
ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "Backend running on Railway", "service": "forecast-api"}


@app.get("/health")
async def health():
    return {"ok": True, "service": "forecast-backend"}


@app.get("/keepalive")
async def keepalive():
    return {"message": "awake"}


def resolve_env(env: str) -> Path:
    if env not in ALLOWED_ENVS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Unknown environment.")
    return CONFIG_ROOT / env


def resolve_promo_path(promo_path: str) -> Path:
    candidate = Path(promo_path)
    if candidate.is_file():
        return candidate
    relative = DATA_DIR / promo_path
    return relative


def latest_config_path(env_dir: Path) -> Path | None:
    files = sorted(env_dir.glob("project_config_*.yaml"))
    if not files:
        return None
    return files[-1]


def guardrail_summary(forecast: ForecastDetail) -> List[str]:
    promo_path = resolve_promo_path(forecast.promo_calendar_path)
    promo_rows = read_promo_calendar(promo_path)
    calendar_warning = granularity_alignment_warning(promo_rows, forecast.granularity)
    data_frequency_exists = frequency_exists(forecast.granularity)
    warnings = build_guardrail_warnings(
        forecast.granularity,
        calendar_warning,
        data_frequency_exists,
    )

    if not promo_rows:
        warnings.append("Promo calendar file missing or empty; unable to verify promotions.")

    _, invalid = validate_promo_rows(promo_rows)
    if invalid:
        warnings.append(
            f"Promo calendar contains {len(invalid)} row(s) with missing columns or invalid dates."
        )

    return warnings


def append_audit(message: str, role: str, env: str) -> None:
    append_audit_log(AUDIT_LOG, message, role, env)


@app.get("/api/defaults")
def get_defaults() -> Dict[str, str | int]:
    return DEFAULTS


@app.get("/api/holidays")
def list_holidays(
    country: str,
    start_date: date,
    end_date: date,
):
    holidays_list = get_holidays(country, start_date, end_date)
    return {
        "country": country.upper(),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "count": len(holidays_list),
        "holidays": holidays_list,
    }


@app.get("/api/load_config")
def load_config(env: str = "dev"):
    env_dir = resolve_env(env)
    latest_path = latest_config_path(env_dir)
    if not latest_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No config found.")
    data = load_yaml(latest_path)
    return {"path": str(latest_path.relative_to(BASE_DIR)), "config": data}


@app.get("/api/get_versions")
def get_versions(env: str | None = None, limit: int = 20):
    history = load_history(HISTORY_PATH)
    if env:
        history = [entry for entry in history if entry.get("env") == env]
    return {"history": history[-limit:]}


@app.get("/api/download_config")
def download_config(env: str = "dev", path: str | None = None):
    env_dir = resolve_env(env)
    target_path: Path | None = None

    if path:
        candidate = (CONFIG_ROOT / path).resolve()
        if not str(candidate).startswith(str(env_dir.resolve())):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid config path.")
        target_path = candidate
    else:
        target_path = latest_config_path(env_dir)

    if not target_path or not target_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Config file not found.")

    yaml_text = target_path.read_text(encoding="utf-8")
    parsed = load_yaml(target_path)
    return {"path": str(target_path.relative_to(BASE_DIR)), "yaml": yaml_text, "config": parsed}


@app.post("/api/save_config")
async def save_config(
    payload: SaveConfigPayload,
    env: str = "dev",
    role: str | None = None,
):
    env_dir = resolve_env(env)
    normalized_role = normalize_role(role)
    ensure_min_role(normalized_role, "editor")

    errors = validate_core_rules(
        payload.forecast.horizon_days,
        payload.forecast.lead_time_days,
        payload.forecast.granularity,
        payload.forecast.promo_calendar_path,
    )
    if errors:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=errors)

    promo_path = resolve_promo_path(payload.forecast.promo_calendar_path)
    if not promo_path.exists():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Promo calendar file not found.")

    warnings = guardrail_summary(payload.forecast)

    timestamp = datetime.utcnow()
    version_tag = payload.version_tag or "draft"
    config_payload = {
        "config_version": payload.config_version,
        "version_tag": version_tag,
        "meta": {
            "name": payload.meta.name,
            "created_by": payload.meta.created_by,
            "created_at": timestamp.isoformat() + "Z",
            "notes": payload.meta.notes or "",
        },
        "forecast": {
            "horizon_days": payload.forecast.horizon_days,
            "lead_time_days": payload.forecast.lead_time_days,
            "granularity": payload.forecast.granularity,
            "hierarchy": payload.forecast.hierarchy,
            "country": payload.forecast.country,
            "promo_calendar_path": payload.forecast.promo_calendar_path,
        },
    }

    config_path = next_config_path(env_dir, timestamp, payload.meta.name)
    dump_yaml(config_path, config_payload)

    history_entry = {
        "env": env,
        "path": str(config_path.relative_to(BASE_DIR)),
        "created_at": timestamp.isoformat() + "Z",
        "created_by": payload.meta.created_by,
        "version_tag": version_tag,
        "warnings": warnings,
        "name": payload.meta.name,
    }
    updated_history = append_history_entry(HISTORY_PATH, history_entry)

    append_audit(f"saved config {config_path.name}", normalized_role, env)

    return {
        "status": "success",
        "path": history_entry["path"],
        "warnings": warnings,
        "history_size": len(updated_history),
        "config": config_payload,
    }


@app.post("/api/upload_promo_calendar")
async def upload_promo_calendar(
    file: UploadFile = File(...),
    env: str = "dev",
    role: str | None = None,
):
    normalized_role = normalize_role(role)
    ensure_min_role(normalized_role, "editor")

    content = await file.read()
    rows, missing_columns = rows_from_bytes(content)
    if missing_columns:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Missing columns: {', '.join(missing_columns)}",
        )

    preview, invalid_rows = validate_promo_rows(rows)
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    safe_name = file.filename or "promo_calendar.csv"
    save_dir = ensure_directory(UPLOADS_DIR / env)
    save_path = save_dir / f"{timestamp}_{safe_name}"
    write_uploaded_calendar(save_path, content)

    append_audit(f"uploaded promo calendar {safe_name}", normalized_role, env)

    return {
        "status": "uploaded",
        "path": str(save_path.relative_to(BASE_DIR)),
        "preview": preview,
        "invalid_rows": invalid_rows,
        "total_rows": len(rows),
    }


def normalize_hierarchy_payload(payload: Dict[str, Dict[str, str]]) -> Dict[str, Dict[str, str]]:
    """
    Backwards-compatible helper so existing store_to_city keys still work.
    """
    if "store_to_city" in payload and "restaurant_to_city" not in payload:
        payload["restaurant_to_city"] = payload.pop("store_to_city")
    return payload


@app.get("/api/hierarchy_mapping")
async def get_hierarchy_mapping():
    mapping = read_json(HIERARCHY_PATH, default={
        "restaurant_to_city": {"Restaurant A": "Mumbai"},
        "city_to_country": {"Mumbai": "India"},
    })
    return normalize_hierarchy_payload(mapping)


@app.post("/api/hierarchy_mapping")
async def update_hierarchy_mapping(
    mapping: HierarchyMapping,
    role: str | None = None,
):
    normalized_role = normalize_role(role)
    ensure_min_role(normalized_role, "editor")
    write_json(HIERARCHY_PATH, mapping.model_dump())
    append_audit("updated hierarchy mapping", normalized_role, "global")
    return {"status": "updated", "mapping": mapping}


@app.post("/api/test_rollup")
async def test_rollup(request: RollupRequest):
    mapping = normalize_hierarchy_payload(read_json(HIERARCHY_PATH, default={}))
    restaurant_to_city = mapping.get("restaurant_to_city", {})
    city_to_country = mapping.get("city_to_country", {})

    city_totals: Dict[str, float] = {}
    country_totals: Dict[str, float] = {}

    for restaurant, value in request.restaurant_values.items():
        city = restaurant_to_city.get(restaurant, "Unknown")
        city_totals[city] = city_totals.get(city, 0) + value
        country = city_to_country.get(city, "Unknown")
        country_totals[country] = country_totals.get(country, 0) + value

    return {
        "cities": city_totals,
        "countries": country_totals,
    }


async def _ingest_upload(file: UploadFile, label: str) -> Path:
    content = await file.read()
    saved_path = _persist_upload(content, file.filename, label)
    return saved_path


def _ensure_latest_upload_path() -> Path:
    info = read_json(LATEST_UPLOAD_INFO, default={})
    path_str = info.get("path")
    if not path_str:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No uploaded files available.")
    candidate = Path(path_str)
    if not candidate.is_absolute():
        candidate = (BASE_DIR / path_str).resolve()
    if not candidate.is_file():
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Latest upload file missing: {path_str}",
        )
    return candidate


@app.post("/api/ingest_data")
async def ingest_data(
    sales: UploadFile | None = File(default=None),
    inventory: UploadFile | None = File(default=None),
    prices: UploadFile | None = File(default=None),
    use_existing: bool = False,
):
    uploaded_files: List[Dict[str, str]] = []
    primary_path: Path | None = None

    for label, upload in (("sales", sales), ("inventory", inventory), ("prices", prices)):
        if upload is None:
            continue
        saved_path = await _ingest_upload(upload, label)
        uploaded_files.append({"type": label, "path": _relative_to_base(saved_path)})
        if label == "sales" or primary_path is None:
            primary_path = saved_path

    if uploaded_files:
        assert primary_path is not None
        _record_latest_upload(primary_path)
    elif use_existing:
        primary_path = _ensure_latest_upload_path()
        _record_latest_upload(primary_path)
    else:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one CSV upload or set use_existing=true.",
        )

    try:
        summary = run_data_validation(filename=str(primary_path))
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {
        "status": "success",
        "uploaded_files": uploaded_files or [{"type": "sales", "path": _relative_to_base(primary_path)}],
        "summary": summary,
    }


@app.post("/api/upload_csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Handles CSV uploads for restaurant sales data.
    """
    try:
        content = await file.read()
        saved_path = _persist_upload(content, file.filename, "sales")
        _record_latest_upload(saved_path)
        summary = analyze_csv(content)
        return {
            "status": "success",
            "data": summary,
            "stored_path": _relative_to_base(saved_path),
        }
    except Exception as exc:  # pragma: no cover - protects against unexpected parsing errors
        return {"status": "error", "message": str(exc)}


@app.post("/api/validate_data")
async def validate_data(filename: str | None = None):
    """
    Cleans the latest uploaded CSV (or a provided filename) and returns validation metadata.
    """
    try:
        summary = run_data_validation(filename=filename)
        return {"status": "success", "summary": summary}
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - safeguard unexpected failures
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Validation failed.") from exc


@app.post("/api/build_timeline")
async def build_timeline():
    if not VALIDATED_FILE.is_file():
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="Validated dataset not found. Run /api/validate_data first.",
        )

    df = pd.read_csv(VALIDATED_FILE)
    try:
        summary = build_continuous_timeline(df)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "success", "summary": summary}


@app.post("/api/aggregate_data")
async def aggregate_data():
    if not CONTINUOUS_FILE.is_file():
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="Continuous dataset not found. Run /api/build_timeline first.",
        )

    df = pd.read_csv(CONTINUOUS_FILE)
    try:
        summary = run_aggregation(df)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "success", "summary": summary}


@app.get("/api/eda/summary")
async def eda_summary(granularity: Literal["daily", "weekly", "monthly"] = Query("daily")):
    try:
        df = eda_tools.load_data(granularity)
        summary = {
            "basic": eda_tools.basic_summary(df),
            "missing": eda_tools.missing_summary(df),
            "outliers": eda_tools.outlier_info(df),
            "coverage": eda_tools.series_coverage_summary(df),
            "trend": eda_tools.trend_curves(df, granularity=granularity),
        }
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "success", "summary": summary}


@app.get("/api/eda/correlation")
async def eda_correlation(granularity: Literal["daily", "weekly", "monthly"] = Query("daily")):
    try:
        df = eda_tools.load_data(granularity)
        correlation = eda_tools.correlation_summary(df)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"status": "success", "correlation": correlation}


@app.get("/api/eda/timeseries")
async def eda_timeseries(granularity: Literal["daily", "weekly", "monthly"] = Query("daily")):
    try:
        df = eda_tools.load_data(granularity)
        timeseries = eda_tools.timeseries_summary(df, granularity=granularity)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "success", "timeseries": timeseries}


@app.get("/api/eda/distribution")
async def eda_distribution(
    column: str = Query("sales_qty"),
    granularity: Literal["daily", "weekly", "monthly"] = Query("daily"),
    bins: int = Query(20, ge=5, le=120),
):
    try:
        df = eda_tools.load_data(granularity)
        distribution = eda_tools.distribution_summary(df, column=column, bins=bins)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "success", "distribution": distribution}


@app.get("/api/eda/datahead")
async def eda_datahead(
    granularity: Literal["daily", "weekly", "monthly"] = Query("daily"),
    limit: int = Query(10, ge=1, le=200),
):
    try:
        df = eda_tools.load_data(granularity)
        data_head = eda_tools.get_data_head(df, limit=limit)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"status": "success", "data_head": data_head}
