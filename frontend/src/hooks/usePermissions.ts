import { useAuth } from './useAuth';

/**
 * Hook for checking user permissions
 * 
 * @example
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
 * 
 * if (hasPermission('products.create')) {
 *   // Show create button
 * }
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * Check if user has a specific permission
   * HQ Super Admin has all permissions (bypass check)
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // HQ Super Admin has all permissions
    if (user.is_hq_super_admin) return true;
    
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   * HQ Super Admin has all permissions (bypass check)
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    
    // HQ Super Admin has all permissions
    if (user.is_hq_super_admin) return true;
    
    if (!user.permissions) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  };

  /**
   * Check if user has all of the specified permissions
   * HQ Super Admin has all permissions (bypass check)
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    
    // HQ Super Admin has all permissions
    if (user.is_hq_super_admin) return true;
    
    if (!user.permissions) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: string): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user || !user.roles) return false;
    return roles.some(role => user.roles.includes(role));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    permissions: user?.permissions || [],
    roles: user?.roles || [],
  };
}