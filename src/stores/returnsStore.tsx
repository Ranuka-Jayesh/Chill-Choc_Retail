import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReturnRequest, ReturnItem, ExchangeItemDetails } from '@/types';
import { returnsSyncSocket } from '@/services/returnsSyncSocket';
import {
  fetchReturnRequestsFromSupabase,
  insertReturnRequestToSupabase,
  updateReturnRequestInSupabase,
  generateUUID,
} from '@/services/supabaseData';

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

export const isDummyReturn = (r: ReturnRequest | any): boolean => {
  if (!r) return false;
  const code = (r.returnCode || '').toUpperCase();
  const inv = (r.invoiceNumber || '').toUpperCase();
  const id = (r.id || '').toLowerCase();
  if (
    code === 'RET-000391' ||
    code === 'RET-000390' ||
    code === 'RET-000389' ||
    id === 'ret-000391' ||
    id === 'ret-000390' ||
    id === 'ret-000389' ||
    inv === 'INV-001825' ||
    inv === 'INV-001820' ||
    inv === 'INV-001802'
  ) {
    return true;
  }

  if (Array.isArray(r.items)) {
    const hasMockItem = r.items.some(
      (it: any) =>
        it.batchNumber === 'LOT-MARS-001' ||
        it.batchNumber === 'LOT-NES-401' ||
        it.batchNumber === 'LOT-MDZ-109'
    );
    if (hasMockItem) return true;
  }

  return false;
};

const INITIAL_RETURNS: ReturnRequest[] = [];

const ReturnsContext = createContext<ReturnsContextType | undefined>(undefined);

export const ReturnsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chill_choc_return_requests');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((r) => !isDummyReturn(r));
            if (clean.length !== parsed.length) {
              localStorage.setItem('chill_choc_return_requests', JSON.stringify(clean));
            }
            return clean;
          }
        }
      } catch (e) {
        console.error('Failed to load returnRequests from localStorage', e);
      }
    }
    return INITIAL_RETURNS;
  });

  // Fetch initial return requests from Supabase
  useEffect(() => {
    let isMounted = true;
    fetchReturnRequestsFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data)) {
        const clean = data.filter((r) => !isDummyReturn(r));
        setReturnRequests(clean);
        try {
          localStorage.setItem('chill_choc_return_requests', JSON.stringify(clean));
        } catch {}
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist returnRequests to localStorage whenever updated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const clean = returnRequests.filter((r) => !isDummyReturn(r));
        localStorage.setItem('chill_choc_return_requests', JSON.stringify(clean));
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
            setReturnRequests(updated.filter((r) => !isDummyReturn(r)));
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const unsubscribe = returnsSyncSocket.subscribe((msg) => {
      if (msg.type === 'RETURN_REQUESTED' && msg.payload && !isDummyReturn(msg.payload)) {
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
        const clean = msg.payload.filter((r) => !isDummyReturn(r));
        setReturnRequests(clean);
        try {
          localStorage.setItem('chill_choc_return_requests', JSON.stringify(clean));
        } catch {}
      } else if (msg.type === 'RETURN_APPROVED') {
        setReturnRequests((prev) =>
          prev.map((r) =>
            r.id === msg.payload.id
              ? {
                  ...r,
                  status: 'Approved',
                  reviewedAt: 'Just now',
                  reviewedBy: msg.payload.reviewerName || 'Admin',
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
                  reviewedBy: msg.payload.reviewerName || 'Admin',
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
    let maxNum = 0;
    for (const r of returnRequests) {
      const match = r.returnCode?.match(/RET-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    }
    const nextCode = `RET-${String(maxNum + 1).padStart(6, '0')}`;
    const newRequest: ReturnRequest = {
      id: generateUUID(),
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

    // Sync to Supabase cloud
    insertReturnRequestToSupabase(newRequest);

    // Broadcast across tabs and network
    returnsSyncSocket.send({
      type: 'RETURN_REQUESTED',
      payload: newRequest,
    });

    return newRequest;
  };

  const approveReturn = (id: string, notes = '', reviewerName = 'Admin') => {
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

    // Sync to Supabase cloud
    updateReturnRequestInSupabase(id, 'Approved', notes || 'Approved by store admin', reviewerName);

    // Broadcast approval
    returnsSyncSocket.send({
      type: 'RETURN_APPROVED',
      payload: { id, notes, reviewerName },
    });
  };

  const rejectReturn = (id: string, notes = '', reviewerName = 'Admin') => {
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

    // Sync to Supabase cloud
    updateReturnRequestInSupabase(id, 'Rejected', notes || 'Rejected by store admin', reviewerName);

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
