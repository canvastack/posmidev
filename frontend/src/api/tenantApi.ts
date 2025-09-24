import { apiClient } from './client';

export interface Tenant {
  id: string;
  name: string;
  status?: 'active' | 'inactive' | 'pending' | 'banned';
  address?: string | null;
  phone?: string | null;
  logo?: string | null;
  can_auto_activate_users?: boolean;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface TenantQuery {
  page?: number;
  per_page?: number;
}

export const tenantApi = {
  getTenants: async (params: TenantQuery = {}): Promise<Paginated<Tenant>> => {
    const response = await apiClient.get('/tenants', { params });
    return response.data;
  },
  getTenant: async (tenantId: string): Promise<Tenant> => {
    const response = await apiClient.get(`/tenants/${tenantId}`);
    return response.data;
  },
};