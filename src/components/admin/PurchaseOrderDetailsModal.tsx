import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderItem, POPaymentBreakdown, POPaymentStatus } from '@/types';
import { usePurchaseOrders } from '@/stores/purchaseOrderStore';
import { useProducts } from '@/stores/productStore';
import { useToast } from '@/stores/toastStore';
import { Code39Barcode } from '@/components/pos/Code39Barcode';
import { formatDateYYYYMMDD } from '@/utils/dateValidator';
import {
  Package,
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  Banknote,
  CreditCard,
  FileText,
  RefreshCw,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Save,
  Check,
  Ban,
  ArrowRight,
  Percent,
} from 'lucide-react';

export interface PurchaseOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
  onPrintLabels?: (po: PurchaseOrder) => void;
}

export const PurchaseOrderDetailsModal: React.FC<PurchaseOrderDetailsModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onPrintLabels,
}) => {
  const { updatePurchaseOrder } = usePurchaseOrders();
  const { products } = useProducts();
  const { showToast } = useToast();

  // Editable fields state
  const [invoiceRef, setInvoiceRef] = useState<string>(purchaseOrder.invoiceRef || '');
  const [notes, setNotes] = useState<string>(purchaseOrder.notes || '');

  // Payment Breakdown State
  const initialBreakdown = purchaseOrder.paymentBreakdown || { cash: 0, card: 0, cheque: 0 };
  const [cashAmount, setCashAmount] = useState<string>(String(initialBreakdown.cash || 0));
  const [cardAmount, setCardAmount] = useState<string>(String(initialBreakdown.card || 0));
  const [chequeAmount, setChequeAmount] = useState<string>(String(initialBreakdown.cheque || 0));
  const [chequeNumber, setChequeNumber] = useState<string>(initialBreakdown.chequeNumber || '');
  const [chequeDueDate, setChequeDueDate] = useState<string>(initialBreakdown.chequeDueDate || '');
  const [unpaidDueDate, setUnpaidDueDate] = useState<string>(initialBreakdown.unpaidDueDate || '');

  // Cheque Lifecycle: 'PENDING' | 'CLEARED' | 'CANCELLED'
  const [chequeStatus, setChequeStatus] = useState<'PENDING' | 'CLEARED' | 'CANCELLED'>(
    initialBreakdown.chequeStatus || (initialBreakdown.cheque && initialBreakdown.cheque > 0 ? 'PENDING' : 'CLEARED')
  );

  // New replacement cheque details if cancelled
  const [newChequeNumber, setNewChequeNumber] = useState<string>('');
  const [newChequeDueDate, setNewChequeDueDate] = useState<string>('');
  const [isReplacementApplied, setIsReplacementApplied] = useState<boolean>(false);

  // Line Items (Strictly Read-Only as received in GRN)
  const items = purchaseOrder.items || [];

  // Keep state synced if purchaseOrder prop changes
  useEffect(() => {
    setInvoiceRef(purchaseOrder.invoiceRef || '');
    setNotes(purchaseOrder.notes || '');
    const pb = purchaseOrder.paymentBreakdown || { cash: 0, card: 0, cheque: 0 };
    setCashAmount(String(pb.cash || 0));
    setCardAmount(String(pb.card || 0));
    setChequeAmount(String(pb.cheque || 0));
    setChequeNumber(pb.chequeNumber || '');
    setChequeDueDate(pb.chequeDueDate || '');
    setUnpaidDueDate(pb.unpaidDueDate || '');
    setChequeStatus(
      pb.chequeStatus || (pb.cheque && pb.cheque > 0 ? 'PENDING' : 'CLEARED')
    );
    setNewChequeNumber('');
    setNewChequeDueDate('');
    setIsReplacementApplied(false);
  }, [purchaseOrder]);

  // Financial Calculations
  const totalInvoiced = useMemo(() => {
    return purchaseOrder.totalInvoiced || items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
  }, [purchaseOrder.totalInvoiced, items]);

  const numCash = parseFloat(cashAmount) || 0;
  const numCard = parseFloat(cardAmount) || 0;
  const numCheque = parseFloat(chequeAmount) || 0;

  // If cheque is cancelled and not yet replaced, cheque payment is not counted towards settled
  const effectiveCheque = chequeStatus === 'CANCELLED' && !isReplacementApplied ? 0 : numCheque;
  const totalPaid = numCash + numCard + effectiveCheque;
  const balanceDue = Math.max(0, totalInvoiced - totalPaid);

  // Derive Payment Status
  const computedPaymentStatus = useMemo((): POPaymentStatus => {
    if (balanceDue <= 0) {
      if (effectiveCheque > 0 && chequeStatus === 'PENDING') {
        return 'CHEQUE PENDING';
      }
      return 'PAID';
    }
    if (totalPaid > 0) {
      return 'PARTIAL';
    }
    return 'CREDIT';
  }, [balanceDue, totalPaid, effectiveCheque, chequeStatus]);

  // Autofill full payment
  const handleAutofillPayment = (type: 'cash' | 'card' | 'cheque') => {
    const remaining = Math.max(
      0,
      totalInvoiced -
        ((type === 'cash' ? 0 : numCash) +
          (type === 'card' ? 0 : numCard) +
          (type === 'cheque' ? 0 : effectiveCheque))
    );

    if (type === 'cash') setCashAmount(String(remaining));
    if (type === 'card') setCardAmount(String(remaining));
    if (type === 'cheque') {
      setChequeAmount(String(remaining));
      if (!chequeNumber) {
        setChequeNumber(`CHQ-${Math.floor(10000 + Math.random() * 90000)}`);
      }
      if (!chequeDueDate) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setChequeDueDate(`${d.getFullYear()} / ${String(d.getMonth() + 1).padStart(2, '0')} / ${String(d.getDate()).padStart(2, '0')}`);
      }
      setChequeStatus('PENDING');
    }
  };

  // Quick Settle Actions for Unpaid / Credit
  const handleSettleFullCash = () => {
    setCashAmount(String(numCash + balanceDue));
    showToast(`Settled remaining Rs. ${balanceDue.toLocaleString()} via Cash`, 'success');
  };

  const handleSettleFullCard = () => {
    setCardAmount(String(numCard + balanceDue));
    showToast(`Settled remaining Rs. ${balanceDue.toLocaleString()} via Bank Transfer`, 'success');
  };

  const handleSettleFullCheque = () => {
    setChequeAmount(String(numCheque + balanceDue));
    if (!chequeNumber) {
      setChequeNumber(`CHQ-${Math.floor(10000 + Math.random() * 90000)}`);
    }
    setChequeStatus('PENDING');
    showToast(`Issued cheque for remaining Rs. ${balanceDue.toLocaleString()}`, 'info');
  };

  // Handle Cheque Cancellation & Issuing New Replacement Cheque
  const handleApplyReplacementCheque = () => {
    if (!newChequeNumber.trim()) {
      showToast('Please enter the new replacement cheque number', 'error');
      return;
    }

    const prevNum = chequeNumber;
    setChequeNumber(newChequeNumber.trim());
    if (newChequeDueDate.trim()) {
      setChequeDueDate(newChequeDueDate.trim());
    }
    setChequeStatus('PENDING');
    setIsReplacementApplied(true);

    const auditText = `\n[Cheque Replaced]: Old Cheque #${prevNum || 'N/A'} was cancelled on ${new Date().toLocaleDateString('en-LK')}. Replaced with New Cheque #${newChequeNumber.trim()}${newChequeDueDate ? ` (Due: ${newChequeDueDate})` : ''}.`;
    setNotes((prev) => (prev ? prev + auditText : auditText.trim()));

    showToast(`Cheque ${prevNum} marked cancelled. New Cheque ${newChequeNumber} registered!`, 'success');
  };

  // Mark Cheque as Cleared / Cashed
  const handleClearCheque = () => {
    setChequeStatus('CLEARED');
    showToast(`Cheque ${chequeNumber || ''} marked as Cleared / Cashed!`, 'success');
  };

  // Save All Changes
  const handleSave = () => {
    const updatedBreakdown: POPaymentBreakdown = {
      cash: numCash,
      card: numCard,
      cheque: effectiveCheque,
      chequeNumber: chequeNumber.trim() || undefined,
      chequeDueDate: chequeDueDate.trim() || undefined,
      chequeStatus,
      previousChequeNumber: isReplacementApplied ? purchaseOrder.paymentBreakdown?.chequeNumber : undefined,
      unpaidDueDate: balanceDue > 0 ? unpaidDueDate.trim() || undefined : undefined,
    };

    updatePurchaseOrder(purchaseOrder.id, {
      invoiceRef: invoiceRef.trim() || purchaseOrder.invoiceRef,
      items,
      totalInvoiced,
      totalPaid,
      balanceDue,
      paymentStatus: computedPaymentStatus,
      paymentBreakdown: updatedBreakdown,
      notes: notes.trim(),
    });

    showToast(`Purchase Order ${purchaseOrder.poNumber} updated successfully!`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-hidden select-none">
      <div className="bg-white text-stone-900 rounded-[24px] sm:rounded-[28px] w-full max-w-[1520px] 2xl:max-w-[1620px] h-[92vh] max-h-[760px] flex flex-col justify-between p-3.5 sm:p-4 md:p-5 shadow-2xl border border-stone-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* ========================================================================= */}
        {/* MODAL TOP HEADER BAR                                                      */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-1 pb-2.5 sm:pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight truncate flex items-center gap-2">
              <span>Purchase Order: {purchaseOrder.poNumber}</span>
            </h2>
            <span className="hidden sm:inline-flex bg-stone-100 text-stone-600 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-stone-200 font-bold tracking-wide shrink-0">
              GRN Settlement &amp; Edit Studio
            </span>

            {/* Live Status Badge */}
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                computedPaymentStatus === 'PAID'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : computedPaymentStatus === 'CHEQUE PENDING'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : computedPaymentStatus === 'CREDIT'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-purple-50 text-purple-700 border-purple-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  computedPaymentStatus === 'PAID'
                    ? 'bg-emerald-500'
                    : computedPaymentStatus === 'CHEQUE PENDING'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span>{computedPaymentStatus}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onPrintLabels && (
              <button
                type="button"
                onClick={() => onPrintLabels(purchaseOrder)}
                className="px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold border border-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                title="Print Barcode Labels for this PO"
              >
                <Printer className="w-3.5 h-3.5 text-[#00b4b6]" />
                <span className="hidden sm:inline">Print Barcodes</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold border border-stone-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1 rounded-full bg-[#00b4b6] hover:bg-[#009ca0] text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Update PO</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between flex-1 min-h-0 overflow-hidden text-stone-900 pt-2">
          {/* Row 1: Header metadata bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pb-2 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-6 h-6 rounded-md bg-[#FAF0E6] flex items-center justify-center text-[#9E6240] shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9E6240] whitespace-nowrap">
                Received Line Items ({items.length})
              </span>
            </div>

            {/* Right Meta Info */}
            <div className="flex items-center flex-wrap gap-4 text-xs font-semibold text-stone-700">
              {/* Vendor */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-stone-400">
                  Vendor:
                </span>
                <span className="font-bold text-stone-900">{purchaseOrder.supplierName}</span>
              </div>

              {/* Bill Ref # (Editable, Clean with no background or box border) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-stone-400">
                  Bill Ref #:
                </span>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="INV-..."
                  title="Edit Invoice / Bill Reference"
                  className="font-mono font-bold text-stone-900 text-[11px] bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none px-1 py-0 w-24 transition-colors"
                />
              </div>

              {/* Date & Time */}
              <div className="hidden md:flex items-center gap-1.5 text-stone-500 text-[11px]">
                <span>{purchaseOrder.date} &bull; {purchaseOrder.time}</span>
              </div>

              {/* Verified By */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-stone-400">
                  Verified:
                </span>
                <span className="text-teal-700 font-bold text-[11px]">{purchaseOrder.verifiedBy}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Payment Settlement Bar (Interactive Settlement Controls) */}
          <div className="flex flex-col gap-2 py-2 border-b border-stone-100 shrink-0 text-stone-900">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              {/* Left Group: Cash, Card, Cheque */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {/* Cash */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-[11px] shrink-0">
                    <Banknote className="w-3.5 h-3.5" />
                    <span className="text-stone-800 font-bold text-[11px]">Cash</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutofillPayment('cash')}
                    className="text-[9px] font-bold text-[#00b4b6] hover:bg-[#00b4b6]/10 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    Full
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-18 sm:w-20 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none text-right font-mono font-bold text-[11px] text-stone-800 py-0.5 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                  />
                </div>

                {/* Card / Bank */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-teal-600 font-bold text-[11px] shrink-0">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-stone-800 font-bold text-[11px]">Card/Bank</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutofillPayment('card')}
                    className="text-[9px] font-bold text-[#00b4b6] hover:bg-[#00b4b6]/10 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    Full
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    className="w-18 sm:w-20 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none text-right font-mono font-bold text-[11px] text-stone-800 py-0.5 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                  />
                </div>

                {/* Cheque */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-amber-600 font-bold text-[11px] shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-stone-800 font-bold text-[11px]">Cheque</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutofillPayment('cheque')}
                    className="text-[9px] font-bold text-[#00b4b6] hover:bg-[#00b4b6]/10 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    Full
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={chequeAmount}
                    onChange={(e) => setChequeAmount(e.target.value)}
                    className="w-18 sm:w-20 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none text-right font-mono font-bold text-[11px] text-stone-800 py-0.5 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                  />
                </div>

                {/* Cheque Details & Controls (if Cheque Amount > 0) */}
                {numCheque > 0 && (
                  <div className="flex items-center gap-2 pl-1 border-l border-stone-200">
                    <input
                      type="text"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="Cheque #"
                      className="w-24 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none font-mono text-[10.5px] font-bold text-stone-800 py-0.5 px-1 transition-colors"
                    />
                    <input
                      type="text"
                      value={chequeDueDate}
                      onChange={(e) => setChequeDueDate(formatDateYYYYMMDD(e.target.value, chequeDueDate))}
                      placeholder="Due YYYY/MM/DD"
                      className="w-24 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none font-mono text-[10.5px] text-stone-800 text-center py-0.5 px-1 transition-colors"
                    />

                    {/* Cheque Status Selector */}
                    <div className="flex items-center gap-1 bg-transparent p-0.5 rounded-lg border border-stone-200 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setChequeStatus('PENDING')}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          chequeStatus === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'text-stone-500 hover:text-stone-900'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCheque}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          chequeStatus === 'CLEARED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'text-stone-500 hover:text-stone-900'
                        }`}
                        title="Mark cheque as cleared / paid"
                      >
                        Cleared
                      </button>
                      <button
                        type="button"
                        onClick={() => setChequeStatus('CANCELLED')}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          chequeStatus === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'text-stone-500 hover:text-stone-900'
                        }`}
                        title="Mark cheque as cancelled / bounced"
                      >
                        Cancelled
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Totals and Balance */}
              <div className="flex items-center flex-wrap gap-4 text-xs">
                {balanceDue > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-rose-600 text-[11px]">
                      UNPAID: Rs. {balanceDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                    <input
                      type="text"
                      value={unpaidDueDate}
                      onChange={(e) => setUnpaidDueDate(formatDateYYYYMMDD(e.target.value, unpaidDueDate))}
                      placeholder="Due YYYY/MM/DD"
                      className="w-24 bg-transparent border-0 border-b border-rose-300 focus:border-rose-500 focus:outline-none rounded-none font-mono text-[10.5px] text-rose-700 text-center py-0.5 px-1 transition-colors"
                    />
                  </div>
                ) : (
                  <span className="text-emerald-700 font-extrabold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>FULLY SETTLED</span>
                  </span>
                )}

                <div className="text-[11px] text-stone-500">
                  Paid: <strong className="text-teal-600 font-mono">Rs. {totalPaid.toLocaleString()}</strong>
                </div>

                <div className="text-[11px] text-stone-500">
                  Invoiced: <strong className="text-stone-900 font-mono">Rs. {totalInvoiced.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Quick Settle Banner if Unpaid Balance Exists */}
            {balanceDue > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60 text-[10.5px]">
                <span className="text-stone-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Outstanding credit balance of <strong>Rs. {balanceDue.toLocaleString()}</strong>. Settle now:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSettleFullCash}
                    className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
                  >
                    + Pay Cash (Rs. {balanceDue.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={handleSettleFullCard}
                    className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-300 text-teal-700 hover:bg-teal-100 font-bold transition-colors cursor-pointer"
                  >
                    + Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={handleSettleFullCheque}
                    className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 font-bold transition-colors cursor-pointer"
                  >
                    + Issue Cheque
                  </button>
                </div>
              </div>
            )}

            {/* CANCELLED CHEQUE REPLACEMENT SUB-PANEL */}
            {chequeStatus === 'CANCELLED' && (
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 text-xs text-stone-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold text-rose-800 block leading-tight">
                      Cheque #{chequeNumber || 'N/A'} is Cancelled / Bounced
                    </span>
                    <span className="text-[10px] text-stone-500 block leading-tight">
                      Enter the new replacement cheque number or switch to cash/bank payment above.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChequeNumber}
                    onChange={(e) => setNewChequeNumber(e.target.value)}
                    placeholder="New Cheque # (e.g. CHQ-99102)"
                    className="bg-transparent px-2 py-0.5 border-0 border-b border-rose-400 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-[#00b4b6] rounded-none"
                  />
                  <input
                    type="text"
                    value={newChequeDueDate}
                    onChange={(e) => setNewChequeDueDate(formatDateYYYYMMDD(e.target.value, newChequeDueDate))}
                    placeholder="New Due Date YYYY/MM/DD"
                    className="bg-transparent px-2 py-0.5 border-0 border-b border-rose-400 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#00b4b6] rounded-none w-32 text-center"
                  />
                  <button
                    type="button"
                    onClick={handleApplyReplacementCheque}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Replacement Cheque</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Received Line Items Table (Read-Only Display with Profit Margin) */}
          <div className="flex-1 min-h-0 overflow-y-auto py-1">
            <table className="table-auto w-full text-left border-collapse text-stone-800 text-[11px]">
              <thead className="sticky top-0 bg-[#FAF7F2] text-[9.5px] font-extrabold uppercase tracking-wider text-stone-400 border-b border-stone-200/80 z-10">
                <tr>
                  <th className="py-1.5 px-2 w-[40px] text-center">#</th>
                  <th className="py-1.5 px-2">Item Name</th>
                  <th className="py-1.5 px-2">Batch / Lot #</th>
                  <th className="py-1.5 px-2 text-center">Expiry (YYYY/MM/DD)</th>
                  <th className="py-1.5 px-2 text-right">Cost (Rs.)</th>
                  <th className="py-1.5 px-2 text-center w-[85px]">
                    <div className="inline-flex items-center justify-center gap-0.5">
                      <span>Margin</span>
                      <Percent className="w-2.5 h-2.5 text-stone-400 stroke-[2.5]" />
                    </div>
                  </th>
                  <th className="py-1.5 px-2 text-right">Sell (Rs.)</th>
                  <th className="py-1.5 px-2 text-center w-[65px]">Qty</th>
                  <th className="py-1.5 px-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {items.map((it, idx) => {
                  const cost = typeof it.costPrice === 'number' ? it.costPrice : parseFloat(String(it.costPrice)) || 0;
                  const sell = typeof it.sellingPrice === 'number' ? it.sellingPrice : parseFloat(String(it.sellingPrice)) || 0;
                  const margin = cost > 0 && sell > 0 ? Math.round((((sell - cost) / cost) * 100) * 10) / 10 : 0;
                  return (
                    <tr key={it.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-2.5 px-2 text-center text-stone-400 font-mono text-[10px]">
                        #{idx + 1}
                      </td>

                      {/* Product Name (Strict Single Line) */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 leading-none">
                          <span className="font-bold text-stone-900 text-[11px] truncate max-w-[220px]" title={it.productName}>
                            {it.productName}
                          </span>
                          {it.weight && (
                            <span className="text-[9.5px] text-stone-400 font-normal font-mono shrink-0">
                              ({it.weight})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Batch / Lot # (Read-Only) */}
                      <td className="py-2.5 px-2 font-mono font-bold text-stone-800 text-[11px] select-all">
                        {it.batchNumber || '-'}
                      </td>

                      {/* Expiry Date (Read-Only) */}
                      <td className="py-2.5 px-2 text-center font-mono text-stone-700 text-[11px]">
                        {it.expiryDate || '-'}
                      </td>

                      {/* Cost Price (Read-Only) */}
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-stone-900 text-[11px]">
                        {cost.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Margin % (Read-Only, Clean with no background or border) */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-[11px]">
                        <span className={margin > 0 ? 'text-emerald-600 font-extrabold' : margin < 0 ? 'text-rose-600 font-extrabold' : 'text-stone-500'}>
                          {margin > 0 ? `+${margin}%` : `${margin}%`}
                        </span>
                      </td>

                      {/* Selling Price (Read-Only) */}
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-orange-600 text-[11px]">
                        {sell.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Quantity (Read-Only) */}
                      <td className="py-2.5 px-2 text-center font-mono font-black text-stone-900 text-[11px]">
                        {it.quantity}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        Rs. {it.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Row 4: Bottom Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2 border-t border-stone-100 shrink-0 text-stone-900">
            {/* Left: Notes Field */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[240px] max-w-[500px]">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-stone-400 whitespace-nowrap">
                PO Notes:
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter receiving, payment, or cheque notes..."
                className="w-full text-xs text-stone-700 border-0 border-b border-stone-200 focus:border-[#00b4b6] focus:outline-none py-0.5 px-1 bg-transparent rounded-none transition-colors"
              />
            </div>

            {/* Right: Totals Summary */}
            <div className="flex items-center gap-3.5 shrink-0 text-[11px]">
              <span className="text-stone-500">
                Total Units: <strong className="text-stone-900">{items.reduce((s, i) => s + (typeof i.quantity === 'number' ? i.quantity : 0), 0)} units</strong>
              </span>
              <span className="font-mono font-bold text-stone-700">
                Total Invoiced: <strong className="text-[#00b4b6] text-xs">Rs. {totalInvoiced.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
