import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStaff } from '@/stores/staffStore';
import { Salesperson } from '@/types';
import { Search, Check, UserCheck, X } from 'lucide-react';

interface SalespersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSalesperson: Salesperson | null | undefined;
  onSelectSalesperson: (salesperson: Salesperson | null) => void;
  productName?: string;
}

type SalespersonOption =
  | { isNone: true; id: string; name: string; code: string; avatarInitials: string }
  | (Salesperson & { isNone?: false });

export const SalespersonModal: React.FC<SalespersonModalProps> = ({
  isOpen,
  onClose,
  selectedSalesperson,
  onSelectSalesperson,
  productName,
}) => {
  const { staffList } = useStaff();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Build real salespersons dynamically from active staff members (EXCLUDING Admins and Cashiers)
  const realSalespersons = useMemo<Salesperson[]>(() => {
    const list: Salesperson[] = [];

    staffList
      .filter((s) => s.status === 'Active')
      .forEach((s) => {
        const roleLower = (s.role || '').toLowerCase().trim();
        const nameLower = (s.name || '').toLowerCase().trim();

        // STRICT REQUIREMENT: Do NOT show Admin or Super Admin as salesperson
        if (
          roleLower.includes('admin') ||
          nameLower.includes('admin') ||
          roleLower.includes('super admin')
        ) {
          return;
        }

        // STRICT REQUIREMENT: Do NOT show Cashier as salesperson
        if (
          roleLower.includes('cashier') ||
          nameLower.includes('cashier') ||
          roleLower.includes('barista')
        ) {
          return;
        }

        // Determine a clean code badge
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

  // Construct options: No Salesperson + filtered employees
  const options = useMemo<SalespersonOption[]>(() => {
    const noneOption: SalespersonOption = {
      isNone: true,
      id: 'none',
      name: 'No Salesperson',
      code: 'Unassign / General sale',
      avatarInitials: '✕',
    };

    const query = search.trim().toLowerCase().replace(/^@/, '');
    const filteredEmployees: SalespersonOption[] = realSalespersons.filter((sp) => {
      if (!query) return true;
      return (
        sp.name.toLowerCase().includes(query) ||
        sp.code.toLowerCase().includes(query) ||
        sp.avatarInitials.toLowerCase().includes(query)
      );
    });

    return [noneOption, ...filteredEmployees];
  }, [search, realSalespersons]);

  // When opened, focus search and select initial item
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      return;
    }

    if (selectedSalesperson) {
      const idx = options.findIndex((opt) => !opt.isNone && opt.id === selectedSalesperson.id);
      setSelectedIndex(idx >= 0 ? idx : 0);
    } else {
      setSelectedIndex(0);
    }

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [isOpen, selectedSalesperson, options]);

  // Keep selectedIndex valid when options change (e.g., search filter)
  useEffect(() => {
    if (selectedIndex >= options.length) {
      setSelectedIndex(Math.max(0, options.length - 1));
    }
  }, [options.length, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen]);

  // Global keyboard shortcuts (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (options.length > 0 ? (prev + 1) % options.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (options.length > 0 ? (prev - 1 + options.length) % options.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const chosen = options[selectedIndex];
        if (chosen) {
          onSelectSalesperson(chosen.isNone ? null : (chosen as Salesperson));
        }
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, options, selectedIndex, onSelectSalesperson, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[480px] sm:max-w-[510px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 relative animate-in zoom-in-95 duration-150 flex flex-row overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Mascot Image (salesperson.png) - No background color, enlarged image */}
        <div className="w-[185px] sm:w-[200px] border-r border-zinc-100/80 flex items-center justify-center p-1.5 shrink-0 select-none overflow-hidden">
          <img
            src="/salesperson.png"
            alt="Salesperson"
            className="w-full h-auto max-h-[290px] object-contain drop-shadow-sm pointer-events-none select-none scale-105"
          />
        </div>

        {/* Right Side: Form & Records */}
        <div className="flex-1 min-w-0 p-3.5 sm:p-4 flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-orange-50 text-[#FF5500] border border-orange-200/70 flex items-center justify-center shadow-2xs">
                <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-black text-black leading-tight">
                  Select Team Member
                </h3>
                <p className="text-[10px] font-medium text-zinc-400 truncate max-w-[180px]">
                  {productName ? `Assign to: ${productName}` : 'Assign sales commission'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-md text-zinc-400 hover:text-black hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer -mr-0.5"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Bar - Perfect alignment, clean light border, orange brand focus */}
          <div className="pt-2 pb-1.5 flex-shrink-0">
            <div className="flex items-center h-8 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 focus-within:bg-white focus-within:border-[#FF5500] focus-within:ring-2 focus-within:ring-[#FF5500]/15 transition-all">
              <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 flex-shrink-0 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search name, code..."
                className="w-full bg-transparent text-xs font-medium text-black placeholder:text-zinc-400 outline-none border-none p-0 leading-normal"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-zinc-400 hover:text-black ml-1.5 p-0.5 rounded-full hover:bg-zinc-100 cursor-pointer"
                  title="Clear"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Single-Row Records List - No profile badge (AM, NS removed), decreased height */}
          <div className="flex-1 overflow-y-auto max-h-[220px] divide-y divide-zinc-100/90 py-0.5 pr-0.5">
            {options.length === 0 ? (
              <div className="py-6 text-center text-zinc-400">
                <p className="text-xs font-bold text-black">No team members found</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Try searching a different name or code</p>
              </div>
            ) : (
              options.map((opt, index) => {
                const isFocused = index === selectedIndex;
                const isCurrentlyActive = opt.isNone
                  ? !selectedSalesperson
                  : selectedSalesperson?.id === opt.id;

                return (
                  <button
                    key={opt.id}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      onSelectSalesperson(opt.isNone ? null : (opt as Salesperson));
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between py-1.5 px-2 transition-colors text-left cursor-pointer rounded-md ${
                      isFocused && isCurrentlyActive
                        ? 'bg-orange-100/90 text-black ring-1 ring-orange-300'
                        : isFocused
                        ? 'bg-zinc-100 text-black'
                        : isCurrentlyActive
                        ? 'bg-orange-50/80 text-black'
                        : 'hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    {/* Single Row: Name + Code Badge Only (No profile initials AM, NS, etc.) */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-xs font-bold text-black truncate">
                        {opt.name}
                      </span>

                      {!opt.isNone && (
                        <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-zinc-100 text-zinc-600 border border-zinc-200/70 shrink-0">
                          {opt.code}
                        </span>
                      )}
                    </div>

                    {/* Active / Checkmark Indicator */}
                    {isCurrentlyActive && (
                      <div
                        className="w-4 h-4 rounded-full bg-[#FF5500] text-white flex items-center justify-center shrink-0 ml-1.5 shadow-2xs"
                        title="Currently assigned"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}

            {realSalespersons.length === 0 && !search && (
              <div className="py-3 px-2 text-center text-zinc-400 border-t border-zinc-100/60 mt-1">
                <p className="text-[11px] font-bold text-zinc-600">No Sales Staff Registered</p>
                <p className="text-[9.5px] text-zinc-400 mt-0.5">
                  Add Sales Representatives in Admin &gt; Staff Management.
                </p>
              </div>
            )}
          </div>

          {/* Footer with Action Buttons Only */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const chosen = options[selectedIndex];
                if (chosen) {
                  onSelectSalesperson(chosen.isNone ? null : (chosen as Salesperson));
                }
                onClose();
              }}
              className="h-8 px-4 rounded-xl bg-black hover:bg-zinc-800 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
