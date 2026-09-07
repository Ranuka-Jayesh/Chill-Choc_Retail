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
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Flexible demo authentication
    if (
      (cleanUser === 'admin' && (cleanPass === 'admin123' || cleanPass === '1234' || cleanPass === 'admin')) ||
      cleanUser === 'manager' ||
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
