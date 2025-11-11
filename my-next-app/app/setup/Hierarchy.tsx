"use client";

import { HierarchyMapping, RollupPreview } from "./types";

type HierarchyProps = {
  mapping: HierarchyMapping | null;
  onChange: (mapping: HierarchyMapping) => void;
  onSave: (mapping: HierarchyMapping) => Promise<void>;
  onTestRollup: () => Promise<RollupPreview | null>;
  rollupPreview: RollupPreview | null;
  disabled: boolean;
};

const defaultMapping: HierarchyMapping = {
  restaurant_to_city: { "Restaurant A": "Mumbai" },
  city_to_country: { Mumbai: "India" },
};

export default function Hierarchy({
  mapping,
  onChange,
  onSave,
  onTestRollup,
  rollupPreview,
  disabled,
}: HierarchyProps) {
  const value = mapping ?? defaultMapping;

  const handleRestaurantChange = (index: number, field: "restaurant" | "city", nextValue: string) => {
    const entries = Object.entries(value.restaurant_to_city);
    const current = entries[index] ?? ["", ""];
    if (field === "restaurant") {
      current[0] = nextValue;
    } else {
      current[1] = nextValue;
    }
    entries[index] = current;
    const nextRestaurantToCity = entries.reduce<Record<string, string>>((acc, [restaurant, city]) => {
      if (restaurant.trim()) acc[restaurant] = city;
      return acc;
    }, {});
    onChange({ ...value, restaurant_to_city: nextRestaurantToCity });
  };

  const handleCityChange = (index: number, field: "city" | "country", nextValue: string) => {
    const entries = Object.entries(value.city_to_country);
    const current = entries[index] ?? ["", ""];
    if (field === "city") {
      current[0] = nextValue;
    } else {
      current[1] = nextValue;
    }
    entries[index] = current;
    const nextCityToCountry = entries.reduce<Record<string, string>>((acc, [city, country]) => {
      if (city.trim()) acc[city] = country;
      return acc;
    }, {});
    onChange({ ...value, city_to_country: nextCityToCountry });
  };

  const addRestaurantRow = () => {
    onChange({ ...value, restaurant_to_city: { ...value.restaurant_to_city, "": "" } });
  };

  const addCityRow = () => {
    onChange({ ...value, city_to_country: { ...value.city_to_country, "": "" } });
  };

  const handleSave = async () => {
    await onSave(value);
  };

  const handleTest = async () => {
    await onTestRollup();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Hierarchy mapping</p>
          <p className="text-xs text-slate-500">
            Map restaurant &gt; city &gt; country so roll-ups stay accurate.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={disabled}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            Test roll-up
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-60"
          >
            Sync mapping
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MappingTable
          title="Restaurant &gt; City"
          rows={Object.entries(value.restaurant_to_city)}
          firstPlaceholder="Restaurant ID"
          secondPlaceholder="City"
          firstKey="restaurant"
          secondKey="city"
          onChange={(index, column, val) =>
            handleRestaurantChange(index, column as "restaurant" | "city", val)
          }
          onAdd={addRestaurantRow}
          disabled={disabled}
        />
        <MappingTable
          title="City &gt; Country"
          rows={Object.entries(value.city_to_country)}
          firstPlaceholder="City"
          secondPlaceholder="Country"
          firstKey="city"
          secondKey="country"
          onChange={(index, column, val) => handleCityChange(index, column as "city" | "country", val)}
          onAdd={addCityRow}
          disabled={disabled}
        />
      </div>

      {rollupPreview ? (
        <div className="rounded-xl border border-emerald-100 bg-white p-4 text-sm text-emerald-700">
          <p className="font-semibold">Mock roll-up</p>
          <p className="text-xs text-emerald-500">Sum of the sample payload by hierarchy.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-500">Cities</p>
              <ul className="mt-1 space-y-1">
                {Object.entries(rollupPreview.cities).map(([city, value]) => (
                  <li key={city}>
                    {city}: <span className="font-semibold">{value.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-500">Countries</p>
              <ul className="mt-1 space-y-1">
                {Object.entries(rollupPreview.countries).map(([country, value]) => (
                  <li key={country}>
                    {country}: <span className="font-semibold">{value.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type MappingTableProps = {
  title: string;
  rows: [string, string][];
  firstPlaceholder: string;
  secondPlaceholder: string;
  firstKey: string;
  secondKey: string;
  onChange: (index: number, column: string, value: string) => void;
  onAdd: () => void;
  disabled: boolean;
};

function MappingTable({
  title,
  rows,
  firstPlaceholder,
  secondPlaceholder,
  firstKey,
  secondKey,
  onChange,
  onAdd,
  disabled,
}: MappingTableProps) {
  return (
    <div className="rounded-xl border border-white bg-white/70 p-4 shadow-inner shadow-white/40">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          + Add
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {rows.map(([first, second], index) => (
          <div key={`${title}-${index}`} className="grid gap-2">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
              placeholder={firstPlaceholder}
              value={first}
              onChange={(event) => onChange(index, firstKey, event.target.value)}
              disabled={disabled}
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
              placeholder={secondPlaceholder}
              value={second}
              onChange={(event) => onChange(index, secondKey, event.target.value)}
              disabled={disabled}
            />
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">No mappings yet.</p>
        ) : null}
      </div>
    </div>
  );
}
