import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashier } from '@/stores/cashierStore';
import {
  History,
  BookmarkCheck,
  RotateCcw,
  Wallet,
  ArrowUpDown,
  Printer,
  Keyboard,
  Lock,
  PowerOff,
  LogOut,
  UserCheck,
} from 'lucide-react';

interface POSMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCashMovement: () => void;
  onOpenShortcutsHelp: () => void;
  onReprintReceipt: () => void;
  onOpenRepReport?: () => void;
  onOpenHeldBills?: () => void;
}

export const POSMoreMenu: React.FC<POSMoreMenuProps> = ({
  isOpen,
  onClose,
  onOpenCashMovement,
  onOpenShortcutsHelp,
  onReprintReceipt,
  onOpenRepReport,
  onOpenHeldBills,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { lockPOS, logout } = useCashier();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-3 top-11 z-50 w-56 bg-white rounded-xl shadow-xl border border-zinc-200 py-1 text-[11px] text-zinc-900 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <div className="px-2.5 py-1 border-b border-zinc-100">
        <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Operations</p>
      </div>

      <div className="py-0.5">
        <button
          onClick={() => {
            onClose();
            navigate('/cashier/sales-history');
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 transition-colors text-left font-semibold"
        >
          <History className="w-3.5 h-3.5 text-black" />
          <span>Sales History</span>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">F2</span>
        </button>

        {onOpenRepReport && (
          <button
            onClick={() => {
              onClose();
              onOpenRepReport();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-orange-50/50 hover:text-[#FF5500] transition-colors text-left font-semibold"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Rep Sales Report</span>
            <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">F4</span>
          </button>
        )}

        <button
          onClick={() => {
            onClose();
            if (onOpenHeldBills) {
              onOpenHeldBills();
            } else {
              navigate('/cashier/held-bills');
            }
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 transition-colors text-left font-semibold"
        >
          <BookmarkCheck className="w-3.5 h-3.5 text-[#FF5500]" />
          <span>Held Bills</span>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">F7</span>
        </button>

        <button
          onClick={() => {
            onClose();
            navigate('/cashier/returns');
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 transition-colors text-left font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
          <span>Returns / Refund</span>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">F9</span>
        </button>

        <button
          onClick={() => {
            onClose();
            navigate('/cashier/cash-session');
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 transition-colors text-left font-semibold"
        >
          <Wallet className="w-3.5 h-3.5 text-black" />
          <span>Cash Summary</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenCashMovement();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 transition-colors text-left font-semibold"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#FF5500]" />
          <span>Cash In / Out</span>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">F10</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onReprintReceipt();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 transition-colors text-left font-semibold"
        >
          <Printer className="w-3.5 h-3.5 text-zinc-500" />
          <span>Reprint Receipt</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenShortcutsHelp();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 transition-colors text-left font-semibold"
        >
          <Keyboard className="w-3.5 h-3.5 text-zinc-500" />
          <span>Shortcuts</span>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">?</span>
        </button>
      </div>

      <div className="pt-0.5 mt-0.5 border-t border-zinc-100">
        <button
          onClick={() => {
            onClose();
            lockPOS();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-orange-50 text-black hover:text-[#FF5500] transition-colors text-left font-semibold"
        >
          <Lock className="w-3.5 h-3.5 text-[#FF5500]" />
          <span>Lock Terminal</span>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">Shift+L</span>
        </button>

        <button
          onClick={() => {
            onClose();
            navigate('/cashier/cash-session');
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 transition-colors text-left font-semibold"
        >
          <PowerOff className="w-3.5 h-3.5 text-rose-500" />
          <span>End Shift</span>
        </button>

        <button
          onClick={() => {
            onClose();
            logout();
            navigate('/cashier/login');
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1 hover:bg-zinc-100 text-zinc-400 hover:text-black transition-colors text-left text-[10px]"
        >
          <LogOut className="w-3 h-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
