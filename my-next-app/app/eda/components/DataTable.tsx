type DataRecord = Record<string, unknown>;

export default function DataTable({ data }: { data: DataRecord[] }) {
  if (!data || data.length === 0)
    return (
      <p className="mt-2 italic text-gray-500">No preview available — please upload a dataset.</p>
    );

  const columns = Object.keys(data[0]);

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-md">
      <table className="min-w-full text-left text-sm font-mono">
        <thead className="border-b bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap border-r px-3 py-2 font-semibold text-gray-700"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} transition hover:bg-indigo-50`}
            >
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap border-r px-3 py-2 text-gray-700">
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
