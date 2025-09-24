import { apiClient } from './client';
import type { User } from '../types';

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UserQuery {
  page?: number;
  per_page?: number;
  q?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  display_name?: string | null;
  status?: User['status'];
  photo?: string | null;
  phone_number?: string | null;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  display_name?: string | null;
  status?: User['status'];
  photo?: string | null;
  phone_number?: string | null;
}

export const userApi = {
  getUsers: async (tenantId: string, params: UserQuery = {}): Promise<Paginated<User>> => {
    const response = await apiClient.get(`/tenants/${tenantId}/users`, { params });
    return response.data;
  },

  getUser: async (tenantId: string, userId: string): Promise<User> => {
    const response = await apiClient.get(`/tenants/${tenantId}/users/${userId}`);
    return response.data;
  },

  createUser: async (tenantId: string, payload: CreateUserPayload): Promise<User> => {
    const response = await apiClient.post(`/tenants/${tenantId}/users`, payload);
    return response.data;
  },

  updateUser: async (tenantId: string, userId: string, payload: UpdateUserPayload): Promise<User> => {
    const response = await apiClient.put(`/tenants/${tenantId}/users/${userId}`, payload);
    return response.data;
  },

  deleteUser: async (tenantId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/users/${userId}`);
  },

  uploadUserPhoto: async (tenantId: string, file: File): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/tenants/${tenantId}/uploads/user-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};