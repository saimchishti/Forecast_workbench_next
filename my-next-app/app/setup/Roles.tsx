"use client";

import { EnvironmentKey, Role } from "./types";

type RolesProps = {
  role: Role;
  environment: EnvironmentKey;
  onRoleChange: (role: Role) => void;
  onEnvironmentChange: (env: EnvironmentKey) => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
};

const roleCopy: Record<Role, string> = {
  viewer: "View-only",
  editor: "Can edit",
  approver: "Final approver",
};

export default function RolesBanner({
  role,
  environment,
  onRoleChange,
  onEnvironmentChange,
  lastEditedBy,
  lastEditedAt,
}: RolesProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">
          User: {role.charAt(0).toUpperCase() + role.slice(1)}
        </p>
        <p className="text-xs text-slate-500">{roleCopy[role]}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Role">
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            value={role}
            onChange={(event) => onRoleChange(event.target.value as Role)}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="approver">Approver</option>
          </select>
        </Field>
        <Field label="Environment">
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            value={environment}
            onChange={(event) => onEnvironmentChange(event.target.value as EnvironmentKey)}
          >
            <option value="dev">Dev</option>
            <option value="prod">Prod</option>
          </select>
        </Field>
      </div>
      {lastEditedBy ? (
        <p className="text-xs text-slate-500">
          Last edited by {lastEditedBy} on {formatTimestamp(lastEditedAt)}
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function formatTimestamp(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}
