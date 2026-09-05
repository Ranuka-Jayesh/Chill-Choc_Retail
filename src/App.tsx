import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/stores/AppProviders';

// Cashier Pages
import { CashierLogin } from '@/pages/cashier/CashierLogin';
import { CashierPin } from '@/pages/cashier/CashierPin';
import { CashierStartSession } from '@/pages/cashier/CashierStartSession';
import { PosScreen } from '@/pages/cashier/PosScreen';
import { HeldBillsScreen } from '@/pages/cashier/HeldBillsScreen';
import { SalesHistoryScreen } from '@/pages/cashier/SalesHistoryScreen';
import { ReturnsScreen } from '@/pages/cashier/ReturnsScreen';
import { CashSessionScreen } from '@/pages/cashier/CashSessionScreen';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          {/* Default entry redirects straight to main POS terminal */}
          <Route path="/" element={<Navigate to="/cashier/pos" replace />} />
          <Route path="/cashier" element={<Navigate to="/cashier/pos" replace />} />

          {/* Cashier Specific Routes */}
          <Route path="/cashier/login" element={<CashierLogin />} />
          <Route path="/cashier/pin" element={<CashierPin />} />
          <Route path="/cashier/start-session" element={<CashierStartSession />} />
          <Route path="/cashier/pos" element={<PosScreen />} />
          <Route path="/cashier/held-bills" element={<HeldBillsScreen />} />
          <Route path="/cashier/sales-history" element={<SalesHistoryScreen />} />
          <Route path="/cashier/returns" element={<ReturnsScreen />} />
          <Route path="/cashier/cash-session" element={<CashSessionScreen />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/cashier/pos" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;
