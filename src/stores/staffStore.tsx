import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffMember, PayrollDisbursement } from '@/types';

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

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Kasun Fernando',
    nic: '199428371920',
    phone: '+94 76 555 8899',
    email: 'kasun.fernando@chillandchoc.lk',
    address: 'No. 12, Galle Road, Colombo 03',
    emergencyContact: '+94 77 999 1122 (Mother)',
    role: 'Cashier',
    attendances: 0,
    baseSalary: 55000,
    payFrequency: 'Monthly',
    salaryDate: '28th of Month',
    overtimeRate: 450,
    status: 'Active',
    bankName: 'Sampath Bank',
    bankAccount: '1004839201',
    bankBranch: 'Bambalapitiya',
    notes: 'Retail terminal cashier.',
    joiningDate: '15 Jan 2026',
    monthlySalesAttributed: 42500,
    isPaidThisMonth: false,
  },
  {
    id: 'staff-2',
    name: 'Dilshan Madushanka',
    nic: '199738291039',
    phone: '+94 72 333 4455',
    email: 'dilshan.m@chillandchoc.lk',
    address: 'No. 45, Station Road, Dehiwala',
    emergencyContact: '+94 71 888 3344 (Brother)',
    role: 'Staff',
    attendances: 0,
    baseSalary: 45000,
    payFrequency: 'Monthly',
    salaryDate: '28th of Month',
    overtimeRate: 400,
    status: 'Active',
    bankName: 'Hatton National Bank (HNB)',
    bankAccount: '0492837461',
    bankBranch: 'Kollupitiya',
    notes: 'Floor staff and stock inventory.',
    joiningDate: '01 Mar 2026',
    monthlySalesAttributed: 18200,
    isPaidThisMonth: false,
  },
  {
    id: 'staff-3',
    name: 'Chaminda Silva',
    nic: '198829104829',
    phone: '+94 77 123 4567',
    email: 'chaminda@chillandchoc.lk',
    address: 'No. 88, Havelock Road, Colombo 05',
    emergencyContact: '+94 77 444 5566 (Wife)',
    role: 'Manager',
    attendances: 3,
    baseSalary: 120000,
    payFrequency: 'Monthly',
    salaryDate: '28th of Month',
    overtimeRate: 750,
    status: 'Active',
    bankName: 'Commercial Bank of Ceylon',
    bankAccount: '8001293847',
    bankBranch: 'Colombo 03',
    notes: 'Retail store manager & operations.',
    joiningDate: '01 Jan 2025',
    monthlySalesAttributed: 85000,
    isPaidThisMonth: true,
    lastPaidDate: '05 Sep 2026',
    lastPaidAmount: 120000,
  },
  {
    id: 'staff-4',
    name: 'Nimal Perera',
    nic: '199120394821',
    phone: '+94 71 987 6543',
    email: 'nimal@chillandchoc.lk',
    address: 'No. 23, Kandy Road, Kelaniya',
    emergencyContact: '+94 77 111 2222 (Kamal Perera - Spouse)',
    role: 'Cashier',
    attendances: 2,
    baseSalary: 75000,
    payFrequency: 'Monthly',
    salaryDate: '28th of Month',
    overtimeRate: 550,
    status: 'Active',
    bankName: 'Bank of Ceylon',
    bankAccount: '0029384756',
    bankBranch: 'Fort Branch',
    notes: 'Senior retail cashier.',
    joiningDate: '10 Aug 2025',
    monthlySalesAttributed: 64800,
    isPaidThisMonth: true,
    lastPaidDate: '06 Sep 2026',
    lastPaidAmount: 75000,
  },
];

const INITIAL_PAYROLL: PayrollDisbursement[] = [
  {
    id: 'pr-init-1',
    staffId: 'staff-3',
    staffName: 'Chaminda Silva',
    role: 'Manager',
    transactionDate: '05 Sep 2026',
    disbursementMode: 'Salary Settlement',
    basicSalary: 120000,
    overtimeHours: 0,
    overtimeRate: 750,
    overtimeAmount: 0,
    bonusAmount: 0,
    deductionAmount: 0,
    totalPayable: 120000,
    paymentMethod: 'Bank Transfer',
    bankDetails: 'Commercial Bank of Ceylon - 8001293847',
    notes: 'Monthly management salary settlement',
  },
  {
    id: 'pr-init-2',
    staffId: 'staff-4',
    staffName: 'Nimal Perera',
    role: 'Cashier',
    transactionDate: '06 Sep 2026',
    disbursementMode: 'Salary Settlement',
    basicSalary: 75000,
    overtimeHours: 0,
    overtimeRate: 550,
    overtimeAmount: 0,
    bonusAmount: 0,
    deductionAmount: 0,
    totalPayable: 75000,
    paymentMethod: 'Cash',
    notes: 'Direct cash salary disbursement',
  },
];

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load staff list from localStorage or fallback, sanitizing any old cafe roles
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
    return INITIAL_STAFF;
  });

  // Load payroll history from localStorage or fallback, sanitizing roles
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
    return INITIAL_PAYROLL;
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

  const addStaff = (staffData: Omit<StaffMember, 'id'>) => {
    const newStaff: StaffMember = {
      ...staffData,
      id: `staff-${Date.now()}`,
      attendances: staffData.attendances ?? 0,
      isPaidThisMonth: false,
    };
    setStaffList((prev) => [...prev, newStaff]);
  };

  const updateStaff = (id: string, updates: Partial<StaffMember>) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
  };

  const disbursePayroll = (disbursement: PayrollDisbursement) => {
    setPayrollHistory((prev) => [disbursement, ...prev]);

    // Mark staff member as paid for this month
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === disbursement.staffId) {
          return {
            ...s,
            isPaidThisMonth: true,
            lastPaidDate: disbursement.transactionDate,
            lastPaidAmount: disbursement.totalPayable,
          };
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
