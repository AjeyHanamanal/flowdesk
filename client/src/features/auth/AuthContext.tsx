import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../../services/api';
import { setToken, clearToken } from '../../lib/api';
import type { User, Role } from '../../types';

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  canAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ROLE_MODULES: Record<Role, string[]> = {
  ADMIN: ['dashboard', 'customers', 'inventory', 'challans', 'activity', 'reports', 'settings'],
  SALES: ['dashboard', 'customers', 'challans', 'activity'],
  WAREHOUSE: ['dashboard', 'inventory', 'challans', 'activity'],
  ACCOUNTS: ['dashboard', 'customers', 'challans', 'activity', 'reports'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('flowdesk_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      authApi.getPermissions()
        .then(({ data }: { data: { permissions: string[] } }) => setPermissions(data.permissions))
        .catch(() => clearToken())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    setToken(data.accessToken);
    localStorage.setItem('flowdesk_user', JSON.stringify(data.user));
    setUser(data.user);
    setPermissions(ROLE_MODULES[data.user.role]);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setPermissions([]);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  const canAccess = useCallback((module: string) => {
    return permissions.includes(module);
  }, [permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, isLoading, login, logout, hasRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
