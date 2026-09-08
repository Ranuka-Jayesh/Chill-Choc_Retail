import React, { createContext, useContext, useState, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderItem, POPaymentBreakdown, POPaymentStatus } from '@/types';

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

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-8803',
    poNumber: 'PO-8803',
    invoiceRef: 'CBS-4412',
    supplierId: 'sup-cbs',
    supplierName: 'Choc & Bakers Supplies Lanka',
    date: 'Aug 27, 2026',
    time: '04:30 PM',
    isRolledOver: true,
    items: [
      {
        id: 'item-8803-1',
        productId: 'prod-belgian-ganache',
        productName: 'Belgian Dark Choc Ganache',
        weight: '15 kg',
        batchNumber: 'LOT-CBS-8803',
        expiryDate: '15 Dec 2027',
        quantity: 15,
        costPrice: 3500,
        sellingPrice: 4200,
        subtotal: 52500,
      },
    ],
    totalInvoiced: 52500,
    totalPaid: 30000,
    balanceDue: 22500,
    paymentStatus: 'CHEQUE PENDING',
    paymentBreakdown: {
      cash: 30000,
      card: 0,
      cheque: 22500,
      chequeDueDate: 'Sep 3',
      chequeNumber: 'CHQ-882190',
    },
    verifiedBy: 'Store Manager',
    notes: 'Batch #409, temperature check OK, received via cold truck',
  },
  {
    id: 'po-4758',
    poNumber: 'PO-4758',
    invoiceRef: 'INV-1751',
    supplierId: 'sup-ccr',
    supplierName: 'Ceylon Coffee Roasters Ltd',
    date: 'Sep 3, 2026',
    time: '03:42 AM',
    items: [
      {
        id: 'item-4758-1',
        productId: 'prod-arabica-espresso',
        productName: 'Arabica Espresso Beans',
        weight: '1 kg',
        batchNumber: 'LOT-CCR-4758',
        expiryDate: '28 Feb 2027',
        quantity: 1,
        costPrice: 6500,
        sellingPrice: 8000,
        subtotal: 6500,
      },
    ],
    totalInvoiced: 6500,
    totalPaid: 6500,
    balanceDue: 0,
    paymentStatus: 'CHEQUE PENDING',
    paymentBreakdown: {
      cash: 0,
      card: 0,
      cheque: 6500,
      chequeDueDate: 'Sep 3',
      chequeNumber: 'CHQ-55102',
    },
    verifiedBy: 'Store Manager',
    notes: 'Fresh roasted coffee intake, sealed airtight aroma bags',
  },
  {
    id: 'po-2026-9',
    poNumber: 'PO-2026-9',
    invoiceRef: 'INV-NES-89',
    supplierId: 'sup-nestle',
    supplierName: 'Nestlé Lanka PLC',
    date: 'Sep 6, 2026',
    time: '10:15 AM',
    items: [
      {
        id: 'item-2026-1',
        productId: 'prod-kitkat',
        productName: 'KitKat Chunky',
        weight: '40g',
        batchNumber: 'LOT-KIT-840-97',
        expiryDate: '15 May 2027',
        quantity: 20,
        costPrice: 365,
        sellingPrice: 450,
        subtotal: 7300,
      },
    ],
    totalInvoiced: 7300,
    totalPaid: 7300,
    balanceDue: 0,
    paymentStatus: 'PAID',
    paymentBreakdown: {
      cash: 7300,
      card: 0,
      cheque: 0,
    },
    verifiedBy: 'Store Manager',
    notes: 'Standard replenishment from central distributor',
  },
];

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
    return INITIAL_PURCHASE_ORDERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(purchaseOrders));
    } catch (e) {
      console.error('Failed to save purchase orders to localStorage', e);
    }
  }, [purchaseOrders]);

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
      id: `po-${Date.now()}`,
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
        return {
          ...po,
          paymentStatus: status,
          totalPaid: newPaid,
          balanceDue: Math.max(0, po.totalInvoiced - newPaid),
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
