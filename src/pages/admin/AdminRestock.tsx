import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useProducts } from '@/stores/productStore';
import { useSuppliers } from '@/stores/supplierStore';
import { usePurchaseOrders } from '@/stores/purchaseOrderStore';
import { useToast } from '@/stores/toastStore';
import { PurchaseOrder, PurchaseOrderItem, POPaymentBreakdown, Supplier, Product } from '@/types';
import { MonthYearPicker } from '@/components/common/MonthYearPicker';
import {
  RefreshCw,
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
  PauseCircle,
  Check,
  AlertCircle,
  User,
  ChevronDown,
  Pencil,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { StockBatchLabelPrintModal, RestockedItemForPrint } from '@/components/admin/StockBatchLabelPrintModal';
import { PurchaseOrderDetailsModal } from '@/components/admin/PurchaseOrderDetailsModal';
import { EditSupplierModal } from '@/components/admin/EditSupplierModal';
import { getPaymentScheduleInfo } from '@/utils/paymentSchedule';
import { formatDateYYYYMMDD, getDaysInMonth } from '@/utils/dateValidator';
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/phoneValidator';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

export interface DraftLineItem {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number | '';
  profitMargin: number | '';
  sellingPrice: number | '';
  quantity: number | '';
}

export interface HeldPurchaseOrder {
  id: string;
  heldAt: string;
  invoiceRef: string;
  supplierId: string;
  supplierName: string;
  deliveryNotes: string;
  isUnpaidCredit: boolean;
  cashAmount: string;
  cardAmount: string;
  chequeAmount: string;
  chequeDueDate: string;
  chequeNumber: string;
  unpaidDueDate: string;
  lineItems: DraftLineItem[];
  totalInvoiced: number;
}

const STORAGE_KEY_HELD_POS = 'chill_choc_held_pos';

const loadHeldPOsFromStorage = (): HeldPurchaseOrder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HELD_POS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load held POs from localStorage:', e);
    return [];
  }
};

const saveHeldPOsToStorage = (items: HeldPurchaseOrder[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_HELD_POS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save held POs to localStorage:', e);
  }
};

export const highlightMatch = (text: string, query: string) => {
  if (!query || !query.trim()) return text;
  const cleanQ = query.trim();
  const index = text.toLowerCase().indexOf(cleanQ.toLowerCase());
  if (index === -1) return text;
  const before = text.slice(0, index);
  const match = text.slice(index, index + cleanQ.length);
  const after = text.slice(index + cleanQ.length);
  return (
    <>
      {before}
      <span className="text-[#FF5500] font-black bg-orange-100/90 px-0.5 rounded">
        {match}
      </span>
      {after}
    </>
  );
};

interface LineItemProductAutocompleteProps {
  idx: number;
  item: DraftLineItem;
  products: Product[];
  supplierFilteredProducts: Product[];
  studioSupplierId: string;
  supplierName?: string;
  onSelectProduct: (productId: string) => void;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
}

export const LineItemProductAutocomplete: React.FC<LineItemProductAutocompleteProps> = ({
  idx,
  item,
  products,
  supplierFilteredProducts,
  studioSupplierId,
  supplierName,
  onSelectProduct,
  onNavigateNext,
  onNavigatePrev,
}) => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProduct = useMemo(
    () => products.find((p) => p.id === item.productId),
    [products, item.productId]
  );

  // Filter suggestions for selected supplier products with priority matching and fallback
  const suggestions = useMemo(() => {
    const q = (isTyping ? searchQuery : '').trim().toLowerCase();
    if (!q || q.length < 1) return [];

    // Selected supplier products pool
    const pool = studioSupplierId && supplierFilteredProducts.length > 0 ? supplierFilteredProducts : products;

    let matched = pool.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.weight && p.weight.toLowerCase().includes(q))
    );

    // If no match in supplierFilteredProducts, fallback to searching all products
    if (matched.length === 0 && pool !== products) {
      matched = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.weight && p.weight.toLowerCase().includes(q))
      );
    }

    matched.sort((a, b) => {
      // 1. Exact barcode match gets highest priority
      const aBarcode = a.barcode?.toLowerCase() === q ? 0 : 1;
      const bBarcode = b.barcode?.toLowerCase() === q ? 0 : 1;
      if (aBarcode !== bBarcode) return aBarcode - bBarcode;

      // 2. Exact SKU match gets second priority
      const aSku = a.sku?.toLowerCase() === q ? 0 : 1;
      const bSku = b.sku?.toLowerCase() === q ? 0 : 1;
      if (aSku !== bSku) return aSku - bSku;

      // 3. Name starts with query
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;

      return a.name.localeCompare(b.name);
    });

    return matched.slice(0, 10);
  }, [isTyping, searchQuery, studioSupplierId, supplierFilteredProducts, products]);

  // Whenever productId changes or is updated, ensure typing/search state is cleared so product name shows
  useEffect(() => {
    if (item.productId) {
      setIsTyping(false);
      setSearchQuery('');
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [item.productId]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchQuery('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(
        `[data-suggestion-index="${activeIndex}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleChoose = (prod: Product) => {
    onSelectProduct(prod.id);
    setIsOpen(false);
    setIsTyping(false);
    setSearchQuery('');
    setActiveIndex(-1);
    onNavigateNext();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = val.trim().toLowerCase();

    // If barcode scanner directly entered an exact barcode or SKU, immediately select it!
    if (clean.length >= 3) {
      const pool = studioSupplierId && supplierFilteredProducts.length > 0 ? supplierFilteredProducts : products;
      const exactMatch =
        pool.find((p) => p.barcode?.toLowerCase() === clean || p.sku?.toLowerCase() === clean) ||
        products.find((p) => p.barcode?.toLowerCase() === clean || p.sku?.toLowerCase() === clean);

      if (exactMatch) {
        handleChoose(exactMatch);
        return;
      }
    }

    setSearchQuery(val);
    setIsTyping(true);
    setActiveIndex(-1);
    if (val.trim().length >= 1) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    if (val.trim() === '' && item.productId) {
      onSelectProduct('');
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Strictly do not open dropdown upon focus until user types letters
    setIsOpen(false);
    setIsTyping(false);
    setActiveIndex(-1);
    e.target.select();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If focus moved inside container (like clear button or dropdown item), don't close
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsTyping(false);
    setIsOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen || suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      if (!isOpen || suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault();
        setIsOpen(false);
        setIsTyping(false);
        onNavigatePrev();
        return;
      }

      const cleanQuery = searchQuery.trim().toLowerCase();

      // 1. Check for exact barcode, SKU, or name match in products pool (handles barcode scanner Enter)
      if (cleanQuery) {
        const pool = studioSupplierId && supplierFilteredProducts.length > 0 ? supplierFilteredProducts : products;
        const exactMatch =
          pool.find(
            (p) =>
              p.barcode?.toLowerCase() === cleanQuery ||
              p.sku?.toLowerCase() === cleanQuery ||
              p.name.toLowerCase() === cleanQuery
          ) ||
          products.find(
            (p) =>
              p.barcode?.toLowerCase() === cleanQuery ||
              p.sku?.toLowerCase() === cleanQuery ||
              p.name.toLowerCase() === cleanQuery
          );

        if (exactMatch) {
          e.preventDefault();
          handleChoose(exactMatch);
          return;
        }
      }

      // 2. If dropdown active item selected
      if (isOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleChoose(suggestions[activeIndex]);
        return;
      }

      // 3. If single suggestion or first suggestion available
      if (suggestions.length > 0) {
        e.preventDefault();
        handleChoose(suggestions[0]);
        return;
      }

      // 4. If product already selected and just pressing Enter, advance to next field
      if (item.productId) {
        e.preventDefault();
        setIsOpen(false);
        setIsTyping(false);
        onNavigateNext();
        return;
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setIsTyping(false);
      setSearchQuery('');
    } else if (e.key === 'Tab') {
      if (isOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
        onSelectProduct(suggestions[activeIndex].id);
      }
      setIsOpen(false);
      setIsTyping(false);
    }
  };

  const displayValue = isTyping
    ? searchQuery
    : currentProduct
    ? `${currentProduct.name}${currentProduct.weight ? ` (${currentProduct.weight})` : ''}`
    : searchQuery;

  return (
    <div
      className={`relative w-full ${isOpen ? 'z-40' : 'z-1'}`}
      ref={containerRef}
    >
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          id={`line-item-${idx}-product`}
          type="text"
          autoComplete="off"
          disabled={!studioSupplierId}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={(e) => {
            if (!studioSupplierId) {
              showToast('Please select a supplier first', 'warning');
              document.getElementById('studio-supplier-select')?.focus();
              return;
            }
            handleInputFocus(e);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            studioSupplierId
              ? 'Type to search product...'
              : '-- Select Supplier First --'
          }
          className={`w-full bg-transparent border-0 border-b-2 font-semibold text-stone-800 text-[11px] py-0.5 pr-5 transition-colors focus:outline-none placeholder:text-stone-400 placeholder:font-normal truncate ${
            isOpen
              ? 'border-[#00b4b6] bg-stone-50/70'
              : 'border-transparent hover:border-stone-200'
          } ${!studioSupplierId ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        {item.productId && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center pr-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProduct('');
                setSearchQuery('');
                setIsTyping(false);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="text-stone-400 hover:text-stone-700 p-0.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              title="Clear product"
              tabIndex={-1}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown - strictly visible only while typing, header removed */}
      {isOpen && isTyping && searchQuery.trim().length >= 1 && (
        <div
          ref={dropdownRef}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 mt-1 z-50 w-[360px] sm:w-[440px] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100 animate-in fade-in slide-in-from-top-1 duration-150 max-h-56 overflow-y-auto"
        >
          {suggestions.length === 0 ? (
            <div className="p-3 text-center text-stone-400 text-[11px]">
              No products found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            suggestions.map((p, sIdx) => {
              const isSelected = sIdx === activeIndex;
              const isCurrentlyChosen = p.id === item.productId;
              return (
                <button
                  key={p.id}
                  data-suggestion-index={sIdx}
                  type="button"
                  onClick={() => handleChoose(p)}
                  onMouseEnter={() => setActiveIndex(sIdx)}
                  className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer text-[11px] ${
                    isSelected
                      ? 'bg-orange-50 text-stone-900 border-l-2 border-[#FF5500]'
                      : isCurrentlyChosen
                      ? 'bg-stone-50/80 text-stone-900 font-semibold'
                      : 'hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  {/* Left: Product Name with Letter-by-Letter Highlighting + Weight */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Package className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                      {highlightMatch(p.name, searchQuery)}
                    </span>
                    {p.weight && (
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-stone-100 text-stone-600 shrink-0">
                        {p.weight}
                      </span>
                    )}
                  </div>

                  {/* Right: Category + Cost / Selling Price */}
                  <div className="flex items-center gap-2 text-[10.5px] text-stone-400 shrink-0">
                    {p.category && (
                      <span className="capitalize text-[10px] text-stone-500 hidden sm:inline">
                        {p.category}
                      </span>
                    )}
                    {p.costPrice && p.costPrice > 0 ? (
                      <span className="text-stone-600 font-mono text-[10px]">
                        Cost: Rs. {p.costPrice}
                      </span>
                    ) : null}
                    {p.price > 0 && (
                      <span className="text-[#FF5500] font-bold font-mono">
                        Rs. {p.price.toLocaleString('en-US')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const parsePODate = (dateStr?: string): { year: number; month: number } | null => {
  if (!dateStr || !dateStr.trim() || dateStr.trim().toUpperCase() === 'N/A') return null;

  const clean = dateStr.trim();
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return { year: parsed.getFullYear(), month: parsed.getMonth() };
  }

  const cleanParts = clean.replace(/,/g, '').split(/\s+/);
  const monthsMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  for (const part of cleanParts) {
    const mStr = part.toLowerCase().slice(0, 3);
    if (mStr in monthsMap) {
      const yearPart = cleanParts.find((p) => /^\d{4}$/.test(p));
      if (yearPart) {
        return { year: parseInt(yearPart, 10), month: monthsMap[mStr] };
      }
    }
  }

  return null;
};

export const AdminRestock: React.FC = () => {
  const { products, restockProduct, restockProducts } = useProducts();
  const { suppliers, addSupplier } = useSuppliers();
  const { purchaseOrders, addPurchaseOrder } = usePurchaseOrders();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search filter, tabs & focus state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'grn' | 'suppliers'>(() => {
    return searchParams.get('tab') === 'suppliers' ? 'suppliers' : 'grn';
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [lastRestockedData, setLastRestockedData] = useState<{
    invoiceRef: string;
    supplierName: string;
    items: RestockedItemForPrint[];
  } | null>(null);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Held restock bills state
  const [heldPOs, setHeldPOs] = useState<HeldPurchaseOrder[]>(loadHeldPOsFromStorage);
  const [currentHeldId, setCurrentHeldId] = useState<string | null>(null);
  const [isHeldPickerModalOpen, setIsHeldPickerModalOpen] = useState(false);

  // New Supplier Quick Form State
  const [newSupName, setNewSupName] = useState('');
  const [newSupBrand, setNewSupBrand] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupLeadTime, setNewSupLeadTime] = useState('2');
  const [newSupIsCompany, setNewSupIsCompany] = useState(false);
  const [newSupProductIds, setNewSupProductIds] = useState<string[]>([]);
  const [supProductSearch, setSupProductSearch] = useState('');

  // When Company Supplier is ticked, show only company products; when unticked, show only non-company products
  const selectableNewSupProducts = useMemo(() => {
    if (newSupIsCompany) {
      return products.filter((p) => Boolean(p.isCompanyProduct));
    }
    return products.filter((p) => !p.isCompanyProduct);
  }, [products, newSupIsCompany]);

  // When toggling Company Supplier, keep only products matching the active mode
  useEffect(() => {
    if (newSupIsCompany) {
      setNewSupProductIds((prev) =>
        prev.filter((id) => products.find((p) => p.id === id)?.isCompanyProduct)
      );
    } else {
      setNewSupProductIds((prev) =>
        prev.filter((id) => !products.find((p) => p.id === id)?.isCompanyProduct)
      );
    }
  }, [newSupIsCompany, products]);

  // --- Goods Inward Studio Form State ---
  const [studioSupplierId, setStudioSupplierId] = useState<string>('');
  const selectedStudioSupplier = useMemo(
    () => suppliers.find((s) => s.id === studioSupplierId),
    [suppliers, studioSupplierId]
  );
  const isCompanySupplier = Boolean(selectedStudioSupplier?.isCompanySupplier);

  const [invoiceRef, setInvoiceRef] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isUnpaidCredit, setIsUnpaidCredit] = useState(false);

  // Payment Breakdown
  const [cashAmount, setCashAmount] = useState<string>('0');
  const [cardAmount, setCardAmount] = useState<string>('0');
  const [chequeAmount, setChequeAmount] = useState<string>('0');
  const [chequeDueDate, setChequeDueDate] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [unpaidDueDate, setUnpaidDueDate] = useState<string>('');

  // Line items state
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);

  // Helper to generate a unique batch number for non-company suppliers (clean, scannable)
  const generateBatchNumber = (): string => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `BAT-${rand}`;
  };

  // Helper to create a new draft line item with clean empty values
  const createEmptyLineItem = (): DraftLineItem => ({
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: '',
    batchNumber: '',
    expiryDate: '',
    costPrice: '',
    profitMargin: '',
    sellingPrice: '',
    quantity: '',
  });

  // Open Studio with fresh/clean state (no auto-selected supplier and no initial item records)
  const handleOpenStudio = () => {
    setCurrentHeldId(null);
    setInvoiceRef(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setDeliveryNotes('');
    setIsUnpaidCredit(false);
    setCashAmount('0');
    setCardAmount('0');
    setChequeAmount('0');
    setChequeDueDate('');
    setChequeNumber('');
    setUnpaidDueDate('');
    setLineItems([]);
    setStudioSupplierId('');
    setIsStudioOpen(true);
    setTimeout(() => {
      document.getElementById('studio-supplier-select')?.focus();
    }, 60);
  };

  // Auto-open Goods Inward Studio if navigated with ?productId=... or ?openStudio=true
  useEffect(() => {
    const openStudio = searchParams.get('openStudio');
    const targetSupId = searchParams.get('supplierId');
    if (openStudio === 'true' && targetSupId) {
      setStudioSupplierId(targetSupId);
      setIsStudioOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }

    const targetProductId = searchParams.get('productId');
    if (!targetProductId || products.length === 0) return;

    const prod = products.find((p) => p.id === targetProductId);
    if (prod) {
      const supId = prod.supplierId || prod.batches?.[0]?.supplierId || (suppliers.length > 0 ? suppliers[0].id : '');
      if (supId) {
        setStudioSupplierId(supId);
      }

      const cost = prod.costPrice && prod.costPrice > 0 ? prod.costPrice : Math.round(prod.price * 0.78);
      let margin = 25;
      if (prod.price > 0 && cost > 0) {
        const calcM = Math.round((((prod.price - cost) / cost) * 100) * 10) / 10;
        margin = calcM > 0 ? calcM : 25;
      }
      const selling = prod.price > 0 ? prod.price : Math.round(cost * (1 + margin / 100));
      const today = new Date();
      const nextYear = today.getFullYear() + 1;

      const prefilledItem: DraftLineItem = {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: prod.id,
        batchNumber: getProductBarcode(prod),
        expiryDate: `${nextYear} / 05 / 15`,
        costPrice: cost,
        profitMargin: margin,
        sellingPrice: selling,
        quantity: 1,
      };

      setLineItems([prefilledItem]);
      setIsStudioOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, products, suppliers, setSearchParams]);

  // Helper to get the product's barcode (clean, no separate batch number)
  const getProductBarcode = (prod?: { barcode?: string; sku?: string }) => {
    return prod?.barcode?.trim() || prod?.sku?.trim() || '';
  };

  // Global Barcode Scanner listener when Goods Inward Studio is open
  useBarcodeScanner({
    enabled: isStudioOpen,
    onScan: (scannedBarcode) => {
      const clean = scannedBarcode.trim().toLowerCase();
      if (!clean) return;

      if (!studioSupplierId) {
        showToast('Please select a supplier first before scanning products', 'warning');
        document.getElementById('studio-supplier-select')?.focus();
        return;
      }

      // Search matching product by barcode or SKU
      const pool = supplierFilteredProducts.length > 0 ? supplierFilteredProducts : products;
      const matchedProd =
        pool.find((p) => p.barcode?.toLowerCase() === clean || p.sku?.toLowerCase() === clean) ||
        products.find((p) => p.barcode?.toLowerCase() === clean || p.sku?.toLowerCase() === clean);

      if (!matchedProd) {
        showToast(`No product found with barcode "${scannedBarcode}"`, 'error');
        return;
      }

      // Check if user is currently focused on an input within a specific line item
      const activeEl = document.activeElement;
      let targetRowIndex = -1;
      if (activeEl && activeEl.id && activeEl.id.startsWith('line-item-')) {
        const parts = activeEl.id.split('-');
        const rowIdx = parseInt(parts[2], 10);
        if (!isNaN(rowIdx) && rowIdx >= 0 && rowIdx < lineItems.length) {
          targetRowIndex = rowIdx;
        }
      }
      if (targetRowIndex === -1) {
        // Check if there is an empty line item without a product
        targetRowIndex = lineItems.findIndex((li) => !li.productId);
      }

      if (targetRowIndex >= 0) {
        handleUpdateLineItem(lineItems[targetRowIndex].id, { productId: matchedProd.id });
        focusField(targetRowIndex, 'expiry');
        showToast(`Scanned: ${matchedProd.name}`, 'success');
      } else {
        const cost = matchedProd.costPrice && matchedProd.costPrice > 0 ? matchedProd.costPrice : Math.round(matchedProd.price * 0.78);
        let margin = 25;
        if (matchedProd.price > 0 && cost > 0) {
          const calcM = Math.round((((matchedProd.price - cost) / cost) * 100) * 10) / 10;
          margin = calcM > 0 ? calcM : 25;
        }
        const selling = matchedProd.price > 0 ? matchedProd.price : Math.round(cost * (1 + margin / 100));
        const today = new Date();
        const nextYear = today.getFullYear() + 1;

        const newItem: DraftLineItem = {
          id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: matchedProd.id,
          batchNumber: isCompanySupplier ? getProductBarcode(matchedProd) : generateBatchNumber(),
          expiryDate: `${nextYear} / 05 / 15`,
          costPrice: cost,
          profitMargin: margin,
          sellingPrice: selling,
          quantity: 1,
        };

        const newIdx = lineItems.length;
        setLineItems((prev) => [...prev, newItem]);
        focusField(newIdx, 'expiry');
        showToast(`Scanned: ${matchedProd.name}`, 'success');
      }
    },
  });

  // Helper to focus table field programmatically
  const focusField = (idx: number, field: 'product' | 'barcode' | 'expiry' | 'cost' | 'margin' | 'sell' | 'qty') => {
    setTimeout(() => {
      const el = document.getElementById(`line-item-${idx}-${field}`) as HTMLInputElement | HTMLSelectElement | null;
      if (el) {
        el.focus();
        if ('select' in el && typeof (el as HTMLInputElement).select === 'function') {
          (el as HTMLInputElement).select();
        }
      }
    }, 40);
  };

  // Add Item to Studio (starts with clean empty values and auto-focuses its product dropdown)
  const handleAddLineItem = (explicitSupplierId?: string) => {
    const targetSupId = explicitSupplierId || studioSupplierId;
    if (!targetSupId) {
      showToast('Please select a supplier first before adding items', 'warning');
      const supplierSelect = document.getElementById('studio-supplier-select');
      supplierSelect?.focus();
      return;
    }
    const nextIdx = lineItems.length;
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
    focusField(nextIdx, 'product');
  };

  // Enter key navigation across table columns & adding new row at end
  const handleKeyDownNav = (
    e: React.KeyboardEvent,
    idx: number,
    field: 'product' | 'barcode' | 'expiry' | 'cost' | 'margin' | 'sell' | 'qty'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Enter: Jump to previous column
        if (field === 'qty') focusField(idx, 'sell');
        else if (field === 'sell') focusField(idx, 'margin');
        else if (field === 'margin') focusField(idx, 'cost');
        else if (field === 'cost') focusField(idx, 'expiry');
        else if (field === 'expiry') focusField(idx, 'barcode');
        else if (field === 'barcode') focusField(idx, 'product');
        else if (field === 'product' && idx > 0) focusField(idx - 1, 'qty');
      } else {
        // Enter: Jump to next column
        if (field === 'product') {
          focusField(idx, 'expiry');
        } else if (field === 'barcode') {
          focusField(idx, 'expiry');
        } else if (field === 'expiry') {
          focusField(idx, 'cost');
        } else if (field === 'cost') {
          focusField(idx, 'margin');
        } else if (field === 'margin') {
          focusField(idx, 'sell');
        } else if (field === 'sell') {
          focusField(idx, 'qty');
        } else if (field === 'qty') {
          // End of the row! Enter key creates a new record and focuses its product dropdown
          if (idx === lineItems.length - 1) {
            handleAddLineItem();
          } else {
            focusField(idx + 1, 'product');
          }
        }
      }
    }
  };

  // Expiry date input handler (YYYY / MM / DD auto-formatting & auto-jump to Cost)
  const handleExpiryInputChange = (id: string, idx: number, rawVal: string) => {
    const currentItem = lineItems.find((li) => li.id === id);
    const prevVal = currentItem?.expiryDate || '';
    const formatted = formatDateYYYYMMDD(rawVal, prevVal);
    handleUpdateLineItem(id, { expiryDate: formatted });

    // Auto-jump to Cost field once all 8 digits (YYYY MM DD) are validly entered!
    if (formatted.replace(/\D/g, '').length === 8) {
      focusField(idx, 'cost');
    }
  };

  // Update Line Item
  const handleUpdateLineItem = (id: string, updates: Partial<DraftLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // If product changed or refreshed, update default batch & cost or reset to empty
        if (updates.productId !== undefined) {
          if (!updates.productId) {
            updated.productId = '';
            updated.batchNumber = '';
            updated.costPrice = '';
            updated.profitMargin = '';
            updated.sellingPrice = '';
            updated.expiryDate = '';
            updated.quantity = '';
          } else {
            const prod = products.find((p) => p.id === updates.productId);
            if (prod) {
              const cost = prod.costPrice && prod.costPrice > 0 ? prod.costPrice : Math.round(prod.price * 0.78);
              let margin: number = 25;
              if (prod.price > 0 && cost > 0) {
                const calcM = Math.round((((prod.price - cost) / cost) * 100) * 10) / 10;
                margin = calcM > 0 ? calcM : 25;
              }
              const selling = prod.price > 0 ? prod.price : Math.round(cost * (1 + margin / 100));
              updated.costPrice = cost;
              updated.profitMargin = margin;
              updated.sellingPrice = selling;
              updated.batchNumber = isCompanySupplier ? getProductBarcode(prod) : generateBatchNumber();
              if (!item.expiryDate) {
                const today = new Date();
                const nextYear = today.getFullYear() + 1;
                updated.expiryDate = `${nextYear} / 05 / 15`;
              }
              if (item.quantity === '' || item.quantity === 0) {
                updated.quantity = 1;
              }
            }
          }
        }

        // 2-Way bidirectional calculation between Margin & Selling Price
        if (updates.profitMargin !== undefined) {
          const cost = typeof updated.costPrice === 'number' ? updated.costPrice : parseFloat(String(updated.costPrice)) || 0;
          const margin = typeof updates.profitMargin === 'number' ? updates.profitMargin : parseFloat(String(updates.profitMargin));
          if (cost > 0 && !isNaN(margin)) {
            updated.sellingPrice = Math.round(cost * (1 + margin / 100));
          } else if ((!cost || cost === 0) && !isNaN(margin) && margin > -100) {
            const selling = typeof updated.sellingPrice === 'number' ? updated.sellingPrice : parseFloat(String(updated.sellingPrice)) || 0;
            if (selling > 0) {
              updated.costPrice = Math.round(selling / (1 + margin / 100));
            }
          }
        } else if (updates.sellingPrice !== undefined) {
          const cost = typeof updated.costPrice === 'number' ? updated.costPrice : parseFloat(String(updated.costPrice)) || 0;
          const selling = typeof updates.sellingPrice === 'number' ? updates.sellingPrice : parseFloat(String(updates.sellingPrice));
          if (cost > 0 && !isNaN(selling)) {
            const calcMargin = ((selling - cost) / cost) * 100;
            updated.profitMargin = Math.round(calcMargin * 10) / 10;
          } else if ((!cost || cost === 0) && !isNaN(selling) && selling > 0) {
            const margin = typeof updated.profitMargin === 'number' ? updated.profitMargin : parseFloat(String(updated.profitMargin));
            if (!isNaN(margin) && margin > -100) {
              updated.costPrice = Math.round(selling / (1 + margin / 100));
            }
          }
        } else if (updates.costPrice !== undefined) {
          const cost = typeof updates.costPrice === 'number' ? updates.costPrice : parseFloat(String(updates.costPrice));
          if (!isNaN(cost) && cost > 0) {
            if (updated.profitMargin !== '') {
              const margin = typeof updated.profitMargin === 'number' ? updated.profitMargin : parseFloat(String(updated.profitMargin)) || 0;
              updated.sellingPrice = Math.round(cost * (1 + margin / 100));
            } else if (updated.sellingPrice !== '') {
              const selling = typeof updated.sellingPrice === 'number' ? updated.sellingPrice : parseFloat(String(updated.sellingPrice)) || 0;
              const calcMargin = ((selling - cost) / cost) * 100;
              updated.profitMargin = Math.round(calcMargin * 10) / 10;
            }
          }
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
    return lineItems.reduce((sum, item) => {
      const cost = typeof item.costPrice === 'number' ? item.costPrice : 0;
      const qty = typeof item.quantity === 'number' ? item.quantity : 0;
      return sum + cost * qty;
    }, 0);
  }, [lineItems]);

  const numCash = parseFloat(cashAmount) || 0;
  const numCard = parseFloat(cardAmount) || 0;
  const numCheque = parseFloat(chequeAmount) || 0;
  const totalPaid = isUnpaidCredit ? 0 : numCash + numCard + numCheque;
  const balanceDue = Math.max(0, totalInvoiced - totalPaid);

  // Filter products according to selected supplier
  const supplierFilteredProducts = useMemo(() => {
    if (!studioSupplierId) {
      return [];
    }

    const sup = suppliers.find((s) => s.id === studioSupplierId);
    const isCompanySupplier = Boolean(sup?.isCompanySupplier);

    const filtered = products.filter((p) => {
      // 0. Company Supplier match: only company products
      if (isCompanySupplier) {
        return Boolean(p.isCompanyProduct);
      }
      // If NOT company supplier, never include company products
      if (p.isCompanyProduct) return false;

      // 1. Direct supplierId match
      if (p.supplierId && p.supplierId === studioSupplierId) return true;
      // 2. Batch supplierId match
      if (p.batches?.some((b) => b.supplierId === studioSupplierId)) return true;
      // 3. Purchase order history match
      if (purchaseOrders.some((po) => po.supplierId === studioSupplierId && po.items.some((it) => it.productId === p.id))) return true;
      // 4. Supplier brand / suppliedProductIds match
      if (sup) {
        if (sup.suppliedProductIds && sup.suppliedProductIds.includes(p.id)) return true;
        if (sup.brand && p.brand && sup.brand.toLowerCase() === p.brand.toLowerCase()) return true;
      }
      return false;
    });

    const fallback = isCompanySupplier
      ? products.filter((p) => Boolean(p.isCompanyProduct))
      : products.filter((p) => !p.isCompanyProduct);

    return filtered.length > 0 ? filtered : fallback;
  }, [products, studioSupplierId, purchaseOrders, suppliers]);

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
    if (!studioSupplierId) {
      showToast('Please select a supplier', 'error');
      document.getElementById('studio-supplier-select')?.focus();
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === studioSupplierId);
    if (!selectedSupplier) {
      showToast('Please select a valid supplier', 'error');
      return;
    }

    if (lineItems.length === 0) {
      showToast('Please add at least one line item to restock', 'error');
      return;
    }

    // Filter valid items that have a product selected
    const validItems = lineItems.filter((item) => item.productId);
    if (validItems.length === 0) {
      showToast('Please select at least one product to restock', 'error');
      return;
    }

    // Restock all items simultaneously into productStore & update live stock
    const restockItems = validItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cost = typeof item.costPrice === 'number' ? item.costPrice : 0;
      const selling = typeof item.sellingPrice === 'number' ? item.sellingPrice : 0;
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const batchVal = isCompanySupplier
        ? (item.batchNumber.trim() || prod?.barcode || prod?.sku || generateBatchNumber())
        : (item.batchNumber.trim() || generateBatchNumber());

      return {
        productId: item.productId,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        batchNumber: batchVal,
        costPrice: cost,
        sellingPrice: selling,
        expiryDate: item.expiryDate || 'N/A',
        quantity: qty,
      };
    });

    restockProducts(restockItems);

    const poItems: PurchaseOrderItem[] = validItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const prodName = prod?.name || 'Item';
      const prodWeight = prod?.weight || '';
      const cost = typeof item.costPrice === 'number' ? item.costPrice : 0;
      const selling = typeof item.sellingPrice === 'number' ? item.sellingPrice : 0;
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const barcodeVal = item.batchNumber.trim() || prod?.barcode || prod?.sku || '';

      return {
        id: `poi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: item.productId,
        productName: prodName,
        weight: prodWeight,
        batchNumber: barcodeVal,
        expiryDate: item.expiryDate || 'N/A',
        quantity: qty,
        costPrice: cost,
        sellingPrice: selling,
        subtotal: cost * qty,
      };
    });

    const paymentBreakdown: POPaymentBreakdown = {
      cash: isUnpaidCredit ? 0 : numCash,
      card: isUnpaidCredit ? 0 : numCard,
      cheque: isUnpaidCredit ? 0 : numCheque,
      chequeDueDate: numCheque > 0 ? chequeDueDate : undefined,
      chequeNumber: numCheque > 0 ? chequeNumber : undefined,
      unpaidDueDate: balanceDue > 0 || isUnpaidCredit ? unpaidDueDate : undefined,
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

    const printItems: RestockedItemForPrint[] = validItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const prodName = prod?.name || 'Confectionery Item';
      const prodWeight = prod?.weight || '';
      const prodSku = prod?.sku || '';
      const cost = typeof item.costPrice === 'number' ? item.costPrice : (prod?.costPrice || 0);
      const selling = typeof item.sellingPrice === 'number' ? item.sellingPrice : (prod?.price || 0);
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const finalCode = isCompanySupplier
        ? (item.batchNumber.trim() || prod?.barcode || prod?.sku || '')
        : (item.batchNumber.trim() || generateBatchNumber());

      return {
        id: item.id,
        productId: item.productId,
        productName: prodName,
        weight: prodWeight,
        sku: prodSku,
        barcode: finalCode,
        batchNumber: finalCode,
        expiryDate: item.expiryDate || 'N/A',
        costPrice: cost,
        sellingPrice: selling,
        quantity: qty,
      };
    });

    setLastRestockedData({
      invoiceRef: invoiceRef.trim() || `INV-${Date.now().toString().slice(-4)}`,
      supplierName: selectedSupplier.name,
      items: printItems,
    });

    showToast(
      `Purchase Order ${newPO.poNumber} confirmed! Received ${validItems.length} products into unified stock.`,
      'success'
    );

    // If this purchase order was resumed from a held draft, clean it up from held bills
    setHeldPOs((prev) => {
      const updated = prev.filter(
        (p) => p.id !== currentHeldId && p.invoiceRef !== invoiceRef.trim()
      );
      saveHeldPOsToStorage(updated);
      return updated;
    });
    setCurrentHeldId(null);

    setLineItems([]);
    setStudioSupplierId('');
    setIsStudioOpen(false);
    setIsBarcodeModalOpen(true);
  };

  // Hold Bill (saves draft state locally, strictly does NOT update stock or save PO)
  const handleHoldBill = () => {
    const hasItems = lineItems.some((i) => i.productId);
    if (!studioSupplierId && !hasItems) {
      showToast('Please select a supplier or add items before holding', 'error');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === studioSupplierId);
    const finalInvRef = invoiceRef.trim() || `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const heldRecord: HeldPurchaseOrder = {
      id: currentHeldId || `held-po-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      heldAt: new Date().toISOString(),
      invoiceRef: finalInvRef,
      supplierId: studioSupplierId,
      supplierName: selectedSupplier ? selectedSupplier.name : 'Unassigned Supplier',
      deliveryNotes,
      isUnpaidCredit,
      cashAmount,
      cardAmount,
      chequeAmount,
      chequeDueDate,
      chequeNumber,
      unpaidDueDate,
      lineItems,
      totalInvoiced,
    };

    setHeldPOs((prev) => {
      const exists = prev.some((p) => p.id === heldRecord.id);
      let updated: HeldPurchaseOrder[];
      if (exists) {
        updated = prev.map((p) => (p.id === heldRecord.id ? heldRecord : p));
      } else {
        updated = [heldRecord, ...prev];
      }
      saveHeldPOsToStorage(updated);
      return updated;
    });

    setIsStudioOpen(false);
    setCurrentHeldId(null);
    showToast(`Bill ${finalInvRef} held! Stock was NOT updated.`, 'info');
  };

  // Resume a held bill into Goods Inward Studio
  const handleResumeHeldPO = (po: HeldPurchaseOrder) => {
    setCurrentHeldId(po.id);
    setStudioSupplierId(po.supplierId || '');
    setInvoiceRef(po.invoiceRef || '');
    setDeliveryNotes(po.deliveryNotes || '');
    setIsUnpaidCredit(!!po.isUnpaidCredit);
    setCashAmount(po.cashAmount || '0');
    setCardAmount(po.cardAmount || '0');
    setChequeAmount(po.chequeAmount || '0');
    setChequeDueDate(po.chequeDueDate || '');
    setChequeNumber(po.chequeNumber || '');
    setUnpaidDueDate(po.unpaidDueDate || '');
    setLineItems(po.lineItems || []);
    setIsHeldPickerModalOpen(false);
    setIsStudioOpen(true);
    showToast(`Resumed held bill ${po.invoiceRef} (${po.supplierName})`, 'info');
  };

  // Discard a held bill draft
  const handleDeleteHeldPO = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHeldPOs((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveHeldPOsToStorage(updated);
      if (updated.length === 0) {
        setIsHeldPickerModalOpen(false);
      }
      return updated;
    });
    if (currentHeldId === id) {
      setCurrentHeldId(null);
    }
    showToast('Held bill draft discarded', 'info');
  };

  // Create Supplier quick handler
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    if (!isValidPhoneNumber(newSupPhone)) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    const created = addSupplier({
      name: newSupName.trim(),
      brand: newSupBrand.trim() || undefined,
      contactPerson: newSupContact.trim() || 'General Sales',
      phone: newSupPhone.trim() || '+94 11 000 0000',
      email: newSupEmail.trim() || undefined,
      address: newSupAddress.trim() || undefined,
      leadTimeDays: parseInt(newSupLeadTime, 10) || 2,
      rating: 4.8,
      status: 'Active',
      since: 'Sep 2026',
      isCompanySupplier: newSupIsCompany,
      suppliedProductIds: newSupProductIds,
    });

    setStudioSupplierId(created.id);
    showToast(`Supplier ${created.name} registered with ${newSupProductIds.length} supplied products`, 'success');
    setIsNewSupplierModalOpen(false);
    setNewSupName('');
    setNewSupBrand('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupEmail('');
    setNewSupAddress('');
    setNewSupLeadTime('2');
    setNewSupIsCompany(false);
    setNewSupProductIds([]);
    setSupProductSearch('');
  };

  // Print Barcode Labels directly from a PO
  const handlePrintLabelsForPO = (po: PurchaseOrder) => {
    const printItems: RestockedItemForPrint[] = (po.items || []).map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      return {
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        weight: it.weight || prod?.weight || '',
        sku: prod?.sku || '',
        barcode: it.batchNumber || prod?.barcode || '',
        batchNumber: it.batchNumber || prod?.barcode || '',
        expiryDate: it.expiryDate || 'N/A',
        costPrice: it.costPrice,
        sellingPrice: it.sellingPrice,
        quantity: it.quantity,
      };
    });

    setLastRestockedData({
      invoiceRef: po.invoiceRef,
      supplierName: po.supplierName,
      items: printItems,
    });
    setViewingPO(null);
    setIsBarcodeModalOpen(true);
  };

  // Filtered Purchase Orders by Selected Month (including pending / credit carryover) and Search Query
  const filteredPOs = useMemo(() => {
    const targetYear = selectedMonth.getFullYear();
    const targetMonth = selectedMonth.getMonth();
    const query = searchQuery.trim().toLowerCase();

    return purchaseOrders.filter((po) => {
      // 1. Month filtering with continuous carryover for pending / credit records
      const poDate = parsePODate(po.date);
      if (poDate) {
        const isFuture =
          poDate.year > targetYear ||
          (poDate.year === targetYear && poDate.month > targetMonth);
        if (isFuture) return false;

        const isSelectedMonth =
          poDate.year === targetYear && poDate.month === targetMonth;

        if (!isSelectedMonth) {
          // Record is from an earlier month:
          // Keep showing if it has pending cheques, credit, partial, or unpaid balance until fully paid
          const isPendingOrCredit =
            po.paymentStatus !== 'PAID' ||
            po.balanceDue > 0 ||
            po.paymentBreakdown?.chequeStatus === 'PENDING';

          if (!isPendingOrCredit) return false;
        }
      }

      // 2. Search query filter
      if (!query) return true;

      return (
        po.poNumber.toLowerCase().includes(query) ||
        po.invoiceRef.toLowerCase().includes(query) ||
        po.supplierName.toLowerCase().includes(query) ||
        po.paymentStatus.toLowerCase().includes(query) ||
        po.items.some((item) => item.productName.toLowerCase().includes(query))
      );
    });
  }, [purchaseOrders, selectedMonth, searchQuery]); // Filtered Suppliers by Search Query
  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return suppliers;

    return suppliers.filter((s) => {
      return (
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.contactPerson.toLowerCase().includes(query) ||
        s.phone.toLowerCase().includes(query) ||
        (s.email && s.email.toLowerCase().includes(query))
      );
    });
  }, [suppliers, searchQuery]);

  return (
    <AdminLayout
      title="Multi-Supplier Restock (GRN)"
      subtitle="Goods Receiving Notes, vendor inward deliveries, multi-supplier batch stock & payment settlements"
      mainClassName="flex-1 overflow-hidden p-3 sm:p-4 w-full flex flex-col min-h-0 h-full"
    >
      <div className="flex-1 flex flex-col min-h-0 w-full h-full">
        {/* Top Control Bar Separated From Table: Tabs on left (GRN & Suppliers), Controls on right */}
        <div className="flex items-center justify-between gap-3 mb-2 px-1 select-none shrink-0">
          {/* Left Side: Tabs Switcher (GRN & Suppliers) */}
          <div className="flex items-center gap-1 p-0.5 bg-stone-200/60 rounded-xl border border-stone-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('grn')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'grn'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/70'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'grn' ? 'text-[#FF5500]' : 'text-stone-400'}`} />
              <span>GRN</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold inline-flex items-center justify-center ${
                activeTab === 'grn' ? 'bg-stone-100 text-stone-700' : 'text-stone-400'
              }`}>
                {filteredPOs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'suppliers'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/70'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'suppliers' ? 'text-[#FF5500]' : 'text-stone-400'}`} />
              <span>Suppliers</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold inline-flex items-center justify-center ${
                activeTab === 'suppliers' ? 'bg-stone-100 text-stone-700' : 'text-stone-400'
              }`}>
                {filteredSuppliers.length}
              </span>
            </button>
          </div>

          {/* Right Side: Month Picker on GRN tab */}
          {activeTab === 'grn' && (
            <MonthYearPicker
              selectedDate={selectedMonth}
              onChange={(d) => setSelectedMonth(d)}
            />
          )}
        </div>

        {activeTab === 'grn' ? (
          /* Purchase Orders / Goods Receiving Notes Ledger Table (Pure Table Card) */
          <div className="flex-1 flex flex-col min-h-0 w-full h-full bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 w-full h-full">
              <table className="w-full border-collapse text-left min-w-[850px]">
                <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                  <tr className="bg-[#FAF7F2] border-b border-stone-200/70 shadow-2xs">
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Purchase / Invoice
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap min-w-[190px]">
                      Supplier / Vendor
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Date / Time
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Items
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
                      const poDate = parsePODate(po.date);
                      const isFromEarlierMonth =
                        poDate &&
                        (poDate.year < selectedMonth.getFullYear() ||
                          (poDate.year === selectedMonth.getFullYear() && poDate.month < selectedMonth.getMonth()));
                      const showRolledOver = Boolean(po.isRolledOver || isFromEarlierMonth);
                      const scheduleInfo = getPaymentScheduleInfo(po);

                      return (
                        <tr
                          key={po.id}
                          onClick={() => setViewingPO(po)}
                          className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                        >
                          {/* 1. PURCHASE / INVOICE */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-[10px] text-stone-900 leading-tight">
                              {po.poNumber}
                            </div>
                            <div className="text-[8.5px] text-zinc-400 font-mono tracking-tight leading-none mt-0.5">
                              {po.invoiceRef}
                            </div>
                          </td>

                          {/* 2. SUPPLIER / VENDOR */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="text-[10px] font-medium text-stone-800 leading-tight">
                              {po.supplierName}
                            </div>
                          </td>

                          {/* 3. DATE / TIME */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 leading-tight">
                              <span className="font-medium text-[10px] text-stone-700">{po.date}</span>
                              {showRolledOver && (
                                <span className="text-[8.5px] font-bold uppercase tracking-wider text-amber-700 font-mono inline-flex items-center leading-normal">
                                  Rolled Over
                                </span>
                              )}
                            </div>
                            <div className="text-[8.5px] text-zinc-400 font-mono leading-none mt-0.5">
                              {po.time}
                            </div>
                          </td>

                          {/* 4. ITEMS */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <span className="text-[9.5px] font-medium text-stone-600 font-mono leading-normal">
                              {po.items.length} Items
                            </span>
                          </td>

                          {/* 5. TOTAL INVOICED */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <span className="font-mono text-[10.5px] font-bold text-stone-900">
                              Rs. {po.totalInvoiced.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* 6. PAID / BALANCE DUE */}
                          <td className="py-1.5 px-3 whitespace-nowrap font-mono text-[10px]">
                            <div className="leading-tight">
                              <span className="text-emerald-700 font-bold">Paid: </span>
                              <span className="text-emerald-700 font-bold">
                                Rs. {po.totalPaid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {po.balanceDue > 0 ? (
                              <div className="text-rose-600 font-bold leading-none mt-0.5 text-[9.5px]">
                                <span>Balance Due: </span>
                                <span>Rs. {po.balanceDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                              </div>
                            ) : po.paymentBreakdown?.cheque && po.paymentBreakdown.cheque > 0 ? (
                              <div className="text-amber-800 font-medium leading-none mt-0.5 text-[9px]">
                                <span>Pending Chq: </span>
                                <span>Rs. {po.paymentBreakdown.cheque.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                              </div>
                            ) : null}
                          </td>

                          {/* 7. PAYMENT STATUS */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col justify-center">
                              {po.paymentStatus === 'CHEQUE PENDING' && (
                                <div className="flex flex-col items-start">
                                  <span className="text-amber-800 font-bold uppercase text-[9px] inline-flex items-center gap-1 leading-tight">
                                    <Landmark className="w-2.5 h-2.5 text-amber-700" />
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
                                    <AlertCircle className="w-2.5 h-2.5 text-orange-600" />
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
        ) : (
          /* Suppliers Directory Ledger Table */
          <div className="flex-1 flex flex-col min-h-0 w-full h-full bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 w-full h-full">
              <table className="w-full border-collapse text-left min-w-[850px]">
                <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                  <tr className="bg-[#FAF7F2] border-b border-stone-200/70 shadow-2xs">
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                      Supplier Name &amp; Code
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                      Contact Person
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap min-w-[180px]">
                      Phone &amp; Email
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center min-w-[100px]">
                      Supplied SKUs
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-center min-w-[90px]">
                      Total Orders
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                      Status
                    </th>
                    <th className="py-1.5 px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap text-right min-w-[80px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((sup) => {
                      const productCount = products.filter(
                        (p) => p.supplierId === sup.id || p.batches?.some((b) => b.supplierId === sup.id)
                      ).length;
                      const orderCount = purchaseOrders.filter((po) => po.supplierId === sup.id).length;

                      return (
                        <tr
                          key={sup.id}
                          onClick={() => navigate(`/admin/suppliers/${sup.id}`)}
                          className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                        >
                          {/* 1. Supplier Name & Code */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[10.5px] text-stone-900 leading-tight">
                                {sup.name}
                              </span>
                              {sup.isCompanySupplier && (
                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 leading-none">
                                  Company
                                </span>
                              )}
                              {sup.brand && (
                                <span className="text-[8.5px] text-amber-700 font-bold inline-flex items-center leading-normal">
                                  ({sup.brand})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-zinc-400 font-mono tracking-tight leading-none">
                                {sup.code}
                              </span>
                              {sup.since && (
                                <span className="text-[8.5px] text-stone-400 leading-none">
                                  • Since {sup.since}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Contact Person */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="text-[10px] font-medium text-stone-800 leading-tight">
                              {sup.contactPerson || 'General Sales'}
                            </div>
                            {sup.rating ? (
                              <div className="flex items-center gap-1 text-[9px] text-amber-600 font-bold mt-0.5 leading-none">
                                <span>★ {sup.rating}</span>
                                {sup.leadTimeDays && (
                                  <span className="text-zinc-400 font-normal font-sans">
                                    • {sup.leadTimeDays}d lead
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </td>

                          {/* 3. Phone & Email */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="font-mono text-[10px] text-stone-700 leading-tight">
                              {sup.phone}
                            </div>
                            <div className="text-[9px] text-zinc-400 font-mono leading-none mt-0.5">
                              {sup.email || 'No email recorded'}
                            </div>
                          </td>

                          {/* 4. Supplied SKUs */}
                          <td className="py-1.5 px-3 whitespace-nowrap text-center">
                            <span className="text-[9.5px] font-medium text-stone-700 font-mono leading-normal">
                              {productCount} SKUs
                            </span>
                          </td>

                          {/* 5. Total Orders */}
                          <td className="py-1.5 px-3 whitespace-nowrap text-center">
                            <span className="font-mono text-[10px] font-medium text-stone-700">
                              {orderCount} GRNs
                            </span>
                          </td>

                          {/* 6. Status */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <span
                              className={`text-[8.5px] font-bold uppercase tracking-wider inline-flex items-center gap-1 leading-normal ${
                                sup.status === 'Active' ? 'text-emerald-700' : 'text-stone-500'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sup.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-400'
                                }`}
                              />
                              <span>{sup.status}</span>
                            </span>
                          </td>

                          {/* 7. Actions */}
                          <td className="py-1.5 px-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setEditingSupplier(sup)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
                              title={`Edit ${sup.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        <Building2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <p className="font-semibold text-xs text-zinc-600">No Suppliers found</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {searchQuery
                            ? 'Try modifying your search query.'
                            : 'Click "Add Supplier" to register your first supplier.'}
                        </p>
                      </td>
                    </tr>
                  )}
                  {filteredSuppliers.length > 0 && (
                    <tr className="h-20 pointer-events-none">
                      <td colSpan={7} className="border-0 bg-transparent"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
            placeholder={activeTab === 'suppliers' ? "Search suppliers, code, contact..." : "Search POs, vendors, items..."}
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

          {/* Add Action Button: Open Add Supplier on suppliers tab, Open Receive Stock on GRN tab */}
          <button
            type="button"
            onClick={activeTab === 'suppliers' ? () => setIsNewSupplierModalOpen(true) : handleOpenStudio}
            className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] aspect-square rounded-full bg-white hover:bg-orange-50 border-2 border-[#FF5500] inline-flex items-center justify-center p-0 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer flex-shrink-0"
            title={activeTab === 'suppliers' ? "Register New Supplier" : "Receive Stock / New Goods Receiving Note"}
          >
            <Plus className="w-[18px] h-[18px] text-[#FF5500] stroke-[2.5] block shrink-0" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Right Held Bills Circle Button (Matches sample design, strictly no animation) */}
      {heldPOs.length > 0 && (
        <div className="fixed bottom-7 sm:bottom-8 right-6 sm:right-8 z-30 flex items-center">
          <button
            type="button"
            onClick={() => {
              setIsHeldPickerModalOpen(true);
            }}
            className="group relative w-11 h-11 sm:w-12 sm:h-12 aspect-square rounded-full bg-[#2B2B2B] text-white border-2 border-[#FF9100] shadow-lg shadow-black/25 hover:border-[#FFA500] hover:scale-105 active:scale-95 transition-transform duration-150 cursor-pointer flex items-center justify-center ring-4 ring-black/10"
            title={
              heldPOs.length === 1
                ? `1 Held Restock Bill (${heldPOs[0].supplierName}) - Click to view`
                : `${heldPOs.length} Held Restock Bills - Click to view`
            }
          >
            {/* Center Pause Icon with golden orange stroke matching sample */}
            <PauseCircle className="w-6 h-6 text-[#FFA800] stroke-[2.2] block shrink-0" />

            {/* Badge Counter with white translucent halo - strictly NO animation */}
            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-gradient-to-b from-[#FF7A18] to-[#E84800] text-white text-[10.5px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white/85 ring-2 ring-[#FF7A18]/40">
              {heldPOs.length}
            </span>

            {/* Floating tooltip preview on hover */}
            <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-stone-900/95 text-stone-200 text-[11px] font-bold border border-stone-700 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
              {heldPOs.length === 1
                ? `Held: ${heldPOs[0].invoiceRef} (Click to view)`
                : `${heldPOs.length} Held Bills (Click to view)`}
            </div>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-PANEL GOODS INWARD STUDIO MODAL (RECEIVE STOCK / PURCHASE ORDER)       */}
      {/* ========================================================================= */}
      {isStudioOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
          <div className="bg-[#383736] text-stone-100 rounded-[24px] sm:rounded-[28px] w-full max-w-[1520px] 2xl:max-w-[1620px] h-[92vh] max-h-[760px] flex flex-col justify-between p-3.5 sm:p-4 md:p-5 shadow-2xl border border-stone-700/60 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Top Header Bar: Sitting directly on dark charcoal canvas */}
            <div className="flex items-center justify-between px-1 pb-2.5 sm:pb-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Receive Stock / Purchase Order
                </h2>
                <span className="hidden sm:inline-flex bg-[#2a2928] text-stone-300 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-stone-600/70 font-bold tracking-wide shrink-0">
                  Goods Inward Studio
                </span>
                {currentHeldId && (
                  <span className="hidden md:inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-amber-500/40 font-bold tracking-wide shrink-0">
                    <PauseCircle className="w-3 h-3 text-amber-400" />
                    Held Draft
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsStudioOpen(false);
                    setCurrentHeldId(null);
                  }}
                  className="px-4 py-1 rounded-full bg-[#2a2928] hover:bg-stone-700 text-stone-200 text-[11px] font-bold border border-stone-600/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleHoldBill}
                  className="px-4 py-1 rounded-full bg-amber-600/85 hover:bg-amber-600 text-white text-[11px] font-bold shadow-sm border border-amber-500/60 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  title="Hold this bill without updating stock"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-200" />
                  <span>Hold Bill</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  disabled={lineItems.length === 0}
                  className="px-4 py-1 rounded-full bg-[#00b4b6] hover:bg-[#009ca0] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  Confirm &amp; Update Stock
                </button>
              </div>
            </div>

            {/* Studio Main Workspace: Single Full-Width Card (Table gets 100% full width) */}
            <div className="flex flex-col justify-between bg-white rounded-[20px] sm:rounded-[22px] p-3.5 sm:p-4 shadow-md border border-stone-200/80 flex-1 min-h-0 overflow-hidden text-stone-900">
              {/* Row 1: Header with Title, Invoice #, Supplier Select, Unpaid (Credit) toggle, and + Add Item */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pb-2 border-b border-stone-100 shrink-0">
                {/* Left: Icon & Section Title */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-6 h-6 rounded-md bg-[#FAF0E6] flex items-center justify-center text-[#9E6240] shrink-0">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#9E6240] whitespace-nowrap">
                    Received Line Items
                  </span>
                </div>

                {/* Right: Controls (Invoice # + Supplier Dropdown with Bottom Border + Unpaid Credit Toggle + Add Item) */}
                <div className="flex items-center flex-wrap gap-3 sm:gap-4 shrink-0">
                  {/* Invoice / Bill Ref Display (Auto-generated, display only - not editable) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 whitespace-nowrap">
                      Inv / Bill #:
                    </span>
                    <span className="font-mono font-bold text-stone-900 text-[11.5px] tracking-tight select-all">
                      {invoiceRef}
                    </span>
                  </div>

                  {/* Supplier Select Dropdown (No background, only bottom border) */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-stone-400 whitespace-nowrap">
                      Supplier:
                    </label>
                    <div className="relative flex items-center">
                      <select
                        id="studio-supplier-select"
                        value={studioSupplierId}
                        onChange={(e) => {
                          const newSupId = e.target.value;
                          setStudioSupplierId(newSupId);
                          const targetSup = suppliers.find((s) => s.id === newSupId);
                          const isComp = Boolean(targetSup?.isCompanySupplier);

                          // Update batch numbers for existing lines to reflect company barcode vs non-company batch
                          setLineItems((prev) =>
                            prev.map((item) => {
                              if (!item.productId) return item;
                              const prod = products.find((p) => p.id === item.productId);
                              if (!prod) return item;
                              if (isComp) {
                                return { ...item, batchNumber: getProductBarcode(prod) };
                              } else {
                                const bc = getProductBarcode(prod);
                                if (!item.batchNumber || item.batchNumber === bc) {
                                  return { ...item, batchNumber: generateBatchNumber() };
                                }
                                return item;
                              }
                            })
                          );

                          if (newSupId && lineItems.length === 0) {
                            setTimeout(() => {
                              handleAddLineItem(newSupId);
                            }, 50);
                          } else if (!newSupId) {
                            setLineItems((prev) => prev.filter((item) => !!item.productId));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (e.currentTarget.value) {
                              if (lineItems.length === 0) {
                                handleAddLineItem(e.currentTarget.value);
                              } else {
                                focusField(0, 'product');
                              }
                            } else {
                              showToast('Please select a supplier first', 'warning');
                            }
                          }
                        }}
                        className={`bg-transparent border-0 border-b ${
                          !studioSupplierId
                            ? 'border-amber-400 text-stone-700 font-bold'
                            : 'border-stone-300 focus:border-[#00b4b6] text-stone-800'
                        } focus:outline-none rounded-none font-bold text-[11px] py-0.5 pl-1 pr-5 max-w-[190px] sm:max-w-[240px] truncate cursor-pointer appearance-none transition-colors`}
                      >
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 text-[9px]">
                        ▼
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNewSupplierModalOpen(true)}
                      className="text-[9.5px] font-bold text-[#00b4b6] hover:underline cursor-pointer whitespace-nowrap pl-0.5"
                      title="Register New Supplier"
                    >
                      + New
                    </button>
                  </div>

                  {/* Unpaid (Credit) Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleCredit}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isUnpaidCredit
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Unpaid (Credit)</span>
                  </button>

                  {/* + Add Item Button */}
                  <button
                    type="button"
                    onClick={() => handleAddLineItem()}
                    className={`px-3 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0 ${
                      !studioSupplierId
                        ? 'border-stone-200 text-stone-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/40'
                        : 'border-[#00b4b6] text-[#00b4b6] hover:bg-[#00b4b6]/10 hover:scale-[1.02] active:scale-95'
                    }`}
                    title={!studioSupplierId ? 'Please select a supplier first' : 'Add Item (Enter)'}
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Top Payment Settlement Bar (No background colors, bottom-border-only inputs) */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 border-b border-stone-100 shrink-0 text-stone-900">
                {/* Left Group: Cash, Card/Bank, Cheque Payment Inputs */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {/* Cash Method */}
                  <div className={`flex items-center gap-1.5 transition-opacity ${isUnpaidCredit ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-[11px] shrink-0">
                      <Banknote className="w-3.5 h-3.5" />
                      <span className="text-stone-800 font-bold text-[11px]">Cash</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofillPayment('cash')}
                      disabled={isUnpaidCredit}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer select-none"
                      title="Autofill remaining balance with Cash"
                    >
                      Full
                    </button>
                    <input
                      type="number"
                      value={cashAmount}
                      disabled={isUnpaidCredit}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-18 sm:w-20 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none text-right font-mono font-bold text-[11px] text-stone-800 py-0.5 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                    />
                  </div>

                  {/* Card / Bank Method */}
                  <div className={`flex items-center gap-1.5 transition-opacity ${isUnpaidCredit ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-1 text-teal-600 font-bold text-[11px] shrink-0">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="text-stone-800 font-bold text-[11px]">Card / Bank</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofillPayment('card')}
                      disabled={isUnpaidCredit}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer select-none"
                      title="Autofill remaining balance with Card"
                    >
                      Full
                    </button>
                    <input
                      type="number"
                      value={cardAmount}
                      disabled={isUnpaidCredit}
                      onChange={(e) => setCardAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-18 sm:w-20 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none text-right font-mono font-bold text-[11px] text-stone-800 py-0.5 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                    />
                  </div>

                  {/* Cheque Method */}
                  <div className={`flex flex-wrap items-center gap-1.5 transition-opacity ${isUnpaidCredit ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-1 text-amber-600 font-bold text-[11px] shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-stone-800 font-bold text-[11px]">Cheque</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutofillPayment('cheque')}
                      disabled={isUnpaidCredit}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer select-none"
                      title="Autofill remaining balance with Cheque"
                    >
                      Full
                    </button>
                    <input
                      type="number"
                      value={chequeAmount}
                      disabled={isUnpaidCredit}
                      onChange={(e) => setChequeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-18 sm:w-20 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none text-right font-mono font-bold text-[11px] text-stone-800 py-0.5 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                    />

                    {/* Cheque Extra Details (Due Date & Cheque # with YYYY / MM / DD masking) */}
                    {numCheque > 0 && !isUnpaidCredit && (
                      <div className="flex items-center gap-2 pl-1 animate-fadeIn">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-stone-400 uppercase">Due:</span>
                          <input
                            type="text"
                            value={chequeDueDate}
                            onChange={(e) => setChequeDueDate(formatDateYYYYMMDD(e.target.value, chequeDueDate))}
                            placeholder="YYYY / MM / DD"
                            className="w-24 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none font-mono text-[10.5px] text-stone-800 text-center py-0.5 px-1 placeholder:text-stone-300 transition-colors"
                            title="Cheque Due Date (YYYY / MM / DD)"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-stone-400 uppercase">#</span>
                          <input
                            type="text"
                            value={chequeNumber}
                            onChange={(e) => setChequeNumber(e.target.value)}
                            placeholder="CHQ-..."
                            className="w-20 bg-transparent border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none rounded-none font-mono text-[10.5px] text-stone-800 py-0.5 px-1 placeholder:text-stone-300 transition-colors"
                            title="Cheque Reference Number"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Group: Unpaid Balance + Payment Date + Totals Summary */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ml-auto">
                  {/* Unpaid Balance Indicator & Payment Date */}
                  {(balanceDue > 0 || isUnpaidCredit) && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-rose-600">Unpaid:</span>
                        <span className="font-mono font-bold">
                          Rs. {balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 pl-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 whitespace-nowrap">
                          Payment Date:
                        </span>
                        <input
                          type="text"
                          value={unpaidDueDate}
                          onChange={(e) => setUnpaidDueDate(formatDateYYYYMMDD(e.target.value, unpaidDueDate))}
                          placeholder="YYYY / MM / DD"
                          className="w-24 bg-transparent border-0 border-b border-rose-300 focus:border-rose-600 focus:outline-none rounded-none font-mono text-[10.5px] font-bold text-rose-700 text-center py-0.5 px-1 placeholder:text-stone-300 transition-colors"
                          title="Payment date for unpaid balance (YYYY / MM / DD)"
                        />
                      </div>
                    </div>
                  )}

                  {/* Summary: Paid & Invoiced */}
                  <div className="flex items-center gap-3 text-[10px] text-stone-400 font-semibold pl-2 border-l border-stone-200">
                    <span>
                      Paid: <strong className="font-mono text-[#00b4b6]">Rs. {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span>
                      Invoiced: <strong className="font-mono text-stone-800">Rs. {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Items Single Row Table (100% Full Width) */}
              <div className="flex-1 min-h-0 flex flex-col justify-between py-1 overflow-hidden">
                {/* Single-Row Items Table Container (No outer border, fully responsive) */}
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
                  <table className="w-full min-w-[820px] text-left border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[3%]" />
                      <col className="w-[26%]" />
                      <col className="w-[14%]" />
                      <col className="w-[13%]" />
                      <col className="w-[9%]" />
                      <col className="w-[7%]" />
                      <col className="w-[10%]" />
                      <col className="w-[6%]" />
                      <col className="w-[9%]" />
                      <col className="w-[3%]" />
                    </colgroup>
                    <thead className="sticky top-0 bg-[#FAF7F2] border-b border-stone-200/80 z-10 select-none">
                      <tr className="text-[9px] font-black uppercase tracking-wider text-stone-500 whitespace-nowrap">
                        <th className="py-2 px-1 text-center">#</th>
                        <th className="py-2 px-2 text-left">Product</th>
                        <th className="py-2 px-1.5 text-center">
                          {isCompanySupplier ? 'Barcode' : 'Batch Number'}
                        </th>
                        <th className="py-2 px-1 text-center">Expiry</th>
                        <th className="py-2 px-1 text-right">Cost (Rs.)</th>
                        <th className="py-2 px-0.5 text-center">
                          <div className="inline-flex items-center justify-center gap-0.5">
                            <span>Margin</span>
                            <Percent className="w-2.5 h-2.5 text-stone-400 stroke-[2.5]" />
                          </div>
                        </th>
                        <th className="py-2 px-1 text-right">Sell (Rs.)</th>
                        <th className="py-2 px-0.5 text-center">Qty</th>
                        <th className="py-2 px-1.5 text-right">Total</th>
                        <th className="py-2 px-1 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs">
                      {lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-14 text-center text-stone-400 select-none">
                            <div
                              onClick={() => handleAddLineItem()}
                              className="flex flex-col items-center justify-center gap-1 cursor-pointer group py-4"
                            >
                              <p className="font-bold text-stone-700 text-xs">
                                {!studioSupplierId ? 'Please Select a Supplier First' : 'No Items in This Restock'}
                              </p>
                              <p className="text-[10.5px] text-stone-400">
                                {!studioSupplierId ? (
                                  <span>
                                    Choose a <span className="font-bold text-[#00b4b6] underline underline-offset-2">Supplier</span> above before adding products.
                                  </span>
                                ) : (
                                  <span>
                                    Click <span className="font-bold text-[#00b4b6] underline underline-offset-2">+ Add Item</span> or press <kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-[9px] font-mono font-bold text-stone-600 border border-stone-200">Enter</kbd> to begin.
                                  </span>
                                )}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        lineItems.map((item, idx) => {
                          const numCost = typeof item.costPrice === 'number' ? item.costPrice : 0;
                          const numQty = typeof item.quantity === 'number' ? item.quantity : 0;
                          const lineSubtotal = numCost * numQty;
                          return (
                            <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                              {/* # Index */}
                              <td className="py-2 px-1 text-center font-mono font-bold text-stone-400 text-[10px]">
                                #{idx + 1}
                              </td>

                              {/* Product Autocomplete Selector (Filtered by Selected Supplier, Letter-by-letter matching) */}
                              <td className="py-2 px-2 relative">
                                <LineItemProductAutocomplete
                                  idx={idx}
                                  item={item}
                                  products={products}
                                  supplierFilteredProducts={supplierFilteredProducts}
                                  studioSupplierId={studioSupplierId}
                                  supplierName={suppliers.find((s) => s.id === studioSupplierId)?.name}
                                  onSelectProduct={(newProductId) =>
                                    handleUpdateLineItem(item.id, { productId: newProductId })
                                  }
                                  onNavigateNext={() => focusField(idx, 'expiry')}
                                  onNavigatePrev={() => (idx > 0 ? focusField(idx - 1, 'qty') : null)}
                                />
                              </td>

                              {/* Product Barcode or Batch Number */}
                              <td className="py-2 px-1.5 text-center">
                                <input
                                  id={`line-item-${idx}-barcode`}
                                  type="text"
                                  value={item.batchNumber}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, { batchNumber: e.target.value })
                                  }
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => handleKeyDownNav(e, idx, 'barcode')}
                                  placeholder={isCompanySupplier ? 'No Barcode' : 'BAT-XXXXXX'}
                                  title={
                                    item.batchNumber
                                      ? isCompanySupplier
                                        ? `Company Barcode: ${item.batchNumber}`
                                        : `Batch Number: ${item.batchNumber}`
                                      : isCompanySupplier
                                      ? 'Enter or scan product barcode'
                                      : 'Enter unique batch number'
                                  }
                                  className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-stone-200 focus:border-[#00b4b6] focus:outline-none font-mono font-bold text-[11px] text-stone-800 text-center py-0.5 placeholder:text-stone-300 transition-colors truncate"
                                />
                              </td>

                              {/* Expiry Date (YYYY / MM / DD auto-formatting & auto-jump to Cost) */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  id={`line-item-${idx}-expiry`}
                                  type="text"
                                  value={item.expiryDate}
                                  onChange={(e) =>
                                    handleExpiryInputChange(item.id, idx, e.target.value)
                                  }
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => handleKeyDownNav(e, idx, 'expiry')}
                                  placeholder="YYYY / MM / DD"
                                  className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-stone-200 focus:border-[#00b4b6] focus:outline-none font-mono text-[10.5px] text-stone-800 text-center py-0.5 placeholder:text-stone-300 transition-colors"
                                />
                              </td>

                              {/* Cost / Unit (Rs.) (Enter jumps to Margin) */}
                              <td className="py-2 px-1 text-right">
                                <input
                                  id={`line-item-${idx}-cost`}
                                  type="number"
                                  step="any"
                                  value={item.costPrice}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      costPrice: e.target.value === '' ? '' : isNaN(parseFloat(e.target.value)) ? '' : parseFloat(e.target.value),
                                    })
                                  }
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => handleKeyDownNav(e, idx, 'cost')}
                                  placeholder="0"
                                  className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-stone-200 focus:border-[#00b4b6] focus:outline-none font-mono font-bold text-[11px] text-stone-900 text-right py-0.5 placeholder:text-stone-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                                />
                              </td>

                              {/* Margin % (Enter jumps to Sell) */}
                              <td className="py-2 px-0.5 text-center">
                                <div className="relative flex items-center justify-center w-full">
                                  <input
                                    id={`line-item-${idx}-margin`}
                                    type="number"
                                    step="any"
                                    value={item.profitMargin}
                                    onChange={(e) =>
                                      handleUpdateLineItem(item.id, {
                                        profitMargin: e.target.value === '' ? '' : isNaN(parseFloat(e.target.value)) ? '' : parseFloat(e.target.value),
                                      })
                                    }
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleKeyDownNav(e, idx, 'margin')}
                                    placeholder="0"
                                    className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-stone-200 focus:border-[#00b4b6] focus:outline-none font-mono font-bold text-[11px] text-stone-900 text-center py-0.5 pr-3 placeholder:text-stone-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                                  />
                                  <span className="absolute right-0.5 pointer-events-none text-stone-400 flex items-center">
                                    <Percent className="w-2.5 h-2.5 stroke-[2.5]" />
                                  </span>
                                </div>
                              </td>

                              {/* Selling Price (Rs.) (Enter jumps to Qty) */}
                              <td className="py-2 px-1 text-right">
                                <input
                                  id={`line-item-${idx}-sell`}
                                  type="number"
                                  step="any"
                                  value={item.sellingPrice}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      sellingPrice: e.target.value === '' ? '' : isNaN(parseFloat(e.target.value)) ? '' : parseFloat(e.target.value),
                                    })
                                  }
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => handleKeyDownNav(e, idx, 'sell')}
                                  placeholder="0"
                                  className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-stone-200 focus:border-[#00b4b6] focus:outline-none font-mono font-bold text-[11px] text-stone-900 text-right py-0.5 placeholder:text-stone-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                                />
                              </td>

                              {/* Restock Qty (Enter adds next row and focuses it) */}
                              <td className="py-2 px-0.5 text-center">
                                <input
                                  id={`line-item-${idx}-qty`}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      quantity: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 1,
                                    })
                                  }
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => handleKeyDownNav(e, idx, 'qty')}
                                  placeholder="0"
                                  className="w-full bg-transparent border-0 border-b-2 border-transparent hover:border-stone-200 focus:border-[#00b4b6] focus:outline-none font-mono font-bold text-[11px] text-stone-900 text-center py-0.5 placeholder:text-stone-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                                />
                              </td>

                              {/* Line Total */}
                              <td className="py-2 px-1.5 text-right whitespace-nowrap">
                                <div className="font-mono font-bold text-[11px] text-stone-900">
                                  Rs. {lineSubtotal.toLocaleString()}
                                </div>
                              </td>

                              {/* Remove Button */}
                              <td className="py-2 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(item.id)}
                                  title="Remove line item"
                                  className="w-5 h-5 rounded text-stone-400 hover:text-rose-600 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Totals Bar */}
                <div className="pt-2 border-t border-stone-100 flex flex-wrap justify-between items-center gap-3 text-[10.5px] shrink-0 mt-1">
                  {/* Optional PO / Delivery Notes */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-sm">
                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 whitespace-nowrap">
                      PO Notes:
                    </span>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Optional delivery / receiving notes..."
                      className="flex-1 bg-transparent border-0 border-b border-stone-200 focus:border-[#00b4b6] focus:outline-none rounded-none text-stone-700 text-[10px] py-0.5 px-1 placeholder:text-stone-400 placeholder:text-[9.5px] transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3.5 shrink-0">
                    <span className="text-stone-500">
                      Total Units: <strong className="text-stone-900">{lineItems.reduce((s, i) => s + (typeof i.quantity === 'number' ? i.quantity : 0), 0)} units</strong>
                    </span>
                    <span className="font-mono font-bold text-stone-700">
                      Total Invoiced: <strong className="text-[#00b4b6] text-xs">Rs. {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PURCHASE ORDER INSPECTION / DETAILS / SETTLEMENT STUDIO MODAL              */}
      {/* ========================================================================= */}
      {viewingPO && (
        <PurchaseOrderDetailsModal
          isOpen={!!viewingPO}
          onClose={() => setViewingPO(null)}
          purchaseOrder={viewingPO}
          onPrintLabels={handlePrintLabelsForPO}
        />
      )}

      {/* ========================================================================= */}
      {/* REGISTER NEW SUPPLIER MODAL (WITH BRAND & SUPPLYING PRODUCTS LIST)       */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* SUPPLIER REGISTRATION STUDIO MODAL (MATCHES GOODS INWARD STUDIO DESIGN)  */}
      {/* ========================================================================= */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
          <div className="bg-[#383736] text-stone-100 rounded-[22px] sm:rounded-[28px] w-full max-w-[1380px] h-[92vh] sm:h-[88vh] max-h-[760px] min-h-[480px] flex flex-col justify-between p-3 sm:p-4 md:p-5 shadow-2xl border border-stone-700/60 overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Top Header Bar: Sitting directly on dark charcoal canvas */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 sm:pb-2.5 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Register New Supplier / Vendor
                </h2>
                <span className="hidden sm:inline-flex bg-[#2a2928] text-stone-300 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-stone-600/70 font-bold tracking-wide shrink-0">
                  Supplier Onboarding Studio
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="px-3.5 sm:px-4 py-1 rounded-full bg-[#2a2928] hover:bg-stone-700 text-stone-200 text-[11px] font-bold border border-stone-600/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSupplier}
                  disabled={!newSupName.trim() || !isValidPhoneNumber(newSupPhone)}
                  className="px-3.5 sm:px-4 py-1 rounded-full bg-[#00b4b6] hover:bg-[#009ca0] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  Confirm &amp; Register Supplier
                </button>
              </div>
            </div>

            {/* Studio Main Workspace: Single Full-Width Card */}
            <div className="flex flex-col bg-white rounded-[18px] sm:rounded-[22px] p-3 sm:p-4 shadow-md border border-stone-200/80 flex-1 min-h-0 overflow-hidden text-stone-900">
              {/* Row 1: Header with Title & Auto Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100 shrink-0">
                {/* Left: Icon & Section Title */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-5.5 h-5.5 rounded-md bg-[#FAF0E6] flex items-center justify-center text-[#9E6240] shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#9E6240] whitespace-nowrap">
                    Vendor Identity &amp; Product Portfolio
                  </span>
                </div>

                {/* Right: Quick Indicators */}
                <div className="flex items-center flex-wrap gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">STATUS:</span>
                    <span className="text-emerald-700 text-[10px] font-bold uppercase">
                      ACTIVE PARTNER
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">CATALOGUE:</span>
                    <span className="font-mono font-bold text-stone-900 text-[11.5px]">
                      {newSupProductIds.length} Products Selected
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Side Split Body: One side for person details, next side to select items */}
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 xl:gap-6 pt-2.5 overflow-hidden">
                {/* LEFT SIDE: Person Details (Compact 2-col grid, fits cleanly without scrollbar) */}
                <div className="w-full lg:w-[350px] xl:w-[390px] shrink-0 flex flex-col justify-between min-h-0">
                  <div>
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-stone-100 mb-2.5">
                      <User className="w-3.5 h-3.5 text-[#00b4b6]" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-700">
                        Supplier &amp; Person Details
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* 1. Supplier Name (Full width) */}
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                          Company / Name *
                        </label>
                        <input
                          type="text"
                          value={newSupName}
                          onChange={(e) => setNewSupName(e.target.value)}
                          placeholder="e.g., Harischandra Mills"
                          required
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6]"
                        />
                        <div className="pt-1.5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newSupIsCompany}
                              onChange={(e) => setNewSupIsCompany(e.target.checked)}
                              className="w-3.5 h-3.5 text-[#00b4b6] rounded border-stone-300 focus:ring-0 cursor-pointer accent-[#00b4b6]"
                            />
                            <span className="text-[11px] font-bold text-stone-700">Company Supplier</span>
                          </label>
                        </div>
                      </div>

                      {/* Row 2: Contact Person + Phone Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            value={newSupContact}
                            onChange={(e) => setNewSupContact(e.target.value)}
                            placeholder="e.g., Sunil Perera"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6]"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            value={newSupPhone}
                            onChange={(e) => setNewSupPhone(formatPhoneNumber(e.target.value))}
                            placeholder="077 123 4567"
                            maxLength={12}
                            required
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6] font-mono"
                          />
                        </div>
                      </div>

                      {/* Row 3: Email Address + Lead Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={newSupEmail}
                            onChange={(e) => setNewSupEmail(e.target.value)}
                            placeholder="e.g., supply@harischandra.lk"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6]"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                            Lead Time (Days)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={newSupLeadTime}
                            onChange={(e) => setNewSupLeadTime(e.target.value)}
                            placeholder="e.g., 2"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6]"
                          />
                        </div>
                      </div>

                      {/* Row 4: Address (Optional) */}
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                          Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={newSupAddress}
                          onChange={(e) => setNewSupAddress(e.target.value)}
                          placeholder="e.g., No. 120, Station Road, Matara"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#00b4b6]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:block pt-2 text-[10px] text-stone-400 italic">
                    All partner communications &amp; lead delivery notices will link to these coordinates.
                  </div>
                </div>

                {/* RIGHT SIDE: Select Items (Product Catalogue Multi-Select Table) */}
                <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden border border-stone-200 rounded-xl shadow-2xs">
                  {/* Table Top Controls Bar */}
                  <div className="p-2 sm:p-2.5 bg-[#FAF7F2] border-b border-stone-200/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-stone-800 whitespace-nowrap">Assign Supplying Products</span>
                      <span className="text-[10.5px] text-stone-400 whitespace-nowrap">
                        ({newSupProductIds.filter((id) => selectableNewSupProducts.some((p) => p.id === id)).length}/{selectableNewSupProducts.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-1 sm:flex-initial justify-end">
                      {/* Search inside Catalogue */}
                      <div className="relative w-full sm:w-44 md:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={supProductSearch}
                          onChange={(e) => setSupProductSearch(e.target.value)}
                          placeholder="Search SKU, name, brand..."
                          className="w-full pl-8 pr-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#00b4b6]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Table View of Products (With horizontal and vertical auto-scrolling) */}
                  <div className="flex-1 overflow-auto min-h-0">
                    <table className="w-full border-collapse text-left text-xs min-w-[380px] sm:min-w-[460px]">
                      <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                        <tr className="border-b border-stone-200/70 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          <th className="py-2 px-2.5 w-9 text-center">
                            <input
                              type="checkbox"
                              checked={selectableNewSupProducts.length > 0 && selectableNewSupProducts.every((p) => newSupProductIds.includes(p.id))}
                              onChange={(e) => {
                                const allIds = selectableNewSupProducts.map((p) => p.id);
                                if (e.target.checked) {
                                  setNewSupProductIds((prev) => Array.from(new Set([...prev, ...allIds])));
                                } else {
                                  setNewSupProductIds((prev) => prev.filter((id) => !allIds.includes(id)));
                                }
                              }}
                              className="w-3.5 h-3.5 text-[#00b4b6] rounded focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="py-2 px-2.5">Product Name</th>
                          <th className="py-2 px-2.5">SKU / Code</th>
                          <th className="py-2 px-2.5">Brand</th>
                          <th className="py-2 px-2.5 hidden sm:table-cell">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectableNewSupProducts
                          .filter((p) => {
                            if (!supProductSearch.trim()) return true;
                            const q = supProductSearch.trim().toLowerCase();
                            return (
                              p.name.toLowerCase().includes(q) ||
                              p.sku.toLowerCase().includes(q) ||
                              (p.brand && p.brand.toLowerCase().includes(q)) ||
                              (p.category && p.category.toLowerCase().includes(q))
                            );
                          })
                          .map((p) => {
                            const isChecked = newSupProductIds.includes(p.id);
                            return (
                              <tr
                                key={p.id}
                                onClick={() => {
                                  if (isChecked) {
                                    setNewSupProductIds((prev) => prev.filter((id) => id !== p.id));
                                  } else {
                                    setNewSupProductIds((prev) => [...prev, p.id]);
                                  }
                                }}
                                className={`hover:bg-stone-50/80 cursor-pointer transition-colors ${
                                  isChecked ? 'bg-[#00b4b6]/5' : ''
                                }`}
                              >
                                <td className="py-2 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewSupProductIds((prev) => [...prev, p.id]);
                                      } else {
                                        setNewSupProductIds((prev) => prev.filter((id) => id !== p.id));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 text-[#00b4b6] rounded focus:ring-0 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-2.5 font-semibold text-stone-900">
                                  <div className="truncate max-w-[140px] sm:max-w-[200px] xl:max-w-[280px]">
                                    {p.name} {p.weight && <span className="text-stone-400 font-normal text-[11px]">({p.weight})</span>}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                                  {p.sku}
                                </td>
                                <td className="py-2 px-2.5 text-stone-600 truncate max-w-[100px]">
                                  {p.brand || '—'}
                                </td>
                                <td className="py-2 px-2.5 capitalize text-stone-500 text-[11px] hidden sm:table-cell">
                                  {p.category || 'General'}
                                </td>
                              </tr>
                            );
                          })}

                        {selectableNewSupProducts.filter((p) => {
                          if (!supProductSearch.trim()) return true;
                          const q = supProductSearch.trim().toLowerCase();
                          return (
                            p.name.toLowerCase().includes(q) ||
                            p.sku.toLowerCase().includes(q) ||
                            (p.brand && p.brand.toLowerCase().includes(q)) ||
                            (p.category && p.category.toLowerCase().includes(q))
                          );
                        }).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-stone-400">
                              {newSupIsCompany
                                ? 'No company products found. Mark products as "Company Product" in Catalog.'
                                : 'No products found.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Row 3: Bottom Footer Status & Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1.5 border-t border-stone-100 text-xs shrink-0">
                <div className="text-[10px] sm:text-[11px] text-stone-400 truncate max-w-[260px] sm:max-w-none">
                  * Vendor registration will create supplier ledger profile &amp; link catalog to Goods Inward Studio.
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono shrink-0">
                  <span>
                    Selected: <strong className="text-stone-900 font-bold">{newSupProductIds.length}</strong>/{products.length}
                  </span>
                  <span>
                    Lead Time: <strong className="text-stone-900 font-bold">{newSupLeadTime || 2}d</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HELD RESTOCK BILLS SELECTION POPUP MODAL (LIGHT THEME, SINGLE LINE ROWS)   */}
      {/* ========================================================================= */}
      {isHeldPickerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white text-stone-900 rounded-2xl w-full max-w-[460px] sm:max-w-[480px] p-3.5 sm:p-4 shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center gap-3 sm:gap-3.5">
              {/* Left Side: Panda Hold Image (Bigger Size) */}
              <div className="shrink-0 flex items-center justify-center select-none">
                <img
                  src="/hold.png"
                  alt="Hold Mascot"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-md select-none pointer-events-none transition-transform hover:scale-105 duration-200"
                />
              </div>

              {/* Right Side: Header & Single-Line Rows */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-stone-900 tracking-tight">
                      Held Restock Bills
                    </h3>
                    <span className="bg-orange-100 text-[#FF5500] text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                      {heldPOs.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHeldPickerModalOpen(false)}
                    className="w-5 h-5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Single-Line Rows of Held Bills */}
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
                  {heldPOs.map((po) => (
                    <div
                      key={po.id}
                      onClick={() => handleResumeHeldPO(po)}
                      className="group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-stone-50 hover:bg-orange-50/70 border border-stone-200/80 hover:border-orange-300 transition-colors cursor-pointer"
                    >
                      {/* Left: Invoice Ref & Supplier Name in single line */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="font-mono text-[10.5px] font-bold text-[#FF5500] shrink-0">
                          {po.invoiceRef}
                        </span>
                        <span className="text-[11px] font-bold text-stone-800 truncate">
                          {po.supplierName}
                        </span>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHeldPO(po.id, e)}
                          className="w-5 h-5 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Discard draft"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResumeHeldPO(po)}
                          className="px-2 py-0.5 rounded bg-[#FF5500] hover:bg-[#e04b00] text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST-RESTOCK BATCH BARCODE & LABEL PRINTING STUDIO MODAL                   */}
      {/* ========================================================================= */}
      {isBarcodeModalOpen && lastRestockedData && (
        <StockBatchLabelPrintModal
          isOpen={isBarcodeModalOpen}
          onClose={() => {
            setIsBarcodeModalOpen(false);
            setLastRestockedData(null);
          }}
          invoiceRef={lastRestockedData.invoiceRef}
          supplierName={lastRestockedData.supplierName}
          items={lastRestockedData.items}
        />
      )}

      {/* ========================================================================= */}
      {/* EDIT SUPPLIER MODAL                                                       */}
      {/* ========================================================================= */}
      {editingSupplier && (
        <EditSupplierModal
          isOpen={!!editingSupplier}
          onClose={() => setEditingSupplier(null)}
          supplier={editingSupplier}
        />
      )}
    </AdminLayout>
  );
};
