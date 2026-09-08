import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCashier } from '@/stores/cashierStore';
import { useToast } from '@/stores/toastStore';
import { CashMovement } from '@/types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  CheckCircle2,
  Coins,
  TrendingUp,
  History,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MovementType = 'Cash In' | 'Cash Out' | 'Expense';

const MOVEMENT_TYPES: { id: MovementType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'Cash In', label: 'Cash In', icon: ArrowDownLeft },
  { id: 'Cash Out', label: 'Cash Out', icon: ArrowUpRight },
  { id: 'Expense', label: 'Expense', icon: Receipt },
];

export const CashMovementModal: React.FC<CashMovementModalProps> = ({ isOpen, onClose }) => {
  const { recordMovement, cashMovements, session } = useCashier();
  const { showToast } = useToast();

  const [selectedType, setSelectedType] = useState<MovementType>('Cash In');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Date selection state & mini calendar popover
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  // Manager Password authorization modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus manager password input when auth modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isAuthModalOpen]);

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else if (isCalendarOpen) {
          setIsCalendarOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isAuthModalOpen, isCalendarOpen, onClose]);

  // Filtered movements based on search query - Unconditional hook call at top
  const filteredMovements = useMemo(() => {
    if (!searchQuery.trim()) return cashMovements;
    const q = searchQuery.toLowerCase().trim();
    return cashMovements.filter(
      (m) =>
        m.reason.toLowerCase().includes(q) ||
        (m.reference && m.reference.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        m.type.toLowerCase().includes(q)
    );
  }, [cashMovements, searchQuery]);

  if (!isOpen) return null;

  // Format date helper: "Today, 5 Sept 2026"
  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const formatted = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (isToday) return `Today, ${formatted}`;
    if (isYesterday) return `Yesterday, ${formatted}`;
    return formatted;
  };

  // Calendar helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = calendarMonth.getFullYear();
  const currentMonth = calendarMonth.getMonth();
  const totalDays = daysInMonth(currentYear, currentMonth);
  const startDay = firstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    setCalendarMonth(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    setIsCalendarOpen(false);
  };

  const handleSelectPreset = (preset: 'today' | 'yesterday') => {
    const d = new Date();
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d);
    setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setIsCalendarOpen(false);
  };

  // Open Manager Password Authorization Modal
  const handleInitiateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      showToast('Please enter a valid cash amount', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Please specify a reason', 'error');
      return;
    }

    setManagerPassword('');
    setAuthError('');
    setShowPassword(false);
    setIsAuthModalOpen(true);
  };

  // Verify Manager Password and commit Cash Movement
  const handleConfirmAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = managerPassword.trim();
    if (!trimmed) {
      setAuthError('Please enter manager password');
      return;
    }

    // Accepts common manager passwords (admin, 1234, manager, chillchoc2026) or any 4+ char password
    const validPasswords = ['admin', '1234', 'manager', 'chillchoc2026'];
    const isValid = validPasswords.includes(trimmed.toLowerCase()) || trimmed.length >= 4;

    if (!isValid) {
      setAuthError('Incorrect manager password (hint: admin or 1234)');
      return;
    }

    const num = parseFloat(amount);
    recordMovement({
      type: selectedType,
      amount: num,
      reason: reason.trim(),
      date: selectedDate.toISOString().split('T')[0],
    });

    showToast(`Manager authorized: Recorded ${selectedType} (Rs. ${num.toLocaleString()})`, 'success');
    setIsAuthModalOpen(false);
    setAmount('');
    setReason('');
    setManagerPassword('');
    setAuthError('');
  };

  // Calculate totals
  const totalIn = cashMovements
    .filter((m) => m.type === 'Cash In')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalOut = cashMovements
    .filter((m) => m.type !== 'Cash In')
    .reduce((sum, m) => sum + m.amount, 0);

  const netMovement = totalIn - totalOut;

  const getBadgeStyle = (type: CashMovement['type']) => {
    switch (type) {
      case 'Cash In':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      case 'Cash Out':
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'Expense':
        return 'bg-rose-50 text-rose-700 border border-rose-200/60';
      default:
        return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Container: 2-Section Clean Architecture */}
      <div
        className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-5xl lg:max-w-[1060px] overflow-hidden flex flex-col md:flex-row max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* SECTION 1 (LEFT): LOGO ON TOP + CASH MOVEMENT FORM BELOW  */}
        {/* ========================================================= */}
        <div className="w-full md:w-[350px] lg:w-[375px] border-b md:border-b-0 md:border-r border-zinc-100/90 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto bg-white shrink-0 select-none">
          <div className="space-y-4">
            {/* Logo on Top - Prominent, Crisp & Sized */}
            <div className="flex items-center justify-center pt-1 pb-1">
              <img
                src="/cashmovement.png"
                alt="Cash Movement Logo"
                className="w-auto h-[135px] lg:h-[150px] object-contain drop-shadow-xs pointer-events-none select-none transition-transform hover:scale-105 duration-200"
              />
            </div>

            {/* Movement Entry Form */}
            <form onSubmit={handleInitiateRecord} className="space-y-3.5">
              {/* Movement Type Segmented Control */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Movement Type
                </label>
                <div className="bg-zinc-100 p-1 rounded-xl grid grid-cols-3 gap-1">
                  {MOVEMENT_TYPES.map((t) => {
                    const isSelected = selectedType === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedType(t.id)}
                        className={`h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-zinc-900 shadow-2xs font-black'
                            : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF5500]' : 'text-zinc-400'}`} />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Amount (LKR) *
                </label>
                <div className="flex items-center h-11 rounded-xl bg-zinc-50 border border-zinc-200/80 focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all overflow-hidden px-3.5">
                  <span className="text-xs font-mono font-bold text-zinc-400 mr-2.5 select-none">
                    Rs.
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent font-mono font-black text-base text-zinc-900 placeholder:text-zinc-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                  />
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="w-5 h-5 rounded-full bg-zinc-200/70 hover:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                      title="Clear amount"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Reason / Purpose Input */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Reason / Purpose *
                </label>
                <div className="flex items-center h-11 rounded-xl bg-zinc-50 border border-zinc-200/80 focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all overflow-hidden px-3.5">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Morning Float, Tea & Milk, Supplier..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-full bg-transparent text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  />
                  {reason && (
                    <button
                      type="button"
                      onClick={() => setReason('')}
                      className="w-5 h-5 rounded-full bg-zinc-200/70 hover:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                      title="Clear reason"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Button with Lock Icon */}
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-sm shadow-orange-500/25 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-3"
                title="Click to enter manager password and record movement"
              >
                <div className="w-6 h-6 rounded-lg bg-black/15 flex items-center justify-center -ml-1">
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Record Movement</span>
              </button>
            </form>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2 (RIGHT): HEADER + STATS + FULL WIDTH HISTORY    */}
        {/* ========================================================= */}
        <div className="flex-1 min-w-0 flex flex-col justify-between overflow-hidden bg-white">
          {/* Header Bar */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-zinc-100 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF5500] shadow-2xs">
                <Wallet className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-zinc-900 tracking-tight leading-tight">
                  Cash Movement &amp; Drawer Float
                </h2>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                  Drawer float, pay-ins, pay-outs &amp; store expenses tracking
                </p>
              </div>
            </div>

            {/* Right Header Controls: Date Picker + Close */}
            <div className="flex items-center gap-2 relative">
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="h-8 px-3 rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-xs font-bold text-zinc-800 transition-all flex items-center gap-2 cursor-pointer shadow-2xs hover:border-zinc-300"
                  title="Filter by custom date"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span className="font-mono text-[11px]">{formatDateDisplay(selectedDate)}</span>
                </button>

                {/* Custom Calendar Dropdown Popover */}
                {isCalendarOpen && (
                  <div className="absolute right-0 top-10 z-50 w-64 p-3 bg-white rounded-2xl shadow-xl border border-zinc-200/90 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-black transition-colors cursor-pointer"
                        title="Previous month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-black text-black">
                        {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-black transition-colors cursor-pointer"
                        title="Next month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-black text-zinc-400">
                      <span>Su</span>
                      <span>Mo</span>
                      <span>Tu</span>
                      <span>We</span>
                      <span>Th</span>
                      <span>Fr</span>
                      <span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-7 h-7" />
                      ))}

                      {Array.from({ length: totalDays }).map((_, i) => {
                        const dayNumber = i + 1;
                        const isSelected =
                          selectedDate.getDate() === dayNumber &&
                          selectedDate.getMonth() === currentMonth &&
                          selectedDate.getFullYear() === currentYear;

                        const today = new Date();
                        const isToday =
                          today.getDate() === dayNumber &&
                          today.getMonth() === currentMonth &&
                          today.getFullYear() === currentYear;

                        return (
                          <button
                            key={`day-${dayNumber}`}
                            type="button"
                            onClick={() => handleSelectDay(dayNumber)}
                            className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-[11px] transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#FF5500] text-white shadow-xs font-black'
                                : isToday
                                ? 'border border-[#FF5500] text-[#FF5500] hover:bg-orange-50 font-black'
                                : 'hover:bg-zinc-100 text-zinc-800'
                            }`}
                          >
                            {dayNumber}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectPreset('today')}
                        className="flex-1 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF5500] text-[10px] font-black transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset('yesterday')}
                        className="flex-1 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-black transition-colors cursor-pointer"
                      >
                        Yesterday
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Top 4 KPI Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 sm:px-6 py-3 border-b border-zinc-100 bg-zinc-50/40">
            {/* Drawer Float */}
            <div className="p-2.5 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs min-w-0">
              <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                Drawer Float
              </span>
              <span className="text-xs sm:text-sm lg:text-base font-black font-mono text-zinc-900 block mt-0.5 whitespace-nowrap truncate tracking-tight">
                Rs. {session.expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Cash In */}
            <div className="p-2.5 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs min-w-0">
              <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                Total Cash In
              </span>
              <span className="text-xs sm:text-sm lg:text-base font-black font-mono text-emerald-600 block mt-0.5 whitespace-nowrap truncate tracking-tight">
                +Rs. {totalIn.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Cash Out */}
            <div className="p-2.5 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs min-w-0">
              <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                Total Cash Out
              </span>
              <span className="text-xs sm:text-sm lg:text-base font-black font-mono text-rose-600 block mt-0.5 whitespace-nowrap truncate tracking-tight">
                -Rs. {totalOut.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Net Movement */}
            <div className="p-2.5 rounded-2xl bg-orange-50/70 border border-orange-200/70 shadow-2xs min-w-0">
              <span className="text-[9.5px] font-bold text-[#FF5500] uppercase tracking-wider block truncate flex items-center gap-1">
                <TrendingUp className="w-3 h-3 inline shrink-0" />
                <span>Net Movement</span>
              </span>
              <span className="text-xs sm:text-sm lg:text-base font-black font-mono text-zinc-900 block mt-0.5 whitespace-nowrap truncate tracking-tight">
                {netMovement >= 0 ? '+' : '-'}Rs. {Math.abs(netMovement).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Today's History: Uses FULL WIDTH of Section with Perfect Spacing */}
          <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0">
              {/* History Header with Count & Inline Search */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-50 text-[#FF5500] flex items-center justify-center">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-zinc-900">Today's History</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-mono font-bold">
                    {filteredMovements.length} {filteredMovements.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                {/* Minimal Search Input */}
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by reason, ref, type..."
                    className="w-full h-8 pl-8 pr-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Full-width History Records List */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 pr-1 select-none">
                {filteredMovements.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                    <Coins className="w-8 h-8 text-zinc-300 mb-2 stroke-1" />
                    <p className="text-xs font-bold text-zinc-600">No movements recorded today</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Recorded pay-ins, pay-outs and expenses will appear here.</p>
                  </div>
                ) : (
                  filteredMovements.map((m, idx) => {
                    const isPositive = m.type === 'Cash In';
                    return (
                      <div
                        key={m.id}
                        className="py-1.5 px-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50/90 rounded-lg transition-colors text-xs"
                      >
                        {/* Left Info: Index + Time + Type Badge + Reason + Ref Tag + Notes */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 w-5 shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 w-14 shrink-0">
                            {m.timestamp}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${getBadgeStyle(m.type)}`}>
                            {m.type}
                          </span>
                          <span
                            className="text-xs font-medium text-zinc-800 truncate flex-1 min-w-0"
                            title={`${m.reason}${m.reference ? ` · Ref: ${m.reference}` : ''}`}
                          >
                            {m.reason}
                          </span>
                          {m.reference && (
                            <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 font-mono text-[9px] shrink-0 font-medium">
                              #{m.reference}
                            </span>
                          )}
                          {m.notes && (
                            <span className="text-[9px] text-zinc-400 truncate max-w-[100px] shrink-0 hidden lg:inline">
                              by {m.notes}
                            </span>
                          )}
                        </div>

                        {/* Right: Monospace Amount */}
                        <span
                          className={`font-mono font-bold text-xs shrink-0 tabular-numbers whitespace-nowrap pl-2 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? '+' : '-'}Rs. {m.amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Bar */}
          <div className="px-5 sm:px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <span>Selected Period:</span>
              <span className="font-mono text-zinc-700 font-bold">{formatDateDisplay(selectedDate)}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 rounded-full bg-zinc-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      </div>

      {/* Small Manager Password Pop-up Modal */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setIsAuthModalOpen(false)}
        >
          <div
            className="w-full max-w-[340px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/80 text-[#FF5500] flex items-center justify-center shadow-2xs">
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900 tracking-tight leading-tight">
                    Manager Password
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                    Approval required to record movement
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="w-6 h-6 rounded-md text-zinc-400 hover:text-black hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Password Form */}
            <form onSubmit={handleConfirmAuth} className="space-y-3 pt-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Enter Manager Password
                </label>
                <div className="flex items-center h-10 rounded-xl bg-zinc-50 border border-zinc-200/80 focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all overflow-hidden px-3">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={managerPassword}
                    onChange={(e) => {
                      setManagerPassword(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    placeholder="Enter password (e.g. admin)"
                    className="w-full h-full bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {authError && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1 animate-in fade-in">
                    {authError}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="flex-1 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs font-bold transition-all shadow-xs shadow-orange-500/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorize</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
