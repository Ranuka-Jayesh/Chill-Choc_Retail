import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

interface CustomDatePickerProps {
  selectedDate: string | null; // e.g. '2026-09-05' or null for all
  filterMode: 'all' | 'today' | 'yesterday' | 'month' | 'custom';
  onSelectPeriod: (mode: 'all' | 'today' | 'yesterday' | 'month' | 'custom', dateStr?: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  selectedDate,
  filterMode,
  onSelectPeriod,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default view to current year and month (September 2026)
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(8); // 8 is September (0-indexed)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Days calculation
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handleDayClick = (day: number) => {
    const formattedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectPeriod('custom', formattedDate);
    setIsOpen(false);
  };

  // Label display
  const getButtonLabel = () => {
    if (filterMode === 'all') return 'All Dates';
    if (filterMode === 'today') return 'Today (05 Sep)';
    if (filterMode === 'yesterday') return 'Yesterday (04 Sep)';
    if (filterMode === 'month') return `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    if (filterMode === 'custom' && selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parseInt(parts[1], 10) - 1;
        const d = parts[2];
        return `${d} ${MONTH_NAMES[m]?.slice(0, 3)} ${y}`;
      }
      return selectedDate;
    }
    return 'Select Date';
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 px-3 rounded-xl border transition-all text-xs font-bold flex items-center gap-2 shadow-2xs ${
          isOpen || filterMode !== 'all'
            ? 'bg-white border-[#FF5500] text-[#FF5500] ring-2 ring-[#FF5500]/15'
            : 'bg-white border-zinc-200 text-zinc-700 hover:border-orange-300 hover:text-black'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-[#FF5500]" />
        <span>{getButtonLabel()}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF5500]' : ''
          }`}
        />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-[310px] sm:w-[325px] bg-white rounded-2xl border border-zinc-200 shadow-2xl p-3.5 select-none animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Preset Chips */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100/80 rounded-xl mb-3 border border-zinc-200/60">
            <button
              onClick={() => {
                onSelectPeriod('today', '2026-09-05');
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterMode === 'today'
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-black hover:bg-white/60'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                onSelectPeriod('yesterday', '2026-09-04');
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterMode === 'yesterday'
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-black hover:bg-white/60'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                onSelectPeriod('month');
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterMode === 'month'
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-black hover:bg-white/60'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => {
                onSelectPeriod('all');
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-black hover:bg-white/60'
              }`}
            >
              All
            </button>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between px-1 mb-2">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-extrabold text-xs text-black">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-black uppercase text-zinc-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month filler days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-7 flex items-center justify-center text-[11px] text-zinc-300 font-medium cursor-not-allowed select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected =
                (filterMode === 'custom' && selectedDate === dateStr) ||
                (filterMode === 'today' && dateStr === '2026-09-05') ||
                (filterMode === 'yesterday' && dateStr === '2026-09-04');

              const isToday = dateStr === '2026-09-05';

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#FF5500] text-white shadow-xs font-black scale-105'
                      : isToday
                      ? 'text-[#FF5500] bg-orange-50 border border-orange-200 font-black hover:bg-orange-100'
                      : 'text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer with Clear and Done */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between px-1">
            <button
              onClick={() => {
                onSelectPeriod('all');
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-zinc-500 hover:text-black transition-colors"
            >
              Reset to All
            </button>
            <button
              onClick={() => {
                onSelectPeriod('today', '2026-09-05');
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-[#FF5500] hover:underline"
            >
              Select Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
