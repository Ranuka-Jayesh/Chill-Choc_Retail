import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/stores/AppProviders';

// Cashier Pages (Untouched)
import { CashierLogin } from '@/pages/cashier/CashierLogin';
import { CashierPin } from '@/pages/cashier/CashierPin';
import { CashierStartSession } from '@/pages/cashier/CashierStartSession';
import { PosScreen } from '@/pages/cashier/PosScreen';
import { HeldBillsScreen } from '@/pages/cashier/HeldBillsScreen';
import { SalesHistoryScreen } from '@/pages/cashier/SalesHistoryScreen';
import { ReturnsScreen } from '@/pages/cashier/ReturnsScreen';
import { CashSessionScreen } from '@/pages/cashier/CashSessionScreen';

// Admin Pages
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminProducts } from '@/pages/admin/AdminProducts';
import { AdminRestock } from '@/pages/admin/AdminRestock';
import { AdminReturns } from '@/pages/admin/AdminReturns';
import { AdminCashAudits } from '@/pages/admin/AdminCashAudits';
import { AdminStaff } from '@/pages/admin/AdminStaff';
import { AdminSupplierProfile } from '@/pages/admin/AdminSupplierProfile';
import { AdminCredentials } from '@/pages/admin/AdminCredentials';
import { AdminAnalytics } from '@/pages/admin/AdminAnalytics';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          {/* Default entry redirects straight to main POS terminal */}
          <Route path="/" element={<Navigate to="/cashier/pos" replace />} />
          <Route path="/cashier" element={<Navigate to="/cashier/pos" replace />} />

          {/* Cashier Specific Routes (Untouched) */}
          <Route path="/cashier/login" element={<CashierLogin />} />
          <Route path="/cashier/pin" element={<CashierPin />} />
          <Route path="/cashier/start-session" element={<CashierStartSession />} />
          <Route path="/cashier/pos" element={<PosScreen />} />
          <Route path="/cashier/held-bills" element={<HeldBillsScreen />} />
          <Route path="/cashier/sales-history" element={<SalesHistoryScreen />} />
          <Route path="/cashier/returns" element={<ReturnsScreen />} />
          <Route path="/cashier/cash-session" element={<CashSessionScreen />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/reports" element={<Navigate to="/admin/analytics" replace />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/restock" element={<AdminRestock />} />
          <Route path="/admin/suppliers/:supplierId" element={<AdminSupplierProfile />} />
          <Route path="/admin/returns" element={<AdminReturns />} />
          <Route path="/admin/cash-audits" element={<AdminCashAudits />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/credentials" element={<AdminCredentials />} />
          <Route path="/admin/operators" element={<Navigate to="/admin/credentials" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/cashier/pos" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;

