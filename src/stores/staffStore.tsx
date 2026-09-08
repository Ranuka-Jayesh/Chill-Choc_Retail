import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffMember, PayrollDisbursement } from '@/types';
import {
  fetchStaffFromSupabase,
  upsertStaffToSupabase,
  deleteStaffFromSupabase,
  fetchPayrollFromSupabase,
  insertPayrollToSupabase,
  generateUUID,
} from '@/services/supabaseData';

interface StaffContextType {
  staffList: StaffMember[];
  payrollHistory: PayrollDisbursement[];
  addStaff: (staff: Omit<StaffMember, 'id'>) => void;
  updateStaff: (id: string, updates: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;
  disbursePayroll: (disbursement: PayrollDisbursement) => void;
  getPayrollForStaff: (staffId: string) => PayrollDisbursement[];
  getStaffMonthlySales: (staffName: string) => number;
}

const sanitizeRole = (role: string): string => {
  if (!role) return 'Staff';
  if (role.toLowerCase().includes('manager')) return 'Manager';
  if (role.toLowerCase().includes('cashier') || role.toLowerCase().includes('barista')) return 'Cashier';
  if (role.toLowerCase().includes('kitchen') || role.toLowerCase().includes('stock') || role.toLowerCase().includes('server')) return 'Staff';
  return role;
};

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem('chill_choc_staff_members');
      if (saved) {
        const parsed: StaffMember[] = JSON.parse(saved);
        return parsed.map((s) => ({ ...s, role: sanitizeRole(s.role) }));
      }
    } catch (e) {
      console.warn('Failed to parse chill_choc_staff_members from localStorage', e);
    }
    return [];
  });

  const [payrollHistory, setPayrollHistory] = useState<PayrollDisbursement[]>(() => {
    try {
      const saved = localStorage.getItem('chill_choc_payroll_history');
      if (saved) {
        const parsed: PayrollDisbursement[] = JSON.parse(saved);
        return parsed.map((p) => ({ ...p, role: sanitizeRole(p.role) }));
      }
    } catch (e) {
      console.warn('Failed to parse chill_choc_payroll_history from localStorage', e);
    }
    return [];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('chill_choc_staff_members', JSON.stringify(staffList));
    } catch (e) {
      console.warn('Failed to save staffList to localStorage', e);
    }
  }, [staffList]);

  useEffect(() => {
    try {
      localStorage.setItem('chill_choc_payroll_history', JSON.stringify(payrollHistory));
    } catch (e) {
      console.warn('Failed to save payrollHistory to localStorage', e);
    }
  }, [payrollHistory]);

  // Fetch initial staff & payroll from Supabase
  useEffect(() => {
    let isMounted = true;
    fetchStaffFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setStaffList(data);
      }
    });
    fetchPayrollFromSupabase().then((data) => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setPayrollHistory(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const addStaff = (staffData: Omit<StaffMember, 'id'>) => {
    const newStaff: StaffMember = {
      ...staffData,
      id: generateUUID(),
      attendances: staffData.attendances ?? 0,
      isPaidThisMonth: false,
    };
    setStaffList((prev) => [...prev, newStaff]);

    // Sync to Supabase cloud
    upsertStaffToSupabase(newStaff);
  };

  const updateStaff = (id: string, updates: Partial<StaffMember>) => {
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const mod = { ...s, ...updates };
          upsertStaffToSupabase(mod);
          return mod;
        }
        return s;
      })
    );
  };

  const deleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    deleteStaffFromSupabase(id);
  };

  const disbursePayroll = (disbursement: PayrollDisbursement) => {
    const record: PayrollDisbursement = {
      ...disbursement,
      id: disbursement.id || generateUUID(),
    };
    setPayrollHistory((prev) => [record, ...prev]);
    insertPayrollToSupabase(record);

    // Mark staff member as paid for this month
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === disbursement.staffId) {
          const mod = {
            ...s,
            isPaidThisMonth: true,
            lastPaidDate: disbursement.transactionDate,
            lastPaidAmount: disbursement.totalPayable,
          };
          upsertStaffToSupabase(mod);
          return mod;
        }
        return s;
      })
    );
  };

  const getPayrollForStaff = (staffId: string) => {
    return payrollHistory.filter((p) => p.staffId === staffId);
  };

  const getStaffMonthlySales = (staffName: string) => {
    const staff = staffList.find((s) => s.name.toLowerCase() === staffName.toLowerCase());
    return staff?.monthlySalesAttributed || 0;
  };

  return (
    <StaffContext.Provider
      value={{
        staffList,
        payrollHistory,
        addStaff,
        updateStaff,
        deleteStaff,
        disbursePayroll,
        getPayrollForStaff,
        getStaffMonthlySales,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
};
