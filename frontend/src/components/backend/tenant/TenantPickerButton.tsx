import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
//import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
//import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
//import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { tenantApi, type Tenant } from '@/api/tenantApi'
import { useTenantScopeStore } from '@/stores/tenantScopeStore'
import { LayoutGrid, List, ChevronsUpDown, ChevronUp, ChevronDown, Building2 } from 'lucide-react'

// Button that opens a searchable/sortable/paginated tenant picker in a modal.
// Shows current tenant (or HQ) as label. Allows switching tenant scope using the store.
export function TenantPickerButton() {
  const { user } = useAuth()
  const hqEnv = import.meta.env.VITE_HQ_TENANT_ID
  const isHq = hqEnv ? (user?.tenant_id === hqEnv) : (user?.roles?.includes('Super Admin') ?? false)

  const { selectedTenantId, setSelectedTenantId } = useTenantScopeStore()

  const [open, setOpen] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(false)

  // Fetch tenants (HQ only)
  useEffect(() => {
    if (!open || !isHq) return
    void fetchTenants()
  }, [open, page, perPage, q, sortBy, sortDir, isHq])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const resp = await tenantApi.getTenants({ page, per_page: perPage, q, sort_by: sortBy, sort_dir: sortDir } as any)
      setTenants(resp.data)
      // Use backend total for accurate pagination; fallback to data length if missing
      setTotal((resp as any).total ?? resp.meta?.total ?? resp.data.length)
    } catch (e) {
      // swallow errors for UX smoothness
    } finally {
      setLoading(false)
    }
  }

  const currentLabel = useMemo(() => {
    if (!isHq) return 'Tenant'
    const current = selectedTenantId ? tenants.find(t => t.id === selectedTenantId) : undefined
    return current?.name ?? 'HQ'
  }, [isHq, selectedTenantId, tenants])

  const toggleSort = (key: 'name' | 'created_at') => {
    if (sortBy !== key) {
      setSortBy(key)
      setSortDir('asc')
    } else {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / perPage))

  const handleSelect = (t: Tenant | null) => {
    setSelectedTenantId(t?.id ?? null)
    setOpen(false)
  }

  if (!isHq) {
    // Non-HQ users do not have global tenant visibility; keep UI clean (hide)
    return null
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="ghost"
        size="md"
        className="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer"
        title="Switch tenant"
      >
        <Building2 className="size-4" />
        <span className="hidden sm:inline">{currentLabel}</span>
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Select Tenant" size="xl">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <input
                  className="input pl-8"
                  placeholder="Search tenants..."
                  value={q}
                  onChange={e => { setPage(1); setQ(e.target.value) }}
                />
                {/* simple search icon */}
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <Button
                type="button"
                size="md"
                variant="ghost"
                onClick={() => setView(v => (v === 'table' ? 'grid' : 'table'))}
                title="Toggle view"
                className="inline-flex items-center gap-2"
              >
                {view === 'table' ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                <span className="hidden sm:inline">{view === 'table' ? 'Grid' : 'Table'} view</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rows:</span>
              <select className="px-2 py-1 rounded-md border border-border bg-background text-foreground" value={perPage} onChange={e => { setPage(1); setPerPage(Number(e.target.value)) }}>
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {view === 'table' ? (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                        <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-md">
                          Name {sortBy === 'name' ? (sortDir === 'asc' ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>) : <ChevronsUpDown className="size-4"/>}
                        </button>
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                        <button type="button" onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-md">
                          Created {sortBy === 'created_at' ? (sortDir === 'asc' ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>) : <ChevronsUpDown className="size-4"/>}
                        </button>
                      </th>
                      <th className="px-4 py-2"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Loading...</td></tr>
                    ) : tenants.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No tenants found.</td></tr>
                    ) : (
                      tenants.map(t => (
                        <tr key={t.id} className="hover:bg-accent/60">
                          <td className="px-4 py-2 font-medium">{t.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{t.id}</td>
                          <td className="px-4 py-2 text-muted-foreground">{(t as any).created_at ?? '-'}</td>
                          <td className="px-4 py-2 text-right">
                            <Button variant="primary" size="sm" onClick={() => handleSelect(t)}>Select</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="text-muted-foreground">Page {page} of {pageCount}</div>
                <div className="inline-flex items-center gap-2">
                  <Button variant="ghost" className="px-2 py-1 rounded-md border border-border disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                  <Button variant="ghost" className="px-2 py-1 rounded-md border border-border disabled:opacity-50" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Next</Button>
                </div>
              </div>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loading ? (
                <div className="col-span-full text-center text-muted-foreground py-6">Loading...</div>
              ) : tenants.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-6">No tenants found.</div>
              ) : (
                tenants.map(t => (
                  <button key={t.id} onClick={() => handleSelect(t)} className="card text-left transition-colors duration-200 hover:bg-accent/60 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg gradient-secondary flex items-center justify-center text-white font-bold">
                        {(t.name || 'T')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.id}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">Page {page} of {pageCount}</div>
              <div className="inline-flex items-center gap-2">
                <Button variant="ghost" className="px-2 py-1 rounded-md border border-border disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                <Button variant="ghost" className="px-2 py-1 rounded-md border border-border disabled:opacity-50" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Next</Button>
              </div>
            </div>
            </>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="inline-flex items-center gap-2">
              <button className="px-2 py-1 rounded-md border border-border" onClick={() => handleSelect(null)}>HQ (no override)</button>
              {selectedTenantId && <Badge>Selected: {selectedTenantId}</Badge>}
            </div>
            <div className="text-muted-foreground">Total: {total}</div>
          </div>
        </div>
      </Modal>
    </>
  )
}