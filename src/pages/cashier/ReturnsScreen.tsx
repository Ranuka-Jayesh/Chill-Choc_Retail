import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSales } from '@/stores/salesStore';
import { useReturns } from '@/stores/returnsStore';
import { useCashier } from '@/stores/cashierStore';
import { useToast } from '@/stores/toastStore';
import { CashierHeader } from '@/components/pos/CashierHeader';
import { AppFooter } from '@/components/common/AppFooter';
import { CompletedSale, ReturnItem } from '@/types';
import {
  ArrowLeft,
  Search,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ScanLine,
  CheckSquare,
  Square,
  Minus,
  Plus,
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
  const { getSaleByInvoice, sales } = useSales();
  const { submitReturnRequest } = useReturns();
  const { cashier, recordRefundCash } = useCashier();
  const { showToast } = useToast();

  const [invoiceQuery, setInvoiceQuery] = useState(searchParams.get('invoice') || 'INV-001829');
  const [activeSale, setActiveSale] = useState<CompletedSale | null>(null);

  // Selected return items state: Record<cartItemId, { selected: boolean; returnQty: number; reason: string; returnToStock: boolean; noStockReason: string }>
  const [returnConfig, setReturnConfig] = useState<
    Record<
      string,
      {
        selected: boolean;
        returnQty: number;
        reason: string;
        returnToStock: boolean;
        noStockReason: string;
      }
    >
  >({});

  // Submission result state
  const [submittedReturnCode, setSubmittedReturnCode] = useState<string | null>(null);

  // Auto load if initial query provided
  useEffect(() => {
    if (invoiceQuery) {
      handleSearchInvoice(invoiceQuery);
    }
  }, []);

  const handleSearchInvoice = (queryStr: string) => {
    const sale = getSaleByInvoice(queryStr);
    if (sale) {
      setActiveSale(sale);
      setSubmittedReturnCode(null);
      // Initialize returnConfig
      const init: typeof returnConfig = {};
      sale.items.forEach((item) => {
        init[item.id] = {
          selected: false,
          returnQty: 1,
          reason: RETURN_REASONS[0],
          returnToStock: true,
          noStockReason: '',
        };
      });
      setReturnConfig(init);
    } else {
      setActiveSale(null);
      showToast(`Invoice "${queryStr}" not found. Try INV-001829`, 'error');
    }
  };

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

  const updateNoStockReason = (itemId: string, noStockReason: string) => {
    setReturnConfig((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        noStockReason,
      },
    }));
  };

  // Calculate total refund
  const totalRefund = React.useMemo(() => {
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

  const handleSubmit = () => {
    if (!activeSale || selectedCount === 0) return;

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

    const req = submitReturnRequest({
      invoiceNumber: activeSale.invoiceNumber,
      items: returnItems,
      totalRefund,
      submittedBy: cashier.name,
    });

    setSubmittedReturnCode(req.returnCode);
    recordRefundCash(totalRefund);
    showToast(`Return request ${req.returnCode} submitted for approval`, 'warning');
  };

  return (
    <div className="min-h-screen w-full bg-brand-bg flex flex-col select-none font-sans">
      <CashierHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cashier/pos')}
              className="p-2 rounded-xl bg-white border border-brand-border text-brand-brown hover:bg-brand-bg hover:text-brand-teal transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to POS</span>
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-brand-brown tracking-tight flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-500" />
                <span>Return / Refund Desk</span>
              </h2>
              <p className="text-xs text-brand-muted">
                Scan customer receipt barcode or search invoice to initiate return
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Lookup Form */}
        <div className="mt-4 bg-white rounded-2xl border border-brand-border p-4 shadow-subtle">
          <label className="block text-xs font-bold text-brand-brown mb-1.5">
            Search Original Sale
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-3" />
              <input
                type="text"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice(invoiceQuery)}
                placeholder="Scan receipt barcode or enter invoice number (e.g. INV-001829)..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-brand-border bg-brand-bg/30 text-xs font-mono font-bold text-brand-brown focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
            <button
              onClick={() => handleSearchInvoice(invoiceQuery)}
              className="px-5 h-10 rounded-xl bg-brand-teal hover:bg-brand-teal-dark text-white font-bold text-xs transition-colors shadow-2xs"
            >
              Load Sale
            </button>
          </div>

          {/* Quick Mock Sample Pills */}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-brand-muted">
            <span>Quick samples:</span>
            {sales.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setInvoiceQuery(s.invoiceNumber);
                  handleSearchInvoice(s.invoiceNumber);
                }}
                className="px-2 py-0.5 rounded-lg bg-brand-bg hover:bg-brand-bg-warm text-brand-teal font-mono font-bold border border-brand-border"
              >
                {s.invoiceNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Submitted Success Banner */}
        {submittedReturnCode && (
          <div className="mt-4 p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-amber-950">
                    RETURN REQUEST SUBMITTED
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono text-xs font-bold">
                    {submittedReturnCode}
                  </span>
                </div>
                <p className="text-xs text-amber-900 font-bold mt-1">
                  Status: Pending Admin Approval
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  This return ticket has been logged in the management ledger. Cash/Card refund will be disbursed once reviewed by the store manager.
                </p>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setSubmittedReturnCode(null);
                      setActiveSale(null);
                      setInvoiceQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-950 text-xs font-bold hover:bg-amber-100"
                  >
                    Start Another Return
                  </button>
                  <button
                    onClick={() => navigate('/cashier/pos')}
                    className="px-4 py-2 rounded-xl bg-brand-teal text-white text-xs font-bold hover:bg-brand-teal-dark shadow-xs"
                  >
                    Return to POS Terminal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loaded Invoice Items */}
        {activeSale && !submittedReturnCode && (
          <div className="mt-4 bg-white rounded-2xl border border-brand-border p-5 shadow-subtle space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-brand-border-subtle gap-2">
              <div>
                <span className="text-sm font-extrabold text-brand-brown font-mono">
                  Invoice #{activeSale.invoiceNumber}
                </span>
                <p className="text-xs text-brand-muted mt-0.5">
                  {activeSale.date} &bull; {activeSale.timestamp} &bull; Cashier: {activeSale.cashier}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-brand-muted block">Original Total</span>
                <span className="text-base font-mono font-bold text-brand-brown">
                  Rs. {activeSale.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Instruction */}
            <div className="text-xs text-brand-muted">
              Select the confectionery products being returned and specify return conditions:
            </div>

            {/* Product Checkbox Selection List */}
            <div className="space-y-3">
              {activeSale.items.map((item) => {
                const cfg = returnConfig[item.id] || {
                  selected: false,
                  returnQty: 1,
                  reason: RETURN_REASONS[0],
                  returnToStock: true,
                  noStockReason: '',
                };

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      cfg.selected
                        ? 'border-brand-teal bg-brand-teal-light/20 shadow-2xs'
                        : 'border-brand-border bg-brand-bg/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Checkbox & Product Name */}
                      <button
                        type="button"
                        onClick={() => toggleSelectProduct(item.id)}
                        className="flex items-center gap-3 text-left"
                      >
                        {cfg.selected ? (
                          <CheckSquare className="w-5 h-5 text-brand-teal flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-brand-muted flex-shrink-0" />
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-brand-brown">
                            {item.product.name}
                          </h4>
                          <span className="text-[11px] text-brand-muted font-mono">
                            Purchased: {item.quantity} &times; Rs. {item.unitPrice.toLocaleString()} ({item.product.weight})
                          </span>
                        </div>
                      </button>

                      {/* Line Total */}
                      <span className="font-mono text-xs font-bold text-brand-brown tabular-numbers">
                        Rs. {(item.unitPrice * (cfg.selected ? cfg.returnQty : item.quantity)).toLocaleString()}
                      </span>
                    </div>

                    {/* Return Details Form (Only visible when checked) */}
                    {cfg.selected && (
                      <div className="mt-4 pt-3 border-t border-brand-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* Return Qty Stepper */}
                        <div>
                          <label className="block text-[11px] font-bold text-brand-brown mb-1">
                            Return Qty
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQty(item.id, item.quantity, -1)}
                              className="w-7 h-7 rounded-lg bg-white border border-brand-border text-brand-brown flex items-center justify-center hover:bg-brand-bg active:scale-95"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-10 text-center font-mono font-bold text-xs">
                              {cfg.returnQty}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, item.quantity, 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-brand-border text-brand-brown flex items-center justify-center hover:bg-brand-bg active:scale-95"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] text-brand-muted ml-1 font-medium">
                              (Max {item.quantity})
                            </span>
                          </div>
                        </div>

                        {/* Return Reason Dropdown */}
                        <div>
                          <label className="block text-[11px] font-bold text-brand-brown mb-1">
                            Reason
                          </label>
                          <select
                            value={cfg.reason}
                            onChange={(e) => updateReason(item.id, e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-brand-border bg-white text-xs font-medium text-brand-brown focus:ring-1 focus:ring-brand-teal"
                          >
                            {RETURN_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Return to Stock */}
                        <div>
                          <label className="block text-[11px] font-bold text-brand-brown mb-1">
                            Return to Stock?
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateReturnToStock(item.id, true)}
                              className={`flex-1 py-1 rounded-lg border text-xs font-bold transition-colors ${
                                cfg.returnToStock
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                  : 'border-brand-border bg-white text-brand-muted'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => updateReturnToStock(item.id, false)}
                              className={`flex-1 py-1 rounded-lg border text-xs font-bold transition-colors ${
                                !cfg.returnToStock
                                  ? 'border-rose-600 bg-rose-50 text-rose-800'
                                  : 'border-brand-border bg-white text-brand-muted'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {/* If No Stock reason */}
                        {!cfg.returnToStock && (
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-rose-700 mb-1">
                              Reason for Not Restocking (Damaged / Expired / Disposed) *
                            </label>
                            <input
                              type="text"
                              value={cfg.noStockReason}
                              onChange={(e) => updateNoStockReason(item.id, e.target.value)}
                              placeholder="e.g. Melted packaging / broken seals"
                              className="w-full h-8 px-2.5 rounded-lg border border-rose-300 bg-rose-50/40 text-xs text-brand-brown"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Refund & Admin Approval Alert */}
            <div className="pt-4 border-t border-brand-border space-y-3">
              {/* Important Admin Approval Message */}
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-semibold">
                  <strong>Notice:</strong> Returns require Admin approval.
                </span>
              </div>

              {/* Total Refund Amount and Submit Button */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-brown block">
                    Calculated Refund Amount
                  </span>
                  <span className="text-lg font-extrabold text-brand-brown font-mono tabular-numbers">
                    Rs. {totalRefund.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={selectedCount === 0}
                  className="h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wide uppercase transition-all shadow-sm"
                >
                  Submit Return Request
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Orange Footer */}
      <AppFooter />
    </div>
  );
};
