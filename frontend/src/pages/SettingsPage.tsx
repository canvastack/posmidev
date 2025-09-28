import { useEffect, useState } from 'react'
import { settingsApi, type TenantSettings } from '@/api/settingsApi'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LoadingSkeleton } from '@/components/states/LoadingSkeleton'
import { ErrorState } from '@/components/states/ErrorState'

export function SettingsPage() {
  const { tenantId } = useAuth()
  const [data, setData] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        if (!tenantId) throw new Error('No tenantId')
        const res = await settingsApi.get(tenantId)
        if (mounted) setData(res)
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Failed to load settings')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [tenantId])

  async function onSave() {
    if (!tenantId || !data) return
    setLoading(true)
    setError(null)
    try {
      const saved = await settingsApi.update(tenantId, data)
      setData(saved)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <Card className="max-w-xl space-y-4">
        <div>
          <Select
            label="Default Payment Method"
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'ewallet', label: 'E-Wallet' },
            ]}
            value={data?.payments?.default_method ?? 'cash'}
            onChange={(e) =>
              setData((prev) => ({
                ...(prev ?? {}),
                payments: {
                  ...(prev?.payments ?? {}),
                  default_method: e.target.value as any,
                },
              }))
            }
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave}>Save</Button>
        </div>
      </Card>
    </div>
  )
}

export default SettingsPage