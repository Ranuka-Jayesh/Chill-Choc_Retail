import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { ConfectionCategory, CartItem as CartItemType, CompletedSale, Salesperson } from '@/types';
import { useCart } from '@/stores/cartStore';
import { useCashier } from '@/stores/cashierStore';
import { useSales } from '@/stores/salesStore';
import { usePosShortcuts } from '@/hooks/usePosShortcuts';

import { CashierHeader } from '@/components/pos/CashierHeader';
import { ProductListView } from '@/components/pos/ProductListView';
import { CenterCartView } from '@/components/pos/CenterCartView';
import { RightBillingPanel } from '@/components/pos/RightBillingPanel';
import { POSShortcutBar } from '@/components/pos/POSShortcutBar';

// Modals
import { PaymentModal } from '@/components/modals/PaymentModal';
import { PaymentSuccessModal } from '@/components/modals/PaymentSuccessModal';
import { ReceiptPreviewModal } from '@/components/modals/ReceiptPreviewModal';
import { SalespersonModal } from '@/components/modals/SalespersonModal';
import { QuantityModal } from '@/components/modals/QuantityModal';
import { DiscountModal } from '@/components/modals/DiscountModal';
import { HoldBillModal } from '@/components/modals/HoldBillModal';
import { CustomerModal } from '@/components/modals/CustomerModal';
import { CashMovementModal } from '@/components/modals/CashMovementModal';
import { HeldBillsModal } from '@/components/modals/HeldBillsModal';
import { KeyboardHelpModal } from '@/components/modals/KeyboardHelpModal';
import { ItemNoteModal } from '@/components/modals/ItemNoteModal';
import { SalespersonReportModal } from '@/components/modals/SalespersonReportModal';

export const PosScreen: React.FC = () => {
  const navigate = useNavigate();
  const { cashier, lockPOS } = useCashier();
  const {
    items,
    customer,
    subtotal,
    totalDiscount,
    tax,
    total,
    addItem,
    selectedItemId,
    updateQuantity,
    selectNextItem,
    selectPreviousItem,
    incrementSelectedItem,
    decrementSelectedItem,
    updateSalesperson,
    updateItemDiscount,
    updateItemNote,
    setCustomer,
    setBillDiscount,
    clearCart,
    itemPendingRemoval,
    setItemPendingRemoval,
    defaultSalesperson,
    assignSalesperson,
    showClearConfirm,
    setShowClearConfirm,
  } = useCart();

  const { completeSale, lastCompletedSale } = useSales();

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ConfectionCategory>('all');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Modals visibility state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isHoldBillOpen, setIsHoldBillOpen] = useState(false);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false);
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSalespersonModalOpen, setIsSalespersonModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isRepReportOpen, setIsRepReportOpen] = useState(false);

  // Selected item modal state
  const [targetItemForSalesperson, setTargetItemForSalesperson] = useState<CartItemType | null>(null);
  const [targetItemForQuantity, setTargetItemForQuantity] = useState<CartItemType | null>(null);
  const [targetItemForDiscount, setTargetItemForDiscount] = useState<CartItemType | null>(null);
  const [targetItemForNote, setTargetItemForNote] = useState<CartItemType | null>(null);

  // Responsive view mode for tablet/mobile screens (< lg)
  const [mobileTab, setMobileTab] = useState<'products' | 'cart' | 'billing'>('cart');

  // Completed sale tracking for success modal & receipt
  const [currentSuccessSale, setCurrentSuccessSale] = useState<CompletedSale | null>(null);

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const categoryMatches =
        selectedCategory === 'all' || product.category === selectedCategory;

      if (!categoryMatches) return false;
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        (product.brand && product.brand.toLowerCase().includes(query))
      );
    });
  }, [selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ConfectionCategory, number> = {
      all: MOCK_PRODUCTS.length,
      chocolate: 0,
      toffees: 0,
      biscuits: 0,
      drinks: 0,
      gifts: 0,
      others: 0,
    };
    MOCK_PRODUCTS.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });
    return counts;
  }, []);

  // Keyboard shortcut handlers
  usePosShortcuts({
    onF1: () => {
      searchInputRef.current?.focus();
    },
    onF2: () => {
      navigate('/cashier/sales-history');
    },
    onF3: () => {
      const target = (selectedItemId && items.find((i) => i.id === selectedItemId)) || items[0] || null;
      setTargetItemForDiscount(target);
      setIsDiscountModalOpen(true);
    },
    onF4: () => {
      setIsRepReportOpen(true);
    },
    onSalesperson: () => {
      const target = (selectedItemId && items.find((i) => i.id === selectedItemId)) || items[0] || null;
      setTargetItemForSalesperson(target);
      setIsSalespersonModalOpen(true);
    },
    onClearCart: () => {
      if (items.length > 0) {
        setShowClearConfirm(true);
      }
    },
    onLockTerminal: () => {
      lockPOS();
    },
    onF5: () => {
      if (items.length > 0) {
        setIsPaymentModalOpen(true);
      }
    },
    onF6: () => {
      if (items.length > 0) {
        setIsHoldBillOpen(true);
      }
    },
    onF7: () => {
      setIsHeldBillsOpen(true);
    },
    onF8: () => {
      setIsCustomerOpen(true);
    },
    onF9: () => {
      navigate('/cashier/returns');
    },
    onF10: () => {
      setIsCashMovementOpen(true);
    },
    onF11: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    },
    onF12: () => {
      if (items.length > 0) {
        setIsPaymentModalOpen(true);
      }
    },
    onEnter: () => {
      if (items.length === 0) return;
      if (
        isPaymentModalOpen ||
        isSuccessOpen ||
        isReceiptOpen ||
        isHoldBillOpen ||
        isCustomerOpen ||
        isCashMovementOpen ||
        isHelpOpen ||
        isSalespersonModalOpen ||
        isDiscountModalOpen ||
        targetItemForQuantity ||
        targetItemForSalesperson ||
        targetItemForDiscount ||
        targetItemForNote
      ) {
        return;
      }

      const amountInput = document.getElementById('amount-received-input') as HTMLInputElement | null;
      if (document.activeElement === amountInput) {
        return;
      }

      const payButton = document.getElementById('pos-pay-button') as HTMLButtonElement | null;
      if (payButton && !payButton.disabled && payButton.title.includes('Pay & Complete')) {
        payButton.click();
        return;
      }

      if (mobileTab !== 'billing') {
        setMobileTab('billing');
      }

      setTimeout(() => {
        if (amountInput) {
          amountInput.focus();
          amountInput.select();
        }
      }, 50);
    },
    onArrowUp: () => {
      if (
        isPaymentModalOpen ||
        isSuccessOpen ||
        isReceiptOpen ||
        isHoldBillOpen ||
        isCustomerOpen ||
        isCashMovementOpen ||
        isHelpOpen ||
        itemPendingRemoval ||
        showClearConfirm ||
        isSalespersonModalOpen ||
        isDiscountModalOpen ||
        targetItemForQuantity ||
        targetItemForSalesperson ||
        targetItemForDiscount ||
        targetItemForNote ||
        items.length === 0
      ) {
        return;
      }
      selectPreviousItem();
    },
    onArrowDown: () => {
      if (
        isPaymentModalOpen ||
        isSuccessOpen ||
        isReceiptOpen ||
        isHoldBillOpen ||
        isCustomerOpen ||
        isCashMovementOpen ||
        isHelpOpen ||
        itemPendingRemoval ||
        showClearConfirm ||
        isSalespersonModalOpen ||
        isDiscountModalOpen ||
        targetItemForQuantity ||
        targetItemForSalesperson ||
        targetItemForDiscount ||
        targetItemForNote ||
        items.length === 0
      ) {
        return;
      }
      selectNextItem();
    },
    onPlus: () => {
      if (
        isPaymentModalOpen ||
        isSuccessOpen ||
        isReceiptOpen ||
        isHoldBillOpen ||
        isCustomerOpen ||
        isCashMovementOpen ||
        isHelpOpen ||
        itemPendingRemoval ||
        showClearConfirm ||
        isSalespersonModalOpen ||
        isDiscountModalOpen ||
        targetItemForQuantity ||
        targetItemForSalesperson ||
        targetItemForDiscount ||
        targetItemForNote ||
        items.length === 0
      ) {
        return;
      }
      incrementSelectedItem();
    },
    onMinus: () => {
      if (
        isPaymentModalOpen ||
        isSuccessOpen ||
        isReceiptOpen ||
        isHoldBillOpen ||
        isCustomerOpen ||
        isCashMovementOpen ||
        isHelpOpen ||
        itemPendingRemoval ||
        showClearConfirm ||
        isSalespersonModalOpen ||
        isDiscountModalOpen ||
        targetItemForQuantity ||
        targetItemForSalesperson ||
        targetItemForDiscount ||
        targetItemForNote ||
        items.length === 0
      ) {
        return;
      }
      decrementSelectedItem();
    },
    onHelp: () => {
      setIsHelpOpen(true);
    },
    onEscape: () => {
      if (itemPendingRemoval) {
        setItemPendingRemoval(null);
        return;
      }
      if (showClearConfirm) {
        setShowClearConfirm(false);
        return;
      }
      if (isSalespersonModalOpen || targetItemForSalesperson) {
        setIsSalespersonModalOpen(false);
        setTargetItemForSalesperson(null);
        return;
      }
      if (isDiscountModalOpen || targetItemForDiscount) {
        setIsDiscountModalOpen(false);
        setTargetItemForDiscount(null);
        return;
      }
      setIsPaymentModalOpen(false);
      setIsSuccessOpen(false);
      setIsReceiptOpen(false);
      setIsHoldBillOpen(false);
      setIsCustomerOpen(false);
      setIsCashMovementOpen(false);
      setIsHelpOpen(false);
      setTargetItemForSalesperson(null);
      setTargetItemForQuantity(null);
      setTargetItemForDiscount(null);
      setTargetItemForNote(null);
    },
  });

  const handlePaymentSuccess = (sale: CompletedSale) => {
    setCurrentSuccessSale(sale);
    setIsSuccessOpen(true);
    clearCart();
  };

  const handleNewSale = () => {
    setIsSuccessOpen(false);
    clearCart();
    searchInputRef.current?.focus();
  };

  const handleReprintLastReceipt = () => {
    if (lastCompletedSale) {
      setCurrentSuccessSale(lastCompletedSale);
      setIsReceiptOpen(true);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#FAFAFA] select-none font-sans">
      {/* Top Compact Header (48px) */}
      <CashierHeader
        onOpenCashMovement={() => setIsCashMovementOpen(true)}
        onOpenHeldBills={() => setIsHeldBillsOpen(true)}
        onOpenShortcutsHelp={() => setIsHelpOpen(true)}
        onReprintReceipt={handleReprintLastReceipt}
        onOpenRepReport={() => setIsRepReportOpen(true)}
      />

      {/* Tablet / Mobile (< lg) View Switcher */}
      <div className="lg:hidden flex items-center justify-between border-b border-zinc-200 bg-white px-3 py-1.5 gap-2 flex-shrink-0">
        <button
          onClick={() => setMobileTab('products')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === 'products'
              ? 'bg-black text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          Confections ({filteredProducts.length})
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'bg-black text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <span>Bill ({items.length})</span>
          {total > 0 && (
            <span className="text-[#FF5500] font-mono font-bold">
              Rs. {total.toLocaleString()}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileTab('billing')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === 'billing'
              ? 'bg-[#FF5500] text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          Pay / Tender
        </button>
      </div>

      {/* Main 3-Section POS Layout (Left products section decreased width to ~28%, giving center cart maximum breathing room) */}
      <main className="flex-1 flex lg:grid lg:grid-cols-[minmax(310px,28%)_1fr_280px] min-h-0 overflow-hidden bg-white">
        {/* Left Section: Interactive Minimal Products List (Decreased width, 3-column product cards) */}
        <section
          className={`h-full overflow-hidden ${
            mobileTab === 'products' ? 'w-full flex-1' : 'hidden'
          } lg:block lg:w-auto`}
        >
          <ProductListView
            products={filteredProducts}
            allProducts={MOCK_PRODUCTS}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            categoryCounts={categoryCounts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddToCart={(product) => {
              addItem(product);
            }}
            searchInputRef={searchInputRef}
          />
        </section>

        {/* Center Section: Cart Scanned Items List (Expanded width for items table & calculations) */}
        <section
          className={`h-full overflow-hidden ${
            mobileTab === 'cart' ? 'w-full flex-1' : 'hidden'
          } lg:block lg:w-auto`}
        >
          <CenterCartView
            onOpenCustomerModal={() => setIsCustomerOpen(true)}
            onOpenHoldBill={() => setIsHoldBillOpen(true)}
            onOpenBillDiscount={() => {
              setTargetItemForDiscount(null);
              setIsDiscountModalOpen(true);
            }}
            onOpenSalespersonModal={(item) => {
              setTargetItemForSalesperson(item);
              setIsSalespersonModalOpen(true);
            }}
            onOpenQuantityModal={(item) => setTargetItemForQuantity(item)}
            onOpenItemDiscountModal={(item) => {
              setTargetItemForDiscount(item);
              setIsDiscountModalOpen(true);
            }}
            onOpenItemNoteModal={(item) => setTargetItemForNote(item)}
          />
        </section>

        {/* Right Section: Amount Entering & Billing Details (Clean 280px tender panel) */}
        <aside
          className={`h-full overflow-hidden ${
            mobileTab === 'billing' ? 'w-full flex-1' : 'hidden'
          } lg:block lg:w-auto`}
        >
          <RightBillingPanel
            onPaymentSuccess={handlePaymentSuccess}
            onOpenReturn={() => navigate('/cashier/returns')}
            onOpenCashMovement={() => setIsCashMovementOpen(true)}
            onOpenMoreMenu={() => setIsHelpOpen(true)}
          />
        </aside>
      </main>

      {/* Persistent Bottom Keyboard Shortcut Bar */}
      <POSShortcutBar
        onF1={() => searchInputRef.current?.focus()}
        onF2={() => navigate('/cashier/sales-history')}
        onF3={() => {
          const target = (selectedItemId && items.find((i) => i.id === selectedItemId)) || items[0] || null;
          setTargetItemForDiscount(target);
          setIsDiscountModalOpen(true);
        }}
        onF4={() => setIsRepReportOpen(true)}
        onF5={() => items.length > 0 && setIsPaymentModalOpen(true)}
        onF6={() => items.length > 0 && setIsHoldBillOpen(true)}
        onF7={() => setIsHeldBillsOpen(true)}
        onF8={() => setIsCustomerOpen(true)}
        onF9={() => navigate('/cashier/returns')}
        onF10={() => setIsCashMovementOpen(true)}
        onF12={() => items.length > 0 && setIsPaymentModalOpen(true)}
        onHelp={() => setIsHelpOpen(true)}
      />

      {/* Modal Overlays */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalDue={total}
        subtotal={subtotal}
        totalDiscount={totalDiscount}
        tax={tax}
        items={items}
        customer={customer}
        cashierName={cashier.name}
        onPaymentSuccess={handlePaymentSuccess}
        onRecordSale={completeSale}
        onOpenCustomerModal={() => setIsCustomerOpen(true)}
      />

      <PaymentSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        sale={currentSuccessSale}
        onNewSale={handleNewSale}
        onPrintReceipt={(s) => {
          setCurrentSuccessSale(s);
          setIsReceiptOpen(true);
        }}
        onViewReceipt={(s) => {
          setCurrentSuccessSale(s);
          setIsReceiptOpen(true);
        }}
      />

      <ReceiptPreviewModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={currentSuccessSale}
      />

      <SalespersonModal
        isOpen={isSalespersonModalOpen || !!targetItemForSalesperson}
        onClose={() => {
          setIsSalespersonModalOpen(false);
          setTargetItemForSalesperson(null);
        }}
        selectedSalesperson={
          targetItemForSalesperson
            ? targetItemForSalesperson.salesperson
            : (selectedItemId && items.find((i) => i.id === selectedItemId)?.salesperson) ||
              defaultSalesperson ||
              null
        }
        onSelectSalesperson={(sp: Salesperson | null) => {
          if (targetItemForSalesperson) {
            updateSalesperson(targetItemForSalesperson.id, sp);
          } else {
            assignSalesperson(sp, selectedItemId);
          }
          setIsSalespersonModalOpen(false);
          setTargetItemForSalesperson(null);
        }}
        productName={targetItemForSalesperson?.product.name}
      />

      <QuantityModal
        isOpen={!!targetItemForQuantity}
        onClose={() => setTargetItemForQuantity(null)}
        item={targetItemForQuantity}
        onUpdateQuantity={updateQuantity}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen || targetItemForDiscount !== null}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setTargetItemForDiscount(null);
        }}
        targetItem={targetItemForDiscount}
        billSubtotal={subtotal}
        onApplyItemDiscount={updateItemDiscount}
        onApplyBillDiscount={setBillDiscount}
      />

      <HoldBillModal
        isOpen={isHoldBillOpen}
        onClose={() => setIsHoldBillOpen(false)}
        items={items}
        total={total}
        currentCustomer={customer}
      />

      <CustomerModal
        isOpen={isCustomerOpen}
        onClose={() => setIsCustomerOpen(false)}
        currentCustomer={customer}
        onSelectCustomer={setCustomer}
      />

      <CashMovementModal
        isOpen={isCashMovementOpen}
        onClose={() => setIsCashMovementOpen(false)}
      />

      <HeldBillsModal
        isOpen={isHeldBillsOpen}
        onClose={() => setIsHeldBillsOpen(false)}
      />

      <ItemNoteModal
        isOpen={!!targetItemForNote}
        onClose={() => setTargetItemForNote(null)}
        item={targetItemForNote}
        onSaveNote={updateItemNote}
      />

      <KeyboardHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <SalespersonReportModal
        isOpen={isRepReportOpen}
        onClose={() => setIsRepReportOpen(false)}
      />
    </div>
  );
};
