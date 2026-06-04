export default function DataTable({ columns, rows, emptyMessage = 'لا توجد بيانات' }) {
  if (!rows?.length) {
    return (
      <div className="card text-center text-gray-500 py-10">{emptyMessage}</div>
    )
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-surface-border bg-surface/50">
            {columns.map((col) => (
              <th key={col.key} className={`py-3 px-3 ${col.className || 'text-right'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              className="border-b border-surface-border/50 hover:bg-surface-hover/50"
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-3 ${col.className || 'text-right'}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
