import React from 'react';
import {
  Search,
  Boxes,
  Percent,
  UserCheck,
  CreditCard,
  Bookmark,
  History,
  Users,
  RotateCcw,
  ArrowUpDown,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { AppFooter } from '@/components/common/AppFooter';

interface ShortcutItem {
  key: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: () => void;
}

interface POSShortcutBarProps {
  onF1?: () => void;
  onF2?: () => void;
  onF3?: () => void;
  onF4?: () => void;
  onF5?: () => void;
  onF6?: () => void;
  onF7?: () => void;
  onF8?: () => void;
  onF9?: () => void;
  onF10?: () => void;
  onF12?: () => void;
  onHelp?: () => void;
}

export const POSShortcutBar: React.FC<POSShortcutBarProps> = ({
  onF1,
  onF2,
  onF3,
  onF4,
  onF5,
  onF6,
  onF7,
  onF8,
  onF9,
  onF10,
  onF12,
  onHelp,
}) => {
  const shortcuts: ShortcutItem[] = [
    { key: 'F1', label: 'Search', shortLabel: 'Search', icon: Search, action: onF1 },
    { key: 'F2', label: 'Sales History', shortLabel: 'History', icon: History, action: onF2 },
    { key: 'F3', label: 'Discount', shortLabel: 'Disc', icon: Percent, action: onF3 },
    { key: 'F4', label: 'Rep Sales', shortLabel: 'Reps', icon: UserCheck, action: onF4 },
    { key: 'F5', label: 'Payment', shortLabel: 'Pay', icon: CreditCard, action: onF5 },
    { key: 'F6', label: 'Hold Bill', shortLabel: 'Hold', icon: Bookmark, action: onF6 },
    { key: 'F7', label: 'Held Bills', shortLabel: 'Held', icon: History, action: onF7 },
    { key: 'F8', label: 'Customer', shortLabel: 'Cust', icon: Users, action: onF8 },
    { key: 'F9', label: 'Return', shortLabel: 'Return', icon: RotateCcw, action: onF9 },
    { key: 'F10', label: 'Cash In/Out', shortLabel: 'Cash', icon: ArrowUpDown, action: onF10 },
    { key: 'F12', label: 'Complete', shortLabel: 'Done', icon: CheckCircle2, action: onF12 },
    { key: '?', label: 'Help', shortLabel: 'Help', icon: HelpCircle, action: onHelp },
  ];

  return (
    <footer className="flex-shrink-0 select-none bg-white border-t border-zinc-200">
      {/* Keyboard Shortcut Row with Mini Icons - Completely Responsive & Zero Scrollbars */}
      <div
        className="h-7 px-2 flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar text-zinc-500 text-[10px] font-semibold"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 xl:gap-2.5 mx-auto shrink-0">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={s.action}
                className="flex items-center gap-1 hover:text-[#FF5500] transition-colors py-0.5 px-1 rounded-md group cursor-pointer shrink-0"
                title={`${s.label} (${s.key})`}
              >
                {/* Tactile Keycap */}
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-black font-mono font-bold border border-zinc-300 text-[9px] shadow-[0_1px_1px_rgba(0,0,0,0.06)] group-hover:border-[#FF5500] transition-colors shrink-0">
                  {s.key}
                </span>

                {/* Orange Icon */}
                <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FF5500] stroke-[2.5] shrink-0" />

                {/* Black Label: Full on xl, Short on sm-lg, key+icon only on xs */}
                <span className="hidden xl:inline whitespace-nowrap text-black font-bold text-[10px] transition-colors">
                  {s.label}
                </span>
                <span className="hidden sm:inline xl:hidden whitespace-nowrap text-black font-bold text-[9.5px] transition-colors">
                  {s.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Small Height Developer & Brand Footer */}
      <AppFooter />
    </footer>
  );
};
