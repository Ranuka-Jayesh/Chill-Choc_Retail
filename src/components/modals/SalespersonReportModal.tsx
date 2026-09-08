import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStaff } from '@/stores/staffStore';
import { useSales } from '@/stores/salesStore';
import { Salesperson } from '@/types';
import {
  Trophy,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Printer,
  TrendingUp,
  Receipt,
  Users,
  Award,
  Search,
  Check,
} from 'lucide-react';

interface SalespersonReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalespersonReportModal: React.FC<SalespersonReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { sales } = useSales();
  const { staffList } = useStaff();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
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

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isCalendarOpen) {
          setIsCalendarOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCalendarOpen, onClose]);

  // Format date helper: "5 Sep 2026"
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

  // Determine if selected date is today
  const isSelectedDateToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  // Helper: check if a sale's date matches selectedDate
  const isDateMatching = (saleDateStr: string, targetDate: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isTargetToday =
      targetDate.getDate() === today.getDate() &&
      targetDate.getMonth() === today.getMonth() &&
      targetDate.getFullYear() === today.getFullYear();

    const isTargetYesterday =
      targetDate.getDate() === yesterday.getDate() &&
      targetDate.getMonth() === yesterday.getMonth() &&
      targetDate.getFullYear() === yesterday.getFullYear();

    const lower = (saleDateStr || '').toLowerCase().trim();

    if (lower === 'today' || lower.startsWith('today')) {
      return isTargetToday;
    }
    if (lower === 'yesterday') {
      return isTargetYesterday;
    }

    // Try parsing as ISO or date string
    const parsed = new Date(saleDateStr);
    if (!isNaN(parsed.getTime())) {
      return (
        parsed.getDate() === targetDate.getDate() &&
        parsed.getMonth() === targetDate.getMonth() &&
        parsed.getFullYear() === targetDate.getFullYear()
      );
    }

    // Match string formatting e.g. "2026-09-08"
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const isoPrefix = `${y}-${m}-${d}`;
    return saleDateStr.startsWith(isoPrefix);
  };

  // Build dynamic real salespersons list (EXCLUDING Admins and Cashiers)
  const realSalespersons = useMemo<Salesperson[]>(() => {
    const list: Salesperson[] = [];
    staffList
      .filter((s) => s.status === 'Active')
      .forEach((s) => {
        const roleLower = (s.role || '').toLowerCase().trim();
        const nameLower = (s.name || '').toLowerCase().trim();

        // STRICT REQUIREMENT: Do NOT show Admin or Cashier as salesperson
        if (
          roleLower.includes('admin') ||
          nameLower.includes('admin') ||
          roleLower.includes('super admin') ||
          roleLower.includes('cashier') ||
          nameLower.includes('cashier') ||
          roleLower.includes('barista')
        ) {
          return;
        }

        let code = 'SALES';
        if (roleLower.includes('rep')) {
          code = 'REP';
        } else if (roleLower.includes('lead')) {
          code = 'LEAD';
        } else if (s.role) {
          code = s.role.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'SALES';
        }

        list.push({
          id: s.id,
          name: s.name,
          code,
          avatarInitials: s.name.slice(0, 2).toUpperCase(),
        });
      });
    return list;
  }, [staffList]);

  // Aggregate sales per salesperson for the selected date dynamically from salesStore
  const reportData = useMemo(() => {
    // 1. Filter completed sales for selected date
    const daySales = sales.filter(
      (s) => s.status !== 'Returned' && isDateMatching(s.date, selectedDate)
    );

    // 2. Track per-salesperson statistics
    const spStats: Record<
      string,
      { totalSales: number; billCount: number; itemCount: number }
    > = {};
    const spBills: Record<string, Set<string>> = {};

    realSalespersons.forEach((sp) => {
      spStats[sp.id] = { totalSales: 0, billCount: 0, itemCount: 0 };
      spBills[sp.id] = new Set();
    });

    daySales.forEach((sale) => {
      // Find default / bill-level salesperson
      const billRep =
        sale.salesperson ||
        sale.items.find((i) => i.salesperson)?.salesperson ||
        null;

      // Group items in this sale
      sale.items.forEach((item) => {
        const rep = item.salesperson || billRep;
        const repId = rep?.id;

        if (repId && spStats[repId]) {
          const itemDiscountVal = item.discount
            ? item.discount.type === 'percentage'
              ? (item.unitPrice * item.quantity * item.discount.value) / 100
              : item.discount.value
            : 0;
          const lineTotal = Math.max(0, item.unitPrice * item.quantity - itemDiscountVal);

          spStats[repId].totalSales += lineTotal;
          spStats[repId].itemCount += item.quantity;
          spBills[repId].add(sale.id || sale.invoiceNumber);
        }
      });
    });

    // Populate billCount
    realSalespersons.forEach((sp) => {
      spStats[sp.id].billCount = spBills[sp.id].size;
    });

    // Build sorted list
    const list = realSalespersons.map((sp) => {
      const stats = spStats[sp.id];
      return {
        ...sp,
        totalSales: stats.totalSales,
        billCount: stats.billCount,
        itemCount: stats.itemCount,
        avgBill: stats.billCount > 0 ? Math.round(stats.totalSales / stats.billCount) : 0,
      };
    });

    // Sort descending by totalSales
    list.sort((a, b) => b.totalSales - a.totalSales);

    // Compute totals
    const totalTeamSales = list.reduce((sum, item) => sum + item.totalSales, 0);
    const totalBills = daySales.length;
    const totalItems = list.reduce((sum, item) => sum + item.itemCount, 0);

    return {
      salespersons: list,
      totalTeamSales,
      totalBills,
      totalItems,
      topPerformer: totalTeamSales > 0 ? list[0] : null,
    };
  }, [selectedDate, sales, realSalespersons]);

  // Filter list by search query
  const filteredSalespersons = useMemo(() => {
    if (!searchQuery.trim()) return reportData.salespersons;
    const q = searchQuery.toLowerCase().trim();
    return reportData.salespersons.filter(
      (sp) =>
        sp.name.toLowerCase().includes(q) ||
        sp.code.toLowerCase().includes(q)
    );
  }, [reportData.salespersons, searchQuery]);

  if (!isOpen) return null;

  // Custom mini calendar helper functions
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150">
      {/* Modal Card - Expanded width for generous, spacious layout */}
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-5xl lg:max-w-[1080px] overflow-hidden flex flex-col md:flex-row max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Left Side: Mascot Image (salesperson.png) - Enlarged, Crisp & Prominent */}
        <div className="w-full md:w-[280px] lg:w-[310px] border-b md:border-b-0 md:border-r border-zinc-100/90 flex flex-col items-center justify-between px-3.5 py-3 shrink-0 bg-white select-none">
          <div className="w-full flex-1 flex items-center justify-center p-1 min-h-[180px] md:min-h-[300px] overflow-hidden">
            <img
              src="/salesperson.png"
              alt="Sales Team Mascot"
              className="w-full h-auto max-h-[270px] md:max-h-[360px] object-contain drop-shadow-sm pointer-events-none select-none scale-110 md:scale-120 transition-transform hover:scale-125"
            />
          </div>

          {/* Left Side Team Highlight Card */}
          <div className="w-full p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/70 text-center shadow-2xs mt-2 hidden md:block">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block leading-tight">
              Active Sales Team
            </span>
            <span className="text-xs font-black text-black block leading-tight mt-0.5">
              5 Staff Members
            </span>
            <div className="mt-1.5 pt-1.5 border-t border-zinc-200/60 flex items-center justify-between text-[10px] px-1 font-mono">
              <span className="text-zinc-500 font-bold">Day Total</span>
              <span className="text-[#FF5500] font-black">
                Rs. {reportData.totalTeamSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Header + Dashboard Content + Footer */}
        <div className="flex-1 min-w-0 flex flex-col justify-between overflow-hidden">
          {/* Header Bar (No F4 badge) */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF5500] shadow-xs">
                <Trophy className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#3B2011] tracking-tight leading-tight">
                  Sales Team Daily Performance
                </h2>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                  Day-wise sales amounts, commission attribution &amp; metrics
                </p>
              </div>
            </div>

          {/* Right Header Controls: Custom Calendar Popover + Close */}
          <div className="flex items-center gap-2 relative">
            {/* Custom Small Calendar Trigger Button */}
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

              {/* Custom Designed Small Calendar Dropdown Widget */}
              {isCalendarOpen && (
                <div className="absolute right-0 top-10 z-50 w-64 p-3 bg-white rounded-2xl shadow-xl border border-zinc-200/90 animate-in fade-in zoom-in-95 duration-150">
                  {/* Calendar Month Navigation */}
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
                      {calendarMonth.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
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

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-black text-zinc-400">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {/* Empty cells before month start */}
                    {Array.from({ length: startDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-7 h-7" />
                    ))}

                    {/* Days of Month */}
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

                  {/* Quick Preset Buttons */}
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
              className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          
          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Total Day Sales
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-[#3B2011] block mt-0.5">
                Rs. {reportData.totalTeamSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Transactions
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-zinc-900 block mt-0.5">
                {reportData.totalBills} Bills
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Items Attributed
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-zinc-900 block mt-0.5">
                {reportData.totalItems} Units
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200/70">
              <span className="text-[10px] font-bold text-[#FF5500] uppercase tracking-wider block flex items-center gap-1">
                <Trophy className="w-3 h-3 inline" />
                <span>Top Performer</span>
              </span>
              <span className="text-sm font-black text-black block truncate mt-0.5">
                {reportData.topPerformer && reportData.totalTeamSales > 0
                  ? `${reportData.topPerformer.name.split(' ')[0]} (${Math.round((reportData.topPerformer.totalSales / reportData.totalTeamSales) * 100)}%)`
                  : 'No Sales Yet'}
              </span>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or TM code..."
                className="w-full h-8 pl-8 pr-3 rounded-xl bg-zinc-100/80 border border-zinc-200/80 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF5500] transition-colors"
              />
            </div>
            <div className="text-[11px] font-bold text-zinc-400">
              {filteredSalespersons.length} Salespersons Active
            </div>
          </div>

          {/* Minimal Single-Row Salesperson Records List */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 divide-y divide-zinc-100 overflow-hidden shadow-2xs">
            {filteredSalespersons.map((sp, idx) => {
              const percentage = reportData.totalTeamSales > 0
                ? Math.round((sp.totalSales / reportData.totalTeamSales) * 100)
                : 0;

              return (
                <div
                  key={sp.id}
                  className="h-10 px-4 flex items-center justify-between gap-4 hover:bg-zinc-50/90 transition-colors"
                >
                  {/* Left: Rank + Name + TM Code (Single line, no profile icon) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Rank Indicator */}
                    <span
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs'
                          : idx === 1
                          ? 'bg-zinc-200 text-zinc-800 border border-zinc-300'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    {/* Name */}
                    <span className="text-xs sm:text-sm font-bold text-black truncate">
                      {sp.name}
                    </span>

                    {/* Code Badge */}
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[9px] font-mono font-bold text-zinc-500 border border-zinc-200 shrink-0">
                      {sp.code}
                    </span>
                  </div>

                  {/* Right: Metrics + Percentage + Sales Amount (All in 1 single line) */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-medium text-zinc-400 hidden sm:inline">
                      {sp.billCount} Bills &bull; {sp.itemCount} Units
                    </span>

                    <span className="px-1.5 py-0.5 rounded-md bg-orange-50 text-[#FF5500] text-[10px] font-mono font-black border border-orange-200/60">
                      {percentage}%
                    </span>

                    <span className="text-xs sm:text-sm font-mono font-black text-[#3B2011] min-w-[95px] text-right">
                      Rs. {sp.totalSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Modal Footer */}
          <div className="px-4 sm:px-5 py-2.5 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500">
              <span>Selected Period:</span>
              <span className="font-mono text-black font-black">{formatDateDisplay(selectedDate)}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
