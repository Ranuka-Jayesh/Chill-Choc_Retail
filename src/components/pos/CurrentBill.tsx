import React, { useEffect } from 'react';
import { ShoppingCart, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { useCart } from '@/stores/cartStore';
import { CartItem } from './CartItem';
import { BillSummary } from './BillSummary';
import { CartItem as CartItemType } from '@/types';

interface CurrentBillProps {
  onOpenPayment: () => void;
  onOpenHoldBill: () => void;
  onOpenReturn: () => void;
  onOpenCustomerModal: () => void;
  onOpenDiscountModal: () => void;
  onOpenMoreMenu: () => void;
  onOpenSalespersonModal: (item: CartItemType | null) => void;
  onOpenQuantityModal: (item: CartItemType) => void;
  onOpenItemDiscountModal: (item: CartItemType) => void;
  onOpenItemNoteModal: (item: CartItemType) => void;
}

export const CurrentBill: React.FC<CurrentBillProps> = ({
  onOpenPayment,
  onOpenHoldBill,
  onOpenReturn,
  onOpenCustomerModal,
  onOpenDiscountModal,
  onOpenMoreMenu,
  onOpenSalespersonModal,
  onOpenQuantityModal,
  onOpenItemDiscountModal,
  onOpenItemNoteModal,
}) => {
  const {
    items,
    customer,
    billDiscount,
    subtotal,
    totalDiscount,
    tax,
    total,
    selectedItemId,
    itemsCount,
    updateQuantity,
    removeItem,
    clearCart,
    itemPendingRemoval,
    setItemPendingRemoval,
    defaultSalesperson,
    showClearConfirm,
    setShowClearConfirm,
  } = useCart();

  const activeSalesperson =
    (selectedItemId && items.find((i) => i.id === selectedItemId)?.salesperson) ||
    defaultSalesperson ||
    items.find((i) => i.salesperson)?.salesperson ||
    null;

  // Close on Escape or confirm on Enter when popup is open
  useEffect(() => {
    if (!showClearConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowClearConfirm(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        clearCart();
        setShowClearConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showClearConfirm, clearCart, setShowClearConfirm]);

  // Close on Escape or confirm on Enter when remove item popup is open
  useEffect(() => {
    if (!itemPendingRemoval) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setItemPendingRemoval(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        removeItem(itemPendingRemoval.id);
        setItemPendingRemoval(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [itemPendingRemoval, removeItem, setItemPendingRemoval]);

  return (
    <div className="h-full flex flex-col bg-brand-bg-warm/30 border-l border-brand-border select-none">
      {/* Bill Panel Header */}
      <div className="h-14 px-4 bg-white border-b border-brand-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-teal-light text-brand-teal flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-brand-brown leading-tight">
              Current Bill
            </h3>
            <span className="text-[10px] font-medium text-brand-muted">
              {customer.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-brand-bg text-brand-brown border border-brand-border text-xs font-mono font-bold">
            {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}
          </span>

          {/* +TM Button near Clear Button */}
          <button
            type="button"
            onClick={() => {
              onOpenSalespersonModal(null);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border cursor-pointer ${
              activeSalesperson
                ? 'bg-orange-50 border-orange-200 text-[#FF5500] hover:bg-orange-100'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
            title="Assign Team Member (@ or F4)"
          >
            {activeSalesperson ? (
              <>
                <UserCheck className="w-3 h-3 text-[#FF5500]" />
                <span className="max-w-[70px] truncate">{activeSalesperson.name.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3 text-zinc-400" />
                <span>+TM</span>
              </>
            )}
          </button>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-lg text-brand-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Void / Clear cart (Shift + C)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400">
            <img
              src="/cart.png"
              alt="Cart is empty"
              className="w-40 h-40 sm:w-44 sm:h-44 object-contain mb-3 select-none pointer-events-none drop-shadow-xs animate-in fade-in zoom-in-95 duration-200"
            />
            <h4 className="text-sm font-bold text-zinc-900">Cart is empty</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
              Scan a barcode or select a confectionery product to start a sale.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onOpenQuantityModal={onOpenQuantityModal}
              onOpenSalespersonModal={onOpenSalespersonModal}
              onOpenItemDiscountModal={onOpenItemDiscountModal}
              onOpenItemNoteModal={onOpenItemNoteModal}
              onRemoveItem={(itemToDel) => setItemPendingRemoval(itemToDel)}
            />
          ))
        )}
      </div>

      {/* Fixed Bill Totals & Checkout Summary */}
      <BillSummary
        itemsCount={itemsCount}
        subtotal={subtotal}
        totalDiscount={totalDiscount}
        tax={tax}
        total={total}
        customer={customer}
        billDiscount={billDiscount}
        onOpenPayment={onOpenPayment}
        onOpenHoldBill={onOpenHoldBill}
        onOpenReturn={onOpenReturn}
        onOpenCustomerModal={onOpenCustomerModal}
        onOpenDiscountModal={onOpenDiscountModal}
        onOpenMoreMenu={onOpenMoreMenu}
        disabled={items.length === 0}
      />

      {/* Creative Minimal Direct Clear Cart Confirmation Popup */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
          onClick={() => setShowClearConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[390px] sm:max-w-[410px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-4 sm:p-5 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Left Side: Cute Mascot Image */}
              <div className="flex-shrink-0">
                <img
                  src="/warning.png"
                  alt="Warning"
                  className="w-24 h-24 sm:w-26 sm:h-26 object-contain drop-shadow-sm select-none pointer-events-none"
                />
              </div>

              {/* Right Side: Short Message & Buttons */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-black text-black tracking-tight leading-tight">
                  Clear all items?
                </h4>
                <p className="text-[11px] font-medium text-zinc-500 mt-1 leading-snug">
                  Remove all{' '}
                  <span className="font-bold text-zinc-900 font-mono">
                    {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                  </span>{' '}
                  from the current bill?
                </p>

                {/* Buttons using current design patterns & increased height */}
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 h-10 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap shadow-xs"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setShowClearConfirm(false);
                    }}
                    className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creative Minimal Direct Remove Item Confirmation Popup */}
      {itemPendingRemoval && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
          onClick={() => setItemPendingRemoval(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[390px] sm:max-w-[410px] bg-white rounded-3xl shadow-2xl border border-zinc-200/90 p-4 sm:p-5 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Left Side: Warning Image */}
              <div className="flex-shrink-0">
                <img
                  src="/warning.png"
                  alt="Warning"
                  className="w-24 h-24 sm:w-26 sm:h-26 object-contain drop-shadow-sm select-none pointer-events-none"
                />
              </div>

              {/* Right Side: Short Message & Buttons */}
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-sm font-black text-black tracking-tight leading-tight">
                  Remove item?
                </h4>
                <p className="text-[11px] font-medium text-zinc-500 mt-1 leading-snug">
                  Remove{' '}
                  <span className="font-bold text-zinc-900 font-mono">
                    {itemPendingRemoval.product.name}
                  </span>{' '}
                  from the current bill?
                </p>

                {/* Buttons using current design patterns & increased height */}
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItemPendingRemoval(null)}
                    className="flex-1 h-10 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.98] text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap shadow-xs"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeItem(itemPendingRemoval.id);
                      setItemPendingRemoval(null);
                    }}
                    className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
