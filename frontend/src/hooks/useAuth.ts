import { useAuthStore } from '../stores/authStore';
import { useTenantScopeStore } from '../stores/tenantScopeStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore();
  const selectedTenantId = useTenantScopeStore((s) => s.selectedTenantId);

  const hqEnv = import.meta.env.VITE_HQ_TENANT_ID;
  const isHq = hqEnv ? (user?.tenant_id === hqEnv) : (user?.roles?.includes('Super Admin') ?? false);
  const effectiveTenantId = isHq && selectedTenantId ? selectedTenantId : user?.tenant_id;

  // Validasi tenant_id (only log when error occurs)
  if (!effectiveTenantId && isAuthenticated) {
    console.error('❌ useAuth Error: tenantId is null or undefined!', 
      JSON.stringify({
        user_tenant_id: user?.tenant_id,
        selectedTenantId,
        isHq,
        hqEnv
      })
    );
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    updateUser,
    // Prefer globally selected tenant only for HQ Super Admin; otherwise use user's own tenant
    tenantId: effectiveTenantId,
  };
};