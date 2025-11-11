"use client";

import PromoUpload from "./PromoUpload";
import { ForecastConfigForm, PromoPreview, PromoScope } from "./types";

type StepCProps = {
  data: ForecastConfigForm;
  promoPreview: PromoPreview | null;
  onForecastChange: (
    field: keyof ForecastConfigForm["forecast"],
    value: string,
  ) => void;
  onPromoUpload: (file: File) => Promise<void>;
  promoUploadError: string | null;
  isUploadingPromo: boolean;
  onScopeChange: (scope: PromoScope) => void;
  disabled: boolean;
};

export default function StepC({
  data,
  promoPreview,
  onForecastChange,
  onPromoUpload,
  promoUploadError,
  isUploadingPromo,
  onScopeChange,
  disabled,
}: StepCProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-slate-700">Special events calendar</label>
        <p className="text-sm text-slate-500">Upload a CSV or reference an existing one.</p>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
          value={data.forecast.promo_calendar_path}
          onChange={(event) => onForecastChange("promo_calendar_path", event.target.value)}
          disabled={disabled}
        />
      </div>

      <PromoUpload
        preview={promoPreview}
        onUpload={onPromoUpload}
        error={promoUploadError}
        isUploading={isUploadingPromo}
        disabled={disabled}
      />

      <div>
        <p className="text-sm font-medium text-slate-700">Apply events uplift to</p>
        <p className="text-sm text-slate-500">Scope controls which restaurants inherit event impact.</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {([
            { value: "all", label: "All restaurants" },
            { value: "selected", label: "Selected restaurants" },
          ] as { value: PromoScope; label: string }[]).map((option) => (
            <label
              key={option.value}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                data.forecast.promo_scope === option.value
                  ? "border-slate-900 bg-slate-900/5 text-slate-900"
                  : "border-slate-200 text-slate-600"
              } ${disabled ? "opacity-60" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                className="sr-only"
                name="promo-scope"
                checked={data.forecast.promo_scope === option.value}
                onChange={() => onScopeChange(option.value)}
                disabled={disabled}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
