import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSales } from '@/stores/salesStore';
import { useToast } from '@/stores/toastStore';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { CashierHeader } from '@/components/pos/CashierHeader';
import { ReceiptPreviewModal } from '@/components/modals/ReceiptPreviewModal';
import { AppFooter } from '@/components/common/AppFooter';
import { CustomDatePicker, DateFilterMode } from '@/components/common/CustomDatePicker';
import { CompletedSale } from '@/types';
import {
  ArrowLeft,
  Search,
  Printer,
  RotateCcw,
  Eye,
  CheckCircle,
  X,
  ReceiptText,
} from 'lucide-react';

export const SalesHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sales, getSaleByInvoice } = useSales();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<DateFilterMode>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Returned'>('all');

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<CompletedSale | null>(null);

  // Auto-open invoice when navigated with ?invoice=... (e.g. from POS barcode scan)
  const invoiceParam = searchParams.get('invoice') || searchParams.get('search');
  useEffect(() => {
    if (invoiceParam) {
      const cleanInv = invoiceParam.replace(/^\*+|\*+$/g, '').trim().toUpperCase();
      setSearch(cleanInv);
      setFilterMode('all');
      setStatusFilter('all');

      const matched =
        getSaleByInvoice(cleanInv) ||
        sales.find((s) => {
          const num = s.invoiceNumber.toUpperCase();
          return (
            num === cleanInv ||
            num === `INV-${cleanInv}` ||
            num.replace(/[^0-9]/g, '') === cleanInv.replace(/[^0-9]/g, '') ||
            s.id.toUpperCase() === cleanInv
          );
        });

      if (matched) {
        showToast(`Filtered to Invoice #${matched.invoiceNumber}`, 'info');
      } else {
        showToast(`Invoice #${cleanInv} not found`, 'warning');
      }

      // Clear the query parameter after consuming
      setSearchParams({}, { replace: true });
    }
  }, [invoiceParam, sales, getSaleByInvoice, setSearchParams, showToast]);

  // Global barcode scanning while on Sales History screen
  useBarcodeScanner({
    enabled: !selectedSaleForReceipt,
    onScan: (scannedCode) => {
      const clean = scannedCode.replace(/^\*+|\*+$/g, '').trim();
      if (!clean) return;

      // A. Check if it's an Invoice / Bill Barcode
      const isInvoicePattern =
        clean.toUpperCase().startsWith('INV-') ||
        clean.toUpperCase().startsWith('CC-') ||
        clean.toUpperCase().startsWith('SALE-');

      const matchedSale =
        getSaleByInvoice(clean) ||
        sales.find((s) => s.invoiceNumber.toUpperCase() === clean.toUpperCase()) ||
        sales.find((s) => s.id.toUpperCase() === clean.toUpperCase()) ||
        (isInvoicePattern
          ? sales.find((s) => s.invoiceNumber.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, ''))
          : undefined);

      if (matchedSale || isInvoicePattern) {
        const invNum = matchedSale ? matchedSale.invoiceNumber : clean;
        setSearch(invNum);
        setFilterMode('all');
        setStatusFilter('all');
        if (matchedSale) {
          showToast(`Filtered to Invoice #${matchedSale.invoiceNumber}`, 'info');
        } else {
          showToast(`Invoice #${clean} not found in history`, 'warning');
        }
        return;
      }

      // B. If a product barcode was scanned while on Sales History screen:
      const matchedProduct =
        MOCK_PRODUCTS.find((p) => p.barcode === clean) ||
        MOCK_PRODUCTS.find((p) => p.sku.toLowerCase() === clean.toLowerCase()) ||
        MOCK_PRODUCTS.find((p) => p.name.toLowerCase() === clean.toLowerCase());

      if (matchedProduct) {
        showToast(`Scanned ${matchedProduct.name}. Adding to bill...`, 'info');
        navigate(`/cashier/pos?addBarcode=${encodeURIComponent(matchedProduct.barcode)}`);
        return;
      }

      showToast(`Barcode not recognized: "${clean}"`, 'warning');
    },
  });

  // Shortcut: Pressing Backspace when no input field is active returns to POS terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedSaleForReceipt) return;

      if (e.key === 'Backspace') {
        const activeEl = document.activeElement;
        const isInputField =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          (activeEl as HTMLElement)?.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          navigate('/cashier/pos');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, selectedSaleForReceipt]);

  const handleSelectPeriod = (
    mode: DateFilterMode,
    dateStr?: string
  ) => {
    setFilterMode(mode);
    setSelectedDate(dateStr || null);
  };

  // Base sales filtered by text search & date period
  const baseSales = sales.filter((sale) => {
    // 1. Text Search Filter
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      sale.invoiceNumber.toLowerCase().includes(term) ||
      (sale.customer?.name && sale.customer.name.toLowerCase().includes(term)) ||
      sale.items.some(
        (item) =>
          item.product.barcode.includes(term) ||
          item.product.name.toLowerCase().includes(term)
      );

    if (!matchesSearch) return false;

    // 2. Date / Period Filter
    if (filterMode === 'all') return true;

    if (filterMode === 'today') {
      return (
        sale.date === 'Today' ||
        sale.date === '2026-09-08' ||
        sale.date === '2026-09-05' ||
        !sale.date
      );
    }

    if (filterMode === 'yesterday') {
      return (
        sale.date === 'Yesterday' ||
        sale.date === '2026-09-07' ||
        sale.date === '2026-09-04'
      );
    }

    if (filterMode === 'month') {
      if (selectedDate) {
        return sale.date === 'Today' || sale.date === 'Yesterday' || sale.date?.startsWith(selectedDate);
      }
      return (
        sale.date === 'Today' ||
        sale.date === 'Yesterday' ||
        sale.date?.startsWith('2026-09')
      );
    }

    if (filterMode === 'year') {
      const yr = selectedDate || '2026';
      return sale.date === 'Today' || sale.date === 'Yesterday' || sale.date?.startsWith(yr);
    }

    if (filterMode === 'custom' && selectedDate) {
      return (
        sale.date === selectedDate ||
        (sale.date === 'Today' && selectedDate === new Date().toISOString().split('T')[0])
      );
    }

    return true;
  });

  // Dynamic counts for status tabs
  const completedCount = baseSales.filter((s) => s.status === 'Completed').length;
  const returnedCount = baseSales.filter((s) => s.status === 'Returned' || s.status === 'Refunded').length;

  // Final filtered sales applying status filter
  const filteredSales = baseSales.filter((sale) => {
    if (statusFilter === 'Completed') {
      return sale.status === 'Completed';
    }
    if (statusFilter === 'Returned') {
      return sale.status === 'Returned' || sale.status === 'Refunded';
    }
    return true;
  });

  // Summary Metrics for Right Panel
  const completedSales = filteredSales.filter((s) => s.status === 'Completed');
  const returnedSales = filteredSales.filter((s) => s.status === 'Returned' || s.status === 'Refunded');

  const totalVolume = statusFilter === 'Returned'
    ? returnedSales.reduce((sum, s) => sum + s.total, 0)
    : completedSales.reduce((sum, s) => sum + s.total, 0);

  const totalItemsCount = filteredSales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );
  const avgTicket = completedSales.length > 0 ? totalVolume / completedSales.length : 0;

  // Period label for right panel display
  const getPeriodDisplayLabel = () => {
    if (filterMode === 'all') return 'All Time';
    if (filterMode === 'today') return 'Today (05 Sep)';
    if (filterMode === 'yesterday') return 'Yesterday (04 Sep)';
    if (filterMode === 'month') return 'September 2026';
    if (filterMode === 'custom' && selectedDate) return selectedDate;
    return 'Custom Date';
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#FAF8F5] flex flex-col overflow-y-auto lg:overflow-hidden select-none font-sans">
      {/* Top Header (Fixed at top) */}
      <div className="shrink-0">
        <CashierHeader />
      </div>

      {/* Main Container - Full Viewport Workstation Layout */}
      <main className="flex-1 flex flex-col px-3.5 py-2.5 sm:px-5 sm:py-3 w-full max-w-[1600px] mx-auto min-h-0 overflow-hidden">
        {/* Top Action Bar (Compact, single-line alignment) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-200/80 shrink-0">
          {/* Left Title with Record Count + Status Filter */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-black tracking-tight flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-[#FF5500]" />
                <span>Sales History</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[#FF5500] text-xs font-black">
                {filteredSales.length} {filteredSales.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {/* Status Filter Segmented Controls */}
            <div className="flex items-center p-0.5 bg-zinc-100/90 rounded-xl border border-zinc-200/80 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`h-7 px-2.5 sm:px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-black shadow-2xs'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                <span>All</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === 'all' ? 'bg-zinc-200 text-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  {baseSales.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('Completed')}
                className={`h-7 px-2.5 sm:px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Completed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-emerald-700'
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                <span>Completed</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === 'Completed' ? 'bg-emerald-700 text-white' : 'text-zinc-400'
                  }`}
                >
                  {completedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('Returned')}
                className={`h-7 px-2.5 sm:px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Returned'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-rose-700'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Returned</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === 'Returned' ? 'bg-rose-700 text-white' : 'text-zinc-400'
                  }`}
                >
                  {returnedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Custom Designed Calendar Picker & Search Bar */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Custom Designed Calendar Picker */}
            <CustomDatePicker
              selectedDate={selectedDate}
              filterMode={filterMode}
              onSelectPeriod={handleSelectPeriod}
            />

            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, customer, item..."
                className="w-full h-8 pl-8 pr-7 rounded-xl border border-zinc-200 bg-white text-xs text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Full-Height Table Card, Right Mascot & Summary */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-2.5 items-stretch lg:overflow-hidden">
          {/* LEFT: Full Height Compact Records Table Card */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full min-h-[380px] lg:min-h-0">
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden flex flex-col flex-1 h-full min-h-0">
              {/* Scrollable Table Area */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-xs shadow-2xs">
                    <tr className="border-b border-zinc-200/80 text-zinc-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 w-[115px]">Invoice #</th>
                      <th className="py-2.5 px-3 w-[85px]">Time</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 w-[85px]">Items</th>
                      <th className="py-2.5 px-3 w-[110px]">Tender</th>
                      <th className="py-2.5 px-3 w-[120px] text-right">Total Amount</th>
                      <th className="py-2.5 px-3 w-[105px]">Status</th>
                      <th className="py-2.5 px-3 w-[90px] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-zinc-400 text-xs">
                          <p className="font-semibold text-zinc-600 text-sm">No transactions found</p>
                          <p className="text-[11px] mt-0.5">Try adjusting your search query, status, or calendar date</p>
                          {(search || filterMode !== 'all' || statusFilter !== 'all') && (
                            <button
                              onClick={() => {
                                setSearch('');
                                setFilterMode('all');
                                setSelectedDate(null);
                                setStatusFilter('all');
                              }}
                              className="mt-3 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-black text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                            >
                              Reset All Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => {
                        const totalQty = sale.items.reduce((sum, i) => sum + i.quantity, 0);
                        const tenderSummary = sale.tenders
                          .map((t) => t.method.toUpperCase())
                          .join(' + ');

                        return (
                          <tr
                            key={sale.id}
                            onClick={() => setSelectedSaleForReceipt(sale)}
                            className="hover:bg-orange-50/35 transition-colors cursor-pointer group"
                          >
                            {/* Invoice Number */}
                            <td className="py-2 px-3 font-mono font-bold text-xs text-[#FF5500] group-hover:underline">
                              {sale.invoiceNumber}
                            </td>

                            {/* Time */}
                            <td className="py-2 px-3 text-zinc-500 font-medium whitespace-nowrap text-xs">
                              {sale.timestamp}
                            </td>

                            {/* Customer */}
                            <td className="py-2 px-3 font-semibold text-zinc-900 text-xs">
                              <span className="truncate block max-w-[130px] xl:max-w-[180px]">
                                {sale.customer?.name || 'Walk-in Customer'}
                              </span>
                            </td>

                            {/* Items count */}
                            <td className="py-2 px-3 text-zinc-600 font-medium text-xs whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono text-[10px] font-bold">
                                {totalQty} {totalQty === 1 ? 'item' : 'items'}
                              </span>
                            </td>

                            {/* Tender */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded bg-zinc-50 text-zinc-700 border border-zinc-200 text-[10px] font-bold uppercase">
                                {tenderSummary}
                              </span>
                            </td>

                            {/* Total Amount */}
                            <td className="py-2 px-3 font-mono font-bold text-xs text-right text-zinc-900 tabular-numbers whitespace-nowrap">
                              Rs. {sale.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              {sale.status === 'Returned' || sale.status === 'Refunded' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 shadow-2xs">
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Returned</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 shadow-2xs">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  <span>Completed</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setSelectedSaleForReceipt(sale)}
                                  className="w-6 h-6 rounded-md text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors flex items-center justify-center cursor-pointer"
                                  title="View standard tax receipt"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedSaleForReceipt(sale)}
                                  className="w-6 h-6 rounded-md text-zinc-400 hover:text-[#FF5500] hover:bg-orange-50 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Reprint standard 80mm thermal receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => navigate(`/cashier/returns?invoice=${sale.invoiceNumber}`)}
                                  className="w-6 h-6 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Request Return / Refund"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Clean Table Footer: Record counts only (no total volume) */}
              {filteredSales.length > 0 && (
                <div className="py-2 px-3.5 bg-zinc-50/90 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500 font-medium shrink-0">
                  <span>
                    Showing <strong className="text-zinc-800">{filteredSales.length}</strong> of{' '}
                    <strong className="text-zinc-800">{sales.length}</strong> records
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Mascot & Register Summary Panel (Matching Full Height) */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full min-h-[380px] lg:min-h-0">
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between h-full flex-1 min-h-0 overflow-hidden">
              {/* Top part of card: Mascot Image & Stats Box */}
              <div className="w-full flex flex-col items-center flex-1 min-h-0 justify-center">
                {/* Dynamically Sized Mascot Image */}
                <div className="w-full flex items-center justify-center shrink-0">
                  <img
                    src="/histry.png"
                    alt="Sales History"
                    className="max-h-[145px] sm:max-h-[175px] xl:max-h-[210px] w-auto object-contain drop-shadow-sm select-none pointer-events-none transition-transform hover:scale-105 duration-300"
                  />
                </div>

                {/* Minimal Stats Box */}
                <div className="w-full mt-2 sm:mt-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/70 p-2.5 space-y-1.5 text-left shrink-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Filter Period
                    </span>
                    <span className="text-xs font-bold text-zinc-800">
                      {getPeriodDisplayLabel()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/60 pt-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {statusFilter === 'Returned' ? 'Total Refunded' : 'Total Revenue'}
                    </span>
                    <span className={`font-mono font-black text-sm ${statusFilter === 'Returned' ? 'text-rose-600' : 'text-black'}`}>
                      Rs. {totalVolume.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {statusFilter === 'Returned' ? 'Refunded Slips' : 'Paid Invoices'}
                    </span>
                    <span className="font-mono font-bold text-xs text-zinc-700">
                      {filteredSales.length} {statusFilter === 'Returned' ? 'Returns' : 'Transactions'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {statusFilter === 'Returned' ? 'Items Returned' : 'Items Sold'}
                    </span>
                    <span className="font-mono font-bold text-xs text-zinc-700">
                      {totalItemsCount} Units
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Avg. Ticket
                    </span>
                    <span className="font-mono font-bold text-xs text-zinc-700">
                      Rs. {avgTicket.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom part of card: Guaranteed Visible Button */}
              <button
                type="button"
                onClick={() => navigate('/cashier/pos')}
                title="Return to POS (or press Backspace)"
                className="w-full h-11 rounded-2xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer shrink-0 mt-2.5"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                <span>Return to POS Terminal</span>
                <span className="text-[10px] font-mono font-medium opacity-80 bg-white/20 px-1.5 py-0.5 rounded-md">
                  ⌫
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Developer & Brand Footer (Compact, fixed at bottom) */}
      <div className="shrink-0">
        <AppFooter />
      </div>

      {/* Formal Standard 80mm Tax Receipt Modal */}
      <ReceiptPreviewModal
        isOpen={!!selectedSaleForReceipt}
        onClose={() => setSelectedSaleForReceipt(null)}
        sale={selectedSaleForReceipt}
        onReturn={(inv) => navigate(`/cashier/returns?invoice=${inv}`)}
      />
    </div>
  );
};
