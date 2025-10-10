import { apiClient } from './client';

/**
 * Phase 9: Supplier Management API + Enhancement (Image & Location)
 * All endpoints are tenant-scoped and respect immutable multi-tenancy rules
 */

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  products_count?: number;
  // Enhancement: Image fields
  image_url: string | null;
  image_thumb_url: string | null;
  has_image?: boolean;
  // Enhancement: Location fields
  latitude: number | null;
  longitude: number | null;
  location_address: string | null;
  has_location?: boolean;
  location_coordinates?: { lat: number; lng: number } | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierForm {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
  notes?: string;
  // Enhancement: Location fields
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string | null;
}

interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const supplierApi = {
  /**
   * Get paginated list of suppliers for a tenant
   */
  getSuppliers: async (tenantId: string, params?: PaginationParams): Promise<PaginatedResponse<Supplier>> => {
    const response = await apiClient.get(`/tenants/${tenantId}/suppliers`, { params });
    return response.data;
  },

  /**
   * Get a single supplier by ID
   */
  getSupplier: async (tenantId: string, supplierId: string): Promise<Supplier> => {
    const response = await apiClient.get(`/tenants/${tenantId}/suppliers/${supplierId}`);
    return response.data.data;
  },

  /**
   * Create a new supplier
   */
  createSupplier: async (tenantId: string, data: SupplierForm): Promise<Supplier> => {
    const response = await apiClient.post(`/tenants/${tenantId}/suppliers`, data);
    return response.data.data || response.data;
  },

  /**
   * Update an existing supplier
   */
  updateSupplier: async (tenantId: string, supplierId: string, data: SupplierForm): Promise<Supplier> => {
    const response = await apiClient.patch(`/tenants/${tenantId}/suppliers/${supplierId}`, data);
    return response.data.data || response.data;
  },

  /**
   * Delete a supplier (only if no products attached)
   */
  deleteSupplier: async (tenantId: string, supplierId: string): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/suppliers/${supplierId}`);
  },

  /**
   * Get all products from a supplier
   */
  getSupplierProducts: async (tenantId: string, supplierId: string, params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get(`/tenants/${tenantId}/suppliers/${supplierId}/products`, { params });
    return response.data;
  },

  /**
   * Upload supplier image (creates thumbnail automatically)
   */
  uploadImage: async (tenantId: string, supplierId: string, imageFile: File): Promise<{ message: string; image_url: string; image_thumb_url: string }> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await apiClient.post(
      `/tenants/${tenantId}/suppliers/${supplierId}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Delete supplier image
   */
  deleteImage: async (tenantId: string, supplierId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/suppliers/${supplierId}/image`);
    return response.data;
  },
};