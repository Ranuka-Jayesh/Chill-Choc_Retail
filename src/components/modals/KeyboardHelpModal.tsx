import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_LIST = [
  // Row 1: Function Keys F1 - F4
  { key: 'F1', title: 'Catalog Search / Scanner', description: 'Focus barcode & search input' },
  { key: 'F2', title: 'Sales History', description: 'View past completed invoices' },
  { key: 'F3', title: 'Apply Discount', description: 'Item or bill percentage discount' },
  { key: 'F4', title: 'Rep Performance', description: 'Staff daily sales & commission' },

  // Row 2: Function Keys F5 - F8
  { key: 'F5', title: 'Payment & Tenders', description: 'Open multi-tender payment modal' },
  { key: 'F6', title: 'Hold Bill', description: 'Park active cart with Enter key' },
  { key: 'F7', title: 'Held Bills (1-9)', description: 'Resume parked bills (keys 1 to 9)' },
  { key: 'F8', title: 'Customer Profile', description: 'Attach or create loyalty profile' },

  // Row 3: Function Keys F9 - F12 (Includes F11 Full Screen!)
  { key: 'F9', title: 'Returns & Refund', description: 'Process customer return request' },
  { key: 'F10', title: 'Cash Movement', description: 'Drawer float, in / out, cash drop' },
  { key: 'F11', title: 'Full Screen', description: 'Toggle full screen register mode' },
  { key: 'F12', title: 'Quick Pay', description: 'Settle sale with exact tender' },

  // Row 4: Cart & Terminal Controls
  { key: '+ / -', title: 'Adjust Quantity', description: 'Increase (+1) or decrease (-1) qty' },
  { key: '↑ / ↓', title: 'Navigate Cart', description: 'Move selection up / down in cart' },
  { key: 'Shift + L', title: 'Lock Terminal', description: 'Lock terminal with PIN security' },
  { key: 'Shift + C', title: 'Clear Cart', description: 'Void and clear active bill items' },

  // Row 5: Operations & Navigation
  { key: '@ (Shift+2)', title: 'Assign Staff', description: 'Tag salesperson to selected item' },
  { key: 'Enter', title: 'Focus / Tender', description: 'Focus amount input or confirm pay' },
  { key: 'Backspace', title: 'Return to POS', description: 'Fast return from sales history' },
  { key: 'Esc', title: 'Cancel / Dismiss', description: 'Close active modal or cancel' },
];

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-[1220px] xl:max-w-[1280px] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-150 max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT SIDE: Custom Mascot Illustration (ks.png) */}
        <div className="w-full md:w-[230px] lg:w-[260px] p-4 sm:p-6 flex flex-col items-center justify-center shrink-0 bg-gradient-to-b from-zinc-50/80 to-orange-50/20 border-b md:border-b-0 md:border-r border-zinc-100 select-none">
          <img
            src="/ks.png"
            alt="Keyboard Shortcuts Mascot"
            className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-contain drop-shadow-md select-none pointer-events-none transition-transform hover:scale-105 duration-300"
          />
        </div>

        {/* RIGHT SIDE: 4 Shortcuts per Row Grid Layout */}
        <div className="flex-1 p-4 sm:p-5 lg:p-6 flex flex-col min-w-0 justify-between overflow-hidden">
          {/* Minimal Header */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500]" />
              <h2 className="text-lg sm:text-xl font-black text-black tracking-tight leading-none">
                Keyboard Shortcuts
              </h2>
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/60 text-[#FF5500] text-[10px] font-bold">
                20 Hotkeys
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-black flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main 4-Column Grid (Exactly 4 shortcuts per row, zero scrollbar, full descriptions visible) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3 my-auto py-2 overflow-y-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHORTCUT_LIST.map((item) => (
              <div
                key={item.key}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-50/90 hover:bg-orange-50/40 border border-zinc-200/80 hover:border-orange-200 transition-all flex flex-col justify-between group shadow-2xs hover:shadow-xs min-h-[66px]"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-900 group-hover:bg-[#FF5500] text-white font-mono font-black text-[10px] sm:text-[11px] shadow-2xs transition-colors shrink-0 tracking-wide">
                    {item.key}
                  </span>
                </div>
                <div className="mt-1.5 min-w-0">
                  <h4 className="text-xs font-bold text-black group-hover:text-[#FF5500] transition-colors leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[10px] sm:text-[10.5px] text-zinc-400 group-hover:text-zinc-600 font-medium leading-tight mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
