import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/stores/adminAuthStore';
import { useReturns } from '@/stores/returnsStore';
import {
  LayoutDashboard,
  Package,
  Boxes,
  RotateCcw,
  Wallet,
  Users,
  LogOut,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { adminUser, logout } = useAdminAuth();
  const { returnRequests } = useReturns();
  const navigate = useNavigate();

  const pendingReturnsCount = returnRequests.filter(
    (r) => r.status === 'Pending Admin Approval'
  ).length;

  const navItems = [
    {
      to: '/admin',
      end: true,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/admin/products',
      label: 'Products & Batches',
      icon: Package,
    },
    {
      to: '/admin/restock',
      label: 'Multi-Supplier Restock',
      icon: Boxes,
    },
    {
      to: '/admin/returns',
      label: 'Refunds & Supplier RTV',
      icon: RotateCcw,
      badge: pendingReturnsCount > 0 ? pendingReturnsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      to: '/admin/cash-audits',
      label: 'Cash & Drawer Audits',
      icon: Wallet,
    },
    {
      to: '/admin/staff',
      label: 'Staff & Cashier PINs',
      icon: Users,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="h-14 px-5 flex items-center justify-between border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Chill & Choc"
                className="h-8 w-auto object-contain"
              />
              <div>
                <span className="text-xs font-black tracking-tight text-[#27140B] block leading-none">
                  CHILL <span className="text-[#FF5500]">&amp;</span> CHOC
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5">
                  Admin Control Center
                </span>
              </div>
            </div>
          </div>

          {/* Outlet Badge */}
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-600 text-[11px] font-semibold">
              <Building2 className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Colombo Flagship Outlet</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#27140B] text-white shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-zinc-100">
          {/* Admin User Info & Logout */}
          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#27140B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {adminUser?.avatarInitials || 'AD'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 truncate leading-tight">
                  {adminUser?.name || 'Administrator'}
                </p>
                <p className="text-[10px] font-medium text-zinc-400 truncate">
                  {adminUser?.role || 'Super Admin'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              title="Logout from Admin"
              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
