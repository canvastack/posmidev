import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useParams } from 'react-router-dom'

// Resolve tenantId from route params or fallback to authenticated user's tenant_id
export function useTenantId() {
  const { tenantId: paramTenant } = useParams<{ tenantId?: string }>()
  const userTenant = useAuthStore(s => s.user?.tenant_id as string | undefined)
  // Future-proof: allow query string override if needed, but prefer param/user
  return useMemo(() => {
    return paramTenant ?? userTenant ?? ''
  }, [paramTenant, userTenant])
}