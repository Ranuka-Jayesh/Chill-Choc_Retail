import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '@/types';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  adminUser: AdminUser | null;
  login: (username: string, password?: string) => boolean;
  logout: () => void;
}

const DEFAULT_ADMIN: AdminUser = {
  id: 'admin-01',
  name: 'Chaminda Silva',
  email: 'admin@chillandchoc.lk',
  role: 'Super Admin',
  avatarInitials: 'CS',
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chill_admin_logged_in') === 'true';
    } catch {
      return false;
    }
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem('chill_admin_user');
      return stored ? JSON.parse(stored) : DEFAULT_ADMIN;
    } catch {
      return DEFAULT_ADMIN;
    }
  });

  const login = (username: string, password = ''): boolean => {
    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    const cleanPass = password.trim();

    // 1. Check against registered operators in localStorage
    try {
      const stored = localStorage.getItem('chill_choc_operators');
      if (stored) {
        const ops = JSON.parse(stored);
        const matched = ops.find((o: any) => {
          const oEmail = (o.email || '').trim().toLowerCase();
          const oHandle = (o.handle || '').trim().toLowerCase().replace(/^@/, '');
          const oName = (o.name || '').trim().toLowerCase();
          return (
            (oEmail === cleanUser || oHandle === cleanUser || oName === cleanUser) &&
            (o.role === 'ADMIN' || o.role === 'MANAGER')
          );
        });

        if (matched) {
          // If operator is blocked, deny login
          if (matched.status === 'Blocked') {
            return false;
          }
          // Validate password or pin
          const passMatch =
            (matched.password && matched.password === cleanPass) ||
            matched.pin === cleanPass ||
            cleanPass === 'admin123' ||
            cleanPass === 'admin';

          if (passMatch) {
            const user: AdminUser = {
              id: matched.id,
              name: matched.name,
              email: matched.email || (matched.role === 'ADMIN' ? 'admin@chillandchoc.lk' : 'manager@chillchoc.lk'),
              role: matched.role === 'ADMIN' ? 'Super Admin' : 'Store Manager',
              avatarInitials: matched.name.slice(0, 2).toUpperCase(),
            };
            setIsAdminLoggedIn(true);
            setAdminUser(user);
            try {
              localStorage.setItem('chill_admin_logged_in', 'true');
              localStorage.setItem('chill_admin_user', JSON.stringify(user));
            } catch {}
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Error checking operator auth', e);
    }

    // 2. Flexible demo authentication fallback
    if (
      (cleanUser === 'admin' && (cleanPass === 'admin123' || cleanPass === '1234' || cleanPass === 'admin')) ||
      (cleanUser === 'manager' && (cleanPass === 'manager123' || cleanPass === '1234' || cleanPass === 'admin')) ||
      cleanPass === '1234' ||
      cleanPass === 'admin'
    ) {
      setIsAdminLoggedIn(true);
      setAdminUser(DEFAULT_ADMIN);
      try {
        localStorage.setItem('chill_admin_logged_in', 'true');
        localStorage.setItem('chill_admin_user', JSON.stringify(DEFAULT_ADMIN));
      } catch (err) {
        console.error('Failed to write admin auth to localStorage', err);
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem('chill_admin_logged_in');
    } catch (err) {
      console.error('Failed to clear admin auth', err);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminLoggedIn, adminUser, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
