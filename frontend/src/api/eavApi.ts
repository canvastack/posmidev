import { apiClient } from './client'
import { withTenant } from './helpers'

export type EavField = {
  id: string
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'json'
  required?: boolean
  options?: any[] | null
  sort_order?: number
}

export type EavBlueprint = {
  id: string
  tenant_id: string
  target_entity: string
  name: string
  status: string
  created_at?: string
  updated_at?: string
}

export type EavBlueprintWithFields = EavBlueprint & { fields: EavField[] }

export type EavAttributesResponse = {
  entity_id: string
  attributes: Record<string, any>
}

export const eavApi = {
  // List blueprints for a target (e.g., 'customer')
  listBlueprints: async (tenantId: string, target: string): Promise<EavBlueprint[]> => {
    const url = withTenant(tenantId, `/blueprints`)
    const { data } = await apiClient.get(url, { params: { target } })
    return data
  },

  // Get a single blueprint with fields
  getBlueprint: async (tenantId: string, blueprintId: string): Promise<EavBlueprintWithFields> => {
    const url = withTenant(tenantId, `/blueprints/${blueprintId}`)
    const { data } = await apiClient.get(url)
    return data
  },

  // Get attributes for a customer
  getCustomerAttributes: async (tenantId: string, customerId: string): Promise<EavAttributesResponse> => {
    const url = withTenant(tenantId, `/customers/${customerId}/attributes`)
    const { data } = await apiClient.get(url)
    return data
  },

  // Put attributes for a customer
  putCustomerAttributes: async (
    tenantId: string,
    customerId: string,
    payload: { attributes: Record<string, any> }
  ): Promise<EavAttributesResponse> => {
    const url = withTenant(tenantId, `/customers/${customerId}/attributes`)
    const { data } = await apiClient.put(url, payload)
    return data
  },
}