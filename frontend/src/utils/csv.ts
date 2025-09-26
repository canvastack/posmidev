export function toCSV<T extends Record<string, any>>(rows: T[], headers?: { key: keyof T; label: string }[]): string {
  if (rows.length === 0) return ''
  const cols = headers ?? (Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: String(k) })))
  const headerLine = cols.map((c) => escape(String(c.label))).join(',')
  const body = rows
    .map((r) => cols.map((c) => escape(String(r[c.key] ?? ''))).join(','))
    .join('\n')
  return `${headerLine}\n${body}`
}

function escape(v: string) {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}