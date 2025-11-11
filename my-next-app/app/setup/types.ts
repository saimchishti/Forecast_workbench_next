export const DATA_SUMMARY_STORAGE_KEY = "forecastWorkbench:dataSummary";

export type Role = "viewer" | "editor" | "approver";
export type EnvironmentKey = "dev" | "prod";
export type Granularity = "daily" | "weekly" | "monthly";
export type PromoScope = "all" | "selected";

export type ForecastDetails = {
  horizon_days: number;
  lead_time_days: number;
  granularity: Granularity;
  hierarchy: string;
  country: string;
  promo_calendar_path: string;
  promo_scope: PromoScope;
};

export type ForecastConfigForm = {
  config_version: string;
  version_tag: string;
  meta: {
    name: string;
    created_by: string;
    notes: string;
  };
  forecast: ForecastDetails;
};

export type DetectedDataSummary = {
  columns: string[];
  date_column: string;
  target_column: string | null;
  start_date: string;
  end_date: string;
  frequency: Granularity;
  hierarchy: string;
  rows: number;
  notes: string;
  suggested_config: {
    forecast_horizon_days: number;
    lead_time_days: number;
    granularity: Granularity;
    hierarchy: string;
    country: string;
  };
};

export type HistoryEntry = {
  env: string;
  path: string;
  created_at: string;
  created_by: string;
  version_tag: string;
  warnings: string[];
  name: string;
};

export type PromoPreview = {
  path: string;
  preview: Record<string, string>[];
  invalid_rows: { row: Record<string, string>; issues: string[] }[];
  total_rows: number;
};

export type HierarchyMapping = {
  restaurant_to_city: Record<string, string>;
  city_to_country: Record<string, string>;
};

export type RollupPreview = {
  cities: Record<string, number>;
  countries: Record<string, number>;
};
