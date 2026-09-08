import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReturnRequest, ReturnItem, ExchangeItemDetails } from '@/types';
import { returnsSyncSocket } from '@/services/returnsSyncSocket';

interface ReturnsContextType {
  returnRequests: ReturnRequest[];
  submitReturnRequest: (params: {
    invoiceNumber: string;
    items: ReturnItem[];
    totalRefund: number;
    submittedBy: string;
    resolutionType?: 'refund' | 'same_replacement' | 'exchange';
    exchangeItem?: ExchangeItemDetails;
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
    date: '2026-09-08',
    timestamp: '08:45 AM',
    resolutionType: 'refund',
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
    date: '2026-09-07',
    timestamp: 'Yesterday, 03:15 PM',
    resolutionType: 'same_replacement',
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
  {
    id: 'ret-000389',
    returnCode: 'RET-000389',
    invoiceNumber: 'INV-001802',
    date: '2026-09-02',
    timestamp: '02 Sept 2026, 11:10 AM',
    resolutionType: 'refund',
    items: [
      {
        productId: 'prod-toblerone',
        productName: 'Toblerone Milk 100g',
        quantity: 1,
        unitPrice: 850,
        reason: 'Expired',
        returnToStock: false,
        refundAmount: 850,
        supplierId: 'sup-mondelez',
        supplierName: 'Mondelēz International',
        batchNumber: 'LOT-MDZ-109',
      },
    ],
    totalRefund: 850,
    status: 'Approved',
    submittedBy: 'Kasun Bandara',
    reviewedAt: '02 Sept 2026, 11:45 AM',
    reviewedBy: 'Chaminda Silva (Admin)',
    reviewNotes: 'Expired stock quarantined immediately.',
  },
  {
    id: 'ret-000388',
    returnCode: 'RET-000388',
    invoiceNumber: 'INV-001712',
    date: '2026-08-28',
    timestamp: '28 Aug 2026, 04:30 PM',
    resolutionType: 'exchange',
    exchangeItem: {
      productId: 'prod-mars',
      productName: 'Mars Bar 51g',
      unitPrice: 480,
      quantity: 1,
      totalValue: 480,
      priceDifference: 60,
    },
    items: [
      {
        productId: 'prod-snickers',
        productName: 'Snickers Single 50g',
        quantity: 1,
        unitPrice: 420,
        reason: 'Packaging Defect',
        returnToStock: false,
        refundAmount: 420,
        supplierId: 'sup-mars',
        supplierName: 'Mars Global Foods Importers',
        batchNumber: 'LOT-MARS-072',
      },
    ],
    totalRefund: 420,
    status: 'Approved',
    submittedBy: 'Nimal Perera',
    reviewedAt: '28 Aug 2026, 05:00 PM',
    reviewedBy: 'Chaminda Silva (Admin)',
  },
];

const ReturnsContext = createContext<ReturnsContextType | undefined>(undefined);

export const ReturnsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chill_choc_return_requests');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load returnRequests from localStorage', e);
      }
    }
    return INITIAL_RETURNS;
  });

  // Persist returnRequests to localStorage whenever updated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chill_choc_return_requests', JSON.stringify(returnRequests));
      } catch (e) {
        console.error('Failed to save returnRequests to localStorage', e);
      }
    }
  }, [returnRequests]);

  // Sync with real-time WebSocket, BroadcastChannel & localStorage storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chill_choc_return_requests' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setReturnRequests(updated);
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const unsubscribe = returnsSyncSocket.subscribe((msg) => {
      if (msg.type === 'RETURN_REQUESTED') {
        setReturnRequests((prev) => {
          if (prev.some((r) => r.id === msg.payload.id || r.returnCode === msg.payload.returnCode)) {
            return prev;
          }
          const updated = [msg.payload, ...prev];
          try {
            localStorage.setItem('chill_choc_return_requests', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else if (msg.type === 'SYNC_RETURNS' && Array.isArray(msg.payload)) {
        setReturnRequests(msg.payload);
      } else if (msg.type === 'RETURN_APPROVED') {
        setReturnRequests((prev) =>
          prev.map((r) =>
            r.id === msg.payload.id
              ? {
                  ...r,
                  status: 'Approved',
                  reviewedAt: 'Just now',
                  reviewedBy: msg.payload.reviewerName || 'Chaminda Silva (Admin)',
                  reviewNotes: msg.payload.notes || 'Approved by store admin',
                }
              : r
          )
        );
      } else if (msg.type === 'RETURN_REJECTED') {
        setReturnRequests((prev) =>
          prev.map((r) =>
            r.id === msg.payload.id
              ? {
                  ...r,
                  status: 'Rejected',
                  reviewedAt: 'Just now',
                  reviewedBy: msg.payload.reviewerName || 'Chaminda Silva (Admin)',
                  reviewNotes: msg.payload.notes || 'Rejected by store admin',
                }
              : r
          )
        );
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribe();
    };
  }, []);

  const submitReturnRequest = ({
    invoiceNumber,
    items,
    totalRefund,
    submittedBy,
    resolutionType = 'refund',
    exchangeItem,
  }: {
    invoiceNumber: string;
    items: ReturnItem[];
    totalRefund: number;
    submittedBy: string;
    resolutionType?: 'refund' | 'same_replacement' | 'exchange';
    exchangeItem?: ExchangeItemDetails;
  }) => {
    const nextNum = 392 + returnRequests.length;
    const nextCode = `RET-${String(nextNum).padStart(6, '0')}`;
    const newRequest: ReturnRequest = {
      id: `ret-${Date.now()}`,
      returnCode: nextCode,
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items,
      totalRefund,
      resolutionType,
      exchangeItem,
      status: 'Pending Admin Approval',
      submittedBy,
    };

    setReturnRequests((prev) => [newRequest, ...prev]);

    // Broadcast across tabs and network
    returnsSyncSocket.send({
      type: 'RETURN_REQUESTED',
      payload: newRequest,
    });

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

    // Broadcast approval
    returnsSyncSocket.send({
      type: 'RETURN_APPROVED',
      payload: { id, notes, reviewerName },
    });
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

    // Broadcast rejection
    returnsSyncSocket.send({
      type: 'RETURN_REJECTED',
      payload: { id, notes, reviewerName },
    });
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
