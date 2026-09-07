import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/stores/adminAuthStore';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AppFooter } from '@/components/common/AppFooter';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  subHeader?: React.ReactNode;
  mainClassName?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  subHeader,
  mainClassName,
}) => {
  const { isAdminLoggedIn } = useAdminAuth();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication Guard: Redirect to /admin/login if not logged in
  if (!isAdminLoggedIn) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-zinc-50/70 flex text-zinc-900 font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Sidebar Navigation */}
      <AdminSidebar
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen lg:pl-64 overflow-hidden">
        {/* Fixed Header Across Entire Admin System: NEVER SCROLLS */}
        <div className="flex-shrink-0 z-30 bg-white">
          <AdminHeader
            title={title}
            subtitle={subtitle}
            onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            actions={actions}
          />
          {subHeader}
        </div>

        {/* Scrollable Main Content Container */}
        <main className={mainClassName || "flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto animate-in fade-in duration-150"}>
          {children}
        </main>

        {/* Small Footer Same as Cashier Side */}
        <AppFooter className="w-full z-20 border-t border-zinc-200" />
      </div>
    </div>
  );
};
