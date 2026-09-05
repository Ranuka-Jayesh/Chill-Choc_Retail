import React from 'react';
import { ToastProvider } from './toastStore';
import { CashierProvider } from './cashierStore';
import { CartProvider } from './cartStore';
import { HeldBillsProvider } from './heldBillsStore';
import { SalesProvider } from './salesStore';
import { ReturnsProvider } from './returnsStore';
import { ToastContainer } from '@/components/common/ToastContainer';
import { POSLockScreen } from '@/components/pos/POSLockScreen';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <CashierProvider>
        <CartProvider>
          <HeldBillsProvider>
            <SalesProvider>
              <ReturnsProvider>
                {children}
                <POSLockScreen />
                <ToastContainer />
              </ReturnsProvider>
            </SalesProvider>
          </HeldBillsProvider>
        </CartProvider>
      </CashierProvider>
    </ToastProvider>
  );
};
