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
import { ToastContainer } from '@/components/common/ToastContainer';
import { POSLockScreen } from '@/components/pos/POSLockScreen';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <PrinterProvider>
        <AdminAuthProvider>
          <SupplierProvider>
            <ProductProvider>
              <SupplierReturnsProvider>
                <PurchaseOrderProvider>
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
                </PurchaseOrderProvider>
              </SupplierReturnsProvider>
            </ProductProvider>
          </SupplierProvider>
        </AdminAuthProvider>
      </PrinterProvider>
    </ToastProvider>
  );
};

