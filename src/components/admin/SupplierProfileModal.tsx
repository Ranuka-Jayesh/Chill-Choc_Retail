import React, { useState, useMemo } from 'react';
import { Supplier, PurchaseOrder, SupplierReturn, Product } from '@/types';
import { usePurchaseOrders } from '@/stores/purchaseOrderStore';
import { useSupplierReturns } from '@/stores/supplierReturnsStore';
import { useProducts } from '@/stores/productStore';
import { useToast } from '@/stores/toastStore';
import { MonthYearPicker } from '@/components/common/MonthYearPicker';
import {
  Building2,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  FileText,
  CreditCard,
  Banknote,
  Plus,
  Package,
  X,
  Tag,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Undo2,
  Search,
} from 'lucide-react';

interface SupplierProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  onOpenNewGRN?: (supplierId: string) => void;
  onViewPO?: (po: PurchaseOrder) => void;
}

export const SupplierProfileModal: React.FC<SupplierProfileModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onOpenNewGRN,
  onViewPO,
}) => {
  const { purchaseOrders } = usePurchaseOrders();
  const { supplierReturns, createSupplierReturn, updateClaimStatus } = useSupplierReturns();
  const { products } = useProducts();
  const { showToast } = useToast();

  // Active view tab inside profile
  const [activeTab, setActiveTab] = useState<'invoices' | 'returns' | 'products'>('invoices');

  // Month filtering state (defaults to September 2026)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(2026, 8, 8));
  const [filterByMonth, setFilterByMonth] = useState<boolean>(true);

  // Search filter inside active tab
  const [tabSearchQuery, setTabSearchQuery] = useState<string>('');

  // Inline "Record New Return to Supplier" form state
  const [isAddingReturn, setIsAddingReturn] = useState<boolean>(false);
  const [returnProductId, setReturnProductId] = useState<string>('');
  const [returnBatchNumber, setReturnBatchNumber] = useState<string>('');
  const [returnQuantity, setReturnQuantity] = useState<string>('1');
  const [returnUnitCost, setReturnUnitCost] = useState<string>('');
  const [returnReason, setReturnReason] = useState<SupplierReturn['reason']>('Quality Issue');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [returnCustomerInvoice, setReturnCustomerInvoice] = useState<string>('');

  // 1. Supplied Products for this vendor
  const supplierProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.supplierId === supplier.id) return true;
      if (supplier.suppliedProductIds?.includes(p.id)) return true;
      if (p.batches?.some((b) => b.supplierId === supplier.id)) return true;
      return false;
    });
  }, [products, supplier]);

  // Helper date parser
  const parseDateStr = (dateStr: string) => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const cleaned = dateStr.trim();
    const parts = cleaned.replace(/,/g, '').split(/[\s-]+/);
    if (parts.length >= 3) {
      let m = -1;
      let d = 1;
      let y = 2026;
      for (const part of parts) {
        const lower = part.toLowerCase();
        if (months[lower] !== undefined) m = months[lower];
        else if (/^\d{4}$/.test(part)) y = parseInt(part, 10);
        else if (/^\d{1,2}$/.test(part)) d = parseInt(part, 10);
      }
      if (m !== -1) return { year: y, month: m, day: d };
    }
    return null;
  };

  // 2. All Invoices for this supplier
  const allSupplierPOs = useMemo(() => {
    return purchaseOrders.filter(
      (po) => po.supplierId === supplier.id || po.supplierName.toLowerCase() === supplier.name.toLowerCase()
    );
  }, [purchaseOrders, supplier]);

  // Filtered Invoices (with month filter & search)
  const filteredPOs = useMemo(() => {
    return allSupplierPOs.filter((po) => {
      // Month filter logic: show if in selected month OR if unpaid/cheque pending carried over
      if (filterByMonth) {
        const d = parseDateStr(po.date);
        if (d) {
          const isSameMonth = d.year === selectedMonth.getFullYear() && d.month === selectedMonth.getMonth();
          const isEarlier =
            d.year < selectedMonth.getFullYear() ||
            (d.year === selectedMonth.getFullYear() && d.month < selectedMonth.getMonth());
          const isPendingRollover =
            isEarlier && (po.paymentStatus !== 'PAID' || (po.balanceDue && po.balanceDue > 0));

          if (!isSameMonth && !isPendingRollover) return false;
        }
      }

      if (tabSearchQuery.trim()) {
        const q = tabSearchQuery.trim().toLowerCase();
        const matchesPO = po.poNumber.toLowerCase().includes(q);
        const matchesInv = po.invoiceRef.toLowerCase().includes(q);
        const matchesItem = po.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesPO && !matchesInv && !matchesItem) return false;
      }

      return true;
    });
  }, [allSupplierPOs, filterByMonth, selectedMonth, tabSearchQuery]);

  // 3. All Returns to Supplier
  const allSupplierReturns = useMemo(() => {
    return supplierReturns.filter(
      (r) => r.supplierId === supplier.id || r.supplierName.toLowerCase() === supplier.name.toLowerCase()
    );
  }, [supplierReturns, supplier]);

  // Filtered Returns by month and search
  const filteredReturns = useMemo(() => {
    return allSupplierReturns.filter((r) => {
      if (filterByMonth) {
        const d = parseDateStr(r.timestamp);
        if (d) {
          const isSameMonth = d.year === selectedMonth.getFullYear() && d.month === selectedMonth.getMonth();
          if (!isSameMonth) return false;
        }
      }

      if (tabSearchQuery.trim()) {
        const q = tabSearchQuery.trim().toLowerCase();
        const matchesCode = r.returnCode.toLowerCase().includes(q);
        const matchesProd = r.productName.toLowerCase().includes(q);
        const matchesBatch = r.batchNumber.toLowerCase().includes(q);
        const matchesReason = r.reason.toLowerCase().includes(q);
        if (!matchesCode && !matchesProd && !matchesBatch && !matchesReason) return false;
      }

      return true;
    });
  }, [allSupplierReturns, filterByMonth, selectedMonth, tabSearchQuery]);

  // 4. Frequent Return / Quality Warning Logic
  // Check if returns for this supplier in the current/selected month are >= 2 or 3, or if any single batch has >= 2 returns
  const returnStatsForWarning = useMemo(() => {
    const returnsInMonth = allSupplierReturns.filter((r) => {
      const d = parseDateStr(r.timestamp);
      if (!d) return true;
      return d.year === selectedMonth.getFullYear() && d.month === selectedMonth.getMonth();
    });

    const batchOccurrences: Record<string, { count: number; productName: string; totalQty: number }> = {};
    returnsInMonth.forEach((r) => {
      const bKey = r.batchNumber || 'Unknown';
      if (!batchOccurrences[bKey]) {
        batchOccurrences[bKey] = { count: 0, productName: r.productName, totalQty: 0 };
      }
      batchOccurrences[bKey].count += 1;
      batchOccurrences[bKey].totalQty += r.quantity;
    });

    const repeatBatches = Object.entries(batchOccurrences).filter(([batch, data]) => batch !== 'Unknown' && data.count >= 2);
    const hasWarning = returnsInMonth.length >= 2 || repeatBatches.length > 0;

    return {
      returnsInMonthCount: returnsInMonth.length,
      repeatBatches,
      hasWarning,
    };
  }, [allSupplierReturns, selectedMonth]);

  // 5. Financial Overview Calculations
  const financialSummary = useMemo(() => {
    const posToCalculate = filterByMonth ? filteredPOs : allSupplierPOs;

    let totalInvoiced = 0;
    let totalPaid = 0;
    let balanceDue = 0;
    let chequePendingAmount = 0;

    posToCalculate.forEach((po) => {
      totalInvoiced += po.totalInvoiced || 0;
      totalPaid += po.totalPaid || 0;
      balanceDue += po.balanceDue || 0;
      if (po.paymentBreakdown?.cheque && po.paymentBreakdown.chequeStatus === 'PENDING') {
        chequePendingAmount += po.paymentBreakdown.cheque;
      }
    });

    const totalDebitNotes = allSupplierReturns.reduce((sum, r) => sum + (r.totalDebitAmount || 0), 0);

    return {
      totalInvoiced,
      totalPaid,
      balanceDue,
      chequePendingAmount,
      totalDebitNotes,
    };
  }, [filterByMonth, filteredPOs, allSupplierPOs, allSupplierReturns]);

  // Handle New Return Submission
  const handleCreateReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnProductId) {
      showToast('Please select a product to return', 'error');
      return;
    }

    const prod = products.find((p) => p.id === returnProductId);
    const qty = parseInt(returnQuantity, 10) || 1;
    const unitCost = parseFloat(returnUnitCost) || prod?.costPrice || Math.round((prod?.price || 500) * 0.78);
    const totalDebit = unitCost * qty;

    createSupplierReturn({
      supplierId: supplier.id,
      supplierName: supplier.name,
      customerInvoiceNumber: returnCustomerInvoice.trim() || `GRN-REF-${Math.floor(1000 + Math.random() * 9000)}`,
      productId: prod?.id || 'prod-custom',
      productName: prod?.name || 'Custom Item',
      quantity: qty,
      unitCost,
      totalDebitAmount: totalDebit,
      batchNumber: returnBatchNumber.trim() || 'LOT-GENERAL',
      reason: returnReason,
      claimStatus: 'Pending Dispatch',
      notes: returnNotes.trim() || 'Recorded from Supplier Profile return manager',
    });

    showToast(`Debit note created for ${supplier.name}`, 'success');
    setIsAddingReturn(false);
    setReturnNotes('');
    setReturnBatchNumber('');
    setReturnQuantity('1');
    setReturnUnitCost('');
    setReturnCustomerInvoice('');
    setActiveTab('returns');
  };

  if (!isOpen) return null;

  const monthLabel = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[92vh] max-h-[900px] rounded-3xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden text-stone-800">
        {/* ========================================================================= */}
        {/* TOP HEADER: SUPPLIER OVERVIEW & ACTIONS                                   */}
        {/* ========================================================================= */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-stone-50 via-stone-50/80 to-white border-b border-stone-200/80 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Supplier Identity */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight leading-tight">
                    {supplier.name}
                  </h2>
                  {supplier.brand && (
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-[10.5px] font-bold">
                      Brand: {supplier.brand}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-zinc-400 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/60 font-semibold">
                    {supplier.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border ${
                      supplier.status === 'Active'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        supplier.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                    />
                    <span>{supplier.status}</span>
                  </span>
                </div>

                {/* Subtitle / Metadata Badges: Since, Contact, Phone */}
                <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-500 flex-wrap">
                  <div className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50/60 px-1.5 py-0.2 rounded border border-amber-200/60">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    <span>Partner Since: <strong>{supplier.since || 'Jan 2024'}</strong></span>
                  </div>

                  <div className="flex items-center gap-1 text-stone-600">
                    <span className="font-medium text-stone-800">Contact: {supplier.contactPerson || 'Sales Team'}</span>
                    {supplier.rating && (
                      <span className="text-amber-600 font-bold ml-1">★ {supplier.rating}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-stone-600">
                    <Phone className="w-3 h-3 text-stone-400" />
                    <span className="font-mono text-[10.5px]">{supplier.phone}</span>
                  </div>

                  {supplier.email && (
                    <div className="flex items-center gap-1 text-stone-600">
                      <Mail className="w-3 h-3 text-stone-400" />
                      <span className="text-[10.5px] truncate max-w-[200px]">{supplier.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Actions & Close */}
            <div className="flex items-center gap-2">
              {onOpenNewGRN && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewGRN(supplier.id);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New GRN</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsAddingReturn(true)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Record Return</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer ml-1"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FINANCIAL SUMMARY CARDS & MONTH PICKER CONTROLS                           */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 bg-[#FAF7F2] border-b border-stone-200/80 shrink-0 space-y-2.5">
          {/* Controls Bar: Month Picker & Filter Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                Financial Statement:
              </span>
              <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl border border-stone-300/60">
                <button
                  type="button"
                  onClick={() => setFilterByMonth(true)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterByMonth
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Monthly View
                </button>
                <button
                  type="button"
                  onClick={() => setFilterByMonth(false)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !filterByMonth
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  All History
                </button>
              </div>
            </div>

            {/* Month Picker when in Monthly View */}
            {filterByMonth && (
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-zinc-400 font-medium">Viewing Month:</span>
                <MonthYearPicker
                  selectedDate={selectedMonth}
                  onChange={(d) => setSelectedMonth(d)}
                />
              </div>
            )}
          </div>

          {/* 4 Sleek KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Invoiced */}
            <div className="p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                <span>Total Invoiced</span>
                <FileText className="w-3.5 h-3.5 text-stone-400" />
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-stone-900 mt-1">
                Rs. {financialSummary.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {filterByMonth ? `${filteredPOs.length} GRNs in ${monthLabel}` : `${allSupplierPOs.length} Total GRNs`}
              </div>
            </div>

            {/* Paid / Settled */}
            <div className="p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-between">
                <span>Paid / Settled</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-emerald-700 mt-1">
                Rs. {financialSummary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">
                Cleared via cash/card/bank
              </div>
            </div>

            {/* Cheques Pending Clearance */}
            <div className="p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center justify-between">
                <span>Cheque Pending</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-amber-700 mt-1">
                Rs. {financialSummary.chequePendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-amber-600/80 mt-0.5">
                Awaiting bank presentation
              </div>
            </div>

            {/* Outstanding Credit / Balance Due */}
            <div className="p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center justify-between">
                <span>Credit / Balance Due</span>
                <CreditCard className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-rose-700 mt-1">
                Rs. {financialSummary.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-rose-600/80 mt-0.5">
                Unpaid vendor credit balance
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* AUTOMATED FREQUENT BATCH RETURN / QUALITY WARNING BANNER                  */}
        {/* ========================================================================= */}
        {returnStatsForWarning.hasWarning && (
          <div className="px-5 py-2.5 bg-amber-50/90 border-b border-amber-300 flex items-start gap-3 shrink-0 animate-in fade-in slide-in-from-top-1">
            <div className="p-1 rounded-lg bg-amber-200/70 text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-2 flex-wrap">
                <span>⚠️ Supplier Quality Notice: {returnStatsForWarning.returnsInMonthCount} Batch Returns in {monthLabel}</span>
                {returnStatsForWarning.repeatBatches.map(([batch, data]) => (
                  <span
                    key={batch}
                    className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-mono text-[10px] font-bold inline-flex items-center"
                  >
                    Batch {batch} returned {data.count}x ({data.totalQty} units)
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                Multiple batch rejections recorded for this supplier. Repeat product faults or packaging damages detected.
                Please inspect delivered batches upon arrival and verify credit note issuance before approving subsequent payments.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RECORD NEW RETURN MODAL / INLINE DRAWER (IF OPEN)                         */}
        {/* ========================================================================= */}
        {isAddingReturn && (
          <div className="p-4 bg-rose-50/80 border-b border-rose-200 shrink-0 text-xs animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Record New Return to Supplier (Debit Note / Incident)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingReturn(false)}
                className="text-rose-500 hover:text-rose-800 cursor-pointer text-xs font-bold"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCreateReturnSubmit} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
              {/* Product */}
              <div className="sm:col-span-2 space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">Product *</label>
                <select
                  value={returnProductId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setReturnProductId(pId);
                    const sel = products.find((p) => p.id === pId);
                    if (sel) {
                      setReturnUnitCost(String(sel.costPrice || Math.round(sel.price * 0.78)));
                      if (sel.batches && sel.batches.length > 0) {
                        setReturnBatchNumber(sel.batches[0].batchNumber);
                      }
                    }
                  }}
                  required
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">-- Select Product --</option>
                  {(supplierProducts.length > 0 ? supplierProducts : products).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Number */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">Batch # *</label>
                <input
                  type="text"
                  value={returnBatchNumber}
                  onChange={(e) => setReturnBatchNumber(e.target.value)}
                  placeholder="e.g., LOT-NES-401"
                  required
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">Qty *</label>
                <input
                  type="number"
                  min="1"
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Unit Cost */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">Unit Cost (Rs.)</label>
                <input
                  type="number"
                  value={returnUnitCost}
                  onChange={(e) => setReturnUnitCost(e.target.value)}
                  placeholder="e.g., 360"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Reason */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Packaging Defect">Packaging Defect</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Expired">Expired</option>
                  <option value="Wrong Product">Wrong Product</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes / Incident Description ("what happened") */}
              <div className="sm:col-span-4 space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">
                  Incident Details ("What happened" to this batch)
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g., Crushed wafer bar inside sealed pack; rejected by auditor"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Customer/Invoice Ref */}
              <div className="sm:col-span-1 space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">Invoice Ref</label>
                <input
                  type="text"
                  value={returnCustomerInvoice}
                  onChange={(e) => setReturnCustomerInvoice(e.target.value)}
                  placeholder="e.g. INV-1040"
                  className="w-full px-2 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Save Debit
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB BAR & SUB-SEARCH FILTER                                               */}
        {/* ========================================================================= */}
        <div className="px-5 py-2.5 bg-white border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Segmented Sub-Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'invoices'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/70'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'invoices' ? 'text-[#FF5500]' : 'text-stone-400'}`} />
              <span>Invoices &amp; GRNs</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold inline-flex items-center justify-center ${
                activeTab === 'invoices' ? 'bg-stone-100 text-stone-700' : 'text-stone-400'
              }`}>
                {filteredPOs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('returns')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'returns'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/70'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Undo2 className={`w-3.5 h-3.5 ${activeTab === 'returns' ? 'text-rose-600' : 'text-stone-400'}`} />
              <span>Returns &amp; Debit Notes</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold inline-flex items-center justify-center ${
                activeTab === 'returns' ? 'bg-rose-50 text-rose-700' : 'text-stone-400'
              }`}>
                {filteredReturns.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/70'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Package className={`w-3.5 h-3.5 ${activeTab === 'products' ? 'text-[#FF5500]' : 'text-stone-400'}`} />
              <span>Supplied SKUs</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold inline-flex items-center justify-center ${
                activeTab === 'products' ? 'bg-stone-100 text-stone-700' : 'text-stone-400'
              }`}>
                {supplierProducts.length}
              </span>
            </button>
          </div>

          {/* Quick Search in Tab */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={tabSearchQuery}
              onChange={(e) => setTabSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-8 pr-3 py-1 bg-stone-50 focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#FF5500] transition-colors"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENTS: INVOICES / RETURNS / PRODUCTS                               */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 w-full bg-white">
          {/* TAB 1: INVOICES & GRNS */}
          {activeTab === 'invoices' && (
            <table className="w-full border-collapse text-left min-w-[800px] text-xs">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                <tr className="border-b border-stone-200/70 shadow-2xs">
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Purchase / Invoice
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Date &amp; Time
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Items Inward
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Total Invoiced
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Paid / Balance Due
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Payment Status
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPOs.length > 0 ? (
                  filteredPOs.map((po) => {
                    const isRolledOver =
                      po.isRolledOver ||
                      po.paymentStatus === 'CREDIT' ||
                      po.paymentStatus === 'CHEQUE PENDING';

                    return (
                      <tr
                        key={po.id}
                        onClick={() => onViewPO?.(po)}
                        className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                      >
                        {/* 1. PO / Invoice */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-stone-900 font-mono text-[11.5px]">
                            {po.poNumber}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {po.invoiceRef}
                          </div>
                        </td>

                        {/* 2. Date */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-stone-700">{po.date}</span>
                            {isRolledOver && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-mono inline-flex items-center justify-center leading-normal">
                                Pending
                              </span>
                            )}
                          </div>
                          <div className="text-[9.5px] text-zinc-400 font-mono">{po.time}</div>
                        </td>

                        {/* 3. Items */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200 leading-normal">
                            {po.items.length} Items
                          </span>
                          <div className="text-[9.5px] text-zinc-400 truncate max-w-[180px] mt-0.5">
                            {po.items.map((i) => i.productName).join(', ')}
                          </div>
                        </td>

                        {/* 4. Total Invoiced */}
                        <td className="py-2 px-3.5 whitespace-nowrap font-mono font-bold text-stone-900">
                          Rs. {po.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 5. Paid / Balance */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="font-mono text-[11px] font-semibold text-emerald-700">
                            Paid: Rs. {po.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {po.balanceDue > 0 ? (
                            <div className="font-mono text-[10.5px] font-bold text-rose-600">
                              Due: Rs. {po.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          ) : (
                            <div className="text-[9px] text-emerald-600 font-bold uppercase">Fully Settled</div>
                          )}
                        </td>

                        {/* 6. Payment Status */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          {po.paymentStatus === 'PAID' && (
                            <span className="border border-emerald-300 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Paid</span>
                            </span>
                          )}
                          {po.paymentStatus === 'CHEQUE PENDING' && (
                            <span className="border border-amber-300 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Cheque Pending</span>
                            </span>
                          )}
                          {po.paymentStatus === 'CREDIT' && (
                            <span className="border border-rose-300 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5 text-rose-600" />
                              <span>Credit</span>
                            </span>
                          )}
                          {po.paymentStatus === 'PARTIAL' && (
                            <span className="border border-orange-300 bg-orange-50 text-orange-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-flex items-center gap-1">
                              <span>Partial</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Action */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewPO?.(po);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[10.5px] transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-zinc-600">No Invoices found</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {filterByMonth
                          ? `No Purchase Orders recorded for ${monthLabel}. Try toggling "All History".`
                          : 'Receive your first goods inward delivery from this vendor.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: RETURNS & DEBIT NOTES ("WHAT HAPPENED") */}
          {activeTab === 'returns' && (
            <table className="w-full border-collapse text-left min-w-[850px] text-xs">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                <tr className="border-b border-stone-200/70 shadow-2xs">
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Debit Note / Date
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Product &amp; Batch
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center">
                    Returned Qty
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Debit Amount
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Reason
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Incident Notes ("What Happened")
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Claim Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredReturns.length > 0 ? (
                  filteredReturns.map((r) => {
                    const isRepeatBatch =
                      allSupplierReturns.filter((other) => other.batchNumber === r.batchNumber).length >= 2;

                    return (
                      <tr key={r.id} className="hover:bg-stone-50/80 transition-colors group">
                        {/* 1. Debit Note / Date */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="font-mono font-bold text-rose-700 text-[11px]">
                            {r.returnCode}
                          </div>
                          <div className="text-[10px] text-zinc-400">{r.timestamp}</div>
                          {r.customerInvoiceNumber && (
                            <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
                              Ref: {r.customerInvoiceNumber}
                            </div>
                          )}
                        </td>

                        {/* 2. Product & Batch */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-stone-900 text-[11.5px]">{r.productName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-zinc-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 inline-flex items-center leading-normal">
                              {r.batchNumber}
                            </span>
                            {isRepeatBatch && (
                              <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center leading-normal">
                                Repeat Return
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Qty */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono font-bold text-[10.5px] border border-rose-200 inline-flex items-center justify-center leading-normal">
                            {r.quantity} units
                          </span>
                        </td>

                        {/* 4. Debit Amount */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-mono font-bold text-rose-700">
                          Rs. {r.totalDebitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <div className="text-[9px] text-zinc-400 font-normal">
                            @ Rs. {r.unitCost} / unit
                          </div>
                        </td>

                        {/* 5. Reason */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold text-[10px] border border-stone-200 inline-flex items-center justify-center leading-normal">
                            {r.reason}
                          </span>
                        </td>

                        {/* 6. Incident Details ("What Happened") */}
                        <td className="py-2.5 px-3.5 min-w-[220px]">
                          <p className="text-[11px] text-stone-700 font-medium leading-tight">
                            {r.notes || 'Batch rejected and debit note issued to vendor.'}
                          </p>
                        </td>

                        {/* 7. Claim Status */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <select
                            value={r.claimStatus}
                            onChange={(e) => updateClaimStatus(r.id, e.target.value as any)}
                            className={`text-[10px] font-bold rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                              r.claimStatus === 'Credit Note Received'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : r.claimStatus === 'Dispatched to Supplier'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : r.claimStatus === 'Pending Dispatch'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-stone-50 text-stone-700 border-stone-200'
                            }`}
                          >
                            <option value="Pending Dispatch">Pending Dispatch</option>
                            <option value="Dispatched to Supplier">Dispatched to Supplier</option>
                            <option value="Credit Note Received">Credit Note Received</option>
                            <option value="Replacement Received">Replacement Received</option>
                            <option value="Rejected by Supplier">Rejected by Supplier</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <Undo2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-zinc-600">No Return Claims recorded</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        This supplier has a clean record for this period with zero batch returns.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: SUPPLIED PRODUCTS */}
          {activeTab === 'products' && (
            <table className="w-full border-collapse text-left min-w-[700px] text-xs">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                <tr className="border-b border-stone-200/70 shadow-2xs">
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Product Name &amp; SKU
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                    Current Stock
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Cost Price
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Selling Price
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Active Batches
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {supplierProducts.length > 0 ? (
                  supplierProducts.map((p) => {
                    const batchCount = p.batches?.length || 0;

                    return (
                      <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-stone-900">{p.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{p.sku}</div>
                        </td>

                        <td className="py-2 px-3.5 whitespace-nowrap text-stone-600">
                          {p.brand || supplier.brand || 'General'}
                        </td>

                        <td className="py-2 px-3.5 whitespace-nowrap text-center">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                              p.stock <= 5
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {p.stock} units
                          </span>
                        </td>

                        <td className="py-2 px-3.5 whitespace-nowrap font-mono text-stone-700">
                          Rs. {p.costPrice || Math.round(p.price * 0.78)}
                        </td>

                        <td className="py-2 px-3.5 whitespace-nowrap font-mono font-bold text-stone-900">
                          Rs. {p.price}
                        </td>

                        <td className="py-2 px-3.5 whitespace-nowrap text-stone-600">
                          <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[10.5px]">
                            {batchCount} batches
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      <Package className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-zinc-600">No SKUs assigned</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Link products when registering or restocking from this supplier.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER                                                              */}
        {/* ========================================================================= */}
        <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs shrink-0">
          <div className="text-stone-500 text-[11px]">
            Showing records for <strong className="text-stone-800">{supplier.name}</strong> • Status:{' '}
            <span className="font-semibold text-stone-700">{supplier.status}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
