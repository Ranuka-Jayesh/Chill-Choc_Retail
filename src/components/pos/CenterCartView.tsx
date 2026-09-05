import React, { useEffect } from 'react';
import { ShoppingCart, Trash2, User, Tag, UserCheck, UserPlus } from 'lucide-react';
import { useCart } from '@/stores/cartStore';
import { CartItem } from './CartItem';
import { CartItem as CartItemType } from '@/types';

interface CenterCartViewProps {
  onOpenCustomerModal: () => void;
  onOpenHoldBill?: () => void;
  onOpenBillDiscount?: () => void;
  onOpenSalespersonModal: (item: CartItemType | null) => void;
  onOpenQuantityModal: (item: CartItemType) => void;
  onOpenItemDiscountModal: (item: CartItemType) => void;
  onOpenItemNoteModal: (item: CartItemType) => void;
}

export const CenterCartView: React.FC<CenterCartViewProps> = ({
  onOpenCustomerModal,
  onOpenHoldBill: _onOpenHoldBill,
  onOpenBillDiscount,
  onOpenSalespersonModal,
  onOpenQuantityModal,
  onOpenItemDiscountModal,
  onOpenItemNoteModal,
}) => {
  const {
    items,
    customer,
    itemsCount,
    selectedItemId,
    setSelectedItemId,
    updateQuantity,
    removeItem,
    clearCart,
    billDiscount,
    subtotal,
    totalDiscount,
    tax,
    total,
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

  // Close on Escape or confirm on Enter when clear bill popup is open
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
    <div className="h-full flex flex-col bg-white border-r border-zinc-200 select-none overflow-hidden">
      {/* Center Cart Header */}
      <div className="h-12 px-3.5 bg-white border-b border-zinc-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center shadow-2xs">
            <ShoppingCart className="w-3.5 h-3.5 text-[#FF5500]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black text-black leading-none">
                Current Bill
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 text-black font-mono text-[9px] font-bold border border-zinc-200">
                {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              onClick={onOpenCustomerModal}
              className="text-[10px] font-semibold text-[#FF5500] hover:underline flex items-center gap-1 mt-0.5"
              title="Change customer"
            >
              <User className="w-2.5 h-2.5" />
              <span>{customer ? customer.name : 'Walk-in Customer'}</span>
            </button>
          </div>
        </div>

        {/* Header Actions: +TM and Clear Cart */}
        <div className="flex items-center gap-1.5">
          {/* +TM Button near Clear Button */}
          <button
            type="button"
            onClick={() => {
              const target = items.find((i) => i.id === selectedItemId) || items[0] || null;
              onOpenSalespersonModal(target);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border cursor-pointer ${
              activeSalesperson
                ? 'bg-orange-50 border-orange-200 text-[#FF5500] hover:bg-orange-100 shadow-2xs'
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

          {/* Clear Cart Button */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 text-[10px] font-semibold transition-colors cursor-pointer"
              title="Void current cart (Shift + C)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Column Labels - Exactly Aligned with CartItem Rows */}
      {items.length > 0 && (
        <div className="px-3 h-8 bg-zinc-50 border-b border-zinc-200 flex items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 select-none flex-shrink-0">
          <span className="flex-1 min-w-0 pr-2">Item Description</span>
          <span className="w-24 text-center shrink-0">Qty</span>
          <span className="w-36 text-right pr-7 shrink-0">Total</span>
        </div>
      )}

      {/* Cart Items List with Only Bottom Border */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400">
            <img
              src="/cart.png"
              alt="Cart is empty"
              className="w-40 h-40 sm:w-44 sm:h-44 object-contain mb-3 select-none pointer-events-none drop-shadow-xs animate-in fade-in zoom-in-95 duration-200"
            />
            <h4 className="text-xs font-bold text-black">Cart is empty</h4>
            <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[190px] leading-relaxed">
              Tap any confection on the left or scan barcode to add items.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={() => setSelectedItemId(item.id)}
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

      {/* Bill Amount Calculations Summary Matching Reference Image */}
      <div className="border-t border-zinc-200 bg-white px-4 py-3 flex-shrink-0 select-none">
        <div className="space-y-1.5 text-xs">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-zinc-500 font-medium">
            <span>Subtotal</span>
            <span className="font-mono tabular-numbers text-black font-bold">
              Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* + Add Discount / Discount Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={onOpenBillDiscount}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF5500] hover:underline cursor-pointer group"
              title="Add or edit bill discount (F3)"
            >
              <Tag className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>
                {billDiscount
                  ? `Discount (${billDiscount.type === 'percentage' ? `${billDiscount.value}%` : 'Fixed'})`
                  : '+ Add Discount'}
              </span>
            </button>
            <span className="font-mono tabular-numbers font-bold text-zinc-600 text-xs">
              {totalDiscount > 0
                ? `- Rs. ${totalDiscount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
                : 'Rs. 0.00'}
            </span>
          </div>

          {/* Subtle Divider Line */}
          <div className="border-t border-zinc-200/80 pt-2 mt-2">
            {/* TOTAL DUE */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                TOTAL DUE
              </span>
              <span className="text-2xl font-black font-mono tabular-numbers text-black tracking-tight leading-none">
                Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

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
