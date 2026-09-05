import React, { useState, useRef, useEffect } from 'react';
import { CartItem as CartItemType } from '@/types';
import {
  Minus,
  Plus,
  MoreVertical,
  UserPlus,
  Percent,
  FileText,
  Trash2,
  X,
} from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onOpenQuantityModal: (item: CartItemType) => void;
  onOpenSalespersonModal: (item: CartItemType) => void;
  onOpenItemDiscountModal: (item: CartItemType) => void;
  onOpenItemNoteModal: (item: CartItemType) => void;
  onRemoveItem: (item: CartItemType) => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  isSelected = false,
  onSelect,
  onUpdateQuantity,
  onOpenQuantityModal,
  onOpenSalespersonModal,
  onOpenItemDiscountModal,
  onOpenItemNoteModal,
  onRemoveItem,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const lineSubtotal = item.unitPrice * item.quantity;
  let discountAmount = 0;
  if (item.discount) {
    if (item.discount.type === 'percentage') {
      discountAmount = lineSubtotal * (item.discount.value / 100);
    } else {
      discountAmount = item.discount.value;
    }
  }
  const finalLineTotal = Math.max(0, lineSubtotal - discountAmount);

  return (
    <div
      id={`cart-item-row-${item.id}`}
      onClick={() => onSelect?.()}
      className={`group relative border-b border-zinc-100 h-10 px-3 transition-colors select-none flex items-center cursor-pointer border-l-2 ${
        isSelected
          ? 'bg-orange-50/70 border-l-[#FF5500]'
          : 'bg-white hover:bg-zinc-50/70 border-l-transparent'
      }`}
    >
      {/* Column 1: Product Name, Weight, Unit Price & Salesperson (flex-1) */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden pr-2">
        {/* Product Title */}
        <h4 className="text-xs font-bold text-zinc-900 truncate leading-none">
          {item.product.name}
        </h4>

        {/* Weight */}
        <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap leading-none">
          ({item.product.weight})
        </span>

        {/* Unit Price */}
        <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap leading-none hidden sm:inline">
          @ {item.unitPrice.toLocaleString()}
        </span>

        {/* Salesperson Badge (Only when assigned, no +TM button in record) */}
        {item.salesperson && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap bg-orange-50 text-[#FF5500] border border-orange-200"
            title={`Assigned to ${item.salesperson.name}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
            <span>{item.salesperson.name.split(' ')[0]}</span>
          </span>
        )}

        {/* Discount Badge */}
        {item.discount && (
          <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200 whitespace-nowrap leading-none">
            -{item.discount.type === 'percentage' ? `${item.discount.value}%` : `Rs.${item.discount.value}`}
          </span>
        )}

        {/* Note Indicator */}
        {item.note && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
              onOpenItemNoteModal(item);
            }}
            className="text-[10px] text-zinc-400 hover:text-[#FF5500] cursor-pointer whitespace-nowrap leading-none"
            title={`Note: ${item.note}`}
          >
            📝
          </span>
        )}
      </div>

      {/* Column 2: Aligned Minimal QTY Stepper (w-24 centered directly under QTY header) */}
      <div className="w-24 shrink-0 flex items-center justify-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
            if (item.quantity <= 1) {
              onRemoveItem(item);
            } else {
              onUpdateQuantity(item.id, item.quantity - 1);
            }
          }}
          className="w-5 h-5 rounded-md bg-zinc-100 hover:bg-[#FF5500] hover:text-white text-zinc-600 flex items-center justify-center transition-colors cursor-pointer active:scale-90"
          title="Decrease quantity"
        >
          <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
            onOpenQuantityModal(item);
          }}
          className="w-6 text-center text-xs font-bold text-zinc-900 font-mono hover:text-[#FF5500] transition-colors cursor-pointer"
          title="Edit quantity"
        >
          {item.quantity}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
            onUpdateQuantity(item.id, item.quantity + 1);
          }}
          className="w-5 h-5 rounded-md bg-zinc-100 hover:bg-[#FF5500] hover:text-white text-zinc-600 flex items-center justify-center transition-colors cursor-pointer active:scale-90"
          title="Increase quantity"
        >
          <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Column 3: Total & Micro Actions (w-36 right-aligned directly under TOTAL header) */}
      <div className="w-36 shrink-0 flex items-center justify-end gap-1.5">
        <div className="text-right">
          <span className="text-xs font-bold text-zinc-900 font-mono tabular-numbers block leading-none">
            Rs. {finalLineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
          {discountAmount > 0 && (
            <span className="text-[9px] text-emerald-600 font-mono line-through block leading-none mt-0.5">
              Rs. {lineSubtotal.toLocaleString()}
            </span>
          )}
        </div>

        {/* 3-Dot Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors flex items-center justify-center cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-7 z-40 w-36 bg-white rounded-xl shadow-xl border border-zinc-200 py-1 text-xs text-zinc-900 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onOpenSalespersonModal(item);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 text-left font-medium"
              >
                <UserPlus className="w-3.5 h-3.5 text-black" />
                <span>Salesperson</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onOpenItemDiscountModal(item);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 text-left font-medium"
              >
                <Percent className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Discount</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onOpenItemNoteModal(item);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-50 text-left font-medium"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>{item.note ? 'Edit Note' : 'Add Note'}</span>
              </button>

              <div className="border-t border-zinc-100 my-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onRemoveItem(item);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 text-left font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick remove cross */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveItem(item);
          }}
          className="text-zinc-400 hover:text-rose-600 p-0.5 rounded transition-colors flex items-center justify-center"
          title="Remove from cart"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
