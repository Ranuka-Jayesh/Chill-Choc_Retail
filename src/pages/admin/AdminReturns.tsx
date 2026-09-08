import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useReturns, isDummyReturn } from '@/stores/returnsStore';
import { useSupplierReturns } from '@/stores/supplierReturnsStore';
import { useToast } from '@/stores/toastStore';
import { ReturnRequest, ReturnItem, SupplierReturn } from '@/types';
import { SupplierClaimModal } from '@/components/admin/SupplierClaimModal';
import { MonthYearPicker } from '@/components/common/MonthYearPicker';
import { returnsSyncSocket } from '@/services/returnsSyncSocket';
import {
  RotateCcw,
  Truck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Search,
  Check,
  RotateCcw as ResetIcon,
  Package,
  X,
} from 'lucide-react';

// Helper to check if a record's date matches the selected month
const isDateInSelectedMonth = (
  dateStr?: string,
  timestampStr?: string,
  selectedMonth?: Date | null
): boolean => {
  if (!selectedMonth) return true;
  const targetYear = selectedMonth.getFullYear();
  const targetMonth = selectedMonth.getMonth(); // 0 to 11

  // 1. Direct YYYY-MM-DD
  if (dateStr) {
    const parts = dateStr.trim().split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        return y === targetYear && m === targetMonth;
      }
    }
  }

  // 2. Text timestamps like "07 Sept 2026, 02:15 PM", "08:45 AM", "Yesterday"
  if (timestampStr) {
    const lower = timestampStr.toLowerCase();
    if (
      lower.includes('today') ||
      lower.includes('yesterday') ||
      lower.includes('just now') ||
      /^\d{1,2}:\d{2}/.test(timestampStr.trim())
    ) {
      const now = new Date();
      return now.getFullYear() === targetYear && now.getMonth() === targetMonth;
    }

    const monthsMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    const cleanParts = lower.replace(/,/g, '').split(/\s+/);
    for (const part of cleanParts) {
      const mStr = part.slice(0, 3);
      if (mStr in monthsMap) {
        const yearPart = cleanParts.find((p) => /^\d{4}$/.test(p));
        if (yearPart) {
          return parseInt(yearPart, 10) === targetYear && monthsMap[mStr] === targetMonth;
        }
      }
    }
  }

  return true;
};

// Compact timestamp formatter to ensure single-line fit
const formatShortTimestamp = (ts?: string): string => {
  if (!ts) return '';
  return ts
    .replace('September', 'Sep')
    .replace('Sept', 'Sep')
    .replace('August', 'Aug')
    .replace('October', 'Oct')
    .replace('November', 'Nov')
    .replace('December', 'Dec')
    .replace('January', 'Jan')
    .replace('February', 'Feb');
};

export const AdminReturns: React.FC = () => {
  const { returnRequests, approveReturn, rejectReturn, linkSupplierReturn } = useReturns();
  const { supplierReturns, updateClaimStatus } = useSupplierReturns();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'approvals' | 'supplier_rtv'>('approvals');
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Supplier Claim modal state
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<{
    returnRequestId: string;
    invoiceNumber: string;
    item: ReturnItem;
  } | null>(null);

  const cleanReturnRequests = useMemo(() => {
    return returnRequests.filter((r) => !isDummyReturn(r));
  }, [returnRequests]);

  const pendingCount = useMemo(() => {
    return cleanReturnRequests.filter((r) => r.status === 'Pending Admin Approval').length;
  }, [cleanReturnRequests]);

  // Listen for real-time returns from cashier
  useEffect(() => {
    const unsub = returnsSyncSocket.subscribe((msg) => {
      if (msg.type === 'RETURN_REQUESTED' && !isDummyReturn(msg.payload)) {
        showToast(`🔔 New Return Request: ${msg.payload.returnCode} (${msg.payload.invoiceNumber}) received from Cashier!`, 'warning');
        // Ensure the admin sees it by not hiding pending items
        setStatusFilter((curr) => (curr === 'approved' ? 'all' : curr));
        setSelectedMonth(new Date());
      }
    });
    return () => unsub();
  }, [showToast]);

  // Filter Tab 1: Customer Refund Approvals
  const filteredCustomerReturns = useMemo(() => {
    return cleanReturnRequests.filter((req) => {
      // Month filter
      if (!isDateInSelectedMonth(req.date, req.timestamp, selectedMonth)) {
        return false;
      }

      // Status filter
      if (statusFilter === 'pending' && req.status !== 'Pending Admin Approval') return false;
      if (statusFilter === 'approved' && req.status !== 'Approved') return false;
      if (statusFilter === 'rejected' && req.status !== 'Rejected') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = req.returnCode.toLowerCase().includes(q);
        const matchInv = req.invoiceNumber.toLowerCase().includes(q);
        const matchUser = req.submittedBy.toLowerCase().includes(q);
        const matchItem = req.items.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            (it.supplierName && it.supplierName.toLowerCase().includes(q)) ||
            (it.batchNumber && it.batchNumber.toLowerCase().includes(q))
        );
        return matchCode || matchInv || matchUser || matchItem;
      }

      return true;
    });
  }, [returnRequests, selectedMonth, statusFilter, searchQuery]);

  // Flatten Customer Return items for high-density table view
  const flattenedReturnRows = useMemo(() => {
    return filteredCustomerReturns.flatMap((req) =>
      req.items.map((item, itemIdx) => ({
        req,
        item,
        itemIdx,
        isFirstItem: itemIdx === 0,
        itemCount: req.items.length,
      }))
    );
  }, [filteredCustomerReturns]);

  // Tab 1 Summary Metrics
  const customerSummary = useMemo(() => {
    const totalRefund = filteredCustomerReturns.reduce((sum, r) => sum + r.totalRefund, 0);
    const pendingInMonth = filteredCustomerReturns.filter(
      (r) => r.status === 'Pending Admin Approval'
    ).length;
    return {
      totalRefund,
      count: filteredCustomerReturns.length,
      pendingCount: pendingInMonth,
    };
  }, [filteredCustomerReturns]);

  // Filter Tab 2: Supplier RTV Claims
  const filteredSupplierReturns = useMemo(() => {
    return supplierReturns.filter((claim) => {
      // Month filter
      if (!isDateInSelectedMonth(claim.date, claim.timestamp, selectedMonth)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = claim.returnCode.toLowerCase().includes(q);
        const matchSup = claim.supplierName.toLowerCase().includes(q);
        const matchProd = claim.productName.toLowerCase().includes(q);
        const matchBatch = claim.batchNumber.toLowerCase().includes(q);
        const matchInv = claim.customerInvoiceNumber.toLowerCase().includes(q);
        return matchCode || matchSup || matchProd || matchBatch || matchInv;
      }

      return true;
    });
  }, [supplierReturns, selectedMonth, searchQuery]);

  // Tab 2 Summary Metrics
  const supplierSummary = useMemo(() => {
    const totalDebit = filteredSupplierReturns.reduce((sum, c) => sum + c.totalDebitAmount, 0);
    const pendingDispatch = filteredSupplierReturns.filter(
      (c) => c.claimStatus === 'Pending Dispatch'
    ).length;
    return {
      totalDebit,
      count: filteredSupplierReturns.length,
      pendingDispatch,
    };
  }, [filteredSupplierReturns]);

  const handleOpenClaim = (returnReq: ReturnRequest, item: ReturnItem) => {
    setSelectedItemForClaim({
      returnRequestId: returnReq.id,
      invoiceNumber: returnReq.invoiceNumber,
      item,
    });
    setClaimModalOpen(true);
  };

  const handleApprove = (reqId: string) => {
    approveReturn(reqId, 'Approved by store administrator');
    showToast('Customer refund approved successfully', 'success');
  };

  const handleReject = (reqId: string) => {
    rejectReturn(reqId, 'Rejected: return window exceeded or product consumed');
    showToast('Return request rejected', 'error');
  };

  return (
    <AdminLayout
      title="Refund Approvals & Supplier Claims"
      subtitle="Inspect customer refunds, trace originating suppliers, and generate supplier debit notes (RTV)"
      mainClassName="flex-1 overflow-hidden p-2.5 sm:p-3.5 w-full flex flex-col min-h-0 h-full"
    >
      <div className="flex-1 flex flex-col min-h-0 w-full h-full space-y-2 select-none relative">
        {/* Top Control Bar: Tabs on Left + Month Picker on Right (NEVER SCROLLS) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 bg-white rounded-xl border border-stone-200/90 shadow-xs shrink-0 w-full">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('approvals');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'approvals'
                  ? 'bg-[#27140B] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Customer Refund Approvals</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9.5px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('supplier_rtv');
                setStatusFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'supplier_rtv'
                  ? 'bg-[#27140B] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Return to Supplier (RTV Claims)</span>
              <span className="text-[10px] font-black text-[#FF5500]">
                {supplierReturns.length}
              </span>
            </button>
          </div>

          {/* Right Side: Month Picker */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            <MonthYearPicker
              selectedDate={selectedMonth || new Date()}
              onChange={(d) => setSelectedMonth(d)}
              onClear={() => setSelectedMonth(null)}
              isFilterActive={selectedMonth !== null}
            />
          </div>
        </div>

        {/* Secondary Toolbar: Filters on Left + Metrics on Right (NEVER SCROLLS) */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white rounded-xl border border-stone-200/90 shadow-xs text-xs shrink-0 w-full">
          {/* Left: Quick Status Filter Tabs */}
          {activeTab === 'approvals' ? (
            <div className="flex items-center gap-2 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'all'
                    ? 'text-zinc-900 underline underline-offset-4 decoration-2 decoration-[#FF5500]'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                All ({cleanReturnRequests.length})
              </button>
              <span className="text-zinc-300">&bull;</span>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'pending'
                    ? 'text-amber-600 underline underline-offset-4 decoration-2 decoration-amber-500'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <span className="text-zinc-300">&bull;</span>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'approved'
                    ? 'text-emerald-600 underline underline-offset-4 decoration-2 decoration-emerald-500'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Approved
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 font-medium">
              <Truck className="w-3.5 h-3.5 text-[#FF5500]" />
              <span className="font-bold text-zinc-800">Supplier Debit Notes Ledger</span>
            </div>
          )}

          {/* Right: Summary Metrics */}
          <div className="flex items-center gap-2.5 text-[10.5px] text-zinc-500 shrink-0 font-medium">
            {activeTab === 'approvals' ? (
              <>
                <span>
                  Records: <strong className="text-zinc-900">{customerSummary.count}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Refund Total:{' '}
                  <strong className="font-mono font-bold text-zinc-900">
                    Rs. {customerSummary.totalRefund.toLocaleString()}
                  </strong>
                </span>
              </>
            ) : (
              <>
                <span>
                  Claims: <strong className="text-zinc-900">{supplierSummary.count}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Total Debit:{' '}
                  <strong className="font-mono font-bold text-[#FF5500]">
                    Rs. {supplierSummary.totalDebit.toLocaleString()}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Customer Refund Approvals Table (Responsive Full Width, Fits Viewport, Internal Scroll) */}
        {activeTab === 'approvals' && (
          <div className="flex-1 flex flex-col min-h-0 w-full h-full bg-white rounded-xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0 w-full h-full pb-14">
              <table className="w-full border-collapse text-left table-fixed">
                <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                  <tr className="bg-[#FAF7F2] border-b border-stone-200/70 shadow-2xs text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-1.5 px-2 w-[10%]">Return &amp; Time</th>
                    <th className="py-1.5 px-2 w-[10%]">Invoice / Staff</th>
                    <th className="py-1.5 px-2 w-[16%]">Product &amp; Batch</th>
                    <th className="py-1.5 px-2 w-[15%]">Origin Supplier</th>
                    <th className="py-1.5 px-2 w-[8%]">Reason</th>
                    <th className="py-1.5 px-1.5 w-[4%] text-right">Qty</th>
                    <th className="py-1.5 px-2 w-[9%] text-right">Resolution</th>
                    <th className="py-1.5 px-2 w-[10%] text-center">Status</th>
                    <th className="py-1.5 px-2 w-[8%] text-center">Supplier Claim</th>
                    <th className="py-1.5 px-2 w-[10%] text-right">Review Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100 text-[10px]">
                  {flattenedReturnRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-14 text-center text-zinc-400">
                        <Package className="w-6 h-6 mx-auto mb-1.5 text-zinc-300 stroke-1" />
                        <p className="text-[11px] font-semibold text-zinc-600">
                          No customer returns found for this period
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Try switching month or adjusting your filter.
                        </p>
                        {selectedMonth && (
                          <button
                            type="button"
                            onClick={() => setSelectedMonth(new Date())}
                            className="mt-2.5 px-2.5 py-1 text-[10.5px] font-bold text-[#FF5500] hover:bg-orange-50 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ResetIcon className="w-3 h-3" />
                            <span>Reset to Current Month</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    flattenedReturnRows.map(({ req, item }, rowIdx) => {
                      const isPending = req.status === 'Pending Admin Approval';
                      const isApproved = req.status === 'Approved';
                      const hasSupplierClaim = !!req.supplierReturnId;

                      return (
                        <tr
                          key={`${req.id}-${rowIdx}`}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isPending ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Col 1: Return Code & Time */}
                          <td className="py-1.5 px-2 font-mono">
                            <span className="font-bold text-[10px] text-zinc-900 block leading-tight truncate">
                              {req.returnCode}
                            </span>
                            <span className="text-[8.5px] text-zinc-400 flex items-center gap-0.5 mt-0.5 truncate leading-tight">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{formatShortTimestamp(req.timestamp)}</span>
                            </span>
                          </td>

                          {/* Col 2: Invoice & Staff */}
                          <td className="py-1.5 px-2">
                            <span className="font-mono text-[10px] font-semibold text-zinc-800 block leading-tight truncate">
                              {req.invoiceNumber}
                            </span>
                            <span className="text-[8.5px] text-zinc-400 block mt-0.5 truncate leading-tight">
                              by {req.submittedBy}
                            </span>
                          </td>

                          {/* Col 3: Product Item & Batch */}
                          <td className="py-1.5 px-2">
                            <span
                              className="font-semibold text-[10px] text-zinc-900 block leading-tight truncate"
                              title={item.productName}
                            >
                              {item.productName}
                            </span>
                            <span className="font-mono text-[8.5px] text-zinc-400 block mt-0.5 truncate leading-tight">
                              Batch: {item.batchNumber || 'N/A'}
                            </span>
                          </td>

                          {/* Col 4: Origin Supplier */}
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1 text-[10px] text-zinc-700 font-medium min-w-0">
                              <Building2 className="w-2.5 h-2.5 text-[#FF5500] shrink-0" />
                              <span className="truncate leading-tight" title={item.supplierName}>
                                {item.supplierName || 'Mars Global Foods'}
                              </span>
                            </div>
                          </td>

                          {/* Col 5: Reason (Clean text: NO border, NO background) */}
                          <td className="py-1.5 px-2 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-semibold ${
                                item.reason === 'Damaged' || item.reason === 'Expired'
                                  ? 'text-rose-600'
                                  : 'text-zinc-700'
                              }`}
                            >
                              {item.reason}
                            </span>
                          </td>

                          {/* Col 6: Qty */}
                          <td className="py-1.5 px-1.5 text-right font-mono font-bold text-[10px] text-zinc-800">
                            {item.quantity}
                          </td>

                          {/* Col 7: Refund Amount / Resolution */}
                          <td className="py-1.5 px-2 text-right font-mono text-[10px] whitespace-nowrap">
                            {req.resolutionType === 'same_replacement' ? (
                              <div>
                                <span className="text-blue-700 font-bold text-[9.5px] block leading-tight">Same Product</span>
                                <span className="text-zinc-400 text-[8.5px] font-normal block leading-tight">Unit Swap (Rs. 0)</span>
                              </div>
                            ) : req.resolutionType === 'exchange' ? (
                              <div>
                                <span className="text-purple-700 font-bold text-[9.5px] block leading-tight truncate max-w-[120px]" title={req.exchangeItem?.productName}>
                                  Exch: {req.exchangeItem?.productName || 'Item'}
                                </span>
                                <span className={`text-[8.5px] font-mono font-bold block leading-tight ${
                                  (req.exchangeItem?.priceDifference || 0) > 0 ? 'text-amber-700' : (req.exchangeItem?.priceDifference || 0) < 0 ? 'text-emerald-700' : 'text-zinc-500'
                                }`}>
                                  {(req.exchangeItem?.priceDifference || 0) > 0
                                    ? `+Rs. ${req.exchangeItem?.priceDifference}`
                                    : (req.exchangeItem?.priceDifference || 0) < 0
                                    ? `-Rs. ${Math.abs(req.exchangeItem?.priceDifference || 0)}`
                                    : 'Even (Rs. 0)'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-zinc-900 font-black text-[10px] block leading-tight">
                                  Rs. {item.refundAmount.toLocaleString()}
                                </span>
                                <span className="text-zinc-400 text-[8.5px] font-normal block leading-tight">Cash Refund</span>
                              </div>
                            )}
                          </td>

                          {/* Col 8: Approval Status (Clean text + icon: NO border, NO background) */}
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            {isPending ? (
                              <span className="text-amber-600 font-bold text-[9.5px] inline-flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> Pending
                              </span>
                            ) : isApproved ? (
                              <span className="text-emerald-600 font-bold text-[9.5px] inline-flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold text-[9.5px] inline-flex items-center gap-0.5">
                                <XCircle className="w-2.5 h-2.5" /> Rejected
                              </span>
                            )}
                          </td>

                          {/* Col 9: Supplier Action / Return to Supplier */}
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            {hasSupplierClaim ? (
                              <span className="text-[9px] font-mono font-medium text-zinc-500">
                                Claimed #{req.supplierReturnId}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenClaim(req, item)}
                                className="px-1.5 py-0.5 text-[9.5px] font-bold text-[#FF5500] hover:bg-orange-50 rounded transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                                title="Charge this item back to vendor (RTV)"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>Return</span>
                              </button>
                            )}
                          </td>

                          {/* Col 10: Review Actions (High Density buttons) */}
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleApprove(req.id)}
                                  className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-bold transition-colors flex items-center gap-0.5 shadow-2xs cursor-pointer"
                                  title="Approve Customer Refund"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(req.id)}
                                  className="px-1 py-0.5 rounded text-rose-600 hover:bg-rose-50 text-[9.5px] font-bold transition-colors cursor-pointer"
                                  title="Reject Customer Refund"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : req.reviewNotes ? (
                              <span
                                className="text-[8.5px] italic text-zinc-400 block max-w-[120px] truncate ml-auto leading-tight"
                                title={req.reviewNotes}
                              >
                                &ldquo;{req.reviewNotes}&rdquo;
                              </span>
                            ) : (
                              <span className="text-[9px] text-zinc-400">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Return to Supplier (RTV Claims Ledger Table - Responsive Full Width) */}
        {activeTab === 'supplier_rtv' && (
          <div className="flex-1 flex flex-col min-h-0 w-full h-full bg-white rounded-xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0 w-full h-full pb-14">
              <table className="w-full border-collapse text-left table-fixed">
                <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                  <tr className="bg-[#FAF7F2] border-b border-stone-200/70 shadow-2xs text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-1.5 px-2 w-[12%]">Debit Note &amp; Date</th>
                    <th className="py-1.5 px-2 w-[17%]">Supplier Name</th>
                    <th className="py-1.5 px-2 w-[18%]">Product &amp; Qty</th>
                    <th className="py-1.5 px-2 w-[12%]">Batch &amp; Invoice</th>
                    <th className="py-1.5 px-2 w-[10%]">Claim Reason</th>
                    <th className="py-1.5 px-2 w-[11%] text-right">Debit Claim (Rs.)</th>
                    <th className="py-1.5 px-2 w-[10%] text-center">Claim Status</th>
                    <th className="py-1.5 px-2 w-[10%] text-right">Update Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100 text-[10px]">
                  {filteredSupplierReturns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-zinc-400">
                        <Truck className="w-6 h-6 mx-auto mb-1.5 text-zinc-300 stroke-1" />
                        <p className="text-[11px] font-semibold text-zinc-600">
                          No supplier claims logged for this period
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Try adjusting month picker or search filter.
                        </p>
                        {selectedMonth && (
                          <button
                            type="button"
                            onClick={() => setSelectedMonth(new Date())}
                            className="mt-2.5 px-2.5 py-1 text-[10.5px] font-bold text-[#FF5500] hover:bg-orange-50 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ResetIcon className="w-3 h-3" />
                            <span>Reset to Current Month</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredSupplierReturns.map((claim) => (
                      <tr key={claim.id} className="hover:bg-amber-50/40 transition-colors">
                        {/* Col 1: Debit Note # & Date */}
                        <td className="py-1.5 px-2 font-mono">
                          <span className="font-bold text-[10px] text-zinc-900 block leading-tight truncate">
                            {claim.returnCode}
                          </span>
                          <span className="text-[8.5px] text-zinc-400 block mt-0.5 font-normal truncate leading-tight">
                            {formatShortTimestamp(claim.timestamp)}
                          </span>
                        </td>

                        {/* Col 2: Supplier Name */}
                        <td className="py-1.5 px-2">
                          <span className="font-bold text-[10px] text-zinc-800 block leading-tight truncate" title={claim.supplierName}>
                            {claim.supplierName}
                          </span>
                        </td>

                        {/* Col 3: Product Item & Qty */}
                        <td className="py-1.5 px-2">
                          <span className="font-semibold text-[10px] text-zinc-900 block leading-tight truncate" title={claim.productName}>
                            {claim.productName}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 block mt-0.5 leading-tight">
                            Qty: <strong className="text-zinc-700 font-bold">{claim.quantity}</strong>
                          </span>
                        </td>

                        {/* Col 4: Batch & Invoice */}
                        <td className="py-1.5 px-2 font-mono text-[9.5px]">
                          <span className="text-zinc-700 font-semibold block leading-tight truncate">
                            {claim.batchNumber}
                          </span>
                          <span className="text-[8.5px] text-zinc-400 block mt-0.5 truncate leading-tight">
                            Inv: {claim.customerInvoiceNumber}
                          </span>
                        </td>

                        {/* Col 5: Claim Reason (Clean text: NO border, NO background) */}
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <span className="text-[10px] font-semibold text-zinc-800">
                            {claim.reason}
                          </span>
                        </td>

                        {/* Col 6: Debit Amount */}
                        <td className="py-1.5 px-2 text-right font-mono font-black text-[10px] text-[#FF5500] whitespace-nowrap">
                          Rs. {claim.totalDebitAmount.toLocaleString()}
                        </td>

                        {/* Col 7: Claim Status (Clean text without border/background) */}
                        <td className="py-1.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`text-[9.5px] font-bold ${
                              claim.claimStatus === 'Credit Note Received'
                                ? 'text-emerald-600'
                                : claim.claimStatus === 'Dispatched to Supplier'
                                ? 'text-blue-600'
                                : claim.claimStatus === 'Replacement Received'
                                ? 'text-emerald-600'
                                : claim.claimStatus === 'Rejected by Supplier'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {claim.claimStatus}
                          </span>
                        </td>

                        {/* Col 8: Update Status Dropdown */}
                        <td className="py-1.5 px-2 text-right whitespace-nowrap">
                          <select
                            value={claim.claimStatus}
                            onChange={(e) =>
                              updateClaimStatus(
                                claim.id,
                                e.target.value as SupplierReturn['claimStatus']
                              )
                            }
                            className="px-1.5 py-0.5 rounded border border-stone-200 bg-white text-[9.5px] font-bold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#FF5500] cursor-pointer max-w-[105px]"
                          >
                            <option value="Pending Dispatch">Pending Dispatch</option>
                            <option value="Dispatched to Supplier">Dispatched</option>
                            <option value="Credit Note Received">Credit Received</option>
                            <option value="Replacement Received">Replacement</option>
                            <option value="Rejected by Supplier">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Floating Bottom Center Search Pop-up Pill (NO ADD ICON) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-30 pointer-events-none select-none">
          <div
            className={`pointer-events-auto flex items-center gap-2 px-3.5 h-10 sm:h-11 rounded-full bg-black/95 transition-all duration-300 ease-in-out will-change-[width] ${
              isSearchFocused || searchQuery.trim().length > 0
                ? 'w-[75vw] sm:w-[320px] shadow-2xl shadow-[#FF5500]/25 border-2 border-[#FF5500] ring-4 ring-[#FF5500]/20'
                : 'w-[190px] sm:w-[220px] shadow-2xl shadow-black/40 border-2 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Search
              className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200 ${
                isSearchFocused || searchQuery.trim().length > 0 ? 'text-[#FF5500]' : 'text-zinc-400'
              }`}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'approvals'
                  ? 'Search returns...'
                  : 'Search claims...'
              }
              className="flex-1 min-w-0 bg-transparent text-xs font-bold text-[#FF5500] placeholder:text-zinc-500 placeholder:font-medium focus:outline-none caret-[#FF5500]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-4.5 h-4.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                title="Clear search"
              >
                <X className="w-2.5 h-2.5 text-[#FF5500]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Claim Modal */}
      {selectedItemForClaim && (
        <SupplierClaimModal
          isOpen={claimModalOpen}
          onClose={() => {
            setClaimModalOpen(false);
            setSelectedItemForClaim(null);
          }}
          returnRequestId={selectedItemForClaim.returnRequestId}
          invoiceNumber={selectedItemForClaim.invoiceNumber}
          item={selectedItemForClaim.item}
          onClaimCreated={(claimId) => {
            linkSupplierReturn(selectedItemForClaim.returnRequestId, claimId);
          }}
        />
      )}
    </AdminLayout>
  );
};
