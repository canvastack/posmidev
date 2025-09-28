import { useEffect, useMemo, useState } from 'react'
import { eavApi, type EavBlueprint, type EavField } from '@/api/eavApi'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/hooks/useAuth'

interface CustomerEavPanelProps {
  tenantId: string
  customerId: string
  open: boolean
  onClose: () => void
}

export function CustomerEavPanel({ tenantId, customerId, open, onClose }: CustomerEavPanelProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [blueprint, setBlueprint] = useState<EavBlueprint | null>(null)
  const [fields, setFields] = useState<EavField[]>([])
  const [values, setValues] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const canEdit = useMemo(() => (user?.roles || []).includes('customers.attributes.update'), [user])

  // Load blueprint (first for target customer) and then attributes
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        // 1) list blueprints
        const bps = await eavApi.listBlueprints(tenantId, 'customer')
        const bp = bps[0]
        if (!bp) {
          setBlueprint(null)
          setFields([])
          setValues({})
          return
        }
        if (cancelled) return
        setBlueprint(bp)
        // 2) fetch full blueprint with fields
        const bpFull = await eavApi.getBlueprint(tenantId, bp.id)
        if (cancelled) return
        setFields((bpFull as any).fields || [])
        // 3) fetch current customer values
        const { attributes } = await eavApi.getCustomerAttributes(tenantId, customerId)
        if (cancelled) return
        setValues(attributes || {})
      } catch (e: any) {
        console.error('EAV init failed', e)
        setError(e?.response?.data?.message || e.message || 'Failed loading EAV data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, tenantId, customerId])

  const handleChange = (key: string, type: EavField['type'], raw: any) => {
    // Best-effort client coercion; server still coerces
    let v: any = raw
    if (type === 'number') v = raw === '' ? null : Number(raw)
    if (type === 'boolean') v = Boolean(raw)
    setValues(prev => ({ ...prev, [key]: v }))
  }

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      await eavApi.putCustomerAttributes(tenantId, customerId, { attributes: values })
      onClose()
    } catch (e: any) {
      console.error('Save EAV failed', e)
      setError(e?.response?.data?.message || e.message || 'Failed saving attributes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" widthClass="w-[420px]" title="Customer Attributes">
      <div className="space-y-4">
        {loading ? (
          <div className="p-2 text-sm">Loading...</div>
        ) : !blueprint ? (
          <div className="p-2 text-sm text-gray-600">No customer blueprint found.</div>
        ) : (
          <>
            <div>
              <div className="text-sm font-semibold">{blueprint.name}</div>
              <div className="text-xs text-gray-500">Target: {blueprint.target_entity}</div>
            </div>

            <div className="space-y-3">
              {fields.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((f) => (
                <div key={f.id} className="space-y-1">
                  <div className="text-xs font-medium">{f.label}</div>
                  {f.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <Switch checked={Boolean(values[f.key])} onChange={(v) => handleChange(f.key, f.type, v)} />
                      <span className="text-xs text-gray-600">{String(Boolean(values[f.key]))}</span>
                    </div>
                  ) : f.type === 'date' ? (
                    <Input type="date" value={values[f.key] || ''} onChange={(e) => handleChange(f.key, f.type, e.target.value)} />
                  ) : f.type === 'number' ? (
                    <Input type="number" value={values[f.key] ?? ''} onChange={(e) => handleChange(f.key, f.type, e.target.value)} />
                  ) : (
                    <Input value={values[f.key] ?? ''} onChange={(e) => handleChange(f.key, f.type, e.target.value)} />
                  )}
                </div>
              ))}
            </div>

            {error && <div className="text-xs text-red-600">{error}</div>}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={save} disabled={saving || !canEdit}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}