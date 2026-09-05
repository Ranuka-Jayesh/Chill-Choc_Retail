import React, { useState, useEffect } from 'react';
import { useHeldBills } from '@/stores/heldBillsStore';
import { useCart } from '@/stores/cartStore';
import { useToast } from '@/stores/toastStore';
import { HeldBill } from '@/types';
import {
  BookmarkCheck,
  Search,
  X,
  Play,
  Trash2,
  Calendar,
  User,
} from 'lucide-react';

interface HeldBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeldBillsModal: React.FC<HeldBillsModalProps> = ({ isOpen, onClose }) => {
  const { heldBills, deleteHeldBill } = useHeldBills();
  const { loadCart, items: currentCartItems, total: cartTotal } = useCart();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [billToDelete, setBillToDelete] = useState<HeldBill | null>(null);
  const [billToResume, setBillToResume] = useState<HeldBill | null>(null);

  const filteredBills = heldBills.filter(
    (b) =>
      b.holdCode.toLowerCase().includes(search.toLowerCase()) ||
      (b.customer?.name && b.customer.name.toLowerCase().includes(search.toLowerCase())) ||
      (b.note && b.note.toLowerCase().includes(search.toLowerCase())) ||
      b.items.some((i) => i.product.name.toLowerCase().includes(search.toLowerCase()))
  );

  const executeResume = (bill: HeldBill) => {
    loadCart(bill.items, bill.customer);
    deleteHeldBill(bill.id);
    showToast(`Resumed ${bill.holdCode} into active cart`, 'success');
    setBillToResume(null);
    onClose();
  };

  const handleResume = (bill: HeldBill) => {
    if (currentCartItems.length > 0) {
      setBillToResume(bill);
    } else {
      executeResume(bill);
    }
  };

  const executeDelete = () => {
    if (billToDelete) {
      deleteHeldBill(billToDelete.id);
      showToast(`Cancelled held bill ${billToDelete.holdCode}`, 'info');
      setBillToDelete(null);
    }
  };

  // Close on Escape, Enter on sub-modals, and 1-9 to resume bills in order
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape handling
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (billToDelete) {
          setBillToDelete(null);
        } else if (billToResume) {
          setBillToResume(null);
        } else {
          onClose();
        }
        return;
      }

      // Enter handling for confirmation dialogs
      if (e.key === 'Enter') {
        if (billToResume) {
          e.preventDefault();
          e.stopPropagation();
          executeResume(billToResume);
          return;
        }
        if (billToDelete) {
          e.preventDefault();
          e.stopPropagation();
          executeDelete();
          return;
        }
      }

      // If user is typing in an input or textarea, let normal typing happen
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Ignore 1-9 if any confirmation sub-modal is open
      if (billToDelete || billToResume) return;

      // 1 to 9 shortcut keys to resume corresponding held bill by order (1 -> index 0, ..., 9 -> index 8)
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < filteredBills.length) {
          e.preventDefault();
          e.stopPropagation();
          handleResume(filteredBills[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, billToDelete, billToResume, filteredBills, currentCartItems, onClose]);

  if (!isOpen) return null;

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
        {/* SECTION 1 (LEFT): BIG HELT.PNG MASCOT                      */}
        {/* ========================================================= */}
        <div className="w-full md:w-[300px] lg:w-[330px] border-b md:border-b-0 md:border-r border-zinc-100/90 p-6 sm:p-7 flex flex-col items-center justify-center bg-white shrink-0 select-none">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            {/* Mascot - Sized Big & Prominent */}
            <img
              src="/helt.png"
              alt="Parked & Held Bills Mascot"
              className="w-auto h-[210px] lg:h-[250px] object-contain drop-shadow-md pointer-events-none select-none transition-transform hover:scale-105 duration-200"
            />

            {/* Section Title & Subtitle */}
            <div className="space-y-1">
              <h3 className="text-base font-black text-black tracking-tight flex items-center justify-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-[#FF5500]" />
                <span>Parked & Held Bills</span>
              </h3>
              <p className="text-[11px] text-zinc-400 max-w-[220px] leading-snug">
                Retrieve customer carts that were placed on temporary hold
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2 (RIGHT): ACTIVE PARKED BILLS LIST & SEARCH      */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/40">
          {/* Header Bar */}
          <div className="h-16 px-5 border-b border-zinc-200/80 flex items-center justify-between gap-3 bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                <BookmarkCheck className="w-4 h-4 text-[#FF5500]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-black leading-tight flex items-center gap-2">
                  <span>Parked Bills</span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5500] font-mono text-[10px] font-black">
                    {filteredBills.length}
                  </span>
                </h4>
                <span className="text-[10px] text-zinc-400">
                  Select a bill to resume checkout
                </span>
              </div>
            </div>

            {/* Search and Close */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-48 sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code, customer..."
                  className="w-full h-10 pl-9 pr-8 rounded-xl border border-zinc-200/90 bg-zinc-50 focus:bg-white text-xs font-medium text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-200/70 hover:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {filteredBills.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-300 mb-3">
                  <BookmarkCheck className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-zinc-800">
                  {search ? 'No matching parked bills' : 'No bills currently on hold'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                  {search
                    ? `No parked bills match "${search}". Try clearing search.`
                    : 'When you need to pause checkout, press F6 in the POS to park a bill here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 shadow-2xs hover:border-[#FF5500]/50 hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5"
                  >
                    {/* Top row: Code, Time, Total */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md bg-orange-50/80 text-[#FF5500] font-mono text-[11px] font-bold border border-orange-200/60 inline-block">
                          {bill.holdCode}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 font-medium">
                          <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                          <span>Today &bull; {bill.timestamp}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm sm:text-base font-black text-black font-mono tabular-numbers block leading-tight">
                          Rs. {bill.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                          {bill.itemsCount} {bill.itemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>

                    {/* Customer & Reason Note */}
                    <div className="p-2 rounded-xl bg-zinc-50/80 border border-zinc-100/90 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                        <User className="w-3 h-3 text-[#FF5500] shrink-0" />
                        <span className="truncate">{bill.customer?.name || 'Walk-in Customer'}</span>
                      </div>
                      {bill.note && (
                        <p className="text-[11px] text-zinc-500 italic pl-4.5 line-clamp-2 leading-tight">
                          &ldquo;{bill.note}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Items Mini-list Preview */}
                    <div className="space-y-1 py-0.5">
                      {bill.items.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] text-zinc-600"
                        >
                          <span className="truncate pr-2">
                            <strong className="text-zinc-900 font-bold">{item.quantity}x</strong>{' '}
                            <span className="text-zinc-700">{item.product.name}</span>
                          </span>
                          <span className="font-mono text-zinc-900 font-medium shrink-0">
                            Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {bill.items.length > 2 && (
                        <div className="text-[10px] text-zinc-400 font-medium pl-0.5">
                          +{bill.items.length - 2} more item{bill.items.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Actions: Delete & Resume */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setBillToDelete(bill)}
                        className="w-8 h-8 rounded-xl border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="Delete parked bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResume(bill)}
                        className="flex-1 h-8 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>RESUME</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-MODAL 1: CONFIRM RESUME WHEN ACTIVE CART HAS ITEMS    */}
      {/* ========================================================= */}
      {billToResume && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100"
          onClick={() => setBillToResume(null)}
        >
          <div
            className="w-full max-w-[390px] sm:max-w-[410px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-4 sm:p-5 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Left Side: Cute Mascot Image */}
              <div className="flex-shrink-0">
                <img
                  src="/warning.png"
                  alt="Warning"
                  className="w-24 h-24 sm:w-26 sm:h-26 object-contain drop-shadow-sm select-none pointer-events-none"
                />
              </div>

              {/* Right Side: Short Message & Buttons */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-black text-black tracking-tight leading-tight">
                  Replace active cart?
                </h4>
                <p className="text-[11px] font-medium text-zinc-500 mt-1 leading-snug">
                  Replace current cart with <span className="font-bold text-zinc-900 font-mono">{billToResume.holdCode}</span>?
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBillToResume(null)}
                    className="flex-1 h-9 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap shadow-xs"
                  >
                    Keep
                  </button>

                  <button
                    type="button"
                    onClick={() => executeResume(billToResume)}
                    className="flex-1 h-9 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    Replace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-MODAL 2: CONFIRM DELETE HELD BILL                     */}
      {/* ========================================================= */}
      {billToDelete && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100"
          onClick={() => setBillToDelete(null)}
        >
          <div
            className="w-full max-w-[390px] sm:max-w-[410px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-4 sm:p-5 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Left Side: Cute Mascot Image */}
              <div className="flex-shrink-0">
                <img
                  src="/warning.png"
                  alt="Warning"
                  className="w-24 h-24 sm:w-26 sm:h-26 object-contain drop-shadow-sm select-none pointer-events-none"
                />
              </div>

              {/* Right Side: Short Message & Buttons */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-black text-black tracking-tight leading-tight">
                  Delete parked bill?
                </h4>
                <p className="text-[11px] font-medium text-zinc-500 mt-1 leading-snug">
                  Remove <span className="font-bold text-zinc-900 font-mono">{billToDelete.holdCode}</span> from parked list?
                </p>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBillToDelete(null)}
                    className="flex-1 h-9 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap shadow-xs"
                  >
                    Keep
                  </button>

                  <button
                    type="button"
                    onClick={executeDelete}
                    className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
