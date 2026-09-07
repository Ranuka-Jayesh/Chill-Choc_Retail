import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthYearPickerProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  onClear?: () => void;
  isFilterActive?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  selectedDate,
  onChange,
  onClear,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'months' | 'years'>('months');
  const [browsingYear, setBrowsingYear] = useState<number>(selectedDate.getFullYear());
  const [decadeStart, setDecadeStart] = useState<number>(
    Math.floor(selectedDate.getFullYear() / 12) * 12
  );

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync browsing year when selectedDate changes
  useEffect(() => {
    setBrowsingYear(selectedDate.getFullYear());
    setDecadeStart(Math.floor(selectedDate.getFullYear() / 12) * 12);
  }, [selectedDate]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setView('months');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentMonthIdx = selectedDate.getMonth();
  const currentYearVal = selectedDate.getFullYear();
  const today = new Date();

  // Arrow navigation on the main button
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    onChange(prev);
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    onChange(next);
  };

  // Select month in popup
  const handleSelectMonth = (monthIdx: number) => {
    const newDate = new Date(browsingYear, monthIdx, 1);
    onChange(newDate);
    setIsOpen(false);
  };

  // Select year in popup
  const handleSelectYear = (year: number) => {
    setBrowsingYear(year);
    setView('months');
  };

  // Reset to current month
  const handleResetToCurrentMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(new Date());
    setBrowsingYear(new Date().getFullYear());
    setView('months');
    setIsOpen(false);
  };

  // Generate 12 years for decade view
  const yearsInGrid = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  return (
    <div className={`relative inline-flex items-center select-none ${className}`} ref={popoverRef}>
      {/* Month Selector Capsule: Black background, fully rounded radius, clean text, no extra symbols */}
      <div className="inline-flex items-center bg-black text-white rounded-full px-1.5 py-0.5 border border-zinc-800 shadow-sm select-none">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={handlePrevMonth}
          title="Previous month"
          className="w-6 h-6 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer active:scale-90"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Center Button: Month & Year Label (pure text, no symbols) */}
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setView('months');
            setBrowsingYear(selectedDate.getFullYear());
          }}
          className={`px-2.5 py-0.5 text-xs font-bold transition-colors cursor-pointer tracking-tight whitespace-nowrap ${
            isOpen ? 'text-[#FF5500]' : 'text-white hover:text-[#FF5500]'
          }`}
          title="Click to select month or year"
        >
          {FULL_MONTH_NAMES[currentMonthIdx]} {currentYearVal}
        </button>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={handleNextMonth}
          title="Next month"
          className="w-6 h-6 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer active:scale-90"
          aria-label="Next month"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SMALL PERFECT RESPONSIVE CALENDAR POPOVER (NO SYMBOLS)                    */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-[225px] sm:w-[235px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white border border-stone-200/90 shadow-2xl p-2.5 text-stone-900 animate-in zoom-in-95 duration-150">
          {view === 'months' ? (
            /* --- MONTH SELECTION VIEW --- */
            <div className="space-y-2">
              {/* Header: Clickable Year with Nav Arrows (Clean text, NO symbols) */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                <button
                  type="button"
                  onClick={() => setBrowsingYear((y) => y - 1)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Previous year"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Clicking Year switches to Years Grid */}
                <button
                  type="button"
                  onClick={() => {
                    setDecadeStart(Math.floor(browsingYear / 12) * 12);
                    setView('years');
                  }}
                  className="px-2 py-0.5 rounded-lg hover:bg-orange-50 text-stone-900 hover:text-[#FF5500] font-black text-xs transition-colors cursor-pointer"
                  title="Click to change year"
                >
                  {browsingYear}
                </button>

                <button
                  type="button"
                  onClick={() => setBrowsingYear((y) => y + 1)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Next year"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 12 Months Grid (Clean, NO checkmark symbols) */}
              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES.map((mName, idx) => {
                  const isSelected =
                    currentMonthIdx === idx && selectedDate.getFullYear() === browsingYear;
                  const isCurrentMonth =
                    today.getMonth() === idx && today.getFullYear() === browsingYear;

                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-black text-white shadow-2xs'
                          : isCurrentMonth
                          ? 'bg-orange-50 text-[#FF5500] border border-orange-200 hover:bg-orange-100'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>

              {/* Footer Quick Actions (Clean text, NO symbols/icons) */}
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10.5px]">
                <button
                  type="button"
                  onClick={handleResetToCurrentMonth}
                  className="text-orange-600 hover:text-orange-800 font-bold cursor-pointer py-0.5 px-1 rounded hover:bg-orange-50 transition-colors"
                >
                  Current Month
                </button>

                {onClear && (
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      setIsOpen(false);
                    }}
                    className="text-stone-500 hover:text-stone-800 font-medium cursor-pointer py-0.5 px-1 rounded hover:bg-stone-100 transition-colors"
                  >
                    Show All
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* --- YEAR SELECTION VIEW --- */
            <div className="space-y-2">
              {/* Header: Decade range with Nav Arrows (Clean text, NO symbols) */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                <button
                  type="button"
                  onClick={() => setDecadeStart((d) => d - 12)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Previous decade"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="font-bold text-[11px] text-stone-800">
                  {decadeStart} to {decadeStart + 11}
                </div>

                <button
                  type="button"
                  onClick={() => setDecadeStart((d) => d + 12)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Next decade"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 12 Years Grid (Clean, NO checkmark symbols) */}
              <div className="grid grid-cols-3 gap-1">
                {yearsInGrid.map((year) => {
                  const isSelected = browsingYear === year;
                  const isCurrentYear = today.getFullYear() === year;

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleSelectYear(year)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-black text-white shadow-2xs'
                          : isCurrentYear
                          ? 'bg-orange-50 text-[#FF5500] border border-orange-200 hover:bg-orange-100'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>

              {/* Back to months link (Clean text, NO symbols) */}
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setView('months')}
                  className="text-stone-600 hover:text-stone-900 font-bold cursor-pointer py-0.5 px-1 rounded hover:bg-stone-100 transition-colors"
                >
                  Back to Months
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectYear(today.getFullYear())}
                  className="text-orange-600 hover:text-orange-800 font-bold cursor-pointer py-0.5 px-1 rounded hover:bg-orange-50 transition-colors"
                >
                  This Year
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
