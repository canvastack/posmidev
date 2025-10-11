import { apiClient } from './client'

export type Tenant = {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  logo?: string | null
  logo_url?: string | null
  logo_thumb_url?: string | null
  has_logo?: boolean
  latitude?: number | null
  longitude?: number | null
  location_address?: string | null
  has_location?: boolean
  location_coordinates?: { lat: number; lng: number } | null
  status?: 'active' | 'inactive' | 'pending' | 'banned'
  can_auto_activate_users?: boolean
  auto_activate_request_pending?: boolean
  auto_activate_requested_at?: string | null
  customers_count?: number
  created_at?: string
  updated_at?: string
}

export type TenantListResponse = {
  data: Tenant[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export const tenantsApi = {
  /**
   * Get all tenants (with pagination)
   * HQ users: see all tenants
   * Non-HQ users: see only own tenant
   */
  list: async (params?: {
    page?: number
    per_page?: number
  }): Promise<TenantListResponse> => {
    const { data } = await apiClient.get('/tenants', { params })
    return data
  },

  /**
   * Get single tenant by ID
   */
  get: async (tenantId: string): Promise<Tenant> => {
    const { data } = await apiClient.get(`/tenants/${tenantId}`)
    return data
  },

  /**
   * Create new tenant (HQ only)
   */
  create: async (payload: {
    name: string
    address?: string
    phone?: string
    logo?: string
    status?: 'active' | 'inactive' | 'pending' | 'banned'
  }): Promise<Tenant> => {
    const { data } = await apiClient.post('/tenants', payload)
    return data
  },

  /**
   * Update tenant
   * Accepts basic info + location fields
   */
  update: async (
    tenantId: string,
    payload: {
      name?: string
      address?: string
      phone?: string
      logo?: string
      latitude?: number | null
      longitude?: number | null
      location_address?: string | null
      status?: 'active' | 'inactive' | 'pending' | 'banned'
      can_auto_activate_users?: boolean
    }
  ): Promise<Tenant> => {
    const { data } = await apiClient.patch(`/tenants/${tenantId}`, payload)
    return data
  },

  /**
   * Delete tenant (HQ only)
   */
  delete: async (tenantId: string): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}`)
  },

  /**
   * Upload tenant logo
   * POST /api/v1/tenants/{tenantId}/upload-logo
   */
  uploadLogo: async (
    tenantId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ logo_url: string; logo_thumb_url: string; message: string }> => {
    const formData = new FormData()
    formData.append('logo', file)

    const { data } = await apiClient.post(
      `/tenants/${tenantId}/upload-logo`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            onProgress(progress)
          }
        },
      }
    )
    return data
  },

  /**
   * Delete tenant logo
   * DELETE /api/v1/tenants/{tenantId}/logo
   */
  deleteLogo: async (tenantId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/tenants/${tenantId}/logo`)
    return data
  },

  /**
   * Update tenant status (HQ only)
   */
  setStatus: async (
    tenantId: string,
    status: 'active' | 'inactive' | 'pending' | 'banned'
  ): Promise<Tenant> => {
    const { data } = await apiClient.post(`/tenants/${tenantId}/status`, {
      status,
    })
    return data
  },

  /**
   * Request auto-activation for users (Tenant Admin)
   */
  requestAutoActivation: async (tenantId: string): Promise<Tenant> => {
    const { data } = await apiClient.post(
      `/tenants/${tenantId}/auto-activation/request`
    )
    return data
  },

  /**
   * Approve auto-activation request (HQ only)
   */
  approveAutoActivation: async (tenantId: string): Promise<Tenant> => {
    const { data } = await apiClient.post(
      `/tenants/${tenantId}/auto-activation/approve`
    )
    return data
  },

  /**
   * Reject auto-activation request (HQ only)
   */
  rejectAutoActivation: async (tenantId: string): Promise<Tenant> => {
    const { data } = await apiClient.post(
      `/tenants/${tenantId}/auto-activation/reject`
    )
    return data
  },
}