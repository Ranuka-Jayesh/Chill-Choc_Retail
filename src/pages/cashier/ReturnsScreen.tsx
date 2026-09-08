import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSales } from '@/stores/salesStore';
import { useReturns } from '@/stores/returnsStore';
import { useCashier } from '@/stores/cashierStore';
import { useProducts } from '@/stores/productStore';
import { useToast } from '@/stores/toastStore';
import { CashierHeader } from '@/components/pos/CashierHeader';
import { AppFooter } from '@/components/common/AppFooter';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { CompletedSale, ReturnItem, Product, ReturnRequest, ExchangeItemDetails } from '@/types';
import { returnsSyncSocket } from '@/services/returnsSyncSocket';
import {
  ArrowLeft,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  ScanLine,
  CheckSquare,
  Square,
  Minus,
  Plus,
  Check,
  X,
  XCircle,
  Package,
} from 'lucide-react';

const RETURN_REASONS = [
  'Customer Changed Mind',
  'Damaged',
  'Expired',
  'Wrong Product',
  'Quality Issue',
  'Other',
];

export const ReturnsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getSaleByInvoice } = useSales();
  const { returnRequests, submitReturnRequest, approveReturn } = useReturns();
  const { cashier, recordRefundCash, recordSaleCash } = useCashier();
  const { products } = useProducts();
  const { showToast } = useToast();

  // Search input - NO default invoice loaded
  const [invoiceQuery, setInvoiceQuery] = useState(searchParams.get('invoice') || '');
  const [activeSale, setActiveSale] = useState<CompletedSale | null>(null);

  // Return items configuration: per cart item ID
  const [returnConfig, setReturnConfig] = useState<
    Record<
      string,
      {
        selected: boolean;
        returnQty: number;
        reason: string;
        returnToStock: boolean;
      }
    >
  >({});

  // Resolution type: 'refund' | 'same_replacement' | 'exchange'
  const [resolutionType, setResolutionType] = useState<'refund' | 'same_replacement' | 'exchange'>('refund');

  // Exchange item picker state
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');
  const [selectedExchangeProduct, setSelectedExchangeProduct] = useState<Product | null>(null);
  const [exchangeQty, setExchangeQty] = useState(1);

  // Track completed/disbursed returns
  const [completedTickets, setCompletedTickets] = useState<Record<string, boolean>>({});

  // Auto-search ONLY if explicit query param provided in URL (e.g. redirected from POS)
  useEffect(() => {
    const param = searchParams.get('invoice');
    if (param) {
      handleSearchInvoice(param);
    }
  }, []);

  const handleSearchInvoice = (queryStr: string) => {
    const clean = queryStr.trim();
    if (!clean) {
      showToast('Please enter an invoice number to search', 'warning');
      return;
    }
    const sale = getSaleByInvoice(clean);
    if (sale) {
      setActiveSale(sale);
      setSelectedExchangeProduct(null);
      setExchangeSearchQuery('');
      setResolutionType('refund');
      // Initialize returnConfig with first item selected
      const init: typeof returnConfig = {};
      sale.items.forEach((item, idx) => {
        init[item.id] = {
          selected: idx === 0,
          returnQty: 1,
          reason: RETURN_REASONS[0],
          returnToStock: true,
        };
      });
      setReturnConfig(init);
    } else {
      setActiveSale(null);
      showToast(`Invoice "${clean}" not found. Try INV-001827 or INV-001829`, 'error');
    }
  };

  // Barcode scanner
  useBarcodeScanner({
    onScan: (scannedCode) => {
      const clean = scannedCode.replace(/^\*+|\*+$/g, '').trim();
      if (!clean) return;
      setInvoiceQuery(clean);
      handleSearchInvoice(clean);
    },
  });

  const toggleSelectProduct = (itemId: string) => {
    setReturnConfig((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected,
      },
    }));
  };

  const updateQty = (itemId: string, maxQty: number, delta: number) => {
    setReturnConfig((prev) => {
      const current = prev[itemId]?.returnQty || 1;
      const next = Math.max(1, Math.min(maxQty, current + delta));
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          returnQty: next,
        },
      };
    });
  };

  const updateReason = (itemId: string, reason: string) => {
    setReturnConfig((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        reason,
      },
    }));
  };

  const updateReturnToStock = (itemId: string, returnToStock: boolean) => {
    setReturnConfig((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        returnToStock,
      },
    }));
  };

  // Calculate total return value
  const totalRefund = useMemo(() => {
    if (!activeSale) return 0;
    return activeSale.items.reduce((sum, item) => {
      const cfg = returnConfig[item.id];
      if (cfg?.selected) {
        return sum + item.unitPrice * cfg.returnQty;
      }
      return sum;
    }, 0);
  }, [activeSale, returnConfig]);

  const selectedCount = Object.values(returnConfig).filter((c) => c.selected).length;

  // Selected returned items list
  const selectedReturnItems = useMemo(() => {
    if (!activeSale) return [];
    return activeSale.items.filter((item) => returnConfig[item.id]?.selected);
  }, [activeSale, returnConfig]);

  // Exchange calculations
  const exchangeTotalValue = useMemo(() => {
    if (!selectedExchangeProduct) return 0;
    return selectedExchangeProduct.price * exchangeQty;
  }, [selectedExchangeProduct, exchangeQty]);

  const exchangePriceDifference = useMemo(() => {
    if (resolutionType !== 'exchange' || !selectedExchangeProduct) return 0;
    return exchangeTotalValue - totalRefund;
  }, [resolutionType, selectedExchangeProduct, exchangeTotalValue, totalRefund]);

  // Filtered exchange products
  const filteredExchangeProducts = useMemo(() => {
    if (resolutionType !== 'exchange') return [];
    const q = exchangeSearchQuery.toLowerCase().trim();
    return products.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
      );
    });
  }, [products, resolutionType, exchangeSearchQuery]);

  // Real-time socket listener for toast notifications on approval/rejection
  useEffect(() => {
    const unsub = returnsSyncSocket.subscribe((msg) => {
      if (msg.type === 'RETURN_APPROVED') {
        showToast('Store Administrator approved return ticket', 'success');
      } else if (msg.type === 'RETURN_REJECTED') {
        showToast('Store Administrator rejected return ticket', 'error');
      }
    });
    return () => unsub();
  }, [showToast]);

  // Submit return request
  const handleSubmitReturn = () => {
    if (!activeSale || selectedCount === 0) return;

    if (resolutionType === 'exchange' && !selectedExchangeProduct) {
      showToast('Please pick an exchange product from the list', 'error');
      return;
    }

    const returnItems: ReturnItem[] = [];
    activeSale.items.forEach((item) => {
      const cfg = returnConfig[item.id];
      if (cfg?.selected) {
        returnItems.push({
          productId: item.product.id,
          productName: `${item.product.name} (${item.product.weight})`,
          quantity: cfg.returnQty,
          unitPrice: item.unitPrice,
          reason: cfg.reason,
          returnToStock: cfg.returnToStock,
          refundAmount: item.unitPrice * cfg.returnQty,
        });
      }
    });

    const exchangePayload: ExchangeItemDetails | undefined =
      resolutionType === 'exchange' && selectedExchangeProduct
        ? {
            productId: selectedExchangeProduct.id,
            productName: `${selectedExchangeProduct.name} (${selectedExchangeProduct.weight})`,
            unitPrice: selectedExchangeProduct.price,
            quantity: exchangeQty,
            totalValue: exchangeTotalValue,
            priceDifference: exchangePriceDifference,
          }
        : undefined;

    const newReq = submitReturnRequest({
      invoiceNumber: activeSale.invoiceNumber,
      items: returnItems,
      totalRefund,
      submittedBy: cashier.name,
      resolutionType,
      exchangeItem: exchangePayload,
    });

    showToast(`Return ${newReq.returnCode} submitted to Admin`, 'success');

    // Reset left form so cashier can immediately scan the next bill
    setActiveSale(null);
    setInvoiceQuery('');
  };

  // Cashier executes disbursement for an approved ticket
  const handleDisburseAndComplete = (req: ReturnRequest) => {
    if (req.resolutionType === 'refund') {
      recordRefundCash(req.totalRefund);
      showToast(`Disbursed Rs. ${req.totalRefund.toLocaleString()} cash`, 'success');
    } else if (req.resolutionType === 'exchange' && req.exchangeItem) {
      const diff = req.exchangeItem.priceDifference;
      if (diff > 0) {
        recordSaleCash(diff);
        showToast(`Collected extra Rs. ${diff.toLocaleString()} cash`, 'success');
      } else if (diff < 0) {
        recordRefundCash(Math.abs(diff));
        showToast(`Refunded Rs. ${Math.abs(diff).toLocaleString()} difference`, 'success');
      } else {
        showToast('Exchange swap finalized (Rs. 0.00)', 'success');
      }
    } else {
      showToast('Fresh unit replacement issued to customer', 'success');
    }

    setCompletedTickets((prev) => ({ ...prev, [req.id]: true }));
  };

  const pendingCount = useMemo(() => {
    return returnRequests.filter((r) => r.status === 'Pending Admin Approval').length;
  }, [returnRequests]);

  return (
    <div className="h-screen w-screen bg-[#FAF7F2] flex flex-col select-none font-sans overflow-hidden">
      <CashierHeader />

      <main className="flex-1 w-full px-2.5 sm:px-3.5 py-2 flex flex-col min-h-0 overflow-hidden">
        {/* Top Minimal Bar */}
        <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-stone-200/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/cashier/pos')}
              className="px-2 py-1 rounded-md bg-white border border-stone-200 text-zinc-700 hover:bg-stone-100 hover:text-zinc-900 transition-colors shadow-2xs flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>POS</span>
            </button>
            <h2 className="text-xs font-black text-zinc-900 tracking-tight flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Return &amp; Exchange Desk</span>
            </h2>
          </div>

          {/* Minimal Search Bar */}
          <div className="flex items-center gap-1.5 w-full max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1.5" />
              <input
                type="text"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice(invoiceQuery)}
                placeholder="Scan or type invoice (e.g. INV-001827)..."
                className="w-full h-6 pl-7 pr-2 rounded border border-stone-200 bg-white text-[11px] font-mono font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-[#FF5500]"
              />
            </div>
            <button
              onClick={() => handleSearchInvoice(invoiceQuery)}
              className="px-2.5 h-6 rounded bg-[#27140B] hover:bg-[#3d1f11] text-white font-bold text-[10.5px] transition-colors shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              <ScanLine className="w-2.5 h-2.5 text-[#FF5500]" />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="flex-1 flex flex-col md:flex-row gap-2 mt-1.5 min-h-0 overflow-hidden">
          {/* ======================================================== */}
          {/* LEFT PANEL: Single-Line Product Table & Return Form      */}
          {/* ======================================================== */}
          <div className="flex-1 flex flex-col bg-white rounded-lg border border-stone-200/90 shadow-2xs min-h-0 overflow-hidden">
            {!activeSale ? (
              /* Minimal Clean Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                <Search className="w-8 h-8 stroke-1 text-zinc-300 mb-1.5" />
                <h3 className="text-xs font-bold text-zinc-600">No Invoice Loaded</h3>
                <p className="text-[11px] text-zinc-400 max-w-xs mt-0.5">
                  Scan receipt barcode or enter invoice number above to load items for return.
                </p>
              </div>
            ) : (
              /* Active Invoice: Modern Minimal SINGLE-LINE Records Table */
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Minimal Header Bar */}
                <div className="px-2.5 py-1 border-b border-stone-200/80 bg-[#FAF7F2] flex items-center justify-between shrink-0 text-[10.5px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900">
                      #{activeSale.invoiceNumber}
                    </span>
                    <span className="text-zinc-400">&bull;</span>
                    <span className="text-zinc-500">{activeSale.date}</span>
                    <span className="text-zinc-400">&bull;</span>
                    <span className="text-zinc-500">{activeSale.timestamp}</span>
                    <span className="text-zinc-400">&bull;</span>
                    <span className="text-zinc-500">{activeSale.cashier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">
                      Total: <strong className="font-mono text-zinc-900">Rs. {activeSale.total.toLocaleString()}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSale(null);
                        setInvoiceQuery('');
                      }}
                      className="font-bold text-zinc-400 hover:text-rose-600 cursor-pointer ml-1"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* SINGLE LINE TABLE FOR PRODUCTS */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <table className="w-full border-collapse text-left table-fixed">
                    <thead className="sticky top-0 z-10 bg-[#FAF7F2] border-b border-stone-200/70 shadow-2xs text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-1 px-2 w-[5%] text-center"></th>
                        <th className="py-1 px-2 w-[34%]">Product Item</th>
                        <th className="py-1 px-1.5 w-[14%] font-mono">Bought</th>
                        <th className="py-1 px-1.5 w-[14%] text-center">Return Qty</th>
                        <th className="py-1 px-1.5 w-[18%]">Reason</th>
                        <th className="py-1 px-1.5 w-[15%] text-center">Restock?</th>
                        <th className="py-1 px-2 w-[14%] text-right font-mono">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-[10.5px]">
                      {activeSale.items.map((item) => {
                        const cfg = returnConfig[item.id] || {
                          selected: false,
                          returnQty: 1,
                          reason: RETURN_REASONS[0],
                          returnToStock: true,
                        };

                        return (
                          <tr
                            key={item.id}
                            onClick={() => toggleSelectProduct(item.id)}
                            className={`h-8 transition-colors cursor-pointer ${
                              cfg.selected ? 'bg-orange-50/25' : 'hover:bg-stone-50/60'
                            }`}
                          >
                            {/* Col 1: Checkbox */}
                            <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleSelectProduct(item.id)}
                                className="cursor-pointer inline-flex items-center"
                              >
                                {cfg.selected ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-[#FF5500]" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                                )}
                              </button>
                            </td>

                            {/* Col 2: Product Name & Weight (ONE LINE) */}
                            <td className="py-1 px-2 truncate" title={`${item.product.name} (${item.product.weight})`}>
                              <span className={`font-bold truncate block ${cfg.selected ? 'text-zinc-900' : 'text-zinc-700'}`}>
                                {item.product.name}
                                <span className="text-[9.5px] font-normal text-zinc-400 ml-1">
                                  ({item.product.weight})
                                </span>
                              </span>
                            </td>

                            {/* Col 3: Purchased Qty & Price */}
                            <td className="py-1 px-1.5 font-mono text-zinc-500 whitespace-nowrap text-[10px]">
                              {item.quantity} &times; Rs. {item.unitPrice}
                            </td>

                            {/* Col 4: Return Qty Stepper (Single-line interactive) */}
                            <td className="py-1 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              {cfg.selected ? (
                                <div className="inline-flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => updateQty(item.id, item.quantity, -1)}
                                    className="w-4 h-4 rounded bg-stone-100 hover:bg-stone-200 text-zinc-700 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="w-5 text-center font-mono font-bold text-[10.5px]">
                                    {cfg.returnQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQty(item.id, item.quantity, 1)}
                                    className="w-4 h-4 rounded bg-stone-100 hover:bg-stone-200 text-zinc-700 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-zinc-300 font-mono text-[10px]">-</span>
                              )}
                            </td>

                            {/* Col 5: Reason Dropdown */}
                            <td className="py-1 px-1.5" onClick={(e) => e.stopPropagation()}>
                              {cfg.selected ? (
                                <select
                                  value={cfg.reason}
                                  onChange={(e) => updateReason(item.id, e.target.value)}
                                  className="w-full h-5 px-1 rounded border border-stone-200 bg-white text-[9.5px] font-medium text-zinc-800 focus:outline-none"
                                >
                                  {RETURN_REASONS.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-zinc-300 text-[10px]">-</span>
                              )}
                            </td>

                            {/* Col 6: Restock Condition Pill Toggle */}
                            <td className="py-1 px-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              {cfg.selected ? (
                                <button
                                  type="button"
                                  onClick={() => updateReturnToStock(item.id, !cfg.returnToStock)}
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition-colors ${
                                    cfg.returnToStock
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                                  }`}
                                  title="Click to toggle condition"
                                >
                                  {cfg.returnToStock ? 'Shelf' : 'Damaged'}
                                </button>
                              ) : (
                                <span className="text-zinc-300 text-[10px]">-</span>
                              )}
                            </td>

                            {/* Col 7: Refund Value */}
                            <td className="py-1 px-2 text-right font-mono font-bold whitespace-nowrap">
                              <span className={cfg.selected ? 'text-zinc-900 font-black' : 'text-zinc-400'}>
                                Rs. {(item.unitPrice * (cfg.selected ? cfg.returnQty : item.quantity)).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Minimal Single-Line Exchange Picker (Only shown when Exchange resolution selected) */}
                {resolutionType === 'exchange' && (
                  <div className="px-2.5 py-1.5 border-t border-purple-200 bg-purple-50/40 flex items-center gap-2 text-xs shrink-0">
                    <span className="text-[10px] font-bold text-purple-950 uppercase tracking-wide shrink-0">
                      Exchange With:
                    </span>
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type="text"
                        value={exchangeSearchQuery}
                        onChange={(e) => setExchangeSearchQuery(e.target.value)}
                        placeholder="Type to search replacement..."
                        className="w-full h-6 px-2 rounded border border-purple-200 bg-white text-[11px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {exchangeSearchQuery && filteredExchangeProducts.length > 0 && !selectedExchangeProduct && (
                        <div className="absolute left-0 bottom-7 w-64 max-h-32 overflow-y-auto bg-white border border-stone-200 rounded shadow-md z-20">
                          {filteredExchangeProducts.slice(0, 5).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedExchangeProduct(p);
                                setExchangeSearchQuery('');
                              }}
                              className="w-full px-2 py-1 text-left text-[10.5px] hover:bg-purple-50 flex justify-between cursor-pointer"
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="font-mono font-bold ml-1">Rs. {p.price}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedExchangeProduct ? (
                      <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
                        <span className="font-bold text-zinc-800 truncate max-w-[140px]">
                          {selectedExchangeProduct.name}
                        </span>
                        <span className={`font-black ${
                          exchangePriceDifference > 0
                            ? 'text-amber-700'
                            : exchangePriceDifference < 0
                            ? 'text-emerald-700'
                            : 'text-zinc-700'
                        }`}>
                          ({exchangePriceDifference > 0 ? `+Rs. ${exchangePriceDifference}` : exchangePriceDifference < 0 ? `-Rs. ${Math.abs(exchangePriceDifference)}` : 'Rs. 0'})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedExchangeProduct(null)}
                          className="text-zinc-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-purple-700 italic">Select replacement product</span>
                    )}
                  </div>
                )}

                {/* Minimal Single-Line Bottom Summary Bar */}
                <div className="px-2.5 py-1.5 border-t border-stone-200/80 bg-white flex items-center justify-between gap-2 shrink-0">
                  {/* Resolution 3-Button Toggle */}
                  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-md text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setResolutionType('refund')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                        resolutionType === 'refund'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolutionType('same_replacement')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                        resolutionType === 'same_replacement'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Same Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolutionType('exchange')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                        resolutionType === 'exchange'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Exchange
                    </button>
                  </div>

                  {/* Summary amount */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-500 text-[11px]">Total Return:</span>
                    <span className="font-mono font-black text-zinc-900">
                      Rs. {totalRefund.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Send Action */}
                  <button
                    type="button"
                    onClick={handleSubmitReturn}
                    disabled={
                      selectedCount === 0 ||
                      (resolutionType === 'exchange' && !selectedExchangeProduct)
                    }
                    className="px-3.5 h-7 rounded-md bg-[#FF5500] hover:bg-[#e04b00] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Send to Admin for Approval
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* RIGHT PANEL: Modern Minimal Single-Line Return Status    */}
          {/* ======================================================== */}
          <div className="w-full md:w-[390px] lg:w-[430px] flex flex-col bg-white rounded-lg border border-stone-200/90 shadow-2xs min-h-0 overflow-hidden shrink-0">
            {/* Minimal Header */}
            <div className="px-2.5 py-1 border-b border-stone-200/80 bg-[#FAF7F2] flex items-center justify-between shrink-0 text-[10.5px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-900">Return Status</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-black">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {returnRequests.length} total records
              </span>
            </div>

            {/* SINGLE-LINE TABLE FOR RETURN STATUS RECORDS */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {returnRequests.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <Package className="w-6 h-6 mx-auto mb-1 text-zinc-300 stroke-1" />
                  <p className="text-xs font-semibold text-zinc-600">No Return Records</p>
                  <p className="text-[10.5px] text-zinc-400 mt-0.5">
                    Submitted return tickets will appear here with live status updates.
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left table-fixed">
                  <thead className="sticky top-0 z-10 bg-[#FAF7F2] border-b border-stone-200/70 shadow-2xs text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-1 px-2 w-[22%]">Ticket</th>
                      <th className="py-1 px-1.5 w-[20%]">Bill</th>
                      <th className="py-1 px-1.5 w-[28%]">Resolution</th>
                      <th className="py-1 px-1.5 w-[16%] text-center">Status</th>
                      <th className="py-1 px-1.5 w-[14%] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-[10px]">
                    {returnRequests.map((req) => {
                      const isPending = req.status === 'Pending Admin Approval';
                      const isApproved = req.status === 'Approved';
                      const isRejected = req.status === 'Rejected';
                      const isDisbursed = completedTickets[req.id];

                      return (
                        <tr
                          key={req.id}
                          className={`h-8 transition-colors ${
                            isPending
                              ? 'bg-amber-50/20 hover:bg-amber-50/40'
                              : isApproved
                              ? 'bg-emerald-50/15 hover:bg-emerald-50/30'
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          {/* Col 1: Ticket Code & Time */}
                          <td className="py-1 px-2 whitespace-nowrap font-mono">
                            <span className="font-bold text-zinc-900 block leading-tight truncate">
                              {req.returnCode}
                            </span>
                            <span className="text-[8.5px] text-zinc-400 block leading-tight">
                              {req.timestamp.split(',')[0]}
                            </span>
                          </td>

                          {/* Col 2: Invoice & First item */}
                          <td className="py-1 px-1.5 truncate">
                            <span className="font-mono font-bold text-zinc-800 block leading-tight truncate">
                              {req.invoiceNumber}
                            </span>
                            <span className="text-[8.5px] text-zinc-400 block leading-tight truncate" title={req.items[0]?.productName}>
                              {req.items[0]?.productName?.split(' ')[0]}...
                            </span>
                          </td>

                          {/* Col 3: Resolution */}
                          <td className="py-1 px-1.5 truncate font-mono">
                            {req.resolutionType === 'same_replacement' ? (
                              <span className="text-blue-700 font-bold block leading-tight truncate">
                                Same (Rs. 0)
                              </span>
                            ) : req.resolutionType === 'exchange' ? (
                              <span className="text-purple-700 font-bold block leading-tight truncate" title={req.exchangeItem?.productName}>
                                Exch: {req.exchangeItem?.productName?.split(' ')[0]} ({(req.exchangeItem?.priceDifference || 0) >= 0 ? `+${req.exchangeItem?.priceDifference}` : req.exchangeItem?.priceDifference})
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-black block leading-tight truncate">
                                Cash Rs. {req.totalRefund.toLocaleString()}
                              </span>
                            )}
                            <span className="text-[8px] text-zinc-400 uppercase font-sans font-semibold block leading-tight">
                              {req.resolutionType || 'Refund'}
                            </span>
                          </td>

                          {/* Col 4: Status (Clean single-line label) */}
                          <td className="py-1 px-1.5 text-center whitespace-nowrap">
                            {isPending ? (
                              <span className="text-[9.5px] font-bold text-amber-700 inline-flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> Pending
                              </span>
                            ) : isApproved ? (
                              <span className="text-[9.5px] font-bold text-emerald-700 inline-flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                              </span>
                            ) : (
                              <span className="text-[9.5px] font-bold text-rose-700 inline-flex items-center gap-0.5">
                                <XCircle className="w-2.5 h-2.5" /> Rejected
                              </span>
                            )}
                          </td>

                          {/* Col 5: Actions */}
                          <td className="py-1 px-1.5 text-right whitespace-nowrap">
                            {isPending ? (
                              <span className="text-[9.5px] text-zinc-400 font-mono">-</span>
                            ) : isApproved ? (
                              <div className="flex items-center justify-end">
                                {!isDisbursed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDisburseAndComplete(req)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-bold cursor-pointer shadow-2xs transition-colors"
                                    title="Disburse & Complete"
                                  >
                                    Pay
                                  </button>
                                ) : (
                                  <span className="text-emerald-700 text-[9.5px] font-bold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Done
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[9px] text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Orange App Footer */}
      <AppFooter />
    </div>
  );
};
