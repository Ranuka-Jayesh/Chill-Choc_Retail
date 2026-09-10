import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Supplier, CartItem, ProductBatch } from '@/types';
import { isBatchExpired } from '@/stores/productStore';
import { Search, Check, Truck, X, ArrowLeft, Package, ChevronRight } from 'lucide-react';

export interface ProductBatchOption extends ProductBatch {
  inCartQty: number;
  stock: number; // available stock (quantityRemaining - inCartQty)
  isStockOver: boolean;
}

export interface ProductSupplierOption {
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  batchNumber?: string;
  batchId?: string;
  batchCount: number;
  batches?: ProductBatch[];
  totalStock: number;
  inCartQty: number;
  stock: number; // available stock (totalStock - inCartQty)
  isStockOver: boolean;
  costPrice?: number;
  expiryDate?: string;
}

/**
 * Extracts unique supplier options for a product based on its batches and real-time cart allocations.
 */
export function getProductSupplierOptions(
  product: Product,
  allSuppliers: Supplier[] = [],
  cartItems: CartItem[] = []
): ProductSupplierOption[] {
  if (!product) return [];

  const inCartItem = cartItems.find((ci) => ci.product.id === product.id);
  const inCartAllocations = inCartItem?.batchAllocations || [];

  const getSupplierInCartQty = (sId: string, sName: string) => {
    return inCartAllocations
      .filter(
        (a) =>
          (a.supplierId && a.supplierId === sId) ||
          (a.supplierName && a.supplierName.toLowerCase() === sName.toLowerCase())
      )
      .reduce((sum, a) => sum + a.quantity, 0);
  };

  // 1. Group by suppliers from product batches
  if (product.batches && product.batches.length > 0) {
    const supplierMap = new Map<string, ProductSupplierOption>();

    for (const b of product.batches) {
      const sId = b.supplierId || b.supplierName;
      const matchedSup = allSuppliers.find(
        (s) =>
          (b.supplierId && s.id === b.supplierId) ||
          (b.supplierName && s.name.toLowerCase() === b.supplierName.toLowerCase())
      );

      const code =
        matchedSup?.code ||
        (b.batchNumber ? b.batchNumber.split('-').slice(0, 2).join('-') : 'SUP');

      if (supplierMap.has(sId)) {
        const item = supplierMap.get(sId)!;
        item.totalStock += b.quantityRemaining ?? 0;
        item.batchCount = (item.batchCount || 1) + 1;
        if (!item.batches) item.batches = [];
        item.batches.push(b);
      } else {
        supplierMap.set(sId, {
          supplierId: b.supplierId || sId,
          supplierName: b.supplierName || matchedSup?.name || sId,
          supplierCode: code,
          batchNumber: b.batchNumber,
          batchId: b.id,
          batchCount: 1,
          batches: [b],
          totalStock: b.quantityRemaining ?? 0,
          inCartQty: 0,
          stock: 0,
          isStockOver: false,
          costPrice: b.costPrice,
          expiryDate: b.expiryDate,
        });
      }
    }

    // Compute inCartQty, remaining available stock, and stock-over flags
    return Array.from(supplierMap.values()).map((opt) => {
      const inCart = getSupplierInCartQty(opt.supplierId, opt.supplierName);
      const available = Math.max(0, opt.totalStock - inCart);

      // Filter out out-of-stock batches so cashier only sees and chooses from in-stock batches
      const activeBatches = (opt.batches || []).filter((b) => {
        const batchInCart = inCartAllocations
          .filter(
            (a) =>
              (a.batchId && a.batchId === b.id) ||
              (a.batchNumber && a.batchNumber.toLowerCase() === b.batchNumber.toLowerCase())
          )
          .reduce((sum, a) => sum + a.quantity, 0);
        return (b.quantityRemaining ?? 0) - batchInCart > 0;
      });

      const firstActive = activeBatches[0];

      return {
        ...opt,
        batches: activeBatches,
        batchCount: activeBatches.length,
        batchNumber: firstActive ? firstActive.batchNumber : opt.batchNumber,
        batchId: firstActive ? firstActive.id : opt.batchId,
        costPrice: firstActive?.costPrice ?? opt.costPrice,
        expiryDate: firstActive?.expiryDate ?? opt.expiryDate,
        totalStock: activeBatches.reduce((sum, b) => sum + (b.quantityRemaining ?? 0), 0),
        inCartQty: inCart,
        stock: available,
        isStockOver: available <= 0,
      };
    });
  }

  // 2. Single supplier fallback
  if (product.supplierId || product.supplierName) {
    const matchedSup = allSuppliers.find((s) => s.id === product.supplierId);
    const inCart = inCartItem ? inCartItem.quantity : 0;
    const available = Math.max(0, product.stock - inCart);

    return [
      {
        supplierId: product.supplierId || 'sup-default',
        supplierName: product.supplierName || matchedSup?.name || 'Default Supplier',
        supplierCode: matchedSup?.code || 'SUP-01',
        batchNumber: product.barcode || product.sku || 'BATCH-01',
        batchCount: 1,
        batches: [],
        totalStock: product.stock,
        inCartQty: inCart,
        stock: available,
        isStockOver: available <= 0,
      },
    ];
  }

  return [];
}

interface SupplierSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  options: ProductSupplierOption[];
  cartItems?: CartItem[];
  initialStep?: 'supplier' | 'batch';
  initialSupplier?: ProductSupplierOption | null;
  onSelectSupplier: (option: ProductSupplierOption, selectedBatch?: ProductBatchOption | null) => void;
  onSupplierStockOver?: (
    exceededOption: ProductSupplierOption,
    availableOptions: ProductSupplierOption[],
    exceededBatch?: ProductBatchOption | null,
    availableBatches?: ProductBatchOption[]
  ) => void;
}

export const SupplierSelectModal: React.FC<SupplierSelectModalProps> = ({
  isOpen,
  onClose,
  product,
  options,
  cartItems = [],
  initialStep = 'supplier',
  initialSupplier = null,
  onSelectSupplier,
  onSupplierStockOver,
}) => {
  const [step, setStep] = useState<'supplier' | 'batch'>('supplier');
  const [selectedSupplier, setSelectedSupplier] = useState<ProductSupplierOption | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Initialize or reset modal state when opened
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setStep('supplier');
      setSelectedSupplier(null);
      return;
    }

    if (initialStep === 'batch' && initialSupplier) {
      setStep('batch');
      setSelectedSupplier(initialSupplier);
    } else if (options.length === 1 && options[0].batches && options[0].batches.length > 1) {
      // If product only has 1 supplier but that supplier has multiple batches, open batch select directly
      setStep('batch');
      setSelectedSupplier(options[0]);
    } else {
      setStep('supplier');
      setSelectedSupplier(null);
    }

    setSearch('');
    setSelectedIndex(0);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [isOpen, initialStep, initialSupplier, options]);

  // Compute live batch options for the selected supplier
  const currentBatchOptions = useMemo<ProductBatchOption[]>(() => {
    if (!selectedSupplier || !selectedSupplier.batches || !product) return [];

    const inCartItem = cartItems.find((ci) => ci.product.id === product.id);
    const inCartAllocations = inCartItem?.batchAllocations || [];

    return selectedSupplier.batches
      .map((b) => {
        const inCart = inCartAllocations
          .filter(
            (a) =>
              (a.batchId && a.batchId === b.id) ||
              (a.batchNumber && a.batchNumber.toLowerCase() === b.batchNumber.toLowerCase())
          )
          .reduce((sum, a) => sum + a.quantity, 0);

        const available = Math.max(0, (b.quantityRemaining ?? 0) - inCart);
        return {
          ...b,
          inCartQty: inCart,
          stock: available,
          isStockOver: available <= 0,
        };
      })
      .filter((b) => !b.isStockOver && b.stock > 0);
  }, [selectedSupplier, product, cartItems]);

  // Filter items based on active step and search query
  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const inStock = options.filter((opt) => !opt.isStockOver && opt.stock > 0);
    const baseList = inStock.length > 0 ? inStock : options;
    if (!query) return baseList;
    return baseList.filter((opt) => opt.supplierName.toLowerCase().includes(query));
  }, [options, search]);

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return currentBatchOptions;
    return currentBatchOptions.filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(query) ||
        (b.expiryDate && b.expiryDate.toLowerCase().includes(query))
    );
  }, [currentBatchOptions, search]);

  // Manage selectedIndex bounds when filtering
  const currentListLength = step === 'supplier' ? filteredSuppliers.length : filteredBatches.length;
  useEffect(() => {
    if (selectedIndex >= currentListLength) {
      setSelectedIndex(Math.max(0, currentListLength - 1));
    }
  }, [currentListLength, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen, step]);

  const handleChooseSupplier = (chosen: ProductSupplierOption) => {
    // If supplier is completely out of stock
    if (chosen.isStockOver || chosen.stock <= 0) {
      const availableSuppliers = options.filter((o) => !o.isStockOver && o.stock > 0);
      if (onSupplierStockOver) {
        onSupplierStockOver(chosen, availableSuppliers, null, []);
      }
      return;
    }

    const inCartItem = cartItems.find((ci) => ci.product.id === product?.id);
    const inCartAllocations = inCartItem?.batchAllocations || [];

    // Filter in-stock batches
    const inStockBatches = (chosen.batches || []).filter((b) => {
      const inCart = inCartAllocations
        .filter(
          (a) =>
            (a.batchId && a.batchId === b.id) ||
            (a.batchNumber && a.batchNumber.toLowerCase() === b.batchNumber.toLowerCase())
        )
        .reduce((sum, a) => sum + a.quantity, 0);
      return (b.quantityRemaining ?? 0) - inCart > 0;
    });

    // If supplier has multiple in-stock batches, prompt cashier to select the batch!
    if (inStockBatches.length > 1) {
      setSelectedSupplier(chosen);
      setStep('batch');
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return;
    }

    // Only 1 in-stock batch exists
    if (inStockBatches.length === 1) {
      const singleB = inStockBatches[0];
      const inCart = inCartAllocations
        .filter(
          (a) =>
            (a.batchId && a.batchId === singleB.id) ||
            (a.batchNumber && a.batchNumber.toLowerCase() === singleB.batchNumber.toLowerCase())
        )
        .reduce((sum, a) => sum + a.quantity, 0);

      const available = Math.max(0, (singleB.quantityRemaining ?? 0) - inCart);
      const batchOpt: ProductBatchOption = {
        ...singleB,
        inCartQty: inCart,
        stock: available,
        isStockOver: available <= 0,
      };

      if (available <= 0) {
        const availableSuppliers = options.filter((o) => !o.isStockOver && o.stock > 0);
        if (onSupplierStockOver) {
          onSupplierStockOver(chosen, availableSuppliers, batchOpt, []);
        }
        return;
      }

      onSelectSupplier(chosen, batchOpt);
      onClose();
      return;
    }

    // Direct fallback
    onSelectSupplier(chosen);
    onClose();
  };

  const handleChooseBatch = (chosenBatch: ProductBatchOption) => {
    if (!selectedSupplier) return;

    if (chosenBatch.isStockOver) {
      const otherAvailableBatches = currentBatchOptions.filter(
        (b) => b.id !== chosenBatch.id && !b.isStockOver
      );
      const otherAvailableSuppliers = options.filter(
        (o) => o.supplierId !== selectedSupplier.supplierId && !o.isStockOver
      );

      if (onSupplierStockOver) {
        onSupplierStockOver(
          selectedSupplier,
          otherAvailableSuppliers,
          chosenBatch,
          otherAvailableBatches
        );
      }
      return;
    }

    onSelectSupplier(selectedSupplier, chosenBatch);
    onClose();
  };

  const handleGoBackToSuppliers = () => {
    if (options.length > 1) {
      setStep('supplier');
      setSelectedSupplier(null);
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      onClose();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const listLen = step === 'supplier' ? filteredSuppliers.length : filteredBatches.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (listLen > 0 ? (prev + 1) % listLen : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (listLen > 0 ? (prev - 1 + listLen) % listLen : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (step === 'supplier') {
          const chosen = filteredSuppliers[selectedIndex];
          if (chosen) handleChooseSupplier(chosen);
        } else {
          const chosenB = filteredBatches[selectedIndex];
          if (chosenB) handleChooseBatch(chosenB);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (step === 'batch' && options.length > 1) {
          handleGoBackToSuppliers();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isOpen,
    step,
    filteredSuppliers,
    filteredBatches,
    selectedIndex,
    options,
    selectedSupplier,
    currentBatchOptions,
  ]);

  if (!isOpen || !product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[620px] sm:max-w-[680px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 relative animate-in zoom-in-95 duration-150 flex flex-row overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Supplier Mascot Illustration */}
        <div className="w-[200px] sm:w-[225px] border-r border-zinc-100/80 flex items-center justify-center p-2 shrink-0 select-none overflow-hidden bg-white">
          <img
            src="/supplier.png"
            alt="Supplier"
            className="w-full h-auto max-h-[310px] object-contain drop-shadow-sm pointer-events-none select-none scale-105"
          />
        </div>

        {/* Right Side: Form & List Records */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {step === 'batch' && options.length > 1 && (
                <button
                  type="button"
                  onClick={handleGoBackToSuppliers}
                  className="w-6 h-6 rounded-md text-zinc-500 hover:text-black hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer mr-0.5 shrink-0"
                  title="Back to supplier selection"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="w-6.5 h-6.5 rounded-lg bg-orange-50 text-[#FF5500] border border-orange-200/70 flex items-center justify-center shadow-2xs shrink-0">
                {step === 'supplier' ? (
                  <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Package className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-xs font-black text-black leading-tight truncate">
                  {step === 'supplier' ? 'Select Supplier' : 'Select Batch'}
                </h3>
                <p className="text-[10px] font-medium text-zinc-400 truncate max-w-[170px]">
                  {step === 'supplier'
                    ? product.name
                    : `${selectedSupplier?.supplierName || ''} • ${product.name}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-md text-zinc-400 hover:text-black hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer -mr-0.5 shrink-0"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="pt-2 pb-1.5 flex-shrink-0">
            <div className="flex items-center h-8 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 focus-within:bg-white focus-within:border-[#FF5500] focus-within:ring-2 focus-within:ring-[#FF5500]/15 transition-all">
              <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 flex-shrink-0 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder={step === 'supplier' ? 'Search supplier name...' : 'Search batch number...'}
                className="w-full bg-transparent text-xs font-medium text-black placeholder:text-zinc-400 outline-none border-none p-0 leading-normal"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-zinc-400 hover:text-black ml-1.5 p-0.5 rounded-full hover:bg-zinc-100 cursor-pointer"
                  title="Clear"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Records List (Suppliers or Batches) */}
          <div className="flex-1 overflow-y-auto max-h-[250px] divide-y divide-zinc-100/90 py-0.5 pr-0.5">
            {step === 'supplier' ? (
              /* STEP 1: Suppliers List */
              filteredSuppliers.length === 0 ? (
                <div className="py-6 text-center text-zinc-400">
                  <p className="text-xs font-bold text-black">No suppliers found</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Try searching a different name</p>
                </div>
              ) : (
                filteredSuppliers.map((opt, index) => {
                  const isFocused = index === selectedIndex;
                  const isCurrentlyActive = index === selectedIndex;
                  const hasMultipleBatches = opt.batches && opt.batches.length > 1;

                  return (
                    <button
                      key={opt.supplierId + (opt.batchNumber || index)}
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => handleChooseSupplier(opt)}
                      className={`w-full flex items-center justify-between py-2 px-2.5 transition-colors text-left cursor-pointer rounded-md ${
                        opt.isStockOver
                          ? isFocused
                            ? 'bg-rose-50 text-black ring-1 ring-rose-300'
                            : 'hover:bg-rose-50/50 text-zinc-700'
                          : isFocused && isCurrentlyActive
                          ? 'bg-orange-100/90 text-black ring-1 ring-orange-300'
                          : isFocused
                          ? 'bg-zinc-100 text-black'
                          : isCurrentlyActive
                          ? 'bg-orange-50/80 text-black'
                          : 'hover:bg-zinc-50 text-zinc-800'
                      }`}
                    >
                      {/* Left: Supplier Name */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                        <span className="text-xs font-bold text-black truncate" title={opt.supplierName}>
                          {opt.supplierName}
                        </span>
                      </div>

                      {/* Right: Available Stock / Stock Over Badge + Batch Count */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasMultipleBatches && !opt.isStockOver && (
                          <span className="text-[9px] font-medium text-zinc-400">
                            {opt.batches?.length} batches
                          </span>
                        )}

                        {opt.isStockOver ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Stock Over
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-emerald-700">
                            {opt.stock} avail
                          </span>
                        )}

                        {hasMultipleBatches ? (
                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                        ) : (
                          isCurrentlyActive && (
                            <div
                              className={`w-4 h-4 rounded-full ${
                                opt.isStockOver ? 'bg-rose-500' : 'bg-[#FF5500]'
                              } text-white flex items-center justify-center shrink-0 shadow-2xs`}
                              title={opt.isStockOver ? 'Stock Over' : 'Selected supplier'}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )
                        )}
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              /* STEP 2: Batches List for Selected Supplier */
              filteredBatches.length === 0 ? (
                <div className="py-6 text-center text-zinc-400">
                  <p className="text-xs font-bold text-black">No in-stock batches found</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {search ? 'Try searching a different batch number' : 'All batches for this supplier are currently out of stock'}
                  </p>
                </div>
              ) : (
                filteredBatches.map((b, index) => {
                  const isFocused = index === selectedIndex;
                  const isCurrentlyActive = index === selectedIndex;

                  return (
                    <button
                      key={b.id || b.batchNumber}
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => handleChooseBatch(b)}
                      className={`w-full flex items-center justify-between py-2 px-2.5 transition-colors text-left cursor-pointer rounded-md ${
                        b.isStockOver
                          ? isFocused
                            ? 'bg-rose-50 text-black ring-1 ring-rose-300'
                            : 'hover:bg-rose-50/50 text-zinc-700'
                          : isFocused && isCurrentlyActive
                          ? 'bg-orange-100/90 text-black ring-1 ring-orange-300'
                          : isFocused
                          ? 'bg-zinc-100 text-black'
                          : isCurrentlyActive
                          ? 'bg-orange-50/80 text-black'
                          : 'hover:bg-zinc-50 text-zinc-800'
                      }`}
                    >
                      {/* Left: Batch Number & Expiry */}
                      <div className="flex flex-col min-w-0 flex-1 pr-2">
                        <span className="text-xs font-mono font-bold text-black truncate">
                          {b.batchNumber}
                        </span>
                        {b.expiryDate && (
                          <span className="text-[10px] text-zinc-400 font-medium leading-none mt-0.5">
                            Exp: {b.expiryDate}
                          </span>
                        )}
                      </div>

                      {/* Right: Available Stock / Stock Over / Expired Badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isBatchExpired(b.expiryDate) ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Expired
                          </span>
                        ) : b.isStockOver ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Stock Over
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-emerald-700">
                            {b.stock} avail
                          </span>
                        )}

                        {isCurrentlyActive && (
                          <div
                            className={`w-4 h-4 rounded-full ${
                              b.isStockOver ? 'bg-rose-500' : 'bg-[#FF5500]'
                            } text-white flex items-center justify-center shrink-0 shadow-2xs`}
                            title={b.isStockOver ? 'Stock Over' : 'Selected batch'}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2 flex-shrink-0">
            {step === 'batch' && options.length > 1 ? (
              <button
                type="button"
                onClick={handleGoBackToSuppliers}
                className="h-8 px-3.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer shadow-xs"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (step === 'supplier') {
                  const chosen = filteredSuppliers[selectedIndex];
                  if (chosen) handleChooseSupplier(chosen);
                } else {
                  const chosenB = filteredBatches[selectedIndex];
                  if (chosenB) handleChooseBatch(chosenB);
                }
              }}
              className="h-8 px-4 rounded-xl bg-black hover:bg-zinc-800 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
