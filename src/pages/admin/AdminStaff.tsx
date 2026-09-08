import React, { useState, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useStaff } from '@/stores/staffStore';
import { useToast } from '@/stores/toastStore';
import { StaffMember, PayrollDisbursement } from '@/types';
import {
  Search,
  Plus,
  Check,
  Calendar,
  Pencil,
  Trash2,
  X,
  CreditCard,
  Building,
  CheckCircle2,
  FileText,
  DollarSign,
  Briefcase,
  User,
  Clock,
  TrendingUp,
  Banknote,
  Receipt,
  UserPlus,
} from 'lucide-react';

export const AdminStaff: React.FC = () => {
  const {
    staffList,
    payrollHistory,
    addStaff,
    updateStaff,
    deleteStaff,
    disbursePayroll,
    getPayrollForStaff,
    getStaffMonthlySales,
  } = useStaff();
  const { showToast } = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Modals state
  const [selectedStaffForPay, setSelectedStaffForPay] = useState<StaffMember | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<StaffMember | null>(null);
  const [isStaffStudioOpen, setIsStaffStudioOpen] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);

  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<StaffMember | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // -------------------------------------------------------------
  // PAYROLL MODAL FORM STATE (Matching Image 3)
  // -------------------------------------------------------------
  const [payDisbursementMode, setPayDisbursementMode] = useState<'Salary Settlement' | 'Salary Advance'>('Salary Settlement');
  const [payBasicSalary, setPayBasicSalary] = useState<number>(0);
  const [payOtHours, setPayOtHours] = useState<number>(0);
  const [payApplyBonus, setPayApplyBonus] = useState<boolean>(false);
  const [payBonusAmount, setPayBonusAmount] = useState<number>(0);
  const [payBonusReason, setPayBonusReason] = useState<string>('Monthly Sales Performance Incentive');
  const [payApplyDeductions, setPayApplyDeductions] = useState<boolean>(false);
  const [payDeductionAmount, setPayDeductionAmount] = useState<number>(0);
  const [payDeductionReason, setPayDeductionReason] = useState<string>('Salary Advance / Deductions');
  const [payPaymentMethod, setPayPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [payChequeNumber, setPayChequeNumber] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Open Pay Modal
  const handleOpenPayModal = (staff: StaffMember) => {
    setSelectedStaffForPay(staff);
    setPayDisbursementMode('Salary Settlement');
    setPayBasicSalary(staff.baseSalary);
    setPayOtHours(0);
    setPayApplyBonus(false);
    setPayBonusAmount(0);
    setPayBonusReason(`Monthly Sales (${staff.name}) Incentive`);
    setPayApplyDeductions(false);
    setPayDeductionAmount(0);
    setPayDeductionReason('Advance / Unpaid leave');
    setPayPaymentMethod(staff.bankName && staff.bankAccount ? 'Bank Transfer' : 'Cash');
    setPayChequeNumber('');
    setPayNotes(staff.notes || 'Monthly salary settlement');
    setIsPayModalOpen(true);
  };

  // Calculations for Payroll Modal
  const otRate = selectedStaffForPay?.overtimeRate || 450;
  const otAmount = Math.round(payOtHours * otRate);
  const effectiveBonus = payApplyBonus ? payBonusAmount : 0;
  const effectiveDeductions = payApplyDeductions ? payDeductionAmount : 0;
  const totalPayable = Math.max(0, payBasicSalary + otAmount + effectiveBonus - effectiveDeductions);

  // Submit Payroll
  const handleConfirmDisbursement = () => {
    if (!selectedStaffForPay) return;

    if (payBasicSalary <= 0 && totalPayable <= 0) {
      showToast('Payable amount must be greater than 0', 'error');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const record: PayrollDisbursement = {
      id: `pr-${Date.now()}`,
      staffId: selectedStaffForPay.id,
      staffName: selectedStaffForPay.name,
      role: selectedStaffForPay.role,
      transactionDate: todayStr,
      disbursementMode: payDisbursementMode,
      basicSalary: payBasicSalary,
      overtimeHours: payOtHours,
      overtimeRate: otRate,
      overtimeAmount: otAmount,
      bonusAmount: effectiveBonus,
      bonusReason: payApplyBonus ? payBonusReason : undefined,
      deductionAmount: effectiveDeductions,
      deductionReason: payApplyDeductions ? payDeductionReason : undefined,
      totalPayable: totalPayable,
      paymentMethod: payPaymentMethod,
      bankDetails:
        payPaymentMethod === 'Bank Transfer'
          ? `${selectedStaffForPay.bankName || 'Bank'} - ${selectedStaffForPay.bankAccount || ''}`
          : payPaymentMethod === 'Cheque'
          ? `Cheque #${payChequeNumber}`
          : undefined,
      notes: payNotes,
    };

    disbursePayroll(record);
    showToast(`Disbursed Rs. ${totalPayable.toLocaleString()} to ${selectedStaffForPay.name}`, 'success');
    setIsPayModalOpen(false);
  };

  // -------------------------------------------------------------
  // STAFF STUDIO (ADD / EDIT) MODAL STATE (Matching Image 4)
  // -------------------------------------------------------------
  const [formName, setFormName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmergency, setFormEmergency] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState('8 Sep 2026');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'On Leave'>('Active');
  const [formNotes, setFormNotes] = useState('');
  const [formBaseSalary, setFormBaseSalary] = useState<number>(60000);
  const [formPayFrequency, setFormPayFrequency] = useState<'Monthly' | 'Bi-weekly' | 'Weekly'>('Monthly');
  const [formSalaryDate, setFormSalaryDate] = useState('28th of Month');
  const [formBankName, setFormBankName] = useState('');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formBankBranch, setFormBankBranch] = useState('');

  const ROLE_SUGGESTIONS = [
    'Manager',
    'Cashier',
    'Staff',
    'Sales Representative',
    'Supervisor',
    'Inventory Officer',
  ];

  const handleOpenAddStaff = () => {
    setIsEditingStaff(false);
    setSelectedStaffForEdit(null);
    setFormName('');
    setFormNic('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormEmergency('');
    setFormRole('Staff');
    setFormJoiningDate('8 Sep 2026');
    setFormStatus('Active');
    setFormNotes('');
    setFormBaseSalary(60000);
    setFormPayFrequency('Monthly');
    setFormSalaryDate('28th of Month');
    setFormBankName('');
    setFormBankAccount('');
    setFormBankBranch('');
    setIsStaffStudioOpen(true);
  };

  const handleOpenEditStaff = (staff: StaffMember) => {
    setIsEditingStaff(true);
    setSelectedStaffForEdit(staff);
    setFormName(staff.name);
    setFormNic(staff.nic || '');
    setFormPhone(staff.phone.replace('+94', '').trim());
    setFormEmail(staff.email || '');
    setFormAddress(staff.address || '');
    setFormEmergency(staff.emergencyContact || '');
    setFormRole(staff.role);
    setFormJoiningDate(staff.joiningDate || '8 Sep 2026');
    setFormStatus(staff.status);
    setFormNotes(staff.notes || '');
    setFormBaseSalary(staff.baseSalary);
    setFormPayFrequency(staff.payFrequency);
    setFormSalaryDate(staff.salaryDate);
    setFormBankName(staff.bankName || '');
    setFormBankAccount(staff.bankAccount || '');
    setFormBankBranch(staff.bankBranch || '');
    setIsStaffStudioOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter full employee name', 'error');
      return;
    }
    if (!formRole.trim()) {
      showToast('Please specify a role or designation', 'error');
      return;
    }

    const formattedPhone = formPhone.startsWith('+94')
      ? formPhone
      : `+94 ${formPhone.trim()}`;

    const staffPayload = {
      name: formName.trim(),
      nic: formNic.trim(),
      phone: formattedPhone,
      email: formEmail.trim(),
      address: formAddress.trim(),
      emergencyContact: formEmergency.trim(),
      role: formRole.trim(),
      attendances: selectedStaffForEdit ? selectedStaffForEdit.attendances : 0,
      baseSalary: formBaseSalary,
      payFrequency: formPayFrequency,
      salaryDate: formSalaryDate,
      overtimeRate: Math.round((formBaseSalary / 160) * 1.25) || 450,
      status: formStatus,
      bankName: formBankName.trim(),
      bankAccount: formBankAccount.trim(),
      bankBranch: formBankBranch.trim(),
      notes: formNotes.trim(),
      joiningDate: formJoiningDate,
      monthlySalesAttributed: selectedStaffForEdit ? selectedStaffForEdit.monthlySalesAttributed : 35000,
      isPaidThisMonth: selectedStaffForEdit ? selectedStaffForEdit.isPaidThisMonth : false,
    };

    if (isEditingStaff && selectedStaffForEdit) {
      updateStaff(selectedStaffForEdit.id, staffPayload);
      showToast(`Updated employee details for ${formName}`, 'success');
    } else {
      addStaff(staffPayload);
      showToast(`Added new employee ${formName} to directory`, 'success');
    }

    setIsStaffStudioOpen(false);
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    if (confirm(`Are you sure you want to remove ${staff.name} from the staff directory?`)) {
      deleteStaff(staff.id);
      showToast(`Removed ${staff.name} from directory`, 'info');
    }
  };

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.bankName && s.bankName.toLowerCase().includes(q));
      if (!matches) return false;
    }

    if (statusFilter === 'unpaid' && s.isPaidThisMonth) return false;
    if (statusFilter === 'paid' && !s.isPaidThisMonth) return false;

    return true;
  });

  const unpaidCount = staffList.filter((s) => !s.isPaidThisMonth).length;
  const paidCount = staffList.filter((s) => s.isPaidThisMonth).length;

  return (
    <AdminLayout
      title="Staff Management"
      subtitle="Staff directory, monthly attendance, salary disbursement & performance bonuses"
      mainClassName="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl w-full mx-auto overflow-hidden animate-in fade-in duration-150"
    >
      {/* Full-Height Layout Wrapper with bottom padding for floating search pill */}
      <div className="flex-1 flex flex-col min-h-0 w-full h-full pb-16">
        {/* Main Staff Directory Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs flex flex-col flex-1 min-h-0 w-full h-full overflow-hidden">
          {/* Header Bar: Title and Status Filter Chips ONLY (Search & Add button moved to bottom pop up center) */}
          <div className="p-3 sm:p-4 border-b border-zinc-100 flex items-center justify-between gap-3 bg-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3B2011]">
                STAFF &amp; EMPLOYEE DIRECTORY
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md font-semibold border border-zinc-200/60">
                {filteredStaff.length} staff
              </span>
            </div>

            {/* Clean Status Filter Chips */}
            <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl text-xs font-bold select-none">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-zinc-900 shadow-2xs font-black'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                All ({staffList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unpaid')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'unpaid'
                    ? 'bg-rose-50 text-rose-700 shadow-2xs font-black'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Unpaid ({unpaidCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-black'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Paid ({paidCount})
              </button>
            </div>
          </div>

          {/* Table Container: Full Height with Sticky Header */}
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 w-full h-full">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2] border-b border-zinc-200 select-none shadow-2xs">
                <tr>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                    EMPLOYEE
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                    ROLE
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                    CONTACT
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                    ATTENDANCES
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                    BASE SALARY
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                    BANK DETAILS
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                    MONTH STATUS
                  </th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 bg-white">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-zinc-400 text-xs">
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const isPaid = staff.isPaidThisMonth;
                    const dueAmount = isPaid ? 0 : staff.baseSalary;

                    return (
                      <tr
                        key={staff.id}
                        className="hover:bg-zinc-50/80 transition-colors group"
                      >
                        {/* 1. EMPLOYEE: Clean Single Line */}
                        <td className="py-2.5 px-4 font-bold text-xs text-zinc-900 whitespace-nowrap">
                          {staff.name}
                        </td>

                        {/* 2. ROLE: Single Line */}
                        <td className="py-2.5 px-3 text-xs text-zinc-600 whitespace-nowrap">
                          {staff.role}
                        </td>

                        {/* 3. CONTACT: Single Line */}
                        <td className="py-2.5 px-3 font-mono text-xs text-zinc-600 whitespace-nowrap">
                          {staff.phone}
                        </td>

                        {/* 4. ATTENDANCES: Single Line */}
                        <td className="py-2.5 px-3 font-bold text-xs text-zinc-900 whitespace-nowrap">
                          {staff.attendances} Days
                        </td>

                        {/* 5. BASE SALARY: Single Line */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-xs text-zinc-900">
                          <span>
                            Rs. {staff.baseSalary.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-sans font-normal ml-1.5">
                            / mo &bull; Pay: {staff.salaryDate?.replace(' of Month', '') || '28th'}
                          </span>
                        </td>

                        {/* 6. BANK DETAILS: Single Line */}
                        <td className="py-2.5 px-3 text-xs text-zinc-700 whitespace-nowrap">
                          {staff.bankName ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-800">{staff.bankName}</span>
                              <span className="font-mono text-zinc-400 text-[11px]">&bull; {staff.bankAccount}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">Direct Cash</span>
                          )}
                        </td>

                        {/* 7. MONTH STATUS: Compact Pill */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isPaid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100">
                              Due: Rs. 0.00
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100">
                              Due: Rs. {dueAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* 8. ACTIONS: Compact Single-Line */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* + Pay Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(staff)}
                              className={`h-6.5 px-2.5 rounded-md font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer ${
                                !isPaid
                                  ? 'bg-teal-50 hover:bg-teal-100 text-[#00BFA5] border border-teal-200'
                                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
                              }`}
                              title="Disburse Salary Payment"
                            >
                              <span>+ Pay</span>
                            </button>

                            {/* Payment History Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaffForHistory(staff);
                                setIsHistoryModalOpen(true);
                              }}
                              className="w-6.5 h-6.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 border border-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                              title="View Payment History"
                            >
                              <Calendar className="w-3 h-3" />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(staff)}
                              className="w-6.5 h-6.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 border border-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Employee"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(staff)}
                              className="w-6.5 h-6.5 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 border border-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING BOTTOM CENTER SEARCH POP-UP PILL WITH + ADD EMPLOYEE BUTTON      */}
      {/* ========================================================================= */}
      <div className="fixed bottom-7 sm:bottom-8 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-30 pointer-events-none select-none">
        <div
          className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 pl-3.5 pr-[2px] h-10 sm:h-11 rounded-full bg-black/95 transition-all duration-300 ease-in-out will-change-[width] ${
            isSearchFocused || searchQuery.trim().length > 0
              ? 'w-[80vw] sm:w-[350px] shadow-2xl shadow-[#FF5500]/25 border-2 border-[#FF5500] ring-4 ring-[#FF5500]/20'
              : 'w-[215px] sm:w-[240px] shadow-2xl shadow-black/40 border-2 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Search
            className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200 ${
              isSearchFocused || searchQuery.trim().length > 0 ? 'text-[#FF5500]' : 'text-zinc-400'
            }`}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, role, phone..."
            className="flex-1 min-w-0 bg-transparent text-xs font-bold text-[#FF5500] placeholder:text-zinc-500 placeholder:font-medium focus:outline-none caret-[#FF5500]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              title="Clear search"
            >
              <X className="w-3 h-3 text-[#FF5500]" />
            </button>
          )}

          {/* Circular + Add Employee Button with plus icon right on search bar */}
          <button
            type="button"
            onClick={handleOpenAddStaff}
            className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] aspect-square rounded-full bg-white hover:bg-orange-50 border-2 border-[#FF5500] inline-flex items-center justify-center p-0 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer flex-shrink-0"
            title="Add New Employee"
          >
            <Plus className="w-[16px] h-[16px] text-[#FF5500] stroke-[2.5] block shrink-0" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DISBURSE PAYROLL PAYMENT MODAL (Matching Image 3)                     */}
      {/* ========================================================================= */}
      {isPayModalOpen && selectedStaffForPay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-5xl my-auto overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50 text-[#00BFA5] border border-teal-200/60">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-zinc-900">
                    Disburse Payroll Payment
                  </h2>
                  <p className="text-xs text-zinc-500 font-semibold">
                    Payee: <strong>{selectedStaffForPay.name}</strong> ({selectedStaffForPay.role})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisbursement}
                  className="px-4 py-2 rounded-xl bg-[#00BFA5] hover:bg-[#00A892] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Disbursement</span>
                </button>
              </div>
            </div>

            {/* 3-Column Studio Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[82vh] overflow-y-auto">
              {/* COLUMN 1: STAFF & SCHEDULE */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider pb-1 border-b border-zinc-100">
                  <User className="w-4 h-4 text-[#00BFA5]" />
                  <span>STAFF &amp; SCHEDULE</span>
                </div>

                {/* Employee Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-sm text-zinc-900">{selectedStaffForPay.name}</h3>
                      <p className="text-xs text-zinc-500">{selectedStaffForPay.role}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVE STAFF
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">BASE SALARY</span>
                      <p className="font-mono font-bold text-zinc-800">
                        Rs. {selectedStaffForPay.baseSalary.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">SALARY PAY DAY</span>
                      <p className="font-bold text-zinc-800">
                        Day {selectedStaffForPay.salaryDate?.replace(' of Month', '') || '28th'}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">ATTENDED DAYS</span>
                      <p className="font-mono font-bold text-[#00BFA5]">{selectedStaffForPay.attendances} Days</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">OVERTIME RATE</span>
                      <p className="font-mono font-bold text-zinc-800">Rs. {otRate}.00/h</p>
                    </div>
                  </div>

                  {/* Monthly Sales Attributed Highlight */}
                  <div className="mt-2 p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/70 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#FF5500]" />
                        Monthly Sales Attributed
                      </span>
                      <span className="font-mono font-black text-sm text-[#FF5500]">
                        Rs. {(selectedStaffForPay.monthlySalesAttributed || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Admin reference to assign performance bonus
                    </p>
                  </div>
                </div>

                {/* Disbursement Mode */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    DISBURSEMENT MODE
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayDisbursementMode('Salary Settlement')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        payDisbursementMode === 'Salary Settlement'
                          ? 'bg-[#27140B] text-white shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700'
                      }`}
                    >
                      Salary Settlement
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayDisbursementMode('Salary Advance')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        payDisbursementMode === 'Salary Advance'
                          ? 'bg-[#27140B] text-white shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700'
                      }`}
                    >
                      Salary Advance
                    </button>
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    INTERNAL NOTES &amp; REMARKS
                  </label>
                  <textarea
                    rows={2}
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Morning shift cashier performance notes..."
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:border-[#00BFA5] focus:ring-1 focus:ring-[#00BFA5] outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* COLUMN 2: EARNINGS BREAKDOWN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider pb-1 border-b border-zinc-100">
                  <Receipt className="w-4 h-4 text-[#00BFA5]" />
                  <span>EARNINGS BREAKDOWN</span>
                </div>

                {/* Basic Salary Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-700">
                      BASIC SALARY (LKR) *
                    </label>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      Base: Rs. {selectedStaffForPay.baseSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-mono font-bold text-zinc-400 text-xs">Rs.</span>
                    <input
                      type="number"
                      value={payBasicSalary || ''}
                      onChange={(e) => setPayBasicSalary(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 pl-9 pr-20 rounded-xl border border-zinc-300 font-mono font-bold text-sm text-zinc-900 focus:border-[#00BFA5] focus:ring-1 focus:ring-[#00BFA5] outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setPayBasicSalary(selectedStaffForPay.baseSalary)}
                      className="absolute right-2 px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Full Base
                    </button>
                  </div>
                </div>

                {/* Overtime (Auto Calculated) */}
                <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00BFA5]" />
                      OVERTIME (AUTO CALCULATED)
                    </span>
                    <span className="text-[10px] text-teal-700 font-mono font-bold">
                      (Rs. {otRate}.00/hr)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">OT HOURS LOGGED</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={payOtHours || ''}
                          onChange={(e) => setPayOtHours(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full h-8 px-2.5 pr-8 rounded-lg border border-teal-200 bg-white font-mono text-xs font-bold"
                          placeholder="0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold">hrs</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">OT AMOUNT (LKR)</label>
                      <div className="h-8 px-2.5 rounded-lg bg-white border border-teal-200 flex items-center justify-end font-mono font-bold text-xs text-teal-700">
                        Rs. {otAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apply Bonus / Incentive */}
                <div className="p-3.5 rounded-2xl border border-zinc-200 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={payApplyBonus}
                      onChange={(e) => setPayApplyBonus(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00BFA5] focus:ring-[#00BFA5] accent-[#00BFA5]"
                    />
                    <span>Apply Bonus / Incentive</span>
                  </label>

                  {payApplyBonus && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                          BONUS AMOUNT (LKR)
                        </span>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 font-mono text-xs text-zinc-400 font-bold">Rs.</span>
                          <input
                            type="number"
                            min="0"
                            value={payBonusAmount || ''}
                            onChange={(e) => setPayBonusAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-zinc-200 font-mono font-bold text-xs text-emerald-600 focus:border-[#00BFA5] outline-hidden"
                            placeholder="5000"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                          REASON / REMARKS
                        </span>
                        <input
                          type="text"
                          value={payBonusReason}
                          onChange={(e) => setPayBonusReason(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 text-xs"
                          placeholder="e.g. Monthly sales performance bonus"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Apply Other Deductions */}
                <div className="p-3.5 rounded-2xl border border-zinc-200 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={payApplyDeductions}
                      onChange={(e) => setPayApplyDeductions(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00BFA5] focus:ring-[#00BFA5] accent-[#00BFA5]"
                    />
                    <span>Apply Other Deductions</span>
                  </label>

                  {payApplyDeductions && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                          DEDUCTION AMOUNT (LKR)
                        </span>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 font-mono text-xs text-zinc-400 font-bold">Rs.</span>
                          <input
                            type="number"
                            min="0"
                            value={payDeductionAmount || ''}
                            onChange={(e) => setPayDeductionAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-zinc-200 font-mono font-bold text-xs text-rose-600 focus:border-[#00BFA5] outline-hidden"
                            placeholder="2000"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                          DEDUCTION REASON
                        </span>
                        <input
                          type="text"
                          value={payDeductionReason}
                          onChange={(e) => setPayDeductionReason(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 text-xs"
                          placeholder="e.g. Unpaid leave deduction"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 3: PAYMENT DETAILS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider pb-1 border-b border-zinc-100">
                  <Building className="w-4 h-4 text-[#00BFA5]" />
                  <span>PAYMENT DETAILS</span>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    PAYMENT METHOD
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPayPaymentMethod('Cash')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        payPaymentMethod === 'Cash'
                          ? 'bg-[#00BFA5] text-white shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayPaymentMethod('Bank Transfer')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        payPaymentMethod === 'Bank Transfer'
                          ? 'bg-[#00BFA5] text-white shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5" />
                      <span>Bank Transfer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayPaymentMethod('Cheque')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        payPaymentMethod === 'Cheque'
                          ? 'bg-[#00BFA5] text-white shadow-xs'
                          : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Cheque</span>
                    </button>
                  </div>
                </div>

                {/* Method info banner */}
                {payPaymentMethod === 'Cash' && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200/70 text-xs text-teal-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00BFA5] flex-shrink-0" />
                    <span>Direct Cash Disbursement</span>
                  </div>
                )}

                {payPaymentMethod === 'Bank Transfer' && (
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
                    <span className="font-bold text-zinc-900 block">Bank Remittance Destination:</span>
                    <p className="text-zinc-600">
                      <strong>{selectedStaffForPay.bankName || 'No bank assigned'}</strong>
                    </p>
                    <p className="font-mono text-zinc-500 text-[11px]">
                      Acc: {selectedStaffForPay.bankAccount || 'N/A'} ({selectedStaffForPay.bankBranch || 'Branch'})
                    </p>
                  </div>
                )}

                {payPaymentMethod === 'Cheque' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">CHEQUE NUMBER</label>
                    <input
                      type="text"
                      value={payChequeNumber}
                      onChange={(e) => setPayChequeNumber(e.target.value)}
                      placeholder="e.g. CHQ-99201"
                      className="w-full h-8.5 px-3 rounded-xl border border-zinc-300 text-xs font-mono font-bold"
                    />
                  </div>
                )}

                {/* PAYROLL CALCULATION SUMMARY CARD */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/80 text-[10px] font-black uppercase text-zinc-400">
                    <span>PAYROLL CALCULATION</span>
                    <span>AMOUNT (LKR)</span>
                  </div>

                  <div className="flex justify-between text-zinc-600">
                    <span>Basic Salary:</span>
                    <span className="font-mono font-bold text-zinc-800">
                      Rs. {payBasicSalary.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-600">
                    <span>Overtime:</span>
                    <span className="font-mono font-bold text-teal-700">
                      +Rs. {otAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-600">
                    <span>Bonus / Incentive:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      +Rs. {effectiveBonus.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {effectiveDeductions > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Deductions:</span>
                      <span className="font-mono font-bold text-rose-600">
                        -Rs. {effectiveDeductions.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
                    <span className="font-black text-zinc-900 text-xs">TOTAL PAYABLE</span>
                    <span className="font-mono font-black text-lg text-[#00BFA5]">
                      Rs. {totalPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Footer Payee & Date */}
                <div className="text-[11px] text-zinc-500 space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>Disbursing Payee:</span>
                    <strong className="text-zinc-900">{selectedStaffForPay.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction Date:</span>
                    <span className="font-mono font-bold text-zinc-700">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD / EDIT EMPLOYEE STUDIO MODAL (Matching Image 4)                   */}
      {/* ========================================================================= */}
      {isStaffStudioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <form
            onSubmit={handleSaveStaff}
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-5xl my-auto overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50 text-[#00BFA5] border border-teal-200/60">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-zinc-900">
                    {isEditingStaff ? 'Edit Employee Details' : 'Add New Employee'}
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">Staff Directory Studio</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffStudioOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00BFA5] hover:bg-[#00A892] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Employee</span>
                </button>
              </div>
            </div>

            {/* 3-Column Studio Form Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[82vh] overflow-y-auto text-xs">
              {/* COLUMN 1: PERSONAL DETAILS */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-zinc-500 uppercase tracking-wider pb-1 border-b border-zinc-100">
                  <User className="w-4 h-4 text-[#00BFA5]" />
                  <span>PERSONAL DETAILS</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">FULL NAME *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Nimal Perera"
                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 focus:border-[#00BFA5] focus:ring-1 focus:ring-[#00BFA5] outline-hidden font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">NIC / NATIONAL ID NUMBER</label>
                  <input
                    type="text"
                    value={formNic}
                    onChange={(e) => setFormNic(e.target.value)}
                    placeholder="e.g. 199012345678V or 200112345678"
                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 font-mono text-xs focus:border-[#00BFA5] outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="font-bold text-zinc-700">PHONE CONTACT</label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {formPhone.replace(/\D/g, '').length} / 9 digits
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono font-bold text-zinc-500">+94</span>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="7X XXX XXXX"
                      className="w-full h-9 pl-12 pr-3 rounded-xl border border-zinc-200 font-mono text-xs focus:border-[#00BFA5] outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="nimal@chillandchoc.lk"
                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 text-xs focus:border-[#00BFA5] outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">RESIDENTIAL ADDRESS</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="No. 45, Temple Road, Colombo 03"
                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 text-xs focus:border-[#00BFA5] outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">EMERGENCY CONTACT (NAME &amp; PHONE)</label>
                  <input
                    type="text"
                    value={formEmergency}
                    onChange={(e) => setFormEmergency(e.target.value)}
                    placeholder="+94 77 111 2222 (Kamal Perera - Spouse)"
                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 text-xs focus:border-[#00BFA5] outline-hidden"
                  />
                </div>
              </div>

              {/* COLUMN 2: EMPLOYMENT DETAILS */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-zinc-500 uppercase tracking-wider pb-1 border-b border-zinc-100">
                  <Briefcase className="w-4 h-4 text-[#00BFA5]" />
                  <span>EMPLOYMENT DETAILS</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700">ROLE / DESIGNATION *</label>
                  <input
                    type="text"
                    required
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g. Manager, Cashier, Staff"
                    className="w-full h-9 px-3 rounded-xl border border-zinc-300 focus:border-[#00BFA5] focus:ring-1 focus:ring-[#00BFA5] outline-hidden font-medium"
                  />

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ROLE_SUGGESTIONS.map((rChip) => (
                      <button
                        key={rChip}
                        type="button"
                        onClick={() => setFormRole(rChip)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          formRole === rChip
                            ? 'bg-teal-50 text-[#00BFA5] border-teal-300'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {rChip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">JOINING / EFFECTIVE DATE</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={formJoiningDate}
                      onChange={(e) => setFormJoiningDate(e.target.value)}
                      className="w-full h-9 px-3 pr-16 rounded-xl border border-zinc-200 text-xs font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setFormJoiningDate('8 Sep 2026')}
                      className="absolute right-2 px-2 py-0.5 rounded-lg bg-orange-50 text-[#FF5500] border border-orange-200 text-[10px] font-bold cursor-pointer"
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700">EMPLOYMENT STATUS</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('Active')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        formStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-2xs font-black'
                          : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Active Staff</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('Inactive')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formStatus === 'Inactive'
                          ? 'bg-zinc-200 text-zinc-900 border-2 border-zinc-400 shadow-2xs font-black'
                          : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      Inactive / On Leave
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">INTERNAL NOTES &amp; REMARKS</label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Contract terms, shift preferences, uniform size, notes..."
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:border-[#00BFA5] focus:ring-1 focus:ring-[#00BFA5] outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* COLUMN 3: PAYMENT DETAILS */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-zinc-500 uppercase tracking-wider pb-1 border-b border-zinc-100">
                  <DollarSign className="w-4 h-4 text-[#00BFA5]" />
                  <span>PAYMENT DETAILS</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700">BASE SALARY (LKR) *</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-mono font-bold text-zinc-400">Rs.</span>
                    <input
                      type="number"
                      required
                      value={formBaseSalary || ''}
                      onChange={(e) => setFormBaseSalary(parseFloat(e.target.value) || 0)}
                      placeholder="60000"
                      className="w-full h-9 pl-9 pr-3 rounded-xl border border-zinc-300 font-mono font-bold text-sm focus:border-[#00BFA5] outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700">PAY FREQUENCY</label>
                    <select
                      value={formPayFrequency}
                      onChange={(e) => setFormPayFrequency(e.target.value as any)}
                      className="w-full h-9 px-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:border-[#00BFA5] outline-hidden"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Bi-weekly">Bi-weekly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700">SALARY DATE</label>
                    <select
                      value={formSalaryDate}
                      onChange={(e) => setFormSalaryDate(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:border-[#00BFA5] outline-hidden"
                    >
                      <option value="28th of Month">28th of Month</option>
                      <option value="1st of Month">1st of Month</option>
                      <option value="15th of Month">15th of Month</option>
                      <option value="30th of Month">30th of Month</option>
                    </select>
                  </div>
                </div>

                {/* Bank Remittance Details Box */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 text-xs flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#00BFA5]" />
                      BANK REMITTANCE DETAILS
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Optional</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600">BANK NAME</label>
                    <input
                      type="text"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      placeholder="e.g. Commercial Bank of Ceylon"
                      className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600">BANK ACCOUNT NUMBER</label>
                    <input
                      type="text"
                      value={formBankAccount}
                      onChange={(e) => setFormBankAccount(e.target.value)}
                      placeholder="e.g. 0029384756"
                      className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600">BANK BRANCH NAME / CODE</label>
                    <input
                      type="text"
                      value={formBankBranch}
                      onChange={(e) => setFormBankBranch(e.target.value)}
                      placeholder="e.g. Kollupitiya Branch - 042"
                      className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PAYSLIP & DISBURSEMENT HISTORY MODAL                                  */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && selectedStaffForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-zinc-900">
                  Payroll History &bull; {selectedStaffForHistory.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  Historical salary settlements, advances, and performance bonuses
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {getPayrollForStaff(selectedStaffForHistory.id).length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  No payroll disbursements recorded yet for this staff member.
                </div>
              ) : (
                getPayrollForStaff(selectedStaffForHistory.id).map((pr) => (
                  <div
                    key={pr.id}
                    className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-zinc-900">{pr.disbursementMode}</span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">
                          {pr.paymentMethod}
                        </span>
                      </div>
                      <p className="text-zinc-500 font-mono text-[11px]">
                        Date: {pr.transactionDate} &bull; Base: Rs. {pr.basicSalary.toLocaleString()}
                        {pr.bonusAmount > 0 && ` • Bonus: +Rs. ${pr.bonusAmount.toLocaleString()}`}
                        {pr.overtimeAmount > 0 && ` • OT: +Rs. ${pr.overtimeAmount.toLocaleString()}`}
                        {pr.deductionAmount > 0 && ` • Deduct: -Rs. ${pr.deductionAmount.toLocaleString()}`}
                      </p>
                      {pr.bankDetails && (
                        <p className="text-zinc-400 text-[10px] font-mono">{pr.bankDetails}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase block">TOTAL DISBURSED</span>
                      <span className="font-mono font-black text-sm text-[#00BFA5]">
                        Rs. {pr.totalPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-zinc-100 flex justify-end bg-zinc-50/50">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
