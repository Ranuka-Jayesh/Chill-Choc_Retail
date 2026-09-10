import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSuppliers } from '@/stores/supplierStore';
import { usePurchaseOrders } from '@/stores/purchaseOrderStore';
import { useSupplierReturns } from '@/stores/supplierReturnsStore';
import { useProducts } from '@/stores/productStore';
import { useToast } from '@/stores/toastStore';
import { MonthYearPicker } from '@/components/common/MonthYearPicker';
import { PurchaseOrderDetailsModal } from '@/components/admin/PurchaseOrderDetailsModal';
import { getPaymentScheduleInfo } from '@/utils/paymentSchedule';
import { PurchaseOrder, SupplierReturn } from '@/types';
import {
  Building2,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  FileText,
  CreditCard,
  Plus,
  Package,
  Clock,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Undo2,
  Search,
  ChevronRight,
  ExternalLink,
  MapPin,
  Pencil,
} from 'lucide-react';
import { EditSupplierModal } from '@/components/admin/EditSupplierModal';

export const AdminSupplierProfile: React.FC = () => {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { suppliers } = useSuppliers();
  const { purchaseOrders } = usePurchaseOrders();
  const { supplierReturns, createSupplierReturn, updateClaimStatus } = useSupplierReturns();
  const { products } = useProducts();
  const { showToast } = useToast();

  // Retrieve Supplier
  const supplier = useMemo(() => {
    return suppliers.find((s) => s.id === supplierId || s.code === supplierId);
  }, [suppliers, supplierId]);

  // Active sub-tab on page
  const [activeTab, setActiveTab] = useState<'invoices' | 'returns' | 'products'>('invoices');

  // Month filtering state (defaults to September 2026)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(2026, 8, 8));
  const [filterByMonth, setFilterByMonth] = useState<boolean>(true);

  // Search query within active tab
  const [tabSearchQuery, setTabSearchQuery] = useState<string>('');

  // Invoice Inspection Modal
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Inline "Record New Return to Supplier" drawer state
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
    if (!supplier) return [];
    return products.filter((p) => {
      if (p.supplierId === supplier.id) return true;
      if (supplier.suppliedProductIds?.includes(p.id)) return true;
      if (p.batches?.some((b) => b.supplierId === supplier.id)) return true;
      return false;
    });
  }, [products, supplier]);

  // Date parser helper
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
    if (!supplier) return [];
    return purchaseOrders.filter(
      (po) => po.supplierId === supplier.id || po.supplierName.toLowerCase() === supplier.name.toLowerCase()
    );
  }, [purchaseOrders, supplier]);

  // Filtered Invoices (with month filter & search)
  const filteredPOs = useMemo(() => {
    return allSupplierPOs.filter((po) => {
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
    if (!supplier) return [];
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

    return {
      totalInvoiced,
      totalPaid,
      balanceDue,
      chequePendingAmount,
    };
  }, [filterByMonth, filteredPOs, allSupplierPOs]);

  // Handle New Return Submission
  const handleCreateReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
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
      notes: returnNotes.trim() || 'Recorded from Supplier Profile return ledger',
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

  if (!supplier) {
    return (
      <AdminLayout
        title="Supplier Not Found"
        subtitle="The requested supplier could not be located"
      >
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-zinc-300 mb-3" />
          <h2 className="text-base font-bold text-stone-900">Supplier Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            We could not find supplier record with ID "{supplierId}". It may have been deleted or moved.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/restock?tab=suppliers')}
            className="mt-4 px-4 py-2 rounded-xl bg-black text-white font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Suppliers Directory</span>
          </button>
        </div>
      </AdminLayout>
    );
  }

  const monthLabel = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AdminLayout
      title={supplier.name}
      subtitle={`Supplier Profile & Ledger • Code: ${supplier.code}${supplier.brand ? ` • Brand: ${supplier.brand}` : ''}`}
      mainClassName="flex-1 overflow-hidden p-3 sm:p-4 w-full flex flex-col min-h-0 h-full"
    >
      <div className="flex-1 flex flex-col min-h-0 w-full h-full gap-2.5">
        {/* ========================================================================= */}
        {/* UNIFIED COMPACT SUPPLIER OVERVIEW & FINANCIAL STATEMENT BAR (SINGLE CARD) */}
        {/* ========================================================================= */}
        <div className="p-3 bg-white rounded-2xl border border-stone-200/90 shadow-2xs shrink-0 flex flex-col gap-2.5">
          {/* Row 1: Navigation, Identity, Contact */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Back button + Identity + Contact */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <button
                type="button"
                onClick={() => navigate('/admin/restock?tab=suppliers')}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group shrink-0"
                title="Back to Suppliers Directory"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-stone-600 group-hover:text-black group-hover:-translate-x-0.5 transition-transform" />
                <span>Back</span>
              </button>

              <span className="font-mono text-xs font-black text-stone-700">
                {supplier.code}
              </span>

              {supplier.isCompanySupplier && (
                <span className="text-[9.5px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 leading-none">
                  Company Supplier
                </span>
              )}

              {supplier.brand && (
                <span className="text-amber-700 text-[11px] font-bold">
                  ({supplier.brand})
                </span>
              )}

              <span
                className={`text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                  supplier.status === 'Active'
                    ? 'text-emerald-700'
                    : 'text-stone-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    supplier.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-400'
                  }`}
                />
                <span>{supplier.status}</span>
              </span>

              <span className="text-[11px] text-amber-700 font-semibold hidden sm:inline-flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>Partner Since: {supplier.since || 'Jan 2024'}</span>
              </span>

              <div className="h-3.5 w-px bg-stone-200 hidden md:block" />

              <div className="text-[11px] text-stone-500 hidden md:flex items-center gap-2">
                <span>Contact: <strong className="text-stone-800 font-semibold">{supplier.contactPerson || 'Sales Team'}</strong></span>
                {supplier.rating && <span className="text-amber-600 font-bold">★ {supplier.rating}</span>}
                <span className="font-mono text-[10.5px] text-stone-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-stone-400" />
                  {supplier.phone}
                </span>
                {supplier.email && (
                  <span className="text-[10.5px] text-stone-500 hidden xl:flex items-center gap-1">
                    <Mail className="w-3 h-3 text-stone-400" />
                    {supplier.email}
                  </span>
                )}
                {supplier.address && (
                  <span className="text-[10.5px] text-stone-500 hidden 2xl:flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    {supplier.address}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Edit Supplier button */}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Edit Supplier"
            >
              <Pencil className="w-3.5 h-3.5 text-amber-700" />
              <span>Edit Supplier</span>
            </button>
          </div>

          {/* Row 2: Simple Clean Financial Summary & Month Filter (No Big Box, No Box Borders, No BG Colors) */}
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            {/* Simple Flat Stats */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              {/* Total Invoiced */}
              <div className="flex flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-400">Total Invoiced</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-black text-xs sm:text-[13px] text-stone-900">
                    Rs. {financialSummary.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono">
                    ({filteredPOs.length} GRNs)
                  </span>
                </div>
              </div>

              <div className="h-6 w-px bg-stone-200/80 hidden sm:block" />

              {/* Paid / Settled */}
              <div className="flex flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-400">Paid / Settled</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-black text-xs sm:text-[13px] text-emerald-600">
                    Rs. {financialSummary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-emerald-600/80 font-medium">Cleared</span>
                </div>
              </div>

              <div className="h-6 w-px bg-stone-200/80 hidden sm:block" />

              {/* Cheque Pending */}
              <div className="flex flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-400">Cheque Pending</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-black text-xs sm:text-[13px] text-amber-600">
                    Rs. {financialSummary.chequePendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-amber-600/80 font-medium">Pending</span>
                </div>
              </div>

              <div className="h-6 w-px bg-stone-200/80 hidden sm:block" />

              {/* Credit / Balance Due */}
              <div className="flex flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-400">Credit / Balance Due</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-black text-xs sm:text-[13px] text-rose-600">
                    Rs. {financialSummary.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-rose-600/80 font-medium">Due</span>
                </div>
              </div>
            </div>

            {/* Month Filter & View Toggle */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterByMonth(true)}
                  className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
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
                  className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    !filterByMonth
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  All History
                </button>
              </div>

              {filterByMonth && (
                <MonthYearPicker
                  selectedDate={selectedMonth}
                  onChange={(d) => setSelectedMonth(d)}
                />
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* AUTOMATED FREQUENT BATCH RETURN / QUALITY WARNING BANNER                  */}
        {/* ========================================================================= */}
        {returnStatsForWarning.hasWarning && (
          <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-start gap-3 shrink-0 animate-in fade-in slide-in-from-top-1 shadow-2xs">
            <div className="p-1 rounded-lg bg-amber-200/70 text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-2 flex-wrap">
                <span>⚠️ Supplier Quality Notice: {returnStatsForWarning.returnsInMonthCount} Batch Returns in {monthLabel}</span>
                {returnStatsForWarning.repeatBatches.map(([batch, data]) => (
                  <span
                    key={batch}
                    className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono text-[10px] font-bold inline-flex items-center"
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
        {/* RECORD NEW RETURN DRAWER (IF OPEN)                                        */}
        {/* ========================================================================= */}
        {isAddingReturn && (
          <div className="p-4 bg-rose-50/90 rounded-2xl border border-rose-200 shrink-0 text-xs animate-in fade-in shadow-xs">
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

              {/* Incident Details ("What Happened") */}
              <div className="sm:col-span-4 space-y-0.5">
                <label className="text-[10px] font-bold uppercase text-stone-600">
                  Incident Details ("What happened" to this batch)
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g., Packaging pierced and melted on transit; credit note requested"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Customer Invoice Ref */}
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

              {/* Submit */}
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
        <div className="flex items-center justify-between gap-3 shrink-0">
          {/* Segmented Sub-Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-stone-200/70 rounded-xl border border-stone-200/90">
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

          {/* Search inside Tab */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={tabSearchQuery}
              onChange={(e) => setTabSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-8 pr-3 py-1 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#FF5500] shadow-2xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENTS: INVOICES / RETURNS / PRODUCTS                               */}
        {/* ========================================================================= */}
        <div className="flex-1 bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 w-full">
            {/* TAB 1: INVOICES & GRNS */}
            {activeTab === 'invoices' && (
              <table className="w-full border-collapse text-left min-w-[850px] text-xs">
                <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                  <tr className="border-b border-stone-200/70 shadow-2xs">
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Purchase / Invoice
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Date &amp; Time
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Items Inward
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Total Invoiced
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Paid / Balance Due
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Payment Status
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
                      const scheduleInfo = getPaymentScheduleInfo(po);

                      return (
                        <tr
                          key={po.id}
                          onClick={() => setViewingPO(po)}
                          className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                        >
                          {/* 1. PO / Invoice */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-stone-900 font-mono text-[10px] leading-tight">
                              {po.poNumber}
                            </div>
                            <div className="text-[8.5px] text-zinc-400 font-mono leading-none mt-0.5">
                              {po.invoiceRef}
                            </div>
                          </td>

                          {/* 2. Date */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 leading-tight">
                              <span className="font-medium text-[10px] text-stone-700">{po.date}</span>
                              {isRolledOver && (
                                <span className="text-[8.5px] font-bold uppercase tracking-wider text-amber-700 font-mono inline-flex items-center leading-normal">
                                  Pending
                                </span>
                              )}
                            </div>
                            <div className="text-[8.5px] text-zinc-400 font-mono leading-none mt-0.5">{po.time}</div>
                          </td>

                          {/* 3. Items */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <span className="text-[9.5px] font-medium text-stone-600 font-mono leading-normal">
                              {po.items.length} Items
                            </span>
                            <div className="text-[8.5px] text-zinc-400 truncate max-w-[180px] mt-0.5 leading-none">
                              {po.items.map((i) => i.productName).join(', ')}
                            </div>
                          </td>

                          {/* 4. Total Invoiced */}
                          <td className="py-1.5 px-3 whitespace-nowrap font-mono font-bold text-[10.5px] text-stone-900">
                            Rs. {po.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* 5. Paid / Balance */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="font-mono text-[10px] font-semibold text-emerald-700 leading-tight">
                              Paid: Rs. {po.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {po.balanceDue > 0 ? (
                              <div className="font-mono text-[9.5px] font-bold text-rose-600 leading-none mt-0.5">
                                Due: Rs. {po.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            ) : (
                              <div className="text-[8.5px] text-emerald-600 font-bold uppercase leading-none mt-0.5">Fully Settled</div>
                            )}
                          </td>

                          {/* 6. Payment Status */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col justify-center">
                              {po.paymentStatus === 'CHEQUE PENDING' && (
                                <div className="flex flex-col items-start">
                                  <span className="text-amber-800 font-bold uppercase text-[9px] inline-flex items-center gap-1 leading-tight">
                                    <Clock className="w-2.5 h-2.5 text-amber-700" />
                                    <span>Cheque Pending</span>
                                  </span>
                                  {scheduleInfo && (
                                    <div className="flex items-center gap-1 mt-0.5 leading-none">
                                      <span className="text-[8px] text-zinc-400 font-mono">
                                        Due {scheduleInfo.dateDisplay}
                                      </span>
                                      <span className="text-zinc-300 text-[8px]">•</span>
                                      <span
                                        className={`text-[8px] uppercase tracking-tight leading-none inline-flex items-center gap-0.5 ${scheduleInfo.badgeClass}`}
                                      >
                                        {scheduleInfo.isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />}
                                        {scheduleInfo.isDueToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                                        <span>{scheduleInfo.countDisplay}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {po.paymentStatus === 'PAID' && (
                                <span className="text-emerald-700 font-bold uppercase text-[9px] inline-flex items-center gap-1 leading-tight">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Paid</span>
                                </span>
                              )}

                              {po.paymentStatus === 'CREDIT' && (
                                <div className="flex flex-col items-start">
                                  <span className="text-rose-600 font-bold uppercase text-[9px] inline-flex items-center gap-1 leading-tight">
                                    <CreditCard className="w-2.5 h-2.5 text-rose-600" />
                                    <span>Credit</span>
                                  </span>
                                  {scheduleInfo && (
                                    <div className="flex items-center gap-1 mt-0.5 leading-none">
                                      <span className="text-[8px] text-zinc-400 font-mono">
                                        Due {scheduleInfo.dateDisplay}
                                      </span>
                                      <span className="text-zinc-300 text-[8px]">•</span>
                                      <span
                                        className={`text-[8px] uppercase tracking-tight leading-none inline-flex items-center gap-0.5 ${scheduleInfo.badgeClass}`}
                                      >
                                        {scheduleInfo.isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />}
                                        {scheduleInfo.isDueToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                                        <span>{scheduleInfo.countDisplay}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {po.paymentStatus === 'PARTIAL' && (
                                <div className="flex flex-col items-start">
                                  <span className="text-orange-600 font-bold uppercase text-[9px] inline-flex items-center gap-1 leading-tight">
                                    <span>Partial</span>
                                  </span>
                                  {scheduleInfo && (
                                    <div className="flex items-center gap-1 mt-0.5 leading-none">
                                      <span className="text-[8px] text-zinc-400 font-mono">
                                        Due {scheduleInfo.dateDisplay}
                                      </span>
                                      <span className="text-zinc-300 text-[8px]">•</span>
                                      <span
                                        className={`text-[8px] uppercase tracking-tight leading-none inline-flex items-center gap-0.5 ${scheduleInfo.badgeClass}`}
                                      >
                                        {scheduleInfo.isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />}
                                        {scheduleInfo.isDueToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                                        <span>{scheduleInfo.countDisplay}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
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
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Debit Note / Date
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Product &amp; Batch
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center">
                      Returned Qty
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Debit Amount
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Reason
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Incident Notes ("What Happened")
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
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
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-rose-700 text-[10px] leading-tight">
                              {r.returnCode}
                            </div>
                            <div className="text-[8.5px] text-zinc-400 leading-none mt-0.5">{r.timestamp}</div>
                            {r.customerInvoiceNumber && (
                              <div className="text-[8.5px] text-zinc-400 font-mono mt-0.5 leading-none">
                                Ref: {r.customerInvoiceNumber}
                              </div>
                            )}
                          </td>

                          {/* 2. Product & Batch */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-stone-900 text-[10.5px] leading-tight">{r.productName}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="font-mono text-[8.5px] text-zinc-500 leading-normal">
                                {r.batchNumber}
                              </span>
                              {isRepeatBatch && (
                                <span className="text-[7.5px] font-bold uppercase tracking-wider text-rose-600 leading-normal">
                                  Repeat Return
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Qty */}
                          <td className="py-1.5 px-3 whitespace-nowrap text-center">
                            <span className="text-rose-600 font-mono font-bold text-[9.5px] leading-normal">
                              {r.quantity} units
                            </span>
                          </td>

                          {/* 4. Debit Amount */}
                          <td className="py-1.5 px-3 whitespace-nowrap font-mono font-bold text-rose-700 text-[10.5px]">
                            Rs. {r.totalDebitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <div className="text-[8.5px] text-zinc-400 font-normal leading-none mt-0.5">
                              @ Rs. {r.unitCost} / unit
                            </div>
                          </td>

                          {/* 5. Reason */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <span className="text-stone-700 font-medium text-[9.5px] leading-normal">
                              {r.reason}
                            </span>
                          </td>

                          {/* 6. Incident Details ("What Happened") */}
                          <td className="py-1.5 px-3 min-w-[200px]">
                            <p className="text-[10px] text-stone-700 font-medium leading-snug">
                              {r.notes || 'Batch rejected and debit note issued to vendor.'}
                            </p>
                          </td>

                          {/* 7. Claim Status */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <select
                              value={r.claimStatus}
                              onChange={(e) => updateClaimStatus(r.id, e.target.value as any)}
                              className={`text-[8.5px] font-bold rounded-lg px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${
                                r.claimStatus === 'Credit Note Received'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.claimStatus === 'Dispatched to Supplier'
                                  ? 'bg-blue-100 text-blue-800'
                                  : r.claimStatus === 'Pending Dispatch'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone-100 text-stone-700'
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
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      Product Name &amp; SKU
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                      Current Stock
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      Cost Price
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      Selling Price
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
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
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-stone-900 text-[10.5px] leading-tight">{p.name}</div>
                            <div className="text-[8.5px] text-zinc-400 font-mono leading-none mt-0.5">{p.sku}</div>
                          </td>

                          <td className="py-1.5 px-3 whitespace-nowrap text-stone-600 text-[9.5px]">
                            {p.brand || supplier.brand || 'General'}
                          </td>

                          <td className="py-1.5 px-3 whitespace-nowrap text-center">
                            <span
                              className={`font-mono font-bold text-[9.5px] leading-normal ${
                                p.stock <= 5 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {p.stock} units
                            </span>
                          </td>

                          <td className="py-1.5 px-3 whitespace-nowrap font-mono text-stone-700 text-[9.5px]">
                            Rs. {p.costPrice || Math.round(p.price * 0.78)}
                          </td>

                          <td className="py-1.5 px-3 whitespace-nowrap font-mono font-bold text-stone-900 text-[10px]">
                            Rs. {p.price}
                          </td>

                          <td className="py-1.5 px-3 whitespace-nowrap text-stone-600">
                            <span className="font-mono text-[9px] text-stone-600 leading-normal">
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
        </div>
      </div>

      {/* PURCHASE ORDER DETAILS INSPECTION MODAL */}
      {viewingPO && (
        <PurchaseOrderDetailsModal
          isOpen={!!viewingPO}
          onClose={() => setViewingPO(null)}
          purchaseOrder={viewingPO}
        />
      )}

      {/* EDIT SUPPLIER MODAL */}
      {isEditModalOpen && supplier && (
        <EditSupplierModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          supplier={supplier}
        />
      )}
    </AdminLayout>
  );
};
