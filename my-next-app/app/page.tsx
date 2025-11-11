import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="max-w-2xl rounded-3xl bg-white p-10 shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Forecast Workbench
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">
          Plan confident forecasts with a guided setup
        </h1>
        <p className="mt-4 text-lg text-slate-500">
          Upload sales data first so we can detect cadence, coverage, and hierarchy,
          then fine-tune the configuration with clean YAML-ready outputs.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-base font-medium text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
          >
            Start with Data Upload
          </Link>
          <Link
            href="/setup"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-6 py-3 text-base font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Jump to Wizard
          </Link>
        </div>
      </div>
    </main>
  );
}
