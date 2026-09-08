import React from 'react';
import { CompletedSale } from '@/types';
import { Code39Barcode } from './Code39Barcode';
import { LOGO_BASE64 } from '@/services/logoAsset';

export interface ThermalReceiptContentProps {
  sale: CompletedSale;
  paperWidth?: 80 | 58;
  isPrintMode?: boolean;
}

export const ThermalReceiptContent: React.FC<ThermalReceiptContentProps> = ({
  sale,
  paperWidth = 80,
  isPrintMode = false,
}) => {
  const is58mm = paperWidth === 58;
  const printWidthMm = is58mm ? '48mm' : '68mm';
  const printMarginLeftMm = is58mm ? '0mm' : '0mm';

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

  // Compute item discounts sum & gross items subtotal
  const itemDiscountsSum = sale.items.reduce((sum, item) => {
    if (!item.discount) return sum;
    const gross = item.unitPrice * item.quantity;
    const disc = item.discount.type === 'percentage'
      ? gross * (item.discount.value / 100)
      : item.discount.value;
    return sum + disc;
  }, 0);

  const grossItemsSubtotal = sale.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDiscountAmount = Math.max(sale.discountTotal || 0, itemDiscountsSum);
  const displaySubtotal = sale.subtotal && sale.subtotal >= grossItemsSubtotal ? sale.subtotal : grossItemsSubtotal;
  const displayTotal = sale.total || Math.max(0, displaySubtotal - totalDiscountAmount);

  // Format receipt date (e.g. 2026.8.9 TUE) instead of saying 'Today'
  const formatReceiptDate = (dateStr?: string, saleId?: string): string => {
    let targetDate: Date;
    if (!dateStr || dateStr.toLowerCase() === 'today') {
      const idTimestamp = saleId?.startsWith('sale-') ? parseInt(saleId.replace('sale-', ''), 10) : NaN;
      targetDate = !isNaN(idTimestamp) ? new Date(idTimestamp) : new Date();
    } else if (dateStr.toLowerCase() === 'yesterday') {
      targetDate = new Date(Date.now() - 86400000);
    } else {
      const parsed = new Date(dateStr);
      targetDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    const year = targetDate.getFullYear();
    const day = targetDate.getDate();
    const month = targetDate.getMonth() + 1;
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayOfWeek = daysOfWeek[targetDate.getDay()];

    return `${year}.${day}.${month} ${dayOfWeek}`;
  };

  const receiptDateFormatted = formatReceiptDate(sale.date, sale.id);

  return (
    <div
      id="thermal-receipt-container"
      data-thermal-receipt="true"
      className={`thermal-receipt-root receipt-80mm-container bg-white text-black select-none box-border ${
        isPrintMode ? 'py-1 text-[10px]' : 'p-6 text-[11px]'
      }`}
      style={{
        width: isPrintMode ? printWidthMm : '100%',
        maxWidth: isPrintMode ? printWidthMm : '340px',
        margin: isPrintMode ? `0 0 0 ${printMarginLeftMm}` : '0 auto',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* 1. Store Logo & Retail Address (Pure Black for Sharp Thermal Printing) */}
      <div className="flex flex-col items-center text-center pb-1 box-border max-w-full">
        <img
          src={LOGO_BASE64}
          alt="Chill & Choc"
          className="w-40 max-w-[75%] h-auto object-contain mb-0.5"
        />
        <p className="text-[9.5px] text-black font-bold leading-tight">
          No. 42, Galle Road, Colombo 03, Sri Lanka
          <br />
          Tel: +94 11 234 5678
        </p>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-black my-2" />

      {/* 2. Retail Sale Header & Metadata */}
      <div className="space-y-1 box-border max-w-full text-black">
        <div className="flex items-center justify-between text-[10.5px] text-black box-border max-w-full">
          <span className="font-semibold text-black">Invoice:</span>
          <span className="font-bold text-black font-mono pr-0.5">
            #{invoiceNum}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-black box-border max-w-full">
          <span className="font-semibold text-black">Date:</span>
          <span className="font-bold text-black pr-0.5">
            {receiptDateFormatted}{sale.timestamp ? `, ${sale.timestamp}` : ''}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-black box-border max-w-full">
          <span className="font-semibold text-black">Cashier:</span>
          <span className="font-bold text-black pr-0.5">
            {sale.cashier.replace(/\s*\(POS-[0-9]+\)/gi, '').replace(/\s*\([^)]*\)/g, '').trim()}
          </span>
        </div>

        {sale.customer?.name && (
          <div className="flex items-start justify-between text-[10px] text-black box-border max-w-full">
            <span className="font-semibold text-black shrink-0 pr-1.5">Customer:</span>
            <span className="font-bold text-black text-right pr-0.5 leading-snug break-words">
              {sale.customer.name}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-black my-2" />

      {/* 3. Items Table */}
      <div className="space-y-2 box-border max-w-full" style={{ width: '100%' }}>
        {/* Table Header: ITEM on left, TOTAL(RS) on right */}
        <div
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-black pb-0.5 box-border"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}
        >
          <span className="text-left">ITEM</span>
          <span className="text-right font-bold pr-0.5">TOTAL(RS)</span>
        </div>

        {/* Item Rows */}
        <div className={`space-y-1.5 box-border max-w-full ${isPrintMode ? 'text-[10px]' : 'text-[11px]'}`} style={{ width: '100%' }}>
          {sale.items.map((item, idx) => {
            const lineSubtotal = item.unitPrice * item.quantity;
            let itemDiscountAmount = 0;
            if (item.discount) {
              if (item.discount.type === 'percentage') {
                itemDiscountAmount = lineSubtotal * (item.discount.value / 100);
              } else {
                itemDiscountAmount = item.discount.value;
              }
            }
            const finalLineTotal = Math.max(0, lineSubtotal - itemDiscountAmount);
            const lineTotalFormatted = finalLineTotal.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            const hasMultiple = item.quantity > 1;
            const hasDiscount = !!item.discount && itemDiscountAmount > 0;
            const showSecondLine = hasMultiple || hasDiscount;

            return (
              <div
                key={idx}
                className="receipt-item-row w-full block box-border max-w-full space-y-0.5"
                style={{ width: '100%', display: 'block' }}
              >
                {/* Primary Row: item on item side (left), total on total side (right) */}
                <div
                  className="w-full flex items-start justify-between font-semibold text-black box-border"
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}
                >
                  <span className="flex-1 min-w-0 pr-1.5 text-left leading-snug break-words">
                    {item.quantity} x {item.product.name}
                  </span>
                  <span className="font-mono font-bold tabular-numbers text-right shrink-0 whitespace-nowrap pr-0.5">
                    {lineTotalFormatted}
                  </span>
                </div>

                {/* Second Row: if quantity > 1, unit price below item name with @ symbol; and if discount */}
                {showSecondLine && (
                  <div className="w-full text-[9px] text-black pl-2 leading-tight flex items-center gap-2 flex-wrap">
                    {hasMultiple && (
                      <span className="font-mono font-bold text-black text-left">
                        @Rs.{item.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="text-black font-bold">
                        Discount: -{item.discount?.type === 'percentage'
                          ? `${item.discount.value}% (-Rs. ${itemDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })})`
                          : `Rs. ${itemDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-black my-2" />

      {/* 4. Financials */}
      <div className={`space-y-1 ${isPrintMode ? 'text-[10px]' : 'text-[10.5px]'} text-black`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-black">Subtotal:</span>
          <span className="font-mono font-bold tabular-numbers text-black pr-0.5">
            Rs. {displaySubtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {totalDiscountAmount > 0 && (
          <div className="flex items-center justify-between font-bold text-black">
            <span>Discount:</span>
            <span className="font-mono font-bold tabular-numbers pr-0.5">
              - Rs. {totalDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-black my-2" />

      {/* 5. Grand Total */}
      <div className="space-y-1 py-0.5">
        <div className="flex items-center justify-between font-bold text-black">
          <span className={`tracking-wide uppercase font-bold ${isPrintMode ? 'text-[12px]' : 'text-sm'}`}>TOTAL:</span>
          <span className={`font-mono tabular-numbers font-extrabold ${isPrintMode ? 'text-[13px]' : 'text-base'} pr-0.5`}>
            Rs. {displayTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {totalDiscountAmount > 0 && (
          <div className="flex items-center justify-between text-[9.5px] text-black font-semibold pt-0.5">
            <span className="uppercase tracking-wider">Total Savings:</span>
            <span className="font-mono font-bold pr-0.5">
              Rs. {totalDiscountAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-black my-2" />

      {/* 6. Payment & Change */}
      <div className={`space-y-1 ${isPrintMode ? 'text-[10px]' : 'text-[10.5px]'} text-black`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-black">Payment Method:</span>
          <span className="font-bold uppercase text-black pr-0.5">{tenderMethod}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-black">Cash Received:</span>
          <span className="font-mono font-bold tabular-numbers text-black pr-0.5">
            Rs. {cashReceived.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between font-bold text-black">
          <span>Change Returned:</span>
          <span className="font-mono font-bold tabular-numbers pr-0.5">
            Rs. {changeReturned.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-b border-dashed border-black my-2" />

      {/* 7. Retail Thank You Note */}
      <div className="text-center py-1 space-y-0.5 text-black">
        <p className="text-[10px] font-bold text-black">Thank you for shopping with us!</p>
        <p className="text-[8.5px] font-bold text-black uppercase tracking-widest">Cool Vibes, Sweet Bites</p>
      </div>

      {/* Centered Barcode - Full Width */}
      <div className="w-full flex flex-col items-center justify-center py-1.5 text-black">
        <Code39Barcode value={invoiceNum} height={36} maxBarWidth={260} showText={false} className="w-full" />
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
        <p className="text-[8.5px] font-mono font-semibold text-black">
          www.ogotechnology.net • +94 75 930 7059
        </p>
      </div>
    </div>
  );
};
