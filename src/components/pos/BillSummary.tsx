import React from 'react';
import { CreditCard, Bookmark, RotateCcw, User, MoreHorizontal, Percent } from 'lucide-react';
import { Customer, BillDiscount } from '@/types';

interface BillSummaryProps {
  itemsCount: number;
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  customer: Customer;
  billDiscount: BillDiscount | null;
  onOpenPayment: () => void;
  onOpenHoldBill: () => void;
  onOpenReturn: () => void;
  onOpenCustomerModal: () => void;
  onOpenDiscountModal: () => void;
  onOpenMoreMenu: () => void;
  disabled?: boolean;
}

export const BillSummary: React.FC<BillSummaryProps> = ({
  itemsCount,
  subtotal,
  totalDiscount,
  tax,
  total,
  customer,
  billDiscount,
  onOpenPayment,
  onOpenHoldBill,
  onOpenReturn,
  onOpenCustomerModal,
  onOpenDiscountModal,
  onOpenMoreMenu,
  disabled = false,
}) => {
  return (
    <div className="bg-white border-t border-brand-border p-4 flex-shrink-0 select-none shadow-subtle">
      {/* Customer summary pill */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-brand-border-subtle text-xs">
        <button
          onClick={onOpenCustomerModal}
          className="flex items-center gap-1.5 text-brand-brown hover:text-brand-teal transition-colors font-medium"
          title="Change or add customer details (F8)"
        >
          <User className="w-3.5 h-3.5 text-brand-muted" />
          <span className="font-bold">{customer.name}</span>
          {customer.phone && <span className="text-brand-muted font-mono">({customer.phone})</span>}
        </button>

        <button
          onClick={onOpenCustomerModal}
          className="text-[10px] font-bold text-brand-teal hover:underline"
        >
          F8 Customer
        </button>
      </div>

      {/* Breakdown: Subtotal, Discount, Tax */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-brand-muted font-medium">
          <span>Subtotal ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})</span>
          <span className="font-mono tabular-numbers text-brand-brown font-semibold">
            Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center justify-between text-brand-muted font-medium">
          <button
            onClick={onOpenDiscountModal}
            className="flex items-center gap-1 text-brand-muted hover:text-brand-orange transition-colors group"
            title="Apply Discount (F3)"
          >
            <Percent className="w-3 h-3 text-brand-orange" />
            <span className="group-hover:underline">
              Discount {billDiscount ? `(${billDiscount.type === 'percentage' ? `${billDiscount.value}%` : 'Fixed'})` : ''}
            </span>
          </button>
          <span className={`font-mono tabular-numbers font-semibold ${totalDiscount > 0 ? 'text-emerald-600' : 'text-brand-brown'}`}>
            {totalDiscount > 0 ? `- Rs. ${totalDiscount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}` : 'Rs. 0.00'}
          </span>
        </div>

        <div className="flex items-center justify-between text-brand-muted font-medium">
          <span>Tax</span>
          <span className="font-mono tabular-numbers text-brand-brown font-semibold">
            Rs. {tax.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Prominent TOTAL Box */}
      <div className="mt-3 p-3 rounded-xl bg-brand-orange-light/50 border border-brand-orange/20 flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-brand-brown/70 block">
            Total Due
          </span>
          <span className="text-[10px] font-medium text-brand-muted block">
            Net Payable (LKR)
          </span>
        </div>
        <div className="text-right">
          <span className="text-xl font-extrabold text-brand-brown font-mono tabular-numbers block">
            Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Large Primary PAY Button */}
      <button
        onClick={onOpenPayment}
        disabled={disabled || itemsCount === 0}
        className={`mt-3 w-full h-12 rounded-xl flex items-center justify-between px-5 font-bold text-sm tracking-wide transition-all duration-150 shadow-card ${
          disabled || itemsCount === 0
            ? 'bg-brand-muted/30 text-white cursor-not-allowed'
            : 'bg-brand-teal hover:bg-brand-teal-dark active:scale-[0.99] text-white'
        }`}
        title="Proceed to Payment (F12)"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          <span>PAY</span>
        </div>
        <span className="font-mono tabular-numbers text-base">
          Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded text-white/90">
          F12
        </span>
      </button>

      {/* Secondary Actions Bar */}
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        <button
          onClick={onOpenHoldBill}
          disabled={disabled || itemsCount === 0}
          className="py-1.5 px-2 rounded-lg border border-brand-border bg-brand-bg/50 hover:bg-brand-bg text-brand-brown hover:text-brand-orange transition-colors flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          title="Park current bill (F6)"
        >
          <div className="flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-brand-orange" />
            <span>Hold</span>
          </div>
          <span className="text-[8px] font-mono text-brand-muted font-normal">F6</span>
        </button>

        <button
          onClick={onOpenReturn}
          className="py-1.5 px-2 rounded-lg border border-brand-border bg-brand-bg/50 hover:bg-brand-bg text-brand-brown hover:text-rose-600 transition-colors flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
          title="Process customer return (F9)"
        >
          <div className="flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Return</span>
          </div>
          <span className="text-[8px] font-mono text-brand-muted font-normal">F9</span>
        </button>

        <button
          onClick={onOpenCustomerModal}
          className="py-1.5 px-2 rounded-lg border border-brand-border bg-brand-bg/50 hover:bg-brand-bg text-brand-brown hover:text-brand-teal transition-colors flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
          title="Customer information (F8)"
        >
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-brand-teal" />
            <span>Customer</span>
          </div>
          <span className="text-[8px] font-mono text-brand-muted font-normal">F8</span>
        </button>

        <button
          onClick={onOpenMoreMenu}
          className="py-1.5 px-2 rounded-lg border border-brand-border bg-brand-bg/50 hover:bg-brand-bg text-brand-brown transition-colors flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
          title="More POS options"
        >
          <div className="flex items-center gap-1">
            <MoreHorizontal className="w-3.5 h-3.5 text-brand-muted" />
            <span>More</span>
          </div>
          <span className="text-[8px] font-mono text-brand-muted font-normal">Menu</span>
        </button>
      </div>
    </div>
  );
};
