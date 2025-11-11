"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import Review from "./Review";
import RolesBanner from "./Roles";
import StepA from "./StepA";
import StepB from "./StepB";
import StepC from "./StepC";
import Success from "./Success";
import {
  DATA_SUMMARY_STORAGE_KEY,
  DetectedDataSummary,
  EnvironmentKey,
  ForecastConfigForm,
  HierarchyMapping,
  HistoryEntry,
  PromoPreview,
  Role,
  RollupPreview,
} from "./types";

const steps = ["Business timing", "Structure", "Special events", "Review", "Success"];

const initialForm: ForecastConfigForm = {
  config_version: "1.0",
  version_tag: "draft",
  meta: {
    name: "Q4 Pricing - India",
    created_by: "saimchisti@gmail.com",
    notes: "",
  },
  forecast: {
    horizon_days: 30,
    lead_time_days: 7,
    granularity: "weekly",
    hierarchy: "Restaurant > City > Country",
    country: "India",
    promo_calendar_path: "data/special_events_calendar.csv",
    promo_scope: "all",
  },
};

const helpItems = [
  { title: "Horizon", body: "Plan far enough for culinary and supply partners. Keep >= lead time." },
  { title: "Granularity", body: "Daily for fast-moving menus, weekly for regional pacing, monthly for exec views." },
  { title: "Special events", body: "Upload a validated events calendar so uplift assumptions stay in sync." },
  { title: "Restaurant structure", body: "Restaurant > City > Country is the minimum to unlock roll-ups." },
];

const API_BASE = "http://127.0.0.1:8000/api";

export default function SetupWizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ForecastConfigForm>(initialForm);
  const [role, setRole] = useState<Role>("editor");
  const [environment, setEnvironment] = useState<EnvironmentKey>("dev");
  const [promoPreview, setPromoPreview] = useState<PromoPreview | null>(null);
  const [promoUploadError, setPromoUploadError] = useState<string | null>(null);
  const [isUploadingPromo, setIsUploadingPromo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedTemplatePath, setSelectedTemplatePath] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<ForecastConfigForm | null>(null);
  const [lastSavedMeta, setLastSavedMeta] = useState<{
    path: string;
    created_at: string;
    created_by: string;
  } | null>(null);
  const [hierarchyMapping, setHierarchyMapping] = useState<HierarchyMapping | null>(null);
  const [rollupPreview, setRollupPreview] = useState<RollupPreview | null>(null);
  const [dataSummary, setDataSummary] = useState<DetectedDataSummary | null>(null);
  const [hasAppliedSummary, setHasAppliedSummary] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const readSummary = () => {
      const stored = window.localStorage.getItem(DATA_SUMMARY_STORAGE_KEY);
      if (!stored) {
        setDataSummary(null);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as DetectedDataSummary;
        setDataSummary(parsed);
        setHasAppliedSummary(false);
      } catch {
        // Ignore malformed payloads but clear state so user isn't blocked.
        setDataSummary(null);
      }
    };

    readSummary();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DATA_SUMMARY_STORAGE_KEY) {
        readSummary();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!dataSummary || hasAppliedSummary) return;

    const suggested = dataSummary.suggested_config;
    const normalizedHierarchy = suggested.hierarchy.toLowerCase();
    const hierarchyLabel =
      normalizedHierarchy === "single-restaurant"
        ? "Single restaurant"
        : normalizedHierarchy === "multi-location"
          ? "Restaurant > City > Country"
          : suggested.hierarchy;

    setFormData((prev) => ({
      ...prev,
      forecast: {
        ...prev.forecast,
        horizon_days: suggested.forecast_horizon_days,
        lead_time_days: suggested.lead_time_days,
        granularity: suggested.granularity,
        hierarchy: hierarchyLabel,
        country: suggested.country || prev.forecast.country,
      },
    }));
    setHasAppliedSummary(true);
  }, [dataSummary, hasAppliedSummary]);

  const progressPercent = useMemo(
    () => (currentStep / (steps.length - 1)) * 100,
    [currentStep],
  );

  const horizonError =
    formData.forecast.horizon_days < formData.forecast.lead_time_days
      ? "Horizon must be greater than or equal to lead time."
      : undefined;

  const metaValid = Boolean(
    formData.meta.name.trim() &&
      formData.meta.created_by.trim() &&
      formData.forecast.hierarchy.trim() &&
      formData.forecast.country.trim(),
  );
  const promosValid = Boolean(formData.forecast.promo_calendar_path.trim());
  const stepIsValid = [!horizonError, metaValid, promosValid];
  const disableNext = currentStep <= 2 && !stepIsValid[currentStep];

  const handleForecastChange = (
    field: keyof ForecastConfigForm["forecast"],
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      forecast: {
        ...prev.forecast,
        [field]: value,
      },
    }));
  };

  const handleMetaChange = (field: keyof ForecastConfigForm["meta"], value: string) => {
    setFormData((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [field]: value,
      },
    }));
  };

  const handleVersionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      version_tag: value,
    }));
  };

  const handlePresetApply = (values: {
    horizon_days: number;
    lead_time_days: number;
    granularity: ForecastConfigForm["forecast"]["granularity"];
  }) => {
    setFormData((prev) => ({
      ...prev,
      forecast: {
        ...prev.forecast,
        ...values,
      },
    }));
  };

  const handleScopeChange = (scope: ForecastConfigForm["forecast"]["promo_scope"]) => {
    handleForecastChange("promo_scope", scope);
  };

  const clearDetectedSummary = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(DATA_SUMMARY_STORAGE_KEY);
    setDataSummary(null);
    setHasAppliedSummary(false);
  }, []);

  const handlePromoUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingPromo(true);
    setPromoUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${API_BASE}/upload_promo_calendar?env=${environment}&role=${role}`,
        {
          method: "POST",
          body,
        },
      );
      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail ?? "Unable to upload events calendar");
      }
      const payload: PromoPreview = await response.json();
      setPromoPreview(payload);
      const normalizedPath = payload.path.replace(/^backend[\\/]/i, "").replace(/\\/g, "/");
      handleForecastChange("promo_calendar_path", normalizedPath || payload.path);
    } catch (error) {
      setPromoUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploadingPromo(false);
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    setSubmitError(null);
    try {
      const response = await fetch(
        `${API_BASE}/save_config?env=${environment}&role=${role}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail ?? "Unable to save configuration");
      }
      const payload = await response.json();
      setWarnings(payload.warnings ?? []);
      setSavedSnapshot(formData);
      const createdAt = payload.config?.meta?.created_at ?? new Date().toISOString();
      const createdBy = payload.config?.meta?.created_by ?? formData.meta.created_by;
      setLastSavedMeta({
        path: payload.path,
        created_at: createdAt,
        created_by: createdBy,
      });
      setCurrentStep(steps.length - 1);
      fetchHistory();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setSubmitError(null);
    try {
      const url = new URL(`${API_BASE}/download_config`);
      url.searchParams.set("env", environment);
      if (lastSavedMeta?.path) {
        url.searchParams.set("path", lastSavedMeta.path);
      }
      const response = await fetch(url);
      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail ?? "Nothing to download yet");
      }
      const payload = await response.json();
      const blob = new Blob([payload.yaml], { type: "text/yaml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = payload.path?.split("/").pop() ?? "project_config.yaml";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to download YAML");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTemplateSelect = async (path: string) => {
    setSelectedTemplatePath(path);
    if (!path) return;
    try {
      const url = new URL(`${API_BASE}/download_config`);
      url.searchParams.set("env", environment);
      url.searchParams.set("path", path);
      const response = await fetch(url);
      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail ?? "Unable to load template");
      }
      const payload = await response.json();
      if (payload.config) {
        setFormData((prev) => ({
          ...prev,
          config_version: payload.config.config_version ?? prev.config_version,
          version_tag: payload.config.version_tag ?? prev.version_tag,
          meta: {
            name: payload.config.meta?.name ?? prev.meta.name,
            created_by: payload.config.meta?.created_by ?? prev.meta.created_by,
            notes: payload.config.meta?.notes ?? prev.meta.notes,
          },
          forecast: {
            ...prev.forecast,
            horizon_days: payload.config.forecast?.horizon_days ?? prev.forecast.horizon_days,
            lead_time_days: payload.config.forecast?.lead_time_days ?? prev.forecast.lead_time_days,
            granularity: payload.config.forecast?.granularity ?? prev.forecast.granularity,
            hierarchy: payload.config.forecast?.hierarchy ?? prev.forecast.hierarchy,
            country: payload.config.forecast?.country ?? prev.forecast.country,
            promo_calendar_path:
              payload.config.forecast?.promo_calendar_path ?? prev.forecast.promo_calendar_path,
            promo_scope: prev.forecast.promo_scope,
          },
        }));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to load template");
    }
  };

  const handleReset = () => {
    setFormData(initialForm);
    setPromoPreview(null);
    setWarnings([]);
    setSavedSnapshot(null);
    setLastSavedMeta(null);
    setCurrentStep(0);
  };

  const fetchDefaults = async () => {
    try {
      const response = await fetch(`${API_BASE}/defaults`);
      if (!response.ok) return;
      const defaults = await response.json();
      setFormData((prev) => ({
        ...prev,
        config_version: defaults.config_version ?? prev.config_version,
        forecast: {
          ...prev.forecast,
          horizon_days: defaults.forecast_horizon_days ?? prev.forecast.horizon_days,
          lead_time_days: defaults.lead_time_days ?? prev.forecast.lead_time_days,
          granularity: defaults.granularity ?? prev.forecast.granularity,
          hierarchy: defaults.hierarchy ?? prev.forecast.hierarchy,
          country: defaults.country ?? prev.forecast.country,
        },
      }));
    } catch (error) {
      console.warn("Unable to load defaults", error);
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/get_versions?env=${environment}`);
      if (!response.ok) return;
      const payload = await response.json();
      setHistory(payload.history ?? []);
    } catch (error) {
      console.warn("Unable to load history", error);
    }
  }, [environment]);

  const fetchHierarchy = async () => {
    try {
      const response = await fetch(`${API_BASE}/hierarchy_mapping`);
      if (!response.ok) return;
      const payload = await response.json();
      setHierarchyMapping(payload);
    } catch (error) {
      console.warn("Unable to load hierarchy mapping", error);
    }
  };

  const handleMappingSave = async (mapping: HierarchyMapping) => {
    try {
      const response = await fetch(`${API_BASE}/hierarchy_mapping?role=${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapping),
      });
      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail ?? "Unable to save mapping");
      }
      setHierarchyMapping(mapping);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save mapping");
    }
  };

  const handleRollupTest = async () => {
    try {
      const response = await fetch(`${API_BASE}/test_rollup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_values: {
            "Restaurant A": 120,
            "Restaurant B": 95,
            "Restaurant C": 140,
          },
        }),
      });
      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail ?? "Unable to test roll-up");
      }
      const payload = await response.json();
      setRollupPreview(payload);
      return payload;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to test roll-up");
      return null;
    }
  };

  useEffect(() => {
    fetchDefaults();
    fetchHierarchy();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepA
            data={formData}
            onForecastChange={handleForecastChange}
            onPresetApply={handlePresetApply}
            validation={{ horizonError }}
            disabled={role === "viewer"}
            dataSummary={dataSummary}
          />
        );
      case 1:
        return (
          <StepB
            data={formData}
            onMetaChange={handleMetaChange}
            onForecastChange={(field, value) => handleForecastChange(field, value)}
            onVersionChange={handleVersionChange}
            mapping={hierarchyMapping}
            onMappingChange={setHierarchyMapping}
            onSaveMapping={handleMappingSave}
            onTestRollup={handleRollupTest}
            rollupPreview={rollupPreview}
            disabled={role === "viewer"}
          />
        );
      case 2:
        return (
          <StepC
            data={formData}
            promoPreview={promoPreview}
            onForecastChange={(field, value) => handleForecastChange(field, value)}
            onPromoUpload={handlePromoUpload}
            promoUploadError={promoUploadError}
            isUploadingPromo={isUploadingPromo}
            onScopeChange={handleScopeChange}
            disabled={role === "viewer"}
          />
        );
      case 3:
        return (
          <Review
            data={formData}
            promoPreview={promoPreview}
            warnings={warnings}
            onConfirm={handleConfirm}
            onDownload={handleDownload}
            isSaving={isSaving}
            isDownloading={isDownloading}
            error={submitError}
            role={role}
          />
        );
      case 4:
        return (
          <Success
            data={savedSnapshot ?? formData}
            warnings={warnings}
            lastSavedPath={lastSavedMeta?.path}
            lastSavedAt={lastSavedMeta?.created_at}
            lastSavedBy={lastSavedMeta?.created_by}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <RolesBanner
              role={role}
              environment={environment}
              onRoleChange={(nextRole) => setRole(nextRole)}
              onEnvironmentChange={(env) => setEnvironment(env)}
              lastEditedBy={lastSavedMeta?.created_by}
              lastEditedAt={lastSavedMeta?.created_at}
            />

            <div className="rounded-3xl bg-white p-6 shadow-xl">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">
                Setup wizard
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-lg font-semibold text-slate-900">
                  {steps[currentStep]}
                </p>
                <p className="text-sm text-slate-500">
                  Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
                </p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  value={selectedTemplatePath}
                  onChange={(event) => handleTemplateSelect(event.target.value)}
                >
                  <option value="">Load a previous template</option>
                  {history.map((entry) => (
                    <option key={entry.path} value={entry.path}>
                      {entry.name} | {entry.version_tag} ({entry.env})
                    </option>
                  ))}
                </select>
                {submitError && currentStep !== 3 ? (
                  <p className="text-sm text-rose-500">{submitError}</p>
                ) : null}
              </div>

              <div className="mt-6">
                {dataSummary ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800">
                    <p className="text-sm font-semibold text-emerald-900">
                      Using detected defaults from your latest upload
                    </p>
                    <p className="mt-1 text-sm">
                      {dataSummary.rows} rows of {dataSummary.frequency} data covering{" "}
                      {dataSummary.start_date} - {dataSummary.end_date}.
                    </p>
                    <p className="text-sm">
                      Hierarchy hint: <span className="font-semibold">{dataSummary.hierarchy}</span>. Date column{" "}
                      <span className="font-semibold">{dataSummary.date_column}</span>
                      {dataSummary.target_column ? ` (target ${dataSummary.target_column})` : ""}.
                    </p>
                    <p className="text-xs text-emerald-600">{dataSummary.notes}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-700">
                        {dataSummary.suggested_config.forecast_horizon_days}d horizon
                      </span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-700">
                        {dataSummary.suggested_config.lead_time_days}d lead time
                      </span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-700">
                        {dataSummary.suggested_config.granularity} cadence
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <button
                        type="button"
                        onClick={clearDetectedSummary}
                        className="inline-flex items-center rounded-full border border-emerald-200 px-4 py-1 font-semibold text-emerald-700 transition hover:bg-white"
                      >
                        Clear summary
                      </button>
                      <Link
                        href="/upload"
                        className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-1 font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Upload a new file
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-sm font-semibold text-slate-900">Start with data upload</p>
                    <p className="mt-1">
                      Upload a restaurant CSV so we can detect cadence, coverage, and hierarchy before you tweak anything.
                      Your selections will be pre-filled here.
                    </p>
                    <Link
                      href="/upload"
                      className="mt-3 inline-flex items-center rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Upload restaurant data
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-6">{renderStep()}</div>

              <div className="mt-8 flex flex-wrap gap-3">
                {currentStep > 0 && currentStep < steps.length && (
                  <button
                    onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                    disabled={isSaving}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Back
                  </button>
                )}

                {currentStep <= 2 && (
                  <button
                    onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
                    disabled={disableNext}
                    className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue
                  </button>
                )}

                {currentStep === steps.length - 1 && (
                  <button
                    onClick={handleReset}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 transition hover:border-slate-300"
                  >
                    Start another setup
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">Context help</h3>
            <ul className="mt-4 space-y-4 text-sm text-slate-600">
              {helpItems.map((item) => (
                <li key={item.title}>
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p className="text-slate-500">{item.body}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.join("; ");
    }
    return undefined;
  } catch {
    return undefined;
  }
}




