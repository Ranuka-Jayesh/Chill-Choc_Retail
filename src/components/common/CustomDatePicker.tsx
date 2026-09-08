import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react';

export type DateFilterMode = 'all' | 'today' | 'yesterday' | 'month' | 'year' | 'custom';

interface CustomDatePickerProps {
  selectedDate: string | null; // e.g. '2026-09-08' or '2026-09' or '2026'
  filterMode: DateFilterMode;
  onSelectPeriod: (mode: DateFilterMode, dateStr?: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  selectedDate,
  filterMode,
  onSelectPeriod,
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic today reference
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();

  const todayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  // View state
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);

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

  const handlePrevYear = () => {
    setViewYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setViewYear((prev) => prev + 1);
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

  const handleMonthSelect = (monthIndex: number) => {
    setViewMonth(monthIndex);
    const monthStr = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    onSelectPeriod('month', monthStr);
    setViewMode('day');
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    setViewYear(year);
    const yearStr = `${year}`;
    onSelectPeriod('year', yearStr);
    setViewMode('month');
    setIsOpen(false);
  };

  // Label display
  const getButtonLabel = () => {
    if (filterMode === 'all') return 'All Dates';
    if (filterMode === 'today') return `Today (${currentDay} ${MONTH_SHORT[currentMonth]})`;
    if (filterMode === 'yesterday') return `Yesterday (${yesterdayDate.getDate()} ${MONTH_SHORT[yesterdayDate.getMonth()]})`;
    if (filterMode === 'month') {
      if (selectedDate && selectedDate.includes('-')) {
        const parts = selectedDate.split('-');
        const m = parseInt(parts[1], 10) - 1;
        return `${MONTH_SHORT[m] || MONTH_SHORT[viewMonth]} ${parts[0]}`;
      }
      return `${MONTH_SHORT[viewMonth]} ${viewYear}`;
    }
    if (filterMode === 'year') {
      return `Year ${selectedDate || viewYear}`;
    }
    if (filterMode === 'custom' && selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parseInt(parts[1], 10) - 1;
        const d = parts[2];
        return `${d} ${MONTH_SHORT[m] || 'M'} ${y}`;
      }
      return selectedDate;
    }
    return 'Select Date';
  };

  // Years range for year selector
  const startDecade = Math.floor(viewYear / 10) * 10 - 1;
  const yearsGrid = Array.from({ length: 12 }, (_, i) => startDecade + i);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer ${
          isOpen || filterMode !== 'all'
            ? 'bg-white border-[#FF5500] text-[#FF5500] ring-2 ring-[#FF5500]/15'
            : 'bg-white border-zinc-200 text-zinc-700 hover:border-orange-300 hover:text-black'
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-[#FF5500]" />
        <span>{getButtonLabel()}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF5500]' : ''
          }`}
        />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 z-50 w-[320px] sm:w-[340px] bg-white rounded-2xl border border-zinc-200/90 shadow-2xl p-4 select-none animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* View Mode Selector Tabs (Day / Month / Year) */}
          <div className="flex items-center justify-between gap-1 p-1 bg-zinc-100 rounded-xl mb-3 border border-zinc-200/60">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-[#FF5500] shadow-2xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Date (Day)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-[#FF5500] shadow-2xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('year')}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'year'
                  ? 'bg-white text-[#FF5500] shadow-2xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Year
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-orange-50/50 rounded-xl mb-3 border border-orange-100">
            <button
              type="button"
              onClick={() => {
                onSelectPeriod('today', todayDateStr);
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'today'
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-700 hover:text-black hover:bg-white/80'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectPeriod('yesterday', yesterdayDateStr);
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'yesterday'
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-700 hover:text-black hover:bg-white/80'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                const curMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                onSelectPeriod('month', curMonthStr);
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'month' && (!selectedDate || selectedDate.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`))
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-700 hover:text-black hover:bg-white/80'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectPeriod('all');
                setIsOpen(false);
              }}
              className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#FF5500] text-white shadow-2xs'
                  : 'text-zinc-700 hover:text-black hover:bg-white/80'
              }`}
            >
              All Dates
            </button>
          </div>

          {/* 1. DAY VIEW */}
          {viewMode === 'day' && (
            <div>
              {/* Navigation Header */}
              <div className="flex items-center justify-between px-1 mb-2.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className="font-black text-xs text-zinc-900 hover:text-[#FF5500] px-2 py-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    {MONTH_NAMES[viewMonth]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('year')}
                    className="font-black text-xs text-zinc-600 hover:text-[#FF5500] px-2 py-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    {viewYear}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
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
                      className="h-7.5 flex items-center justify-center text-[11px] text-zinc-300 font-medium select-none"
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
                    (filterMode === 'today' && dateStr === todayDateStr) ||
                    (filterMode === 'yesterday' && dateStr === yesterdayDateStr);

                  const isToday = dateStr === todayDateStr;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`h-7.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
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
            </div>
          )}

          {/* 2. MONTH SELECTOR VIEW */}
          {viewMode === 'month' && (
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-black text-sm text-zinc-900">{viewYear}</span>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1">
                {MONTH_NAMES.map((mName, idx) => {
                  const mStr = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
                  const isSelected = filterMode === 'month' && selectedDate === mStr;
                  const isCurrent = viewYear === currentYear && idx === currentMonth;

                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => handleMonthSelect(idx)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF5500] text-white shadow-xs'
                          : isCurrent
                          ? 'bg-orange-50 text-[#FF5500] border border-orange-200'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {mName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. YEAR SELECTOR VIEW */}
          {viewMode === 'year' && (
            <div>
              <div className="flex items-center justify-between px-1 mb-3">
                <button
                  type="button"
                  onClick={() => setViewYear((prev) => prev - 10)}
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-black text-xs text-zinc-600">
                  {yearsGrid[0]} - {yearsGrid[yearsGrid.length - 1]}
                </span>
                <button
                  type="button"
                  onClick={() => setViewYear((prev) => prev + 10)}
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1">
                {yearsGrid.map((yr) => {
                  const isSelected = filterMode === 'year' && selectedDate === `${yr}`;
                  const isCurrent = yr === currentYear;

                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleYearSelect(yr)}
                      className={`py-2.5 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF5500] text-white shadow-xs'
                          : isCurrent
                          ? 'bg-orange-50 text-[#FF5500] border border-orange-200'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer with Reset and Select Today */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                onSelectPeriod('all');
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-zinc-500 hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" />
              <span>Reset to All</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectPeriod('today', todayDateStr);
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-[#FF5500] hover:underline cursor-pointer"
            >
              Select Today ({currentDay} {MONTH_SHORT[currentMonth]})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
