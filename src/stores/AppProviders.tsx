import React from 'react';
import { ToastProvider } from './toastStore';
import { CashierProvider } from './cashierStore';
import { CartProvider } from './cartStore';
import { HeldBillsProvider } from './heldBillsStore';
import { SalesProvider } from './salesStore';
import { ReturnsProvider } from './returnsStore';
import { PrinterProvider } from './printerStore';
import { AdminAuthProvider } from './adminAuthStore';
import { SupplierProvider } from './supplierStore';
import { ProductProvider } from './productStore';
import { SupplierReturnsProvider } from './supplierReturnsStore';
import { PurchaseOrderProvider } from './purchaseOrderStore';
import { StaffProvider } from './staffStore';
import { OperatorProvider } from './operatorStore';
import { ToastContainer } from '@/components/common/ToastContainer';
import { POSLockScreen } from '@/components/pos/POSLockScreen';

// One-time cleanup for any cached dummy records in the browser's localStorage
if (typeof window !== 'undefined') {
  try {
    const CLEAN_FLAG = 'chill_choc_clean_wipe_executed_v4';
    if (localStorage.getItem(CLEAN_FLAG) !== 'true') {
      const keysToPurge = [
        'pos_completed_sales',
        'chill_choc_products_v1',
        'chill_choc_staff_members',
        'chill_choc_suppliers',
        'chill_choc_purchase_orders_v1',
        'chill_choc_supplier_returns',
        'pos_return_requests',
        'chill_choc_return_requests',
        'chill_choc_operators',
        'pos_cash_session',
        'pos_cash_movements',
        'pos_cash_history',
        'pos_is_locked',
        'pos_blocked_by_admin',
        'pos_blocked_reason',
        'chill_admin_logged_in',
        'chill_admin_user',
        'pos_held_bills',
      ];
      keysToPurge.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(CLEAN_FLAG, 'true');
    }
    // Also proactively sanitize chill_choc_return_requests from any mock records
    const rawReturns = localStorage.getItem('chill_choc_return_requests');
    if (rawReturns) {
      try {
        const parsed = JSON.parse(rawReturns);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((r: any) => {
            const code = (r?.returnCode || '').toUpperCase();
            const inv = (r?.invoiceNumber || '').toUpperCase();
            return (
              code !== 'RET-000391' &&
              code !== 'RET-000390' &&
              code !== 'RET-000389' &&
              inv !== 'INV-001825' &&
              inv !== 'INV-001820' &&
              inv !== 'INV-001802'
            );
          });
          if (clean.length !== parsed.length) {
            localStorage.setItem('chill_choc_return_requests', JSON.stringify(clean));
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Local storage purge warning:', err);
  }
}

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <PrinterProvider>
        <OperatorProvider>
          <AdminAuthProvider>
            <SupplierProvider>
              <ProductProvider>
                <SupplierReturnsProvider>
                  <PurchaseOrderProvider>
                    <StaffProvider>
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
                    </StaffProvider>
                  </PurchaseOrderProvider>
                </SupplierReturnsProvider>
              </ProductProvider>
            </SupplierProvider>
          </AdminAuthProvider>
        </OperatorProvider>
      </PrinterProvider>
    </ToastProvider>
  );
};
