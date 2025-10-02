import { apiClient } from './client';
import type { 
  FooterResponse, 
  FooterContent, 
  FooterManagementResponse,
  PublicProductsResponse,
  PublicProduct,
  ContentPage,
  ContentPageSummary,
  ContentPageForm
} from '../types';

export const contentApi = {
  /**
   * Public API: Get footer content for a tenant (no auth required)
   * GET /api/v1/tenants/{tenantId}/public/footer
   */
  getPublicFooter: async (tenantId: string): Promise<FooterResponse> => {
    const url = `/tenants/${tenantId}/public/footer`;
    const { data } = await apiClient.get(url);
    return data;
  },

  /**
   * Admin API: Get footer content for editing (auth required)
   * GET /api/v1/tenants/{tenantId}/content/footer
   */
  getFooterForEdit: async (tenantId: string): Promise<FooterManagementResponse> => {
    const url = `/tenants/${tenantId}/content/footer`;
    const { data } = await apiClient.get(url);
    return data;
  },

  /**
   * Admin API: Update footer content (auth required)
   * PUT /api/v1/tenants/{tenantId}/content/footer
   */
  updateFooter: async (
    tenantId: string,
    footer: FooterContent
  ): Promise<{ message: string; tenantId: string; footer: FooterContent }> => {
    const url = `/tenants/${tenantId}/content/footer`;
    const { data } = await apiClient.put(url, footer);
    return data;
  },

  /**
   * Admin API: Reset footer to default (auth required)
   * DELETE /api/v1/tenants/{tenantId}/content/footer
   */
  deleteFooter: async (
    tenantId: string
  ): Promise<{ message: string; tenantId: string }> => {
    const url = `/tenants/${tenantId}/content/footer`;
    const { data } = await apiClient.delete(url);
    return data;
  },

  /**
   * Public API: Get published products (no auth required, paginated)
   * GET /api/v1/tenants/{tenantId}/public/products
   * @param params - Optional query params: q (search), minStock, limit, page
   */
  getPublicProducts: async (
    tenantId: string,
    params?: { q?: string; minStock?: number; limit?: number; page?: number }
  ): Promise<PublicProductsResponse> => {
    const url = `/tenants/${tenantId}/public/products`;
    const { data } = await apiClient.get(url, { params });
    return data;
  },

  /**
   * Public API: Get single published product (no auth required)
   * GET /api/v1/tenants/{tenantId}/public/products/{productId}
   */
  getPublicProduct: async (
    tenantId: string,
    productId: string
  ): Promise<PublicProduct> => {
    const url = `/tenants/${tenantId}/public/products/${productId}`;
    const { data } = await apiClient.get(url);
    return data;
  },

  /**
   * Public API: Get a content page by slug (no auth required)
   * GET /api/v1/tenants/{tenantId}/public/pages/{slug}
   */
  getContentPage: async (
    tenantId: string,
    slug: string
  ): Promise<ContentPage> => {
    const url = `/tenants/${tenantId}/public/pages/${slug}`;
    const { data } = await apiClient.get(url);
    return data;
  },

  /**
   * Public API: Get all published content pages (no auth required)
   * GET /api/v1/tenants/{tenantId}/public/pages
   */
  getAllContentPages: async (
    tenantId: string
  ): Promise<ContentPageSummary[]> => {
    const url = `/tenants/${tenantId}/public/pages`;
    const { data } = await apiClient.get(url);
    return data;
  },

  // ===== ADMIN APIS (Auth Required) =====

  /**
   * Admin API: Get all content pages (includes drafts)
   * GET /api/v1/tenants/{tenantId}/content/pages
   */
  getContentPagesAdmin: async (
    tenantId: string,
    params?: { per_page?: number; search?: string }
  ): Promise<{ data: ContentPage[]; current_page: number; last_page: number; per_page: number; total: number }> => {
    const url = `/tenants/${tenantId}/content/pages`;
    const { data } = await apiClient.get(url, { params });
    return data;
  },

  /**
   * Admin API: Get single content page by ID
   * GET /api/v1/tenants/{tenantId}/content/pages/{pageId}
   */
  getContentPageAdmin: async (
    tenantId: string,
    pageId: string
  ): Promise<ContentPage> => {
    const url = `/tenants/${tenantId}/content/pages/${pageId}`;
    const { data } = await apiClient.get(url);
    return data.data;
  },

  /**
   * Admin API: Create new content page
   * POST /api/v1/tenants/{tenantId}/content/pages
   */
  createContentPage: async (
    tenantId: string,
    pageData: ContentPageForm
  ): Promise<ContentPage> => {
    const url = `/tenants/${tenantId}/content/pages`;
    const { data } = await apiClient.post(url, pageData);
    return data.data;
  },

  /**
   * Admin API: Update content page
   * PUT /api/v1/tenants/{tenantId}/content/pages/{pageId}
   */
  updateContentPage: async (
    tenantId: string,
    pageId: string,
    pageData: ContentPageForm
  ): Promise<ContentPage> => {
    const url = `/tenants/${tenantId}/content/pages/${pageId}`;
    const { data } = await apiClient.put(url, pageData);
    return data.data;
  },

  /**
   * Admin API: Delete content page
   * DELETE /api/v1/tenants/{tenantId}/content/pages/{pageId}
   */
  deleteContentPage: async (
    tenantId: string,
    pageId: string
  ): Promise<void> => {
    const url = `/tenants/${tenantId}/content/pages/${pageId}`;
    await apiClient.delete(url);
  },
};