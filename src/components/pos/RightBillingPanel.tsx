import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CreditCard, Banknote, Split, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useCart } from '@/stores/cartStore';
import { useCashier } from '@/stores/cashierStore';
import { useSales } from '@/stores/salesStore';
import { PaymentMethod, PaymentTender, CompletedSale } from '@/types';

interface RightBillingPanelProps {
  onPaymentSuccess: (sale: CompletedSale) => void;
  onOpenReturn?: () => void;
  onOpenCashMovement?: () => void;
  onOpenMoreMenu?: () => void;
}

export const RightBillingPanel: React.FC<RightBillingPanelProps> = ({
  onPaymentSuccess,
  onOpenReturn: _onOpenReturn,
  onOpenCashMovement: _onOpenCashMovement,
  onOpenMoreMenu: _onOpenMoreMenu,
}) => {
  const {
    items,
    customer,
    subtotal,
    totalDiscount,
    tax,
    total,
    itemsCount,
    defaultSalesperson,
    clearCart: _clearCart,
  } = useCart();

  const { cashier } = useCashier();
  const { completeSale } = useSales();

  const amountInputRef = useRef<HTMLInputElement>(null);
  const splitCashInputRef = useRef<HTMLInputElement>(null);
  const splitCardInputRef = useRef<HTMLInputElement>(null);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [amountReceivedStr, setAmountReceivedStr] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');

  // Split Tender State: separate Cash and Card inputs
  const [splitCashStr, setSplitCashStr] = useState<string>('');
  const [splitCardStr, setSplitCardStr] = useState<string>('');
  const [splitError, setSplitError] = useState<string>('');

  // Clear amount and errors when cart is emptied or total becomes 0
  useEffect(() => {
    if (total === 0) {
      setAmountReceivedStr('');
      setAmountError('');
      setSplitCashStr('');
      setSplitCardStr('');
      setSplitError('');
    }
  }, [total]);

  // Cash Calculations
  const amountReceivedNum = parseFloat(amountReceivedStr);
  const hasCustomAmount = !isNaN(amountReceivedNum) && amountReceivedStr.trim() !== '';
  const isShort = hasCustomAmount && amountReceivedNum < total;
  const changeDue = hasCustomAmount ? Math.max(0, amountReceivedNum - total) : 0;

  // Split Tender Calculations
  const splitCashNum = parseFloat(splitCashStr) || 0;
  const splitCardNum = parseFloat(splitCardStr) || 0;
  const hasSplitCash = splitCashStr.trim() !== '' && !isNaN(parseFloat(splitCashStr));
  const hasSplitCard = splitCardStr.trim() !== '' && !isNaN(parseFloat(splitCardStr));
  const hasAnySplit = hasSplitCash || hasSplitCard;
  const splitTotalTendered = splitCashNum + splitCardNum;
  const splitRemaining = Math.max(0, total - splitTotalTendered);
  const splitChangeDue = hasSplitCash && splitTotalTendered > total ? Math.max(0, splitTotalTendered - total) : 0;

  // Quick cash buttons (Guaranteed 4 smart presets for balanced 2x2 grid)
  const quickCashPills = useMemo(() => {
    if (total <= 0) return [500, 1000, 2000, 5000];
    const exact = total;
    const step = total < 1000 ? 100 : total < 5000 ? 500 : 1000;
    const r1 = Math.ceil(total / step) * step === exact ? exact + step : Math.ceil(total / step) * step;
    const r2 = r1 + (step * (total > 5000 ? 1 : 2));
    const r3 = r2 + (step * (total > 5000 ? 2 : 5));

    const pills = [exact];
    if (!pills.includes(r1)) pills.push(r1);
    if (!pills.includes(r2)) pills.push(r2);
    if (!pills.includes(r3)) pills.push(r3);

    while (pills.length < 4) {
      const last = pills[pills.length - 1];
      pills.push(last + (step * 2));
    }

    return pills.slice(0, 4);
  }, [total]);

  // Can complete: has items, total > 0, and adequate payment received for selected method
  const canComplete =
    itemsCount > 0 &&
    total > 0 &&
    (selectedMethod === 'cash'
      ? hasCustomAmount && amountReceivedNum >= total
      : selectedMethod === 'other'
      ? hasAnySplit && splitTotalTendered >= total
      : true);

  // Quick Split Helper: 50 / 50 Cash & Card
  const handleSplit5050 = () => {
    if (total <= 0) return;
    const half = Math.round((total / 2) * 100) / 100;
    const otherHalf = Math.round((total - half) * 100) / 100;
    setSplitCashStr(String(half));
    setSplitCardStr(String(otherHalf));
    setSplitError('');
  };

  // Quick Split Helper: Clear both inputs
  const handleClearSplit = () => {
    setSplitCashStr('');
    setSplitCardStr('');
    setSplitError('');
    splitCashInputRef.current?.focus();
  };

  // Quick Split Helper: Fill remaining balance into target field
  const handleFillRemaining = (target: 'cash' | 'card') => {
    if (total <= 0) return;
    if (target === 'cash') {
      const needed = Math.max(0, total - splitCardNum);
      setSplitCashStr(String(needed));
      setSplitError('');
      splitCashInputRef.current?.focus();
    } else {
      const needed = Math.max(0, total - splitCashNum);
      setSplitCardStr(String(needed));
      setSplitError('');
      splitCardInputRef.current?.focus();
    }
  };

  const handleExecutePayment = (overrideCash?: number, overrideCard?: number) => {
    // Validate cash payment: amount is strictly required
    if (selectedMethod === 'cash') {
      if (!hasCustomAmount || amountReceivedStr.trim() === '') {
        setAmountError('Amount is required to proceed');
        amountInputRef.current?.focus();
        return;
      }
      if (amountReceivedNum < total) {
        setAmountError(`Amount cannot be less than total (Rs. ${total.toLocaleString()})`);
        amountInputRef.current?.focus();
        return;
      }
    }

    const effectiveCashNum = overrideCash !== undefined ? overrideCash : splitCashNum;
    const effectiveCardNum = overrideCard !== undefined ? overrideCard : splitCardNum;
    const effectiveSplitTotal = effectiveCashNum + effectiveCardNum;
    const effectiveSplitChange = effectiveCashNum > 0 && effectiveSplitTotal > total ? Math.max(0, effectiveSplitTotal - total) : 0;

    // Validate split payment: both cash & card amounts must cover the total
    if (selectedMethod === 'other') {
      if (effectiveSplitTotal === 0) {
        setSplitError('Enter cash and card amounts to proceed');
        splitCashInputRef.current?.focus();
        return;
      }
      if (effectiveSplitTotal < total) {
        setSplitError(`Split amount must cover total (Short by Rs. ${(total - effectiveSplitTotal).toLocaleString()})`);
        if (effectiveCashNum === 0) splitCashInputRef.current?.focus();
        else splitCardInputRef.current?.focus();
        return;
      }
    }

    const isExplicitSplit = overrideCash !== undefined || overrideCard !== undefined;
    if (!canComplete && !isExplicitSplit) return;

    let tenders: PaymentTender[] = [];
    let finalAmount = total;
    let finalChange = 0;

    if (selectedMethod === 'cash') {
      finalAmount = amountReceivedNum;
      finalChange = Math.max(0, finalAmount - total);
      tenders = [
        {
          method: 'cash',
          amount: finalAmount,
        },
      ];
    } else if (selectedMethod === 'card') {
      finalAmount = total;
      finalChange = 0;
      tenders = [
        {
          method: 'card',
          amount: total,
        },
      ];
    } else if (selectedMethod === 'other') {
      finalAmount = effectiveSplitTotal;
      finalChange = effectiveSplitChange;

      if (effectiveCashNum > 0) {
        tenders.push({
          method: 'cash',
          amount: effectiveCashNum,
        });
      }
      if (effectiveCardNum > 0) {
        tenders.push({
          method: 'card',
          amount: effectiveCardNum,
        });
      }
    }

    const effectiveSalesperson =
      defaultSalesperson ||
      items.find((i) => i.salesperson)?.salesperson ||
      null;

    const sale = completeSale({
      items,
      subtotal,
      discountTotal: totalDiscount,
      tax,
      total,
      customer,
      tenders,
      change: finalChange,
      cashierName: cashier.name,
      salesperson: effectiveSalesperson,
    });

    setAmountReceivedStr('');
    setAmountError('');
    setSplitCashStr('');
    setSplitCardStr('');
    setSplitError('');
    onPaymentSuccess(sale);
  };

  // Enter-based procedure: pressing Enter in the amount field validates and processes payment.
  // Prevent ArrowUp and ArrowDown from altering the numeric value.
  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation?.();
      }
      handleExecutePayment();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  // Enter-based navigation in split tender fields:
  // 1. In 1st field (Cash): pressing Enter activates 2nd field (Card) and auto-fills remaining balance (selected)
  // 2. In 2nd field (Card): pressing Enter triggers payment directly (same as Cash workflow)
  const handleSplitKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'cash' | 'card'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation?.();
      }

      const inputVal = (e.target as HTMLInputElement).value;
      const currentInputAmt = parseFloat(inputVal) || 0;

      if (field === 'cash') {
        const cashAmt = currentInputAmt > 0 ? currentInputAmt : (parseFloat(splitCashStr) || 0);
        const cardAmt = parseFloat(splitCardStr) || 0;

        // If total is already fully covered by cash + existing card, execute payment immediately
        if (cashAmt + cardAmt >= total && total > 0 && cardAmt > 0) {
          handleExecutePayment(cashAmt, cardAmt);
          return;
        }

        // Auto-fill remaining balance into Card field if empty or if cash changed
        if (cashAmt > 0 && total > cashAmt && (!splitCardStr.trim() || cardAmt <= 0)) {
          const remaining = Math.max(0, total - cashAmt);
          setSplitCardStr(String(remaining));
        }

        if (splitError) setSplitError('');

        // Activate 2nd field (Card) and select text so user can immediately press Enter or overwrite
        setTimeout(() => {
          splitCardInputRef.current?.focus();
          splitCardInputRef.current?.select();
        }, 30);
      } else {
        // Card field
        const cardAmt = currentInputAmt > 0 ? currentInputAmt : (parseFloat(splitCardStr) || 0);
        const cashAmt = parseFloat(splitCashStr) || 0;

        // If Cash is empty but Card has amount, auto-fill remaining to Cash and activate it
        if (cardAmt > 0 && cashAmt === 0 && total > cardAmt) {
          const remaining = Math.max(0, total - cardAmt);
          setSplitCashStr(String(remaining));
          setTimeout(() => {
            splitCashInputRef.current?.focus();
            splitCashInputRef.current?.select();
          }, 30);
          return;
        }

        // Both entered or Card covering remaining: execute payment!
        handleExecutePayment(cashAmt, cardAmt);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white select-none overflow-hidden border-l border-zinc-200">
      {/* Billing Panel Header */}
      <div className="h-12 px-3.5 border-b border-zinc-200 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <CreditCard className="w-4 h-4 text-[#FF5500]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-black leading-tight">
              Billing & Tender
            </h3>
            <span className="text-[10px] text-zinc-400">
              Register {cashier.register} &bull; Colombo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            {selectedMethod === 'other' ? 'SPLIT' : selectedMethod.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Billing Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* Mobile-Only Net Payable Banner (Hidden on desktop since Center Cart shows calculations) */}
        <div className="lg:hidden p-2.5 rounded-xl bg-black text-white flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block leading-tight">
              TOTAL DUE
            </span>
            <span className="text-[8px] text-zinc-500 font-medium leading-tight">
              Net Payable ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-white font-mono tabular-numbers block leading-none">
              Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div>
          <label className="block text-[10px] font-black text-zinc-500 mb-1.5 uppercase tracking-wider">
            Payment Tender
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
              { id: 'card' as PaymentMethod, label: 'Card (POS)', icon: CreditCard },
              { id: 'other' as PaymentMethod, label: 'Split Tender', icon: Split },
            ].map((m) => {
              const isSelected = selectedMethod === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(m.id);
                    if (amountError) setAmountError('');
                    if (splitError) setSplitError('');
                    if (m.id === 'other') {
                      setTimeout(() => splitCashInputRef.current?.focus(), 50);
                    } else if (m.id === 'cash') {
                      setTimeout(() => amountInputRef.current?.focus(), 50);
                    }
                  }}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-black bg-black text-white font-bold shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-black'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF5500]' : 'text-zinc-400'}`} />
                  <span className="text-[10px] truncate max-w-full font-semibold">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Entering Section (when Cash) */}
        {selectedMethod === 'cash' ? (
          <div className="space-y-2 pt-0.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="amount-received-input"
                  className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1"
                >
                  <span>Amount Received (Rs.)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                {amountError ? (
                  <span className="text-[9px] font-mono font-bold text-rose-600 animate-pulse">
                    Required Field
                  </span>
                ) : isShort ? (
                  <span className="text-[9px] font-mono font-bold text-rose-500">
                    Short by Rs. {(total - amountReceivedNum).toLocaleString()}
                  </span>
                ) : (
                  total > 0 && (
                    <span className="text-[9px] font-mono text-zinc-400">
                      Min Rs. {total.toLocaleString()}
                    </span>
                  )
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-zinc-400 select-none">
                  Rs.
                </span>
                <input
                  ref={amountInputRef}
                  id="amount-received-input"
                  type="number"
                  inputMode="decimal"
                  value={amountReceivedStr}
                  onChange={(e) => {
                    setAmountReceivedStr(e.target.value);
                    if (amountError) setAmountError('');
                  }}
                  onKeyDown={handleAmountKeyDown}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="0.00"
                  className={`w-full h-9 pl-9 pr-8 rounded-xl border bg-white text-sm font-mono font-black text-black placeholder:text-zinc-300 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    amountError || isShort
                      ? 'border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-rose-900'
                      : 'border-zinc-200 focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500]'
                  }`}
                />
                {amountReceivedStr && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmountReceivedStr('');
                      if (amountError) setAmountError('');
                      amountInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-black transition-colors cursor-pointer"
                    title="Clear amount"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Required Field Error Message */}
              {amountError && (
                <div className="flex items-center gap-1.5 mt-1 text-rose-600 animate-in fade-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span className="text-[10px] font-bold leading-tight">{amountError}</span>
                </div>
              )}
            </div>

            {/* Quick Cash Presets (2x2 Balanced Responsive Grid with Active State) */}
            <div className="grid grid-cols-2 gap-1.5">
              {quickCashPills.map((pill) => {
                const isSelected = hasCustomAmount && amountReceivedNum === pill;
                return (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => {
                      setAmountReceivedStr(String(pill));
                      if (amountError) setAmountError('');
                      amountInputRef.current?.focus();
                    }}
                    className={`py-1.5 px-2 rounded-lg font-mono font-bold text-[11px] border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-black border-zinc-200'
                    }`}
                  >
                    {pill === total ? 'Exact' : `Rs. ${pill.toLocaleString()}`}
                  </button>
                );
              })}
            </div>
          </div>
        ) : selectedMethod === 'other' ? (
          /* Split Tender: Separate Cash and Card Amounts */
          <div className="space-y-2.5 pt-0.5">
            {/* Balance Tracker Overview Card */}
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block leading-tight">
                  Total Due
                </span>
                <span className="text-[11px] font-black text-black font-mono tabular-numbers leading-tight block mt-0.5">
                  Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block leading-tight">
                  Tendered
                </span>
                <span className="text-[11px] font-black text-black font-mono tabular-numbers leading-tight block mt-0.5">
                  Rs. {splitTotalTendered.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block leading-tight">
                  {splitRemaining > 0 ? 'Remaining' : 'Status'}
                </span>
                <span
                  className={`text-[11px] font-black font-mono tabular-numbers leading-tight block mt-0.5 ${
                    splitRemaining > 0 ? 'text-[#FF5500]' : 'text-emerald-600'
                  }`}
                >
                  {splitRemaining > 0
                    ? `Rs. ${splitRemaining.toLocaleString('en-LK', { minimumFractionDigits: 0 })}`
                    : 'Covered ✓'}
                </span>
              </div>
            </div>

            {/* Quick Presets: 50/50 Split & Reset */}
            {total > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSplit5050}
                  className="flex-1 py-1 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-200 text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>50 / 50 Split</span>
                  <span className="text-zinc-500 font-normal">
                    (Rs. {(Math.round((total / 2) * 100) / 100).toLocaleString()})
                  </span>
                </button>
                {(splitCashStr || splitCardStr) && (
                  <button
                    type="button"
                    onClick={handleClearSplit}
                    className="py-1 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-black border border-zinc-200 text-[10px] font-bold transition-all cursor-pointer"
                    title="Clear split amounts"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            {/* Cash Amount Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="split-cash-input"
                  className="text-[10px] font-black text-zinc-600 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Banknote className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Cash Amount</span>
                </label>
                {total > 0 && splitRemaining > 0 && splitCardNum > 0 && (
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('cash')}
                    className="text-[9px] font-bold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    + Fill Rs. {splitRemaining.toLocaleString()}
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-zinc-400 select-none">
                  Rs.
                </span>
                <input
                  ref={splitCashInputRef}
                  id="split-cash-input"
                  type="number"
                  inputMode="decimal"
                  value={splitCashStr}
                  onChange={(e) => {
                    setSplitCashStr(e.target.value);
                    if (splitError) setSplitError('');
                  }}
                  onKeyDown={(e) => handleSplitKeyDown(e, 'cash')}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="0.00"
                  className="w-full h-9 pl-9 pr-8 rounded-xl border border-zinc-200 bg-white text-sm font-mono font-black text-black placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {splitCashStr && (
                  <button
                    type="button"
                    onClick={() => {
                      setSplitCashStr('');
                      if (splitError) setSplitError('');
                      splitCashInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-black transition-colors cursor-pointer"
                    title="Clear cash amount"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Card (POS) Amount Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="split-card-input"
                  className="text-[10px] font-black text-zinc-600 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Card (POS) Amount</span>
                </label>
                {total > 0 && splitRemaining > 0 && splitCashNum > 0 && (
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('card')}
                    className="text-[9px] font-bold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    + Fill Rs. {splitRemaining.toLocaleString()}
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-zinc-400 select-none">
                  Rs.
                </span>
                <input
                  ref={splitCardInputRef}
                  id="split-card-input"
                  type="number"
                  inputMode="decimal"
                  value={splitCardStr}
                  onChange={(e) => {
                    setSplitCardStr(e.target.value);
                    if (splitError) setSplitError('');
                  }}
                  onKeyDown={(e) => handleSplitKeyDown(e, 'card')}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="0.00"
                  className="w-full h-9 pl-9 pr-8 rounded-xl border border-zinc-200 bg-white text-sm font-mono font-black text-black placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {splitCardStr && (
                  <button
                    type="button"
                    onClick={() => {
                      setSplitCardStr('');
                      if (splitError) setSplitError('');
                      splitCardInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-black transition-colors cursor-pointer"
                    title="Clear card amount"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Split Error Message */}
            {splitError && (
              <div className="flex items-center gap-1.5 mt-1 text-rose-600 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span className="text-[10px] font-bold leading-tight">{splitError}</span>
              </div>
            )}
          </div>
        ) : (
          /* Card (POS) Status Card */
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-black text-black">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Card Swipe / Terminal Tap</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Customer terminal ready to process <strong className="text-black">Rs. {total.toLocaleString()}</strong>. Tap Complete Sale to authorize.
            </p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Checkout Action Area */}
      <div className="p-3 border-t border-zinc-200 bg-white flex-shrink-0 space-y-2">
        {/* Live Change Due (Positioned at bottom right above PAY/COMPLETE) */}
        {selectedMethod === 'cash' && (
          <div
            className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
              changeDue > 0
                ? 'bg-orange-50 border-[#FF5500]/30 shadow-xs'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-black block leading-tight">
                Change Due
              </span>
              <span className="text-[8px] text-zinc-400 font-medium">
                Return to Customer
              </span>
            </div>
            <span
              className={`text-sm font-mono font-black tabular-numbers ${
                changeDue > 0 ? 'text-[#FF5500]' : 'text-zinc-600'
              }`}
            >
              Rs. {changeDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {selectedMethod === 'other' && splitChangeDue > 0 && (
          <div className="p-2 rounded-xl border flex items-center justify-between transition-all bg-orange-50 border-[#FF5500]/30 shadow-xs">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-black block leading-tight">
                Change Due
              </span>
              <span className="text-[8px] text-zinc-400 font-medium">
                Return to Customer
              </span>
            </div>
            <span className="text-sm font-mono font-black tabular-numbers text-[#FF5500]">
              Rs. {splitChangeDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Large Primary PAY Button - Disabled until valid amount entered */}
        <button
          id="pos-pay-button"
          type="button"
          onClick={() => handleExecutePayment()}
          className={`w-full h-11 rounded-xl flex items-center justify-between px-4 font-black text-xs uppercase tracking-wider transition-all duration-150 shadow-xs select-none whitespace-nowrap ${
            canComplete
              ? 'bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white shadow-sm cursor-pointer'
              : 'bg-zinc-200 hover:bg-zinc-200 text-zinc-400 cursor-not-allowed'
          }`}
          title={
            canComplete
              ? 'Pay & Complete Sale'
              : selectedMethod === 'other'
              ? 'Enter cash and card amounts covering total to proceed'
              : 'Enter amount received to proceed'
          }
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-black tracking-wider">PAY</span>
          </div>
          <span className="font-mono tabular-numbers text-xs font-black shrink-0">
            Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </button>
      </div>
    </div>
  );
};
