import { apiClient } from './client'
import { withTenant } from './helpers'

export type TenantSettings = {
  payments?: {
    default_method?: 'ewallet' | 'card' | 'cash'
  }
}

export const settingsApi = {
  get: async (tenantId: string): Promise<TenantSettings> => {
    const url = withTenant(tenantId, '/settings')
    const { data } = await apiClient.get(url)
    return data
  },

  update: async (
    tenantId: string,
    payload: TenantSettings
  ): Promise<TenantSettings> => {
    const url = withTenant(tenantId, '/settings')
    const { data } = await apiClient.patch(url, payload)
    return data
  },
}