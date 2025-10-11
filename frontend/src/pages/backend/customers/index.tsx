import { Fragment, useEffect, useMemo, useState } from 'react'
import { customersApi, type Customer, type Paginated as PaginatedCustomers } from '@/api/customersApi'
import { tenantApi, type Tenant, type Paginated as PaginatedTenants } from '@/api/tenantApi'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { CustomerEavPanel } from '@/components/domain/customers/CustomerEavPanel'
import { CustomerFormDialog } from '@/components/domain/customers/CustomerFormDialog'
import { MapPin, UserCircle, Plus, Edit } from 'lucide-react'

// Customers page behavior:
// - HQ user with tenants.view: list tenants (top table), expandable to show that tenant's customers (AJAX) with pagination
// - Non-HQ: show own-tenant customers only (no tenantId in URL)
export function CustomersPage() {
  const { user, tenantId } = useAuth()

  // Detect HQ user (by tenant match) and permission tenants.view from roles array
  const hqTenantId = (import.meta as any).env?.VITE_HQ_TENANT_ID || ''
  const isHqUser = Boolean(user?.tenant_id && hqTenantId && user?.tenant_id === hqTenantId)
  const canViewTenants = (user?.roles || []).includes('tenants.view') || false

  // Shared search debounce for customers
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 300)

  // State for non-HQ customers table
  const [custLoading, setCustLoading] = useState(false)
  const [custRows, setCustRows] = useState<Customer[]>([])
  const [custTotal, setCustTotal] = useState(0)
  const [custPage, setCustPage] = useState(1)
  const [custPerPage, setCustPerPage] = useState(10)

  // State for HQ tenants table
  const [tenantsLoading, setTenantsLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantsPage, setTenantsPage] = useState(1)
  const [tenantsPerPage, setTenantsPerPage] = useState(10)
  const [tenantsTotal, setTenantsTotal] = useState(0)

  // Expandable rows state for HQ: cache per-tenant customers
  type TenantRowState = { expanded: boolean; page: number; perPage: number; q: string; loading: boolean; data?: PaginatedCustomers<Customer> }
  const [rowState, setRowState] = useState<Record<string, TenantRowState>>({})

  // Fetch non-HQ customers
  useEffect(() => {
    if (isHqUser && canViewTenants) return // HQ path handled separately
    if (!tenantId) return
    let cancelled = false
    setCustLoading(true)
    customersApi
      .list(tenantId, { q: debouncedQ || undefined, page: custPage, per_page: custPerPage })
      .then((res) => { if (!cancelled) { setCustRows(res.data); setCustTotal(res.total) } })
      .finally(() => setCustLoading(false))
    return () => { cancelled = true }
  }, [isHqUser, canViewTenants, tenantId, debouncedQ, custPage, custPerPage])

  // Fetch tenants for HQ view
  useEffect(() => {
    if (!(isHqUser && canViewTenants)) return
    let cancelled = false
    setTenantsLoading(true)
    tenantApi.getTenants({ page: tenantsPage, per_page: tenantsPerPage })
      .then((res: PaginatedTenants<Tenant>) => { if (!cancelled) { setTenants(res.data); setTenantsTotal(res.total) } })
      .finally(() => setTenantsLoading(false))
    return () => { cancelled = true }
  }, [isHqUser, canViewTenants, tenantsPage, tenantsPerPage])

  const custColumns = useMemo(
    () => [
      {
        key: 'photo',
        header: 'Photo',
        render: (r: Customer) =>
          r.photo_thumb_url || r.photo_url ? (
            <img
              src={r.photo_thumb_url || r.photo_url}
              alt={r.name}
              className="w-10 h-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          ),
      },
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email', render: (r: Customer) => r.email || '-' },
      { key: 'phone', header: 'Phone', render: (r: Customer) => r.phone || '-' },
      {
        key: 'location',
        header: 'Delivery Location',
        render: (r: Customer) =>
          r.has_delivery_location ? (
            <div className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
              <MapPin className="h-3 w-3" />
              <span>Tersedia</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          ),
      },
      { key: 'tags', header: 'Tags', render: (r: Customer) => (r.tags || []).join(', ') || '-' },
      {
        key: '__actions',
        header: 'Actions',
        render: (r: Customer, targetTenantId?: string) => (
          <div className="flex items-center gap-2">
            <button
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              onClick={() => openEditDialog(r, targetTenantId)}
              title="Edit customer"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              className="text-primary-700 hover:underline text-sm"
              onClick={() => openEav(r)}
            >
              EAV
            </button>
          </div>
        ),
      },
    ],
    []
  )

  const custLastPage = Math.max(1, Math.ceil(custTotal / custPerPage))
  const tenantsLastPage = Math.max(1, Math.ceil(tenantsTotal / tenantsPerPage))

  // HQ interactions
  const ensureRowState = (id: string): TenantRowState => rowState[id] || { expanded: false, page: 1, perPage: 10, q: '', loading: false }
  const toggleExpand = async (t: Tenant) => {
    const cur = ensureRowState(t.id)
    const next = { ...cur, expanded: !cur.expanded }
    setRowState(prev => ({ ...prev, [t.id]: next }))
    if (!cur.expanded) await fetchTenantCustomers(t.id, cur.page, cur.perPage, cur.q)
  }
  const fetchTenantCustomers = async (tenant: string, page: number, perPage: number, q?: string) => {
    try {
      setRowState(prev => ({ ...prev, [tenant]: { ...ensureRowState(tenant), loading: true } }))
      const res = await customersApi.list(tenant, { page, per_page: perPage, q })
      setRowState(prev => ({ ...prev, [tenant]: { ...ensureRowState(tenant), expanded: true, loading: false, data: res, page: res.current_page, perPage: res.per_page } }))
    } catch (e) {
      setRowState(prev => ({ ...prev, [tenant]: { ...ensureRowState(tenant), loading: false } }))
      console.error('Failed loading customers', e)
    }
  }

  if (isHqUser && canViewTenants) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-500">Select a tenant to view its customers</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>&nbsp;</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenantsLoading ? (
              <TableRow><TableCell colSpan={4} className="py-8">Loading tenants...</TableCell></TableRow>
            ) : tenants.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8">No tenants</TableCell></TableRow>
            ) : (
              tenants.map((t) => {
                const state = ensureRowState(t.id)
                const customersCount = (state.data?.total ?? undefined) // will be filled after expand; could be enhanced with backend count
                return (
                  <Fragment key={t.id}>
                    <TableRow>
                      <TableCell className="w-10">
                        <button onClick={() => toggleExpand(t)} className="text-gray-600 hover:text-gray-900">{state.expanded ? '▾' : '▸'}</button>
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><span className="inline-flex px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">{t.status ?? 'pending'}</span></TableCell>
                      <TableCell>{(t as any).customers_count ?? customersCount ?? '-'}</TableCell>
                    </TableRow>
                    {state.expanded && (
                      <tr>
                        <td colSpan={4} className="bg-gray-50 dark:bg-gray-900/20">
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={state.q}
                                  onChange={(e) => setRowState(prev => ({ ...prev, [t.id]: { ...ensureRowState(t.id), q: e.target.value, expanded: true } }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') fetchTenantCustomers(t.id, 1, state.perPage, state.q) }}
                                  placeholder="Search customers..."
                                  className="w-64"
                                />
                                <Button onClick={() => fetchTenantCustomers(t.id, 1, state.perPage, state.q)}>Search</Button>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-sm text-muted-foreground">Page {state.data?.current_page || 1} of {state.data?.last_page || 1} — {state.data?.total || 0} customers</div>
                                <Button 
                                  onClick={() => openCreateDialog(t.id)} 
                                  className="btn btn-primary flex items-center gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Tambah Customer
                                </Button>
                              </div>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {custColumns.map(c => <TableHead key={c.key}>{c.header}</TableHead>)}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {state.loading ? (
                                  <TableRow><TableCell colSpan={custColumns.length}>Loading...</TableCell></TableRow>
                                ) : !state.data || state.data.data.length === 0 ? (
                                  <TableRow><TableCell colSpan={custColumns.length}>No results</TableCell></TableRow>
                                ) : (
                                  state.data.data.map((r) => (
                                    <TableRow key={r.id}>
                                      {custColumns.map((c) => (
                                        <TableCell key={c.key}>{c.render ? c.render(r, t.id) : (r as any)[c.key]}</TableCell>
                                      ))}
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                            <div className="flex items-center justify-between text-sm">
                              <div></div>
                              <div className="flex items-center gap-2">
                                <Button variant="secondary" disabled={(state.data?.current_page || 1) <= 1} onClick={() => fetchTenantCustomers(t.id, Math.max(1, (state.data?.current_page || 1) - 1), state.perPage, state.q)}>Prev</Button>
                                <Button variant="secondary" disabled={(state.data?.current_page || 1) >= (state.data?.last_page || 1)} onClick={() => fetchTenantCustomers(t.id, Math.min((state.data?.last_page || 1), (state.data?.current_page || 1) + 1), state.perPage, state.q)}>Next</Button>
                                <select className="border rounded p-1" value={state.perPage} onChange={(e) => fetchTenantCustomers(t.id, 1, Number(e.target.value), state.q)}>
                                  {[10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-end text-sm">
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={tenantsPage <= 1} onClick={() => setTenantsPage(p => Math.max(1, p - 1))}>Prev</Button>
            <Button variant="secondary" disabled={tenantsPage >= tenantsLastPage} onClick={() => setTenantsPage(p => Math.min(tenantsLastPage, p + 1))}>Next</Button>
            <select className="border rounded p-1" value={tenantsPerPage} onChange={(e) => { setTenantsPage(1); setTenantsPerPage(Number(e.target.value)); }}>
              {[10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>
      </div>
    )
  }

  // Local state for EAV panel
  const [eavOpen, setEavOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // Local state for Customer Form Dialog
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [dialogTenantId, setDialogTenantId] = useState<string | null>(null)

  const openEav = (c: Customer) => {
    setSelectedCustomerId(c.id)
    setEavOpen(true)
  }

  const openCreateDialog = (targetTenantId?: string) => {
    setEditingCustomer(null)
    setDialogTenantId(targetTenantId || tenantId || null)
    setFormDialogOpen(true)
  }

  const openEditDialog = (c: Customer, targetTenantId?: string) => {
    setEditingCustomer(c)
    setDialogTenantId(targetTenantId || tenantId || null)
    setFormDialogOpen(true)
  }

  const handleFormSuccess = () => {
    // Refresh customer list
    if (isHqUser && canViewTenants) {
      // Reload tenants and refresh expanded rows
      setTenantsPage((p) => p) // Trigger re-fetch
      // Also refresh the specific tenant's customer list if it's expanded
      if (dialogTenantId) {
        const state = ensureRowState(dialogTenantId)
        if (state.expanded) {
          fetchTenantCustomers(dialogTenantId, state.page, state.perPage, state.q)
        }
      }
    } else {
      // Reload local customer list
      setCustPage((p) => p) // Trigger re-fetch via useEffect
    }
    setFormDialogOpen(false)
    setDialogTenantId(null)
  }

  // Non-HQ table
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers..." className="w-64" />
          <Button onClick={() => setCustPage(1)}>Search</Button>
        </div>
        <Button onClick={openCreateDialog} className="btn btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tambah Customer
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {custColumns.map((c) => (<TableHead key={c.key}>{c.header}</TableHead>))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {custLoading ? (
            <TableRow><TableCell colSpan={custColumns.length}>Loading...</TableCell></TableRow>
          ) : custRows.length === 0 ? (
            <TableRow><TableCell colSpan={custColumns.length}>No results</TableCell></TableRow>
          ) : (
            custRows.map((r) => (
              <TableRow key={r.id}>
                {custColumns.map((c) => (<TableCell key={c.key}>{c.render ? c.render(r) : (r as any)[c.key]}</TableCell>))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm">
        <div>Page {custPage} of {custLastPage} — {custTotal} total</div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={custPage <= 1} onClick={() => setCustPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <Button variant="secondary" disabled={custPage >= custLastPage} onClick={() => setCustPage((p) => Math.min(custLastPage, p + 1))}>Next</Button>
          <select className="border rounded p-1" value={custPerPage} onChange={(e) => { setCustPage(1); setCustPerPage(Number(e.target.value)); }}>
            {[10, 20, 50].map((n) => (<option key={n} value={n}>{n} / page</option>))}
          </select>
        </div>
      </div>

      {tenantId && selectedCustomerId && (
        <CustomerEavPanel
          tenantId={tenantId}
          customerId={selectedCustomerId}
          open={eavOpen}
          onClose={() => setEavOpen(false)}
        />
      )}

      {(tenantId || dialogTenantId) && (
        <CustomerFormDialog
          isOpen={formDialogOpen}
          onClose={() => {
            setFormDialogOpen(false)
            setDialogTenantId(null)
          }}
          tenantId={dialogTenantId || tenantId!}
          customer={editingCustomer}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

export default CustomersPage