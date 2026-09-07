import React, { createContext, useContext, useState } from 'react';
import { ReturnRequest, ReturnItem } from '@/types';

interface ReturnsContextType {
  returnRequests: ReturnRequest[];
  submitReturnRequest: (params: {
    invoiceNumber: string;
    items: ReturnItem[];
    totalRefund: number;
    submittedBy: string;
  }) => ReturnRequest;
  approveReturn: (id: string, notes?: string, reviewerName?: string) => void;
  rejectReturn: (id: string, notes?: string, reviewerName?: string) => void;
  linkSupplierReturn: (returnRequestId: string, supplierReturnId: string) => void;
}

const INITIAL_RETURNS: ReturnRequest[] = [
  {
    id: 'ret-000391',
    returnCode: 'RET-000391',
    invoiceNumber: 'INV-001825',
    timestamp: '08:45 AM',
    items: [
      {
        productId: 'prod-mars',
        productName: 'Mars Bar 51g',
        quantity: 1,
        unitPrice: 480,
        reason: 'Damaged',
        returnToStock: false,
        refundAmount: 480,
        supplierId: 'sup-mars',
        supplierName: 'Mars Global Foods Importers',
        batchNumber: 'LOT-MARS-081',
      },
    ],
    totalRefund: 480,
    status: 'Pending Admin Approval',
    submittedBy: 'Nimal Perera',
  },
  {
    id: 'ret-000390',
    returnCode: 'RET-000390',
    invoiceNumber: 'INV-001820',
    timestamp: 'Yesterday, 03:15 PM',
    items: [
      {
        productId: 'prod-kitkat',
        productName: 'KitKat Chunky 40g',
        quantity: 2,
        unitPrice: 450,
        reason: 'Quality Issue',
        returnToStock: false,
        refundAmount: 900,
        supplierId: 'sup-nestle',
        supplierName: 'Nestlé Lanka PLC',
        batchNumber: 'LOT-NES-401',
      },
    ],
    totalRefund: 900,
    status: 'Approved',
    submittedBy: 'Nimal Perera',
    reviewedAt: 'Yesterday, 03:30 PM',
    reviewedBy: 'Chaminda Silva (Admin)',
    reviewNotes: 'Customer refund paid out. Dispatched to Nestlé for warranty credit.',
    supplierReturnId: 'rtv-100',
  },
];

const ReturnsContext = createContext<ReturnsContextType | undefined>(undefined);

export const ReturnsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(INITIAL_RETURNS);

  const submitReturnRequest = ({
    invoiceNumber,
    items,
    totalRefund,
    submittedBy,
  }: {
    invoiceNumber: string;
    items: ReturnItem[];
    totalRefund: number;
    submittedBy: string;
  }) => {
    const nextNum = 392 + returnRequests.length;
    const nextCode = `RET-${String(nextNum).padStart(6, '0')}`;
    const newRequest: ReturnRequest = {
      id: `ret-${Date.now()}`,
      returnCode: nextCode,
      invoiceNumber,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items,
      totalRefund,
      status: 'Pending Admin Approval',
      submittedBy,
    };

    setReturnRequests((prev) => [newRequest, ...prev]);
    return newRequest;
  };

  const approveReturn = (id: string, notes = '', reviewerName = 'Chaminda Silva (Admin)') => {
    setReturnRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Approved' as const,
              reviewedAt: 'Just now',
              reviewedBy: reviewerName,
              reviewNotes: notes || 'Approved by store admin',
            }
          : r
      )
    );
  };

  const rejectReturn = (id: string, notes = '', reviewerName = 'Chaminda Silva (Admin)') => {
    setReturnRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Rejected' as const,
              reviewedAt: 'Just now',
              reviewedBy: reviewerName,
              reviewNotes: notes || 'Rejected by store admin',
            }
          : r
      )
    );
  };

  const linkSupplierReturn = (returnRequestId: string, supplierReturnId: string) => {
    setReturnRequests((prev) =>
      prev.map((r) =>
        r.id === returnRequestId ? { ...r, supplierReturnId } : r
      )
    );
  };

  return (
    <ReturnsContext.Provider
      value={{
        returnRequests,
        submitReturnRequest,
        approveReturn,
        rejectReturn,
        linkSupplierReturn,
      }}
    >
      {children}
    </ReturnsContext.Provider>
  );
};

export const useReturns = () => {
  const context = useContext(ReturnsContext);
  if (!context) {
    throw new Error('useReturns must be used within a ReturnsProvider');
  }
  return context;
};
