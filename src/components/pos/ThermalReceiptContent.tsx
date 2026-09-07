import React from 'react';
import { CompletedSale } from '@/types';
import { Code39Barcode } from './Code39Barcode';

export interface ThermalReceiptContentProps {
  sale: CompletedSale;
  paperWidth?: 80 | 58;
  isPrintMode?: boolean;
}

export const ThermalReceiptContent: React.FC<ThermalReceiptContentProps> = ({
  sale,
  isPrintMode = false,
}) => {
  // Format retail invoice number
  const invoiceNum = sale.invoiceNumber || `CC-${sale.id}`;

  // Format payment tender details
  const tenderMethod = sale.tenders && sale.tenders.length > 0
    ? sale.tenders[0].method.toUpperCase()
    : 'CASH';

  const cashReceived = sale.tenders && sale.tenders.length > 0
    ? sale.tenders.reduce((sum, t) => sum + t.amount, 0)
    : sale.total + (sale.change || 0);

  const changeReturned = sale.change || 0;

  return (
    <div
      id="thermal-receipt-container"
      data-thermal-receipt="true"
      className={`thermal-receipt-root receipt-80mm-container bg-white text-black font-sans select-none box-border ${
        isPrintMode ? 'p-0 text-[10px]' : 'p-6 text-[11px]'
      }`}
      style={{
        width: isPrintMode ? '64mm' : '100%',
        maxWidth: isPrintMode ? '64mm' : '340px',
        boxSizing: 'border-box',
        margin: '0',
      }}
    >
      {/* 1. Store Logo & Retail Address (Pure Black for Sharp Thermal Printing) */}
      <div className="flex flex-col items-center text-center pb-1.5 box-border max-w-full">
        <img
          src="/logo-mono.png"
          alt="Chill & Choc"
          className="w-24 h-auto object-contain mb-1"
        />
        <p className="text-[9.5px] text-black font-bold leading-tight">
          No. 42, Galle Road, Colombo 03, Sri Lanka
          <br />
          Tel: +94 11 234 5678
        </p>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-zinc-800 my-2" />

      {/* 2. Retail Sale Header & Metadata */}
      <div className="space-y-1 box-border max-w-full text-black">
        <div className="flex items-center justify-between box-border max-w-full">
          <span className="font-extrabold text-sm text-black tracking-tight">
            Invoice: #{invoiceNum}
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-100 border border-black text-[9px] font-black tracking-wider text-black uppercase shrink-0">
            RETAIL SALE
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-black box-border max-w-full">
          <span className="font-semibold text-black">Date:</span>
          <span className="font-bold text-black">
            {sale.date}, {sale.timestamp}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-black box-border max-w-full">
          <span className="font-semibold text-black">Cashier:</span>
          <span className="font-bold text-black">
            {sale.cashier.replace(/\s*\(POS-[0-9]+\)/gi, '').replace(/\s*\([^)]*\)/g, '').trim()}
          </span>
        </div>

        {sale.customer?.name && (
          <div className="flex items-center justify-between text-[10px] text-black box-border max-w-full">
            <span className="font-semibold text-black">Customer:</span>
            <span className="font-extrabold text-black truncate max-w-[140px]">
              {sale.customer.name}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-zinc-800 my-2" />

      {/* 3. Items Table */}
      <div className="space-y-2 box-border max-w-full">
        {/* Table Header */}
        <div className="flex items-center justify-between text-[10px] font-black uppercase text-black pb-0.5 box-border max-w-full">
          <span>ITEM</span>
          <span>TOTAL (RS)</span>
        </div>

        {/* Item Rows */}
        <div className="space-y-1.5 text-[11px] box-border max-w-full">
          {sale.items.map((item, idx) => {
            const lineTotal = (item.unitPrice * item.quantity).toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            return (
              <div key={idx} className="receipt-item-row flex items-start justify-between font-bold text-black box-border max-w-full">
                <span className="flex-1 min-w-0 pr-2 leading-snug break-words">
                  {item.quantity}x {item.product.name}
                </span>
                <span className="font-mono tabular-numbers text-right shrink-0 whitespace-nowrap">
                  {lineTotal}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-zinc-800 my-2" />

      {/* 4. Financials */}
      <div className="space-y-1.5 text-[10.5px] text-black">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-black">Subtotal:</span>
          <span className="font-mono font-bold tabular-numbers text-black">
            Rs. {sale.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {sale.discountTotal > 0 && (
          <div className="flex items-center justify-between font-black text-black">
            <span>Discount:</span>
            <span className="font-mono tabular-numbers">
              - Rs. {sale.discountTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-zinc-800 my-2" />

      {/* 5. Grand Total */}
      <div className="flex items-center justify-between font-black text-sm text-black py-0.5">
        <span className="tracking-wide uppercase">TOTAL:</span>
        <span className="font-mono tabular-numbers text-base">
          Rs. {sale.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-zinc-800 my-2" />

      {/* 6. Payment & Change */}
      <div className="space-y-1 text-[10.5px] text-black">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-black">Payment Method:</span>
          <span className="font-black uppercase text-black">{tenderMethod}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-black">Cash Received:</span>
          <span className="font-mono font-bold tabular-numbers text-black">
            Rs. {cashReceived.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between font-black text-black">
          <span>Change Returned:</span>
          <span className="font-mono tabular-numbers">
            Rs. {changeReturned.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-zinc-800 my-2" />

      {/* 7. Retail Thank You Note */}
      <div className="text-center py-1 space-y-0.5 text-black">
        <p className="text-[10px] font-bold text-black">Thank you for shopping with us!</p>
        <p className="text-[8.5px] font-black text-black uppercase tracking-widest">Cool Vibes, Sweet Bites</p>
      </div>

      {/* Centered Barcode */}
      <div className="flex flex-col items-center justify-center py-1.5 text-black">
        <Code39Barcode value={invoiceNum} height={36} />
      </div>

      {/* Distinct Dashed Line */}
      <div className="border-b-2 border-dashed border-black my-2" />

      {/* 8. Footer Attribution */}
      <div
        id="receipt-footer-attribution"
        data-receipt-footer="true"
        className="text-center space-y-0.5 text-black"
      >
        <p className="text-[9.5px] font-mono font-bold tracking-wider uppercase text-black">
          DEVELOPED BY OGO TECHNOLOGY
        </p>
        <p className="text-[8.5px] font-mono font-medium text-black">
          www.ogotechnology.net • +94 75 930 7059
        </p>
      </div>
    </div>
  );
};
