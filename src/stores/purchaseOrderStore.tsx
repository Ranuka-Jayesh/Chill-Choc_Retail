import React, { createContext, useContext, useState, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderItem, POPaymentBreakdown, POPaymentStatus } from '@/types';
import {
  fetchPurchaseOrdersFromSupabase,
  insertPurchaseOrderToSupabase,
  updatePurchaseOrderStatusInSupabase,
  generateUUID,
} from '@/services/supabaseData';

interface CreatePOInput {
  poNumber?: string;
  invoiceRef: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  paymentBreakdown: POPaymentBreakdown;
  isCredit?: boolean;
  notes?: string;
  verifiedBy?: string;
}

interface PurchaseOrderContextType {
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (input: CreatePOInput) => PurchaseOrder;
  getPurchaseOrderById: (id: string) => PurchaseOrder | undefined;
  updatePurchaseOrderStatus: (id: string, status: POPaymentStatus, paidAmount?: number) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
}

const STORAGE_KEY = 'chill_choc_purchase_orders_v1';

const PurchaseOrderContext = createContext<PurchaseOrderContextType | undefined>(undefined);

export const PurchaseOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse purchase orders from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(purchaseOrders));
    } catch (e) {
      console.error('Failed to save purchase orders to localStorage', e);
    }
  }, [purchaseOrders]);

  // Fetch initial purchase orders from Supabase
  useEffect(() => {
    let isMounted = true;
    fetchPurchaseOrdersFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data)) {
        setPurchaseOrders(data);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const addPurchaseOrder = (input: CreatePOInput): PurchaseOrder => {
    const totalInvoiced = input.items.reduce((sum, item) => sum + item.subtotal, 0);
    const cash = input.paymentBreakdown.cash || 0;
    const card = input.paymentBreakdown.card || 0;
    const cheque = input.paymentBreakdown.cheque || 0;
    const totalPaid = input.isCredit ? 0 : cash + card + cheque;
    const balanceDue = Math.max(0, totalInvoiced - totalPaid);

    let paymentStatus: POPaymentStatus = 'PAID';
    if (input.isCredit) {
      paymentStatus = 'CREDIT';
    } else if (cheque > 0 && totalPaid >= totalInvoiced) {
      paymentStatus = 'CHEQUE PENDING';
    } else if (balanceDue > 0) {
      paymentStatus = totalPaid > 0 ? 'PARTIAL' : 'CREDIT';
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const poNumber = input.poNumber || `PO-${randomSuffix}`;

    const newPO: PurchaseOrder = {
      id: generateUUID(),
      poNumber,
      invoiceRef: input.invoiceRef || `INV-${randomSuffix}`,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      date: dateFormatted,
      time: timeFormatted,
      items: input.items,
      totalInvoiced,
      totalPaid,
      balanceDue,
      paymentStatus,
      paymentBreakdown: input.isCredit
        ? { cash: 0, card: 0, cheque: 0, unpaidDueDate: input.paymentBreakdown?.unpaidDueDate }
        : input.paymentBreakdown,
      notes: input.notes || '',
      verifiedBy: input.verifiedBy || 'Store Manager',
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Sync to Supabase cloud
    insertPurchaseOrderToSupabase(newPO);

    return newPO;
  };

  const getPurchaseOrderById = (id: string) => {
    return purchaseOrders.find((p) => p.id === id);
  };

  const updatePurchaseOrderStatus = (id: string, status: POPaymentStatus, paidAmount?: number) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== id) return po;
        const newPaid = paidAmount !== undefined ? paidAmount : po.totalPaid;
        const balance = Math.max(0, po.totalInvoiced - newPaid);
        updatePurchaseOrderStatusInSupabase(id, status, newPaid, balance);
        return {
          ...po,
          paymentStatus: status,
          totalPaid: newPaid,
          balanceDue: balance,
        };
      })
    );
  };

  const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== id) return po;
        return {
          ...po,
          ...updates,
        };
      })
    );
  };

  const deletePurchaseOrder = (id: string) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <PurchaseOrderContext.Provider
      value={{
        purchaseOrders,
        addPurchaseOrder,
        getPurchaseOrderById,
        updatePurchaseOrderStatus,
        updatePurchaseOrder,
        deletePurchaseOrder,
      }}
    >
      {children}
    </PurchaseOrderContext.Provider>
  );
};

export const usePurchaseOrders = () => {
  const context = useContext(PurchaseOrderContext);
  if (!context) {
    throw new Error('usePurchaseOrders must be used within a PurchaseOrderProvider');
  }
  return context;
};
