import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, token, isLoading, error, isLocked, remainingAttempts, login, logout, checkAuth } =
    useAuthStore();

  const isAuthenticated = Boolean(token && user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isSectionAdmin = user?.role === 'SECTION_ADMIN';
  const isAdmin = isSuperAdmin || isSectionAdmin;
  const isEmployee = user?.role === 'EMPLOYEE';

  return {
    user,
    token,
    isLoading,
    error,
    isLocked,
    remainingAttempts,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    isSectionAdmin,
    isEmployee,
    login,
    logout,
    checkAuth,
  };
}
