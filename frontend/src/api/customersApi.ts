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
}

export type CustomerRequest = {
  name?: string
  email?: string | null
  phone?: string | null
  tags?: string[]
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
}