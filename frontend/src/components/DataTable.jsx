export default function DataTable({ columns, rows, emptyMessage = 'لا توجد بيانات' }) {
  if (!rows?.length) {
    return (
      <div className="data-table-empty">{emptyMessage}</div>
    )
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="data-table w-full text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`py-3 px-3 ${col.className || 'text-right'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
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
