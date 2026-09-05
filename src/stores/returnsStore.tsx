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
        reason: 'Customer Changed Mind',
        returnToStock: true,
        refundAmount: 480,
      }
    ],
    totalRefund: 480,
    status: 'Pending Admin Approval',
    submittedBy: 'Nimal Perera',
  }
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
    const nextCode = `RET-000392`;
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

  return (
    <ReturnsContext.Provider value={{ returnRequests, submitReturnRequest }}>
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
