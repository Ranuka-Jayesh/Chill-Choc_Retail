import React, { useState, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useProducts } from '@/stores/productStore';
import { useSuppliers } from '@/stores/supplierStore';
import { usePurchaseOrders } from '@/stores/purchaseOrderStore';
import { useToast } from '@/stores/toastStore';
import { PurchaseOrder, PurchaseOrderItem, POPaymentBreakdown } from '@/types';
import { MonthYearPicker } from '@/components/common/MonthYearPicker';
import {
  Boxes,
  Building2,
  Package,
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  Landmark,
  CreditCard,
  Banknote,
  FileText,
  Trash2,
  X,
  Eye,
  Percent,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';

export const AdminRestock: React.FC = () => {
  const { products, restockProduct } = useProducts();
  const { suppliers, addSupplier } = useSuppliers();
  const { purchaseOrders, addPurchaseOrder } = usePurchaseOrders();
  const { showToast } = useToast();

  // Search filter & focus state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);

  // New Supplier Quick Form State
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');

  // --- Goods Inward Studio Form State ---
  const [studioSupplierId, setStudioSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [invoiceRef, setInvoiceRef] = useState<string>('INV-5500');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isUnpaidCredit, setIsUnpaidCredit] = useState(false);

  // Payment Breakdown
  const [cashAmount, setCashAmount] = useState<string>('0');
  const [cardAmount, setCardAmount] = useState<string>('0');
  const [chequeAmount, setChequeAmount] = useState<string>('0');
  const [chequeDueDate, setChequeDueDate] = useState<string>('Sep 3');
  const [chequeNumber, setChequeNumber] = useState<string>('CHQ-98402');

  // Line items state
  interface DraftLineItem {
    id: string;
    productId: string;
    batchNumber: string;
    expiryDate: string;
    costPrice: number;
    profitMargin: number;
    sellingPrice: number;
    quantity: number;
  }

  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);

  // Open Studio with fresh/clean state
  const handleOpenStudio = () => {
    const randomInv = Math.floor(1000 + Math.random() * 9000);
    setInvoiceRef(`INV-${randomInv}`);
    setDeliveryNotes('');
    setIsUnpaidCredit(false);
    setCashAmount('0');
    setCardAmount('0');
    setChequeAmount('0');
    setChequeDueDate('Sep 3');
    setChequeNumber(`CHQ-${Math.floor(10000 + Math.random() * 90000)}`);
    setLineItems([]);
    setStudioSupplierId(suppliers[0]?.id || '');
    setIsStudioOpen(true);
  };

  // Add Item to Studio
  const handleAddLineItem = () => {
    const defaultProd = products[0];
    if (!defaultProd) {
      showToast('No products available to restock', 'error');
      return;
    }

    const cost = defaultProd.costPrice && defaultProd.costPrice > 0
      ? defaultProd.costPrice
      : Math.round(defaultProd.price * 0.78);
    const margin = 25;
    const selling = defaultProd.price > 0 ? defaultProd.price : Math.round(cost * (1 + margin / 100));

    const today = new Date();
    const expiryYear = today.getFullYear() + 1;
    const defaultExpiry = `15 May ${expiryYear}`;

    const newItem: DraftLineItem = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: defaultProd.id,
      batchNumber: `LOT-${defaultProd.sku.replace('CC-', '')}-${today.getMonth() + 1}${today.getDate()}`,
      expiryDate: defaultExpiry,
      costPrice: cost,
      profitMargin: margin,
      sellingPrice: selling,
      quantity: 20,
    };

    setLineItems((prev) => [...prev, newItem]);
  };

  // Update Line Item
  const handleUpdateLineItem = (id: string, updates: Partial<DraftLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // If product changed, update default batch & cost
        if (updates.productId && updates.productId !== item.productId) {
          const prod = products.find((p) => p.id === updates.productId);
          if (prod) {
            const cost = prod.costPrice && prod.costPrice > 0 ? prod.costPrice : Math.round(prod.price * 0.78);
            const margin = item.profitMargin || 25;
            const selling = prod.price > 0 ? prod.price : Math.round(cost * (1 + margin / 100));
            updated.costPrice = cost;
            updated.sellingPrice = selling;
            updated.batchNumber = `LOT-${prod.sku.replace('CC-', '')}-${new Date().getMonth() + 1}${new Date().getDate()}`;
          }
        }

        // If cost or margin changed, auto-recalculate selling price
        if (updates.costPrice !== undefined || updates.profitMargin !== undefined) {
          const cost = updated.costPrice || 0;
          const margin = updated.profitMargin || 0;
          updated.sellingPrice = Math.round(cost * (1 + margin / 100));
        }

        return updated;
      })
    );
  };

  // Remove Line Item
  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Totals calculations
  const totalInvoiced = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  }, [lineItems]);

  const numCash = parseFloat(cashAmount) || 0;
  const numCard = parseFloat(cardAmount) || 0;
  const numCheque = parseFloat(chequeAmount) || 0;
  const totalPaid = isUnpaidCredit ? 0 : numCash + numCard + numCheque;
  const balanceDue = Math.max(0, totalInvoiced - totalPaid);

  // Autofill full amount for payment methods
  const handleAutofillPayment = (type: 'cash' | 'card' | 'cheque') => {
    if (isUnpaidCredit) setIsUnpaidCredit(false);
    const remainingToPay = Math.max(0, totalInvoiced - (
      (type === 'cash' ? 0 : numCash) +
      (type === 'card' ? 0 : numCard) +
      (type === 'cheque' ? 0 : numCheque)
    ));

    if (type === 'cash') setCashAmount(String(remainingToPay));
    if (type === 'card') setCardAmount(String(remainingToPay));
    if (type === 'cheque') setChequeAmount(String(remainingToPay));
  };

  // Toggle Unpaid (Credit)
  const handleToggleCredit = () => {
    if (!isUnpaidCredit) {
      setIsUnpaidCredit(true);
      setCashAmount('0');
      setCardAmount('0');
      setChequeAmount('0');
    } else {
      setIsUnpaidCredit(false);
    }
  };

  // Confirm and Receive Stock
  const handleConfirmRestock = () => {
    if (lineItems.length === 0) {
      showToast('Please add at least one line item to restock', 'error');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === studioSupplierId) || suppliers[0];

    // Restock each product in productStore
    const poItems: PurchaseOrderItem[] = [];

    for (const item of lineItems) {
      const prod = products.find((p) => p.id === item.productId);
      const prodName = prod?.name || 'Item';
      const prodWeight = prod?.weight || '';

      restockProduct({
        productId: item.productId,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        batchNumber: item.batchNumber.trim() || `LOT-${Date.now().toString().slice(-4)}`,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        expiryDate: item.expiryDate || 'N/A',
        quantity: item.quantity,
      });

      poItems.push({
        id: `poi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: item.productId,
        productName: prodName,
        weight: prodWeight,
        batchNumber: item.batchNumber.trim() || `LOT-${Date.now().toString().slice(-4)}`,
        expiryDate: item.expiryDate || 'N/A',
        quantity: item.quantity,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        subtotal: item.costPrice * item.quantity,
      });
    }

    const paymentBreakdown: POPaymentBreakdown = {
      cash: isUnpaidCredit ? 0 : numCash,
      card: isUnpaidCredit ? 0 : numCard,
      cheque: isUnpaidCredit ? 0 : numCheque,
      chequeDueDate: numCheque > 0 ? chequeDueDate : undefined,
      chequeNumber: numCheque > 0 ? chequeNumber : undefined,
    };

    const newPO = addPurchaseOrder({
      invoiceRef: invoiceRef.trim() || `INV-${Date.now().toString().slice(-4)}`,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      items: poItems,
      paymentBreakdown,
      isCredit: isUnpaidCredit,
      notes: deliveryNotes.trim(),
      verifiedBy: 'Store Manager',
    });

    showToast(
      `Purchase Order ${newPO.poNumber} confirmed! Received ${lineItems.length} products into unified stock.`,
      'success'
    );

    setIsStudioOpen(false);
  };

  // Create Supplier quick handler
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    const created = addSupplier({
      name: newSupName.trim(),
      contactPerson: newSupContact.trim() || 'General Sales',
      phone: newSupPhone.trim() || '+94 11 000 0000',
      status: 'Active',
    });

    setStudioSupplierId(created.id);
    showToast(`Supplier ${created.name} registered`, 'success');
    setIsNewSupplierModalOpen(false);
    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
  };

  // Filtered Purchase Orders
  const filteredPOs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return purchaseOrders;

    return purchaseOrders.filter((po) => {
      return (
        po.poNumber.toLowerCase().includes(query) ||
        po.invoiceRef.toLowerCase().includes(query) ||
        po.supplierName.toLowerCase().includes(query) ||
        po.paymentStatus.toLowerCase().includes(query) ||
        po.items.some((item) => item.productName.toLowerCase().includes(query))
      );
    });
  }, [purchaseOrders, searchQuery]);

  return (
    <AdminLayout
      title="Multi-Supplier Restock (GRN)"
      subtitle="Goods Receiving Notes, vendor inward deliveries, multi-supplier batch stock & payment settlements"
      mainClassName="flex-1 overflow-hidden p-3 sm:p-4 w-full flex flex-col min-h-0 h-full"
    >
      <div className="flex-1 flex flex-col min-h-0 w-full h-full">
        {/* Top Control Bar Separated From Table: Right-Side Top < Month > Button, No Background */}
        <div className="flex items-center justify-between gap-3 mb-2 px-1 select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700">Goods Receiving Notes</span>
            <span className="text-[10px] font-mono text-zinc-500 bg-stone-100 px-2 py-0.5 rounded-md font-semibold border border-stone-200/60">
              {filteredPOs.length} records
            </span>
          </div>

          {/* Right Side Top: < Month > navigator button */}
          <MonthYearPicker
            selectedDate={selectedMonth}
            onChange={(d) => setSelectedMonth(d)}
          />
        </div>

        {/* Purchase Orders / Goods Receiving Notes Ledger Table (Pure Table Card) */}
        <div className="flex-1 flex flex-col min-h-0 w-full h-full bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 w-full h-full">
            <table className="w-full border-collapse text-left min-w-[850px]">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                <tr className="bg-[#FAF7F2] border-b border-stone-200/70 shadow-2xs">
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Purchase / Invoice
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                    Supplier / Vendor
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Date / Time
                  </th>
                  <th className="py-2.5 px-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    Items
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
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPOs.length > 0 ? (
                  filteredPOs.map((po) => {
                    return (
                      <tr
                        key={po.id}
                        onClick={() => setViewingPO(po)}
                        className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                      >
                        {/* 1. PURCHASE / INVOICE */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-[11px] text-stone-900 leading-tight">
                            {po.poNumber}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-mono tracking-tight leading-none mt-0.5">
                            {po.invoiceRef}
                          </div>
                        </td>

                        {/* 2. SUPPLIER / VENDOR */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="text-[11px] font-semibold text-stone-800 leading-tight">
                            {po.supplierName}
                          </div>
                        </td>

                        {/* 3. DATE / TIME */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 leading-tight">
                            <span className="font-medium text-[11px] text-stone-700">{po.date}</span>
                            {po.isRolledOver && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300 font-mono leading-none">
                                Rolled Over
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-mono leading-none mt-0.5">
                            {po.time}
                          </div>
                        </td>

                        {/* 4. ITEMS */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80 leading-none">
                            {po.items.length} Items
                          </span>
                        </td>

                        {/* 5. TOTAL INVOICED */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <span className="font-bold text-stone-900 font-mono text-[11px] leading-tight">
                            Rs. {po.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* 6. PAID / BALANCE DUE */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-teal-600 font-mono text-[11px] leading-tight">
                            Paid: Rs. {po.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {po.paymentBreakdown?.cheque && po.paymentBreakdown.cheque > 0 && po.paymentStatus === 'CHEQUE PENDING' ? (
                            <div className="text-[9px] font-semibold text-amber-800 font-mono leading-none mt-0.5">
                              Pending Chq: Rs. {po.paymentBreakdown.cheque.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          ) : po.balanceDue > 0 ? (
                            <div className="text-[9px] font-semibold text-rose-600 font-mono leading-none mt-0.5">
                              Balance Due: Rs. {po.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          ) : null}
                        </td>

                        {/* 7. PAYMENT STATUS */}
                        <td className="py-2 px-3.5 whitespace-nowrap">
                          <div className="flex flex-col justify-center">
                            {po.paymentStatus === 'CHEQUE PENDING' && (
                              <>
                                <span className="border border-amber-300 bg-amber-50/70 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 leading-none w-fit">
                                  <Landmark className="w-2.5 h-2.5 text-amber-700" />
                                  <span>Cheque Pending</span>
                                </span>
                                {po.paymentBreakdown?.chequeDueDate && (
                                  <div className="text-[9px] text-amber-800 font-medium pl-1 leading-none mt-0.5">
                                    Due {po.paymentBreakdown.chequeDueDate}
                                  </div>
                                )}
                              </>
                            )}

                            {po.paymentStatus === 'PAID' && (
                              <span className="border border-emerald-300 bg-emerald-50/70 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 leading-none w-fit">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Paid</span>
                              </span>
                            )}

                            {po.paymentStatus === 'CREDIT' && (
                              <span className="border border-rose-300 bg-rose-50/70 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 leading-none w-fit">
                                <CreditCard className="w-2.5 h-2.5 text-rose-600" />
                                <span>Credit</span>
                              </span>
                            )}

                            {po.paymentStatus === 'PARTIAL' && (
                              <span className="border border-orange-300 bg-orange-50/70 text-orange-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 leading-none w-fit">
                                <AlertCircle className="w-2.5 h-2.5 text-orange-600" />
                                <span>Partial</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-zinc-600">No Purchase Orders found</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {searchQuery ? 'Try clearing or modifying your search filter.' : 'Receive your first goods inward batch to see records here.'}
                      </p>
                    </td>
                  </tr>
                )}
                {filteredPOs.length > 0 && (
                  <tr className="h-20 pointer-events-none">
                    <td colSpan={7} className="border-0 bg-transparent"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Bottom Center Search Pop-up Pill with + Add Button */}
      <div className="fixed bottom-7 sm:bottom-8 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-30 pointer-events-none">
        <div
          className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 pl-3.5 pr-[2px] sm:pr-[2px] h-11 sm:h-12 rounded-full bg-black/95 transition-all duration-300 ease-in-out will-change-[width] ${
            isSearchFocused || searchQuery.trim().length > 0
              ? 'w-[80vw] sm:w-[350px] shadow-2xl shadow-[#FF5500]/25 border-2 border-[#FF5500] ring-4 ring-[#FF5500]/20'
              : 'w-[215px] sm:w-[240px] shadow-2xl shadow-black/40 border-2 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Search
            className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
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
            placeholder="Search POs, vendors..."
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-bold text-[#FF5500] placeholder:text-zinc-500 placeholder:font-medium focus:outline-none caret-[#FF5500]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              title="Clear search"
            >
              <X className="w-3 h-3 text-[#FF5500]" />
            </button>
          )}

          {/* Add New Restock / PO Button */}
          <button
            type="button"
            onClick={handleOpenStudio}
            className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] aspect-square rounded-full bg-white hover:bg-orange-50 border-2 border-[#FF5500] inline-flex items-center justify-center p-0 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer flex-shrink-0"
            title="Receive Stock / New Purchase Order"
          >
            <Plus className="w-[18px] h-[18px] text-[#FF5500] stroke-[2.5] block shrink-0" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3-PANEL GOODS INWARD STUDIO MODAL (RECEIVE STOCK / PURCHASE ORDER)       */}
      {/* ========================================================================= */}
      {isStudioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#222120] text-white rounded-3xl overflow-hidden max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-zinc-700/60 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold text-white">
                  Receive Stock / Purchase Order
                </h2>
                <span className="bg-zinc-800 text-zinc-300 font-mono text-[10px] px-2.5 py-0.5 rounded-lg border border-zinc-700 font-medium">
                  Goods Inward Studio
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStudioOpen(false)}
                  className="px-4 py-1.5 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  disabled={lineItems.length === 0}
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 disabled:cursor-not-allowed"
                >
                  Confirm &amp; Update Stock
                </button>
              </div>
            </div>

            {/* 3-Panel Body Container on Warm Beige Backdrop */}
            <div className="bg-[#F5F2EB] p-4 sm:p-5 overflow-y-auto flex-1 text-stone-900 grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* ========================================== */}
              {/* PANEL 1: SUPPLIER & INVOICE DETAILS (Col 3) */}
              {/* ========================================== */}
              <div className="lg:col-span-3 flex flex-col justify-between bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs space-y-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/80 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-orange-700" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-800">
                      Supplier &amp; Invoice Details
                    </span>
                  </div>

                  {/* Supplier Select */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-700">
                        Supplier / Vendor *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsNewSupplierModalOpen(true)}
                        className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer"
                      >
                        + New
                      </button>
                    </div>
                    <select
                      value={studioSupplierId}
                      onChange={(e) => setStudioSupplierId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/60 font-semibold text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white cursor-pointer"
                    >
                      <option value="" disabled>-- Select Active Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Invoice / Bill Ref */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700">
                      Invoice / Bill Ref #
                    </label>
                    <input
                      type="text"
                      value={invoiceRef}
                      onChange={(e) => setInvoiceRef(e.target.value)}
                      placeholder="e.g., INV-5500"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono font-bold text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Delivery / PO Notes */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700">
                      Delivery / PO Notes
                    </label>
                    <textarea
                      rows={3}
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Batch #409, temperature check OK, received via cold truck..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>

                  {/* Chill & Choc Mascot Logo Graphic */}
                  <div className="pt-2 text-center">
                    <img
                      src="/logo.png"
                      alt="Chill & Choc"
                      className="w-20 h-20 object-contain mx-auto drop-shadow-xs"
                    />
                    <div className="font-black text-xs text-[#27140B] mt-1">Chill &amp; Choc</div>
                    <div className="text-[9px] font-bold text-orange-600 tracking-wider">
                      COOL VIBES, SWEET BITES
                    </div>
                  </div>
                </div>

                {/* Bottom Meta Box */}
                <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-stone-500">
                    <span>Receiving Date:</span>
                    <span className="font-mono font-bold text-stone-800">
                      {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-stone-500">
                    <span>Verified By:</span>
                    <span className="font-bold text-teal-600">Store Manager</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-500">
                    <span>Total Items:</span>
                    <span className="font-mono font-bold text-stone-800">
                      {lineItems.length} lines
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================== */}
              {/* PANEL 2: RECEIVED LINE ITEMS (Col 6)       */}
              {/* ========================================== */}
              <div className="lg:col-span-6 flex flex-col bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs min-h-[440px]">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/80 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-orange-700" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-800">
                      Received Line Items
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-3 py-1 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Line Items Container */}
                <div className="flex-1 flex flex-col justify-center py-3">
                  {lineItems.length === 0 ? (
                    <div className="border-2 border-dashed border-stone-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center my-auto flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200/60 flex items-center justify-center mb-3">
                        <Package className="w-6 h-6 text-stone-400 stroke-[1.5]" />
                      </div>
                      <p className="font-bold text-stone-700 text-xs">No Items Added</p>
                      <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
                        Click <span className="font-semibold text-teal-700">"+ Add Item"</span> above to select ingredients or confections being received.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {lineItems.map((item, idx) => {
                        const lineSubtotal = item.costPrice * item.quantity;
                        const profitPerUnit = Math.max(0, item.sellingPrice - item.costPrice);

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/40 hover:bg-white transition-all space-y-3 shadow-2xs"
                          >
                            {/* Row Header: Item # & Product Select & Delete */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-stone-400 w-5">
                                #{idx + 1}
                              </span>
                              <div className="flex-1">
                                <select
                                  value={item.productId}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, { productId: e.target.value })
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white font-bold text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.weight}) &bull; Current: {p.stock} units
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(item.id)}
                                title="Remove line item"
                                className="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Batch Number & Expiry Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-stone-500">
                                  Batch / Lot #
                                </label>
                                <input
                                  type="text"
                                  value={item.batchNumber}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, { batchNumber: e.target.value })
                                  }
                                  placeholder="LOT-KIT-840"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white font-mono text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-stone-500">
                                  Expiry Date
                                </label>
                                <input
                                  type="text"
                                  value={item.expiryDate}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, { expiryDate: e.target.value })
                                  }
                                  placeholder="e.g., 15 May 2027"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>
                            </div>

                            {/* Cost, Margin, Selling Price, and Quantity */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-stone-100 text-xs">
                              {/* Cost Price */}
                              <div>
                                <label className="text-[10px] font-bold text-stone-500">
                                  Cost / Unit (Rs.)
                                </label>
                                <input
                                  type="number"
                                  value={item.costPrice}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      costPrice: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white font-mono font-bold text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>

                              {/* Profit Margin % */}
                              <div>
                                <label className="text-[10px] font-bold text-stone-500">
                                  Margin %
                                </label>
                                <input
                                  type="number"
                                  value={item.profitMargin}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      profitMargin: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white font-mono font-bold text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>

                              {/* Selling Price */}
                              <div>
                                <label className="text-[10px] font-bold text-orange-700">
                                  Selling Price (Rs.)
                                </label>
                                <input
                                  type="number"
                                  value={item.sellingPrice}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      sellingPrice: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-orange-300 bg-orange-50/30 font-mono font-bold text-orange-950 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>

                              {/* Restock Qty */}
                              <div>
                                <label className="text-[10px] font-bold text-teal-700">
                                  Restock Qty
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      quantity: parseInt(e.target.value, 10) || 1,
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-teal-300 bg-teal-50/30 font-mono font-black text-teal-950 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </div>
                            </div>

                            {/* Subtotal bar */}
                            <div className="flex justify-between items-center text-[11px] pt-1 text-stone-500">
                              <span className="text-[10px] text-emerald-700 font-medium">
                                Profit: Rs. {profitPerUnit} / unit
                              </span>
                              <div className="font-mono font-bold text-stone-800">
                                Line Total: <span className="text-stone-900 font-black">Rs. {lineSubtotal.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer totals */}
                {lineItems.length > 0 && (
                  <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs">
                    <span className="text-stone-500">
                      Total Units: <strong className="text-stone-900">{lineItems.reduce((s, i) => s + i.quantity, 0)} units</strong>
                    </span>
                    <span className="font-mono font-bold text-stone-700">
                      Total Invoiced: <strong className="text-teal-700 text-sm">Rs. {totalInvoiced.toLocaleString()}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* ========================================== */}
              {/* PANEL 3: PAYMENT SETTLEMENT (Col 3)        */}
              {/* ========================================== */}
              <div className="lg:col-span-3 flex flex-col justify-between bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs space-y-4">
                <div className="space-y-4">
                  {/* Header & Unpaid (Credit) Toggle */}
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/80 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-orange-700" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-800">
                        Payment Settlement
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleCredit}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        isUnpaidCredit
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300'
                      }`}
                    >
                      Unpaid (Credit)
                    </button>
                  </div>

                  {/* Payment Methods Section */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] text-stone-400 uppercase tracking-wider font-bold">
                      <span>Payment Method Breakdown (Rs.)</span>
                      <span className="italic text-[9px] lowercase">Click "Full" to autofill</span>
                    </div>

                    {/* Cash Row */}
                    <div className={`p-2.5 rounded-xl border transition-all ${isUnpaidCredit ? 'opacity-40 pointer-events-none bg-stone-50 border-stone-200' : 'bg-stone-50/60 border-stone-200/90'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cash</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAutofillPayment('cash')}
                          className="text-[10px] font-bold font-mono px-2 py-0.2 rounded bg-white border border-stone-200 hover:border-stone-400 text-stone-600 cursor-pointer"
                        >
                          Full
                        </button>
                      </div>
                      <input
                        type="number"
                        value={cashAmount}
                        disabled={isUnpaidCredit}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right font-mono font-bold text-xs bg-transparent focus:outline-none text-stone-900"
                      />
                    </div>

                    {/* Card / Bank Row */}
                    <div className={`p-2.5 rounded-xl border transition-all ${isUnpaidCredit ? 'opacity-40 pointer-events-none bg-stone-50 border-stone-200' : 'bg-stone-50/60 border-stone-200/90'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                          <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                          <span>Card / Bank</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAutofillPayment('card')}
                          className="text-[10px] font-bold font-mono px-2 py-0.2 rounded bg-white border border-stone-200 hover:border-stone-400 text-stone-600 cursor-pointer"
                        >
                          Full
                        </button>
                      </div>
                      <input
                        type="number"
                        value={cardAmount}
                        disabled={isUnpaidCredit}
                        onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right font-mono font-bold text-xs bg-transparent focus:outline-none text-stone-900"
                      />
                    </div>

                    {/* Cheque Row */}
                    <div className={`p-2.5 rounded-xl border transition-all ${isUnpaidCredit ? 'opacity-40 pointer-events-none bg-stone-50 border-stone-200' : 'bg-stone-50/60 border-stone-200/90'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>Cheque</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAutofillPayment('cheque')}
                          className="text-[10px] font-bold font-mono px-2 py-0.2 rounded bg-white border border-stone-200 hover:border-stone-400 text-stone-600 cursor-pointer"
                        >
                          Full
                        </button>
                      </div>
                      <input
                        type="number"
                        value={chequeAmount}
                        disabled={isUnpaidCredit}
                        onChange={(e) => setChequeAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right font-mono font-bold text-xs bg-transparent focus:outline-none text-stone-900"
                      />

                      {/* Cheque detail fields if cheque > 0 */}
                      {numCheque > 0 && !isUnpaidCredit && (
                        <div className="mt-2 pt-2 border-t border-stone-200/60 grid grid-cols-2 gap-1.5 text-[10px]">
                          <div>
                            <span className="text-stone-400 block">Due Date:</span>
                            <input
                              type="text"
                              value={chequeDueDate}
                              onChange={(e) => setChequeDueDate(e.target.value)}
                              placeholder="e.g. Sep 3"
                              className="w-full bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-stone-800"
                            />
                          </div>
                          <div>
                            <span className="text-stone-400 block">Cheque #:</span>
                            <input
                              type="text"
                              value={chequeNumber}
                              onChange={(e) => setChequeNumber(e.target.value)}
                              placeholder="CHQ-98402"
                              className="w-full bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-stone-800"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Settlement Summary & Status Action */}
                <div className="space-y-3 pt-3 border-t border-stone-100 text-xs">
                  <div className="flex justify-between items-center text-stone-500">
                    <span>Total Invoiced:</span>
                    <span className="font-mono font-bold text-stone-900">
                      Rs. {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-stone-500">
                    <span>Total Paid:</span>
                    <span className="font-mono font-bold text-teal-600">
                      Rs. {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {balanceDue > 0 && (
                    <div className="flex justify-between items-center text-rose-700 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200/60 text-[11px]">
                      <span>Balance (Credit):</span>
                      <span className="font-mono font-bold">
                        Rs. {balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Primary Studio Action Button */}
                  <button
                    type="button"
                    onClick={handleConfirmRestock}
                    disabled={lineItems.length === 0}
                    className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold text-xs tracking-wide shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Boxes className="w-4 h-4 text-orange-400" />
                    <span>
                      {lineItems.length === 0
                        ? 'Add Items To Pay'
                        : `Receive & Settle (Rs. ${totalInvoiced.toLocaleString()})`}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PURCHASE ORDER INSPECTION / DETAILS MODAL                                 */}
      {/* ========================================================================= */}
      {viewingPO && (
        <Modal
          isOpen={true}
          onClose={() => setViewingPO(null)}
          title={`Purchase Order: ${viewingPO.poNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Meta Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200 text-stone-700">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Vendor</span>
                <strong className="text-stone-900">{viewingPO.supplierName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Bill Ref #</span>
                <span className="font-mono">{viewingPO.invoiceRef}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Date &amp; Time</span>
                <span>{viewingPO.date} &bull; {viewingPO.time}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Verified By</span>
                <span className="text-teal-700 font-bold">{viewingPO.verifiedBy}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-800 mb-2">
                Received Line Items ({viewingPO.items.length})
              </h4>
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-stone-200 text-[10px] text-stone-500 uppercase font-bold">
                    <tr>
                      <th className="py-2 px-3">Item Name</th>
                      <th className="py-2 px-3">Batch / Lot</th>
                      <th className="py-2 px-3">Expiry</th>
                      <th className="py-2 px-3 text-right">Cost Price</th>
                      <th className="py-2 px-3 text-right">Selling Price</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {viewingPO.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-bold text-stone-900">
                          {it.productName} {it.weight && `(${it.weight})`}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">{it.batchNumber}</td>
                        <td className="py-2 px-3 text-stone-600">{it.expiryDate || 'N/A'}</td>
                        <td className="py-2 px-3 text-right font-mono">Rs. {it.costPrice.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-orange-600 font-bold">
                          Rs. {it.sellingPrice.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                          Rs. {it.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Breakdown Info */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap justify-between items-center gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Payment Status
                </span>
                <span className="text-xs font-bold text-stone-900">
                  {viewingPO.paymentStatus}
                </span>
                {viewingPO.paymentBreakdown?.cheque && viewingPO.paymentBreakdown.cheque > 0 && (
                  <div className="text-[11px] text-amber-800">
                    Cheque: Rs. {viewingPO.paymentBreakdown.cheque.toLocaleString()} (Due {viewingPO.paymentBreakdown.chequeDueDate})
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-xs text-stone-500">
                  Total Invoiced: <strong className="font-mono text-stone-900">Rs. {viewingPO.totalInvoiced.toLocaleString()}</strong>
                </div>
                <div className="text-xs text-teal-600 font-bold">
                  Total Paid: <span className="font-mono">Rs. {viewingPO.totalPaid.toLocaleString()}</span>
                </div>
                {viewingPO.balanceDue > 0 && (
                  <div className="text-xs text-rose-600 font-bold">
                    Balance Due: <span className="font-mono">Rs. {viewingPO.balanceDue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {viewingPO.notes && (
              <div className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                <strong className="text-stone-700">Notes:</strong> {viewingPO.notes}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPO(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* QUICK ADD SUPPLIER MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewSupplierModalOpen}
        onClose={() => setIsNewSupplierModalOpen(false)}
        title="Register New Supplier"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700">Company / Supplier Name *</label>
            <input
              type="text"
              value={newSupName}
              onChange={(e) => setNewSupName(e.target.value)}
              placeholder="e.g., Harischandra Mills PLC"
              required
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700">Contact Person</label>
            <input
              type="text"
              value={newSupContact}
              onChange={(e) => setNewSupContact(e.target.value)}
              placeholder="e.g., Sunil Perera"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700">Phone Number</label>
            <input
              type="text"
              value={newSupPhone}
              onChange={(e) => setNewSupPhone(e.target.value)}
              placeholder="e.g., +94 77 123 4567"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsNewSupplierModalOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};
