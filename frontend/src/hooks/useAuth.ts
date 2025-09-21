import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    updateUser,
    tenantId: user?.tenant_id,
  };
};