import { useEffect, useMemo, useState } from 'react'
import { customersApi, type Customer } from '@/api/customersApi'
import { useTenantId } from '@/hooks/useTenantId'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import { useDebounce } from '@/hooks/useDebounce'

export function CustomersPage() {
  const tenantId = useTenantId()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)

  const debouncedQ = useDebounce(q, 300)

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    setLoading(true)
    customersApi
      .list(tenantId, { q: debouncedQ || undefined, page, per_page: perPage })
      .then((res) => {
        if (cancelled) return
        setRows(res.data)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))

    return () => {
      cancelled = true
    }
  }, [tenantId, debouncedQ, page, perPage])

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'tags', header: 'Tags', render: (r: Customer) => (r.tags || []).join(', ') },
    ],
    []
  )

  const lastPage = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers..."
          className="w-64"
        />
        <Button onClick={() => setPage(1)}>Search</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length}>Loading...</TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>No results</TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {c.render ? c.render(r) : (r as any)[c.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm">
        <div>
          Page {page} of {lastPage} — {total} total
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
          >
            Next
          </Button>
          <select
            className="border rounded p-1"
            value={perPage}
            onChange={(e) => { setPage(1); setPerPage(Number(e.target.value)); }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}