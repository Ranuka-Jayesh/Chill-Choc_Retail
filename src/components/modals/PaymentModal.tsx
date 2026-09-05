import React, { useState, useEffect } from 'react';
import { PaymentMethod, PaymentTender, CartItem, Customer, CompletedSale } from '@/types';
import {
  Banknote,
  CreditCard,
  Split,
  CheckCircle2,
  X,
  Receipt,
  User,
  Delete,
} from 'lucide-react';
import { SplitPayment } from './SplitPayment';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDue: number;
  subtotal: number;
  totalDiscount: number;
  tax: number;
  items: CartItem[];
  customer: Customer;
  cashierName: string;
  onPaymentSuccess: (sale: CompletedSale) => void;
  onRecordSale: (params: {
    items: CartItem[];
    subtotal: number;
    discountTotal: number;
    tax: number;
    total: number;
    customer?: Customer;
    tenders: PaymentTender[];
    change: number;
    cashierName: string;
  }) => CompletedSale;
  onOpenCustomerModal?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalDue,
  subtotal,
  totalDiscount,
  tax,
  items,
  customer,
  cashierName,
  onPaymentSuccess,
  onRecordSale,
  onOpenCustomerModal,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [amountReceivedStr, setAmountReceivedStr] = useState<string>('');
  const [splitTenders, setSplitTenders] = useState<PaymentTender[]>([]);

  // 6 Dynamic presets formatted like sample design: Exact, rounded steps
  const quickCashPresets = React.useMemo(() => {
    const exact = totalDue;
    const r1 = Math.ceil(totalDue / 500) * 500;
    const p1 = r1 > exact ? r1 : exact + 500;
    const p2 = Math.ceil(p1 / 1000) * 1000 || p1 + 500;
    const p3 = p2 + 1000;
    const p4 = p3 + 2000;
    const p5 = 10000;

    const list: { label: string; value: number }[] = [
      { label: 'Exact', value: exact },
      { label: `Rs. ${p1.toLocaleString()}`, value: p1 },
      { label: `Rs. ${p2.toLocaleString()}`, value: p2 },
      { label: `Rs. ${p3.toLocaleString()}`, value: p3 },
      { label: `Rs. ${p4.toLocaleString()}`, value: p4 },
      { label: `Rs. ${p5.toLocaleString()}`, value: p5 },
    ];

    // Deduplicate values if needed
    const seen = new Set<number>();
    const result: { label: string; value: number }[] = [];
    for (const item of list) {
      if (!seen.has(item.value)) {
        seen.add(item.value);
        result.push(item);
      }
    }
    while (result.length < 6) {
      const lastVal = result[result.length - 1]?.value || 5000;
      const nextVal = lastVal + 2000;
      result.push({ label: `Rs. ${nextVal.toLocaleString()}`, value: nextVal });
    }
    return result.slice(0, 6);
  }, [totalDue]);

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod('cash');
      setIsSplitMode(false);
      setAmountReceivedStr(String(totalDue > 0 ? totalDue : ''));
      setSplitTenders([]);
    }
  }, [isOpen, totalDue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        // Prevent default enter and process payment if valid
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' && target.id !== 'modal-cash-input') {
          return;
        }
        e.preventDefault();
        handleComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const amountReceived = parseFloat(amountReceivedStr) || 0;
  const changeDue = Math.max(0, amountReceived - totalDue);

  const canCompleteSingle =
    selectedMethod !== 'cash' || amountReceived >= totalDue;

  const totalSplitPaid = splitTenders.reduce((acc, t) => acc + t.amount, 0);
  const canCompleteSplit = isSplitMode && totalSplitPaid >= totalDue;
  const canComplete = isSplitMode ? canCompleteSplit : canCompleteSingle;

  // Touchscreen numpad handlers
  const handleNumpadDigit = (digit: string) => {
    setAmountReceivedStr((prev) => {
      if (digit === '.') {
        if (prev.includes('.')) return prev;
        return prev ? `${prev}.` : '0.';
      }
      if (prev === '0') return digit;
      return `${prev}${digit}`;
    });
  };

  const handleNumpadClear = () => {
    setAmountReceivedStr('');
  };

  const handleNumpadBackspace = () => {
    setAmountReceivedStr((prev) => prev.slice(0, -1));
  };

  const handleComplete = () => {
    if (!canComplete) return;

    let tenders: PaymentTender[] = [];
    let change = 0;

    if (isSplitMode) {
      tenders = splitTenders;
      change = 0;
    } else {
      tenders = [
        {
          method: selectedMethod,
          amount: selectedMethod === 'cash' ? amountReceived : totalDue,
        },
      ];
      change = selectedMethod === 'cash' ? changeDue : 0;
    }

    const sale = onRecordSale({
      items,
      subtotal,
      discountTotal: totalDiscount,
      tax,
      total: totalDue,
      customer,
      tenders,
      change,
      cashierName,
    });

    onClose();
    onPaymentSuccess(sale);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-sm flex flex-col justify-center items-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 my-auto">
        {/* Top Header Bar matching Image 2 */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Tender &amp; Settlement
            </h2>
            <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Retail
            </span>
          </div>

          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 transition-all cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Dual Card Main Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[38%_62%] gap-3.5 items-stretch">
          {/* LEFT CARD: ORDER SUMMARY */}
          <div className="rounded-3xl bg-white border border-zinc-200/90 p-5 shadow-2xl flex flex-col justify-between min-h-[460px]">
            <div>
              {/* Order Summary Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-zinc-800">
                  <Receipt className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>Order Summary</span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCustomerModal?.()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[10px] font-semibold text-zinc-700 transition-colors cursor-pointer shadow-2xs"
                  title="Change customer or loyalty member"
                >
                  <User className="w-2.5 h-2.5 text-[#FF5500]" />
                  <span>{customer ? customer.name : 'Add Member / Points'}</span>
                </button>
              </div>

              {/* Huge Total Due Banner */}
              <div className="mt-4 p-4 rounded-2xl bg-[#FAF9F6] border border-zinc-200/80 flex items-baseline justify-between shadow-2xs">
                <div className="flex items-baseline">
                  <span className="text-sm font-bold text-[#FF5500] font-mono mr-1">Rs.</span>
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-900">
                    {totalDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs font-semibold text-zinc-400">Total Due</span>
              </div>

              {/* Items & Modifiers List */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-1.5 border-b border-zinc-100">
                  <span>Items &amp; Modifiers</span>
                  <span>Amount</span>
                </div>

                <div className="overflow-y-auto max-h-[170px] divide-y divide-zinc-100/80 py-1 pr-1">
                  {items.length === 0 ? (
                    <div className="py-6 text-center text-zinc-400 text-xs">No items in current bill</div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <span className="font-mono font-bold text-[#FF5500]">{item.quantity}x</span>
                          <span className="font-semibold text-zinc-800 truncate">{item.product.name}</span>
                        </div>
                        <span className="font-mono font-bold text-zinc-900 shrink-0">
                          Rs. {(item.unitPrice * item.quantity).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bill Calculations */}
            <div className="border-t border-zinc-200/80 pt-3 mt-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-zinc-500 font-medium">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-zinc-800">
                  Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span className="font-mono font-bold">
                    - Rs. {totalDiscount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="border-t border-zinc-100 pt-2 flex items-baseline justify-between">
                <span className="text-sm font-black text-zinc-900">Final Settlement</span>
                <span className="text-xl font-black font-mono text-[#FF5500]">
                  Rs. {totalDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT CARD: TENDER, NUMPAD & SETTLEMENT */}
          <div className="rounded-3xl bg-white border border-zinc-200/90 p-5 shadow-2xl flex flex-col justify-between min-h-[460px]">
            <div>
              {/* Tender Method Switcher (Top Tabs) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('cash');
                    setIsSplitMode(false);
                    setAmountReceivedStr(String(totalDue));
                  }}
                  className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    selectedMethod === 'cash' && !isSplitMode
                      ? 'bg-[#FF5500] text-white shadow-sm'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('card');
                    setIsSplitMode(false);
                  }}
                  className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    selectedMethod === 'card' && !isSplitMode
                      ? 'bg-[#FF5500] text-white shadow-sm'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSplitMode(true)}
                  className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    isSplitMode
                      ? 'bg-[#FF5500] text-white shadow-sm'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Split className="w-4 h-4" />
                  <span>Split Tender</span>
                </button>
              </div>

              {/* Sub-view: Split Mode vs Single Mode */}
              {isSplitMode ? (
                <div className="my-4">
                  <SplitPayment
                    totalDue={totalDue}
                    tenders={splitTenders}
                    onChangeTenders={setSplitTenders}
                  />
                </div>
              ) : selectedMethod === 'cash' ? (
                /* Cash Sub-Layout with Presets and Numpad exactly matching Image 2 */
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_240px] gap-4 my-3.5">
                  {/* Left Column: Cash Received Input & Presets & Change */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                        Cash Received
                      </label>
                      <div className="h-14 rounded-2xl border-2 border-[#FF5500] bg-white px-4 flex items-center justify-between shadow-2xs">
                        <span className="text-base font-bold text-zinc-400 font-mono select-none">Rs.</span>
                        <input
                          id="modal-cash-input"
                          type="text"
                          inputMode="decimal"
                          value={amountReceivedStr}
                          onChange={(e) => setAmountReceivedStr(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder={String(totalDue)}
                          className="w-full text-right text-2xl sm:text-3xl font-black font-mono text-zinc-900 bg-transparent focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Cash Presets (2 Rows x 3 Cols) */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
                        Quick Cash Presets
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {quickCashPresets.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAmountReceivedStr(String(p.value))}
                            className={`py-2 px-1 rounded-xl border text-xs font-bold font-mono transition-all text-center cursor-pointer shadow-2xs ${
                              amountReceived === p.value
                                ? 'bg-black text-white border-black'
                                : 'bg-zinc-50 hover:bg-orange-50 hover:border-[#FF5500] text-zinc-800 border-zinc-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Change Due Row */}
                    <div className="pt-3 border-t border-zinc-100 flex items-baseline justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Change Due
                      </span>
                      <span className="text-2xl font-black font-mono tabular-numbers text-zinc-900">
                        Rs. {changeDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Numeric Numpad (3x4 grid + wide Backspace) */}
                  <div className="flex flex-col items-center">
                    <div className="grid grid-cols-3 gap-2">
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleNumpadDigit(num)}
                          className="w-14 h-14 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 active:scale-95 text-xl font-bold font-mono text-zinc-900 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                        >
                          {num}
                        </button>
                      ))}

                      {/* Clear Button */}
                      <button
                        type="button"
                        onClick={handleNumpadClear}
                        className="w-14 h-14 rounded-full border border-rose-200 bg-rose-50/50 hover:bg-rose-100 active:scale-95 text-xs font-bold text-rose-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                      >
                        Clear
                      </button>

                      {/* 0 Button */}
                      <button
                        type="button"
                        onClick={() => handleNumpadDigit('0')}
                        className="w-14 h-14 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 active:scale-95 text-xl font-bold font-mono text-zinc-900 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                      >
                        0
                      </button>

                      {/* Decimal . Button */}
                      <button
                        type="button"
                        onClick={() => handleNumpadDigit('.')}
                        className="w-14 h-14 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 active:scale-95 text-xl font-bold font-mono text-zinc-900 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                      >
                        .
                      </button>
                    </div>

                    {/* Wide Backspace Button */}
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="w-full h-10 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 active:scale-98 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 shadow-2xs mt-2.5 transition-all cursor-pointer"
                    >
                      <Delete className="w-4 h-4 text-zinc-500" />
                      <span>Backspace</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Card Terminal Mode */
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 my-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-[#FF5500] border border-orange-200 flex items-center justify-center shadow-xs">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-zinc-900">Card Payment Terminal Ready</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Swipe, insert chip, or tap customer card on terminal.
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-mono font-bold text-zinc-800">
                    Amount: Rs. {totalDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3 mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 font-bold text-xs sm:text-sm py-3 px-6 transition-all cursor-pointer shadow-2xs"
              >
                Back to Order
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={!canComplete}
                className={`rounded-2xl flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-8 text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-sm ${
                  canComplete
                    ? 'bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white cursor-pointer'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
