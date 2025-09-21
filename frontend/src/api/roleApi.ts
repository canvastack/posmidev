import { apiClient } from './client';
import { Role, RoleForm, Permission } from '../types';

export const roleApi = {
  getRoles: async (tenantId: string): Promise<Role[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/roles`);
    return response.data;
  },

  getRole: async (tenantId: string, roleId: string): Promise<Role> => {
    const response = await apiClient.get(`/tenants/${tenantId}/roles/${roleId}`);
    return response.data;
  },

  createRole: async (tenantId: string, data: RoleForm): Promise<Role> => {
    const response = await apiClient.post(`/tenants/${tenantId}/roles`, data);
    return response.data;
  },

  updateRole: async (tenantId: string, roleId: string, data: RoleForm): Promise<Role> => {
    const response = await apiClient.put(`/tenants/${tenantId}/roles/${roleId}`, data);
    return response.data;
  },

  deleteRole: async (tenantId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/roles/${roleId}`);
  },

  getPermissions: async (tenantId: string): Promise<Permission[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/permissions`);
    return response.data;
  },
};