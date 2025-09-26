// Helper utilities for tenant-aware API paths

export const withTenant = (tenantId: string, path: string) => `/tenants/${tenantId}${path}`;