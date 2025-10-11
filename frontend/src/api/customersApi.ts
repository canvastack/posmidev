import { apiClient } from './client'
import { withTenant } from './helpers'

export type Customer = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  tags?: string[]
  created_at?: string
  updated_at?: string
  
  // Day 4: Photo & Delivery Location Enhancement
  photo_url?: string | null
  photo_thumb_url?: string | null
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_address?: string | null
  has_photo?: boolean
  has_delivery_location?: boolean
  delivery_coordinates?: string | null // Format: "lat,lng"
}

export type CustomerRequest = {
  name?: string
  email?: string | null
  phone?: string | null
  tags?: string[]
  
  // Day 4: Location fields
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_address?: string | null
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export const customersApi = {
  list: async (
    tenantId: string,
    params: { q?: string; page?: number; per_page?: number } = {}
  ): Promise<Paginated<Customer>> => {
    const url = withTenant(tenantId, '/customers')
    const { data } = await apiClient.get(url, { params })
    return data
  },

  get: async (tenantId: string, id: string): Promise<Customer> => {
    const url = withTenant(tenantId, `/customers/${id}`)
    const { data } = await apiClient.get(url)
    return data
  },

  create: async (
    tenantId: string,
    payload: CustomerRequest
  ): Promise<Customer> => {
    const url = withTenant(tenantId, '/customers')
    const { data } = await apiClient.post(url, payload)
    return data
  },

  update: async (
    tenantId: string,
    id: string,
    payload: CustomerRequest
  ): Promise<Customer> => {
    const url = withTenant(tenantId, `/customers/${id}`)
    const { data } = await apiClient.patch(url, payload)
    return data
  },

  remove: async (tenantId: string, id: string): Promise<void> => {
    const url = withTenant(tenantId, `/customers/${id}`)
    await apiClient.delete(url)
  },

  // Day 10: Photo Upload/Delete Methods
  uploadPhoto: async (
    tenantId: string,
    customerId: string,
    file: File,
    onUploadProgress?: (progress: number) => void
  ): Promise<{ photo_url: string; photo_thumb_url: string | null }> => {
    const url = withTenant(tenantId, `/customers/${customerId}/upload-photo`)
    const formData = new FormData()
    formData.append('photo', file)

    const { data } = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onUploadProgress(percentCompleted)
        }
      },
    })
    return data
  },

  deletePhoto: async (tenantId: string, customerId: string): Promise<void> => {
    const url = withTenant(tenantId, `/customers/${customerId}/photo`)
    await apiClient.delete(url)
  },
}