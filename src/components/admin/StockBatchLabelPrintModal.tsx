import React, { useState, useMemo } from 'react';
import { usePrinter } from '@/hooks/usePrinter';
import { useProducts } from '@/stores/productStore';
import { useToast } from '@/stores/toastStore';
import { generateTSPLLabel } from '@/services/tsplGenerator';
import { generateESCPOSLabel, generateBarcodeSvgHtml, LabelSize } from '@/services/escposLabelGenerator';
import {
  LABEL_SIZE_CONFIGS,
  ORDERED_LABEL_SIZES,
  formatDisplayTitle,
  extractProductMeasurement,
  getDynamicTitleSizePt,
} from '@/services/labelConfig';
import { Code39Barcode } from '@/components/pos/Code39Barcode';
import { ThermalLabelDiagramPreview } from '@/components/pos/ThermalLabelDiagramPreview';
import { Product } from '@/types';
import {
  Barcode,
  Printer,
  X,
  CheckCircle2,
  Tag,
  Package,
  Layers,
  Copy,
  Calendar,
  ExternalLink,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';

export interface RestockedItemForPrint {
  id: string;
  productId: string;
  productName: string;
  weight?: string;
  sku?: string;
  barcode?: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number; // Restocked quantity
}

export interface StockBatchLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceRef: string;
  supplierName: string;
  items: RestockedItemForPrint[];
}

export const StockBatchLabelPrintModal: React.FC<StockBatchLabelPrintModalProps> = ({
  isOpen,
  onClose,
  invoiceRef,
  supplierName,
  items,
}) => {
  const { isConnected, printLabel, isPrinting } = usePrinter();
  const { products } = useProducts();
  const { showToast } = useToast();

  const [labelSize, setLabelSize] = useState<LabelSize>('30x15');
  const labelType: 'barcode' | 'shelftag' = labelSize === '50x30' ? 'shelftag' : 'barcode';
  // Printer command protocol: 'tspl' (XP-365B dedicated label printer) vs 'escpos' (XP-80TS)
  const [printerProtocol, setPrinterProtocol] = useState<'escpos' | 'tspl'>('tspl');
  // Copies per item ID, defaulting to the quantity restocked
  const [itemCopies, setItemCopies] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((it) => {
      initial[it.id] = Math.max(1, it.quantity || 1);
    });
    return initial;
  });

  // Keep copies in sync if items change
  React.useEffect(() => {
    setItemCopies((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        if (next[it.id] === undefined) {
          next[it.id] = Math.max(1, it.quantity || 1);
        }
      });
      return next;
    });
  }, [items]);

  // Active preview item
  const [activePreviewId, setActivePreviewId] = useState<string>(items[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync active preview if needed
  React.useEffect(() => {
    if (items.length > 0 && (!activePreviewId || !items.some((it) => it.id === activePreviewId))) {
      setActivePreviewId(items[0].id);
    }
  }, [items, activePreviewId]);

  const activeItem = items.find((it) => it.id === activePreviewId) || items[0];

  // Total labels to print across all items
  const totalLabels = useMemo(() => {
    return items.reduce((sum, it) => sum + (itemCopies[it.id] || it.quantity || 1), 0);
  }, [items, itemCopies]);

  if (!isOpen || items.length === 0) return null;

  // Helper to resolve Product entity for TSPL generation
  const resolveProductForTSPL = (item: RestockedItemForPrint): Product => {
    const existing = products.find((p) => p.id === item.productId);
    const resolvedBarcode = item.barcode || item.batchNumber || existing?.barcode || 'BAR-001';
    if (existing) {
      return {
        ...existing,
        price: item.sellingPrice > 0 ? item.sellingPrice : existing.price,
        barcode: resolvedBarcode,
      };
    }
    return {
      id: item.productId,
      name: item.productName,
      sku: item.sku || 'SKU-001',
      barcode: resolvedBarcode,
      weight: item.weight || '',
      price: item.sellingPrice,
      costPrice: item.costPrice,
      stock: item.quantity,
      category: 'chocolate',
      supplierName,
    };
  };

  // Update copies for a specific item (restricted between 1 and item.quantity)
  const handleSetCopies = (id: string, val: number) => {
    const targetItem = items.find((it) => it.id === id);
    const maxAllowed = Math.max(1, targetItem?.quantity || 1);
    const clamped = Math.max(1, Math.min(maxAllowed, val));

    setItemCopies((prev) => ({
      ...prev,
      [id]: clamped,
    }));
  };

  // Set all items to a specific copy multiplier
  const handleSetAllCopiesToQty = () => {
    const updated: Record<string, number> = {};
    items.forEach((it) => {
      updated[it.id] = Math.max(1, it.quantity || 1);
    });
    setItemCopies(updated);
    showToast('Reset all label copies to received stock quantities', 'info');
  };

  const handleSetAllCopiesTo = (num: number) => {
    const updated: Record<string, number> = {};
    items.forEach((it) => {
      updated[it.id] = num;
    });
    setItemCopies(updated);
  };

  // Direct Browser Print Fallback for Xprinter XP-80TS
  const printViaBrowser = (itemsToPrint: RestockedItemForPrint[]) => {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      showToast('Please allow popups to print labels via browser', 'error');
      return;
    }

    const cfg = LABEL_SIZE_CONFIGS[labelSize] || LABEL_SIZE_CONFIGS['30x22'];

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels - ${invoiceRef}</title>
        <style>
          @page {
            size: ${cfg.widthMm}mm ${cfg.heightMm}mm;
            margin: 0;
          }
          @media print {
            html, body {
              width: ${cfg.widthMm}mm;
              height: ${cfg.heightMm}mm;
              margin: 0;
              padding: 0;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #ffffff;
            color: #000000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label-page {
            width: ${cfg.widthMm}mm;
            height: ${cfg.heightMm}mm;
            max-width: ${cfg.widthMm}mm;
            max-height: ${cfg.heightMm}mm;
            padding: ${cfg.pagePadding};
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            overflow: hidden;
            box-sizing: border-box;
            background: #ffffff;
            color: #000000;
          }
          .label-text-block {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .brand-title {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-weight: 900;
            font-size: ${cfg.brandFontSizePt}pt;
            line-height: 1;
            letter-spacing: 0.1px;
            color: #000000;
          }
          .brand-tagline {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-weight: 500;
            font-size: ${cfg.taglineFontSizePt}pt;
            line-height: 1;
            color: #000000;
            margin-top: 0.2mm;
          }
          .prod-title {
            font-weight: 700;
            line-height: 1.1;
            color: #000000;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-word;
            text-transform: capitalize;
            max-width: 100%;
            margin-top: 0.25mm;
          }
          .price-big {
            font-size: ${cfg.priceFontSizePt}pt;
            font-weight: 900;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            line-height: 1;
            color: #000000;
            letter-spacing: -0.2px;
            margin-top: 0.3mm;
          }
          .price-unit {
            font-size: ${Math.max(4.2, Math.round(cfg.priceFontSizePt * 0.52))}pt;
            font-weight: 700;
            color: #000000;
            margin-left: 0.4mm;
          }
          .barcode-box {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: auto;
            margin-bottom: 0.1mm;
            flex-shrink: 0;
          }
          .barcode-text {
            width: 100%;
            max-width: ${cfg.heightMm <= 15 ? '26mm' : `${Math.min(cfg.widthMm - 4, Math.round(cfg.barcodeMaxBarWidth * 0.175))}mm`};
            display: flex;
            justify-content: space-between;
            box-sizing: border-box;
            font-family: "Courier New", Courier, monospace, sans-serif;
            font-size: ${cfg.barcodeFontSizePt}pt;
            font-weight: 800;
            line-height: 1;
            margin-top: 0.25mm;
            color: #000000;
          }
        </style>
      </head>
      <body>
    `;

    itemsToPrint.forEach((it) => {
      const copies = itemCopies[it.id] || it.quantity || 1;
      const formattedPrice = it.sellingPrice.toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const { cleanTitle, measurement } = extractProductMeasurement(it.productName, it.weight);
      const measurementSuffix = measurement ? `<span class="price-unit">/ ${measurement}</span>` : '';
      const dynamicTitleSizePt = getDynamicTitleSizePt(cleanTitle.length, cfg.titleFontSizePt);

      const targetBarcodeWidthMm =
        cfg.heightMm <= 15 ? 26 : Math.min(cfg.widthMm - 4, Math.round(cfg.barcodeMaxBarWidth * 0.175));
      const cleanBc = (it.barcode || it.batchNumber || '').trim();
      const bcDigitsSpacedHtml = cleanBc
        .split('')
        .map((ch: string) => `<span>${ch}</span>`)
        .join('');

      for (let c = 0; c < copies; c++) {
        htmlContent += `
          <div class="label-page">
            <div class="label-text-block">
              ${cfg.heightMm > 15 ? `<div class="brand-title">Chill&amp;Chock</div>` : ''}
              ${cfg.showTagline ? `<div class="brand-tagline">Cool vibe sweet bite</div>` : ''}
              <div class="prod-title" style="font-size:${dynamicTitleSizePt}pt;">${cleanTitle}</div>
              <div class="price-big">Rs. ${formattedPrice}${measurementSuffix}</div>
            </div>
            <div class="barcode-box">
              ${generateBarcodeSvgHtml(cleanBc, cfg.barcodeSvgHeight, targetBarcodeWidthMm, true)}
            </div>
          </div>
        `;
      }
    });

    htmlContent += `
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Print Single Item
  const handlePrintSingle = async (item: RestockedItemForPrint) => {
    const copies = itemCopies[item.id] || item.quantity || 1;
    const prod = resolveProductForTSPL(item);
    const barcodeToPrint = item.barcode || item.batchNumber;

    const printData =
      printerProtocol === 'escpos'
        ? generateESCPOSLabel(prod, {
            copies,
            labelType,
            labelSize,
            batchNumber: barcodeToPrint,
            storeName: 'Chill&Chock',
          })
        : generateTSPLLabel(prod, {
            copies,
            labelType,
            labelSize,
            batchNumber: barcodeToPrint,
            storeName: 'Chill&Chock',
          });

    if (isConnected) {
      setIsSubmitting(true);
      try {
        await printLabel({
          data: printData,
          jobId: `label-${barcodeToPrint}-${Date.now()}`,
        });
        showToast(`Printed ${copies}x ${item.productName} barcode labels!`, 'success');
      } catch (err: any) {
        console.error('Print failed:', err);
        showToast(`Print agent error: ${err.message || 'Falling back to browser print'}`, 'error');
        printViaBrowser([item]);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Direct browser thermal label print
      printViaBrowser([item]);
    }
  };

  // Print All Items
  const handlePrintAll = async () => {
    if (items.length === 0) return;

    if (isConnected) {
      setIsSubmitting(true);
      try {
        let bundledData = '';
        for (const it of items) {
          const copies = itemCopies[it.id] || it.quantity || 1;
          const prod = resolveProductForTSPL(it);
          const barcodeToPrint = it.barcode || it.batchNumber;
          bundledData +=
            printerProtocol === 'escpos'
              ? generateESCPOSLabel(prod, {
                  copies,
                  labelType,
                  labelSize,
                  batchNumber: barcodeToPrint,
                  storeName: 'Chill&Chock',
                })
              : generateTSPLLabel(prod, {
                  copies,
                  labelType,
                  labelSize,
                  batchNumber: barcodeToPrint,
                  storeName: 'Chill&Chock',
                });
        }

        await printLabel({
          data: bundledData,
          jobId: `all-labels-${Date.now()}`,
        });

        showToast(`Sent ${totalLabels} barcode labels to printer!`, 'success');
      } catch (err: any) {
        console.error('Batch print failed:', err);
        showToast('Print agent error. Launching browser print preview...', 'error');
        printViaBrowser(items);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      printViaBrowser(items);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-hidden select-none">
      <div className="bg-white text-stone-900 rounded-[24px] sm:rounded-[28px] w-full max-w-[1520px] 2xl:max-w-[1620px] h-[92vh] max-h-[760px] flex flex-col justify-between p-3.5 sm:p-4 md:p-5 shadow-2xl border border-stone-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* ========================================================================= */}
        {/* MODAL TOP HEADER BAR                                                      */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-1 pb-2.5 sm:pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight truncate flex items-center gap-2">
              <Barcode className="w-4 h-4 text-[#00b4b6]" />
              <span>Print Stock Barcodes &amp; Labels</span>
            </h2>
            <span className="hidden sm:inline-flex bg-emerald-50 text-emerald-700 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-300 font-bold tracking-wide shrink-0 items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Stock Inward Complete</span>
            </span>
            <span className="hidden md:inline-flex bg-stone-100 text-stone-600 font-mono text-[10px] px-2 py-0.5 rounded-full border border-stone-200 font-bold shrink-0">
              {invoiceRef}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold border border-stone-200 transition-colors cursor-pointer"
            >
              Done / Close
            </button>
            <button
              type="button"
              onClick={handlePrintAll}
              disabled={isSubmitting || isPrinting}
              className="px-4 py-1 rounded-full bg-[#00b4b6] hover:bg-[#009ca0] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Printing...' : `Print All Labels (${totalLabels})`}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between flex-1 min-h-0 overflow-hidden text-stone-900 pt-2">
          {/* Row 1: Section Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pb-2 border-b border-stone-100 shrink-0">
            {/* Left: Supplier & Invoice metadata */}
            <div className="flex items-center gap-2 text-stone-600 text-[11px]">
              <span className="font-bold text-stone-900">{supplierName}</span>
              <span>•</span>
              <span className="font-mono">{invoiceRef}</span>
            </div>

            {/* Right: Format Selector & Printer Mode */}
            <div className="flex items-center flex-wrap gap-2.5 shrink-0">
              {/* Label Size Selector */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-full border border-stone-200">
                {ORDERED_LABEL_SIZES.slice(0, 4).map((sizeKey) => {
                  const sCfg = LABEL_SIZE_CONFIGS[sizeKey];
                  const isSelected = labelSize === sizeKey;
                  return (
                    <button
                      key={sizeKey}
                      type="button"
                      onClick={() => setLabelSize(sizeKey)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                      title={sCfg.description}
                    >
                      <span>{sCfg.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Printer Mode: XP-365B (TSPL) vs XP-80TS (ESC/POS) */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-full border border-stone-200">
                <button
                  type="button"
                  onClick={() => setPrinterProtocol('tspl')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    printerProtocol === 'tspl'
                      ? 'bg-black text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Native TSPL command language for Xprinter XP-365B direct thermal label printer"
                >
                  <Printer className="w-3 h-3" />
                  <span>XP-365B (TSPL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterProtocol('escpos')}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    printerProtocol === 'escpos'
                      ? 'bg-black text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Native ESC/POS hardware barcodes for Xprinter XP-80TS receipt & label printer"
                >
                  <span>XP-80TS (ESC/POS)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Table and Preview Split */}
          <div className="flex-1 min-h-0 py-2 overflow-hidden flex flex-col lg:flex-row gap-3">
            {/* Left: Items Table */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <table className="table-auto w-full text-left border-collapse text-stone-800 text-[11px]">
                <thead className="sticky top-0 bg-[#FAF7F2] text-[9.5px] font-extrabold uppercase tracking-wider text-stone-400 border-b border-stone-200/80 z-10">
                  <tr>
                    <th className="py-1.5 px-2 w-[35px] text-center">#</th>
                    <th className="py-1.5 px-2">Product</th>
                    <th className="py-1.5 px-2">Barcode</th>
                    <th className="py-1.5 px-2 text-center">Barcode Preview</th>
                    <th className="py-1.5 px-2 text-center">Expiry</th>
                    <th className="py-1.5 px-2 text-right">Selling Price</th>
                    <th className="py-1.5 px-2 text-center w-[120px]">Print Copies</th>
                    <th className="py-1.5 px-2 text-center w-[60px]">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {items.map((item, idx) => {
                    const copies = itemCopies[item.id] || item.quantity || 1;
                    const isSelected = item.id === activePreviewId;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setActivePreviewId(item.id)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected ? 'bg-amber-50/50' : 'hover:bg-stone-50'
                        }`}
                      >
                        {/* # */}
                        <td className="py-1 px-2 text-center text-stone-400 font-mono text-[10px]">
                          #{idx + 1}
                        </td>

                        {/* Product (Strict Single Line) */}
                        <td className="py-1 px-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 leading-none">
                            <span className="font-bold text-stone-900 text-[11px] truncate max-w-[180px]" title={item.productName}>
                              {item.productName}
                            </span>
                            {(item.weight || item.sku) && (
                              <span className="text-[9.5px] text-stone-400 font-normal shrink-0">
                                ({[item.weight, item.sku].filter(Boolean).join(' • ')})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Barcode */}
                        <td className="py-1 px-2 font-mono font-bold text-stone-700 whitespace-nowrap text-[11px]">
                          {item.barcode || item.batchNumber || '-'}
                        </td>

                        {/* Barcode Vector Preview */}
                        <td className="py-1 px-2 text-center">
                          <div className="inline-flex flex-col items-center justify-center bg-white px-1.5 py-0.5 rounded border border-stone-200/90 shadow-2xs w-full max-w-[130px]">
                            <Code39Barcode
                              value={item.barcode || item.batchNumber}
                              height={16}
                              showText={false}
                              className="w-full max-w-[120px]"
                            />
                            <div className="w-full max-w-[120px] flex justify-between font-mono text-[7.5px] font-bold text-stone-700 leading-none mt-0.5 px-0.5">
                              {(item.barcode || item.batchNumber || '').split('').map((ch, i) => (
                                <span key={i}>{ch}</span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Expiry */}
                        <td className="py-1 px-2 text-center font-mono text-[10.5px] text-stone-600 whitespace-nowrap">
                          {item.expiryDate}
                        </td>

                        {/* Selling Price */}
                        <td className="py-1 px-2 text-right font-mono font-bold text-stone-900 whitespace-nowrap text-[11px]">
                          Rs. {item.sellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Copies Input */}
                        <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetCopies(item.id, copies - 1)}
                              disabled={copies <= 1}
                              className="w-4 h-4 bg-transparent text-stone-400 hover:text-stone-800 disabled:opacity-20 disabled:hover:text-stone-400 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer disabled:cursor-not-allowed select-none"
                              title="Decrease copies (Minimum: 1)"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={item.quantity || 1}
                              value={copies}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value);
                                if (!isNaN(parsed)) {
                                  handleSetCopies(item.id, parsed);
                                }
                              }}
                              onBlur={(e) => {
                                const parsed = parseInt(e.target.value);
                                if (isNaN(parsed) || parsed < 1) {
                                  handleSetCopies(item.id, 1);
                                }
                              }}
                              className="w-9 h-5 text-center font-mono font-bold text-stone-900 border-0 border-b border-stone-300 focus:border-[#00b4b6] focus:outline-none text-[10.5px] py-0 bg-transparent rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title={`Print copies (1 to ${item.quantity || 1})`}
                            />
                            <button
                              type="button"
                              onClick={() => handleSetCopies(item.id, copies + 1)}
                              disabled={copies >= (item.quantity || 1)}
                              className="w-4 h-4 bg-transparent text-stone-400 hover:text-stone-800 disabled:opacity-20 disabled:hover:text-stone-400 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer disabled:cursor-not-allowed select-none"
                              title={`Increase copies (Max: ${item.quantity || 1})`}
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Print Single Action (Icon Only) */}
                        <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handlePrintSingle(item)}
                            disabled={isSubmitting || isPrinting}
                            className="w-6.5 h-6.5 rounded-full bg-[#00b4b6] hover:bg-[#009ca0] text-white shadow-2xs transition-all cursor-pointer flex items-center justify-center active:scale-95 mx-auto"
                            title={`Print ${copies} label(s) for ${item.productName}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right: Live Formal Sticker Preview Card */}
            {activeItem && (() => {
              const cfg = LABEL_SIZE_CONFIGS[labelSize] || LABEL_SIZE_CONFIGS['35x25'];
              const { cleanTitle, measurement } = extractProductMeasurement(activeItem.productName, activeItem.weight);

              return (
                <div className="w-full lg:w-[320px] shrink-0 bg-white rounded-2xl p-3.5 border border-stone-200 flex flex-col justify-between shadow-2xs">
                  <div>
                    {/* Header with Title and Dynamic Size Badge */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-stone-500" />
                        <span>Sticker Preview</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white font-mono text-[10px] font-bold tracking-tight shadow-2xs">
                        {cfg.name}
                      </span>
                    </div>

                    {/* 100% Responsive Dimension Diagram Preview (No colored background) */}
                    <div className="w-full flex justify-center py-1">
                      <ThermalLabelDiagramPreview
                        labelSize={labelSize}
                        productName={activeItem.productName}
                        weight={activeItem.weight}
                        price={activeItem.sellingPrice}
                        barcode={activeItem.barcode || activeItem.batchNumber}
                        storeName="Chill&Chock"
                        tagline="Cool vibe sweet bite"
                      />
                    </div>
                  </div>

                {/* Quick Presets for Selected Item (Clean neutral styling) */}
                <div className="pt-2 border-t border-stone-100 mt-2">
                  <div className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Quick Preset Copies:
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from(new Set([1, activeItem.quantity || 1, 5, 10]))
                      .filter((preset) => preset <= (activeItem.quantity || 1))
                      .sort((a, b) => a - b)
                      .map((preset, pIdx) => (
                        <button
                          key={`${preset}-${pIdx}`}
                          type="button"
                          onClick={() => handleSetCopies(activeItem.id, preset)}
                          className={`flex-1 py-1 rounded text-[9.5px] font-bold border transition-colors cursor-pointer ${
                            (itemCopies[activeItem.id] || activeItem.quantity) === preset
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {preset === activeItem.quantity && preset > 1 ? `Stock (${preset})` : `${preset}x`}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            );
          })()}
          </div>

          {/* Row 3: Bottom Footer Bar (Printer Tip + Print All Actions) */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2 border-t border-stone-100 shrink-0 text-stone-900">
            {/* Left: Helpful Printer Tip */}
            <div className="flex items-center gap-2 text-[10.5px] text-stone-500">
              <span className="font-bold text-stone-700">Xprinter Setup:</span>
              <span>
                Insert your 30x15mm, 30x22mm, or 40x20mm label roll into your XP-365B. Calibrate the 3mm gap sensor if needed.
              </span>
            </div>

            {/* Right: Reset and Print Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAllCopiesToQty}
                className="px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10.5px] font-bold transition-colors cursor-pointer"
              >
                Reset to Stock Qty
              </button>

              <button
                type="button"
                onClick={() => printViaBrowser(items)}
                className="px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Open browser print dialog for Windows Xprinter Driver"
              >
                <Printer className="w-3 h-3 text-stone-600" />
                <span>Browser Print</span>
              </button>

              <button
                type="button"
                onClick={handlePrintAll}
                disabled={isSubmitting || isPrinting}
                className="px-4 py-1.5 rounded-full bg-[#00b4b6] hover:bg-[#009ca0] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending to Printer...' : `Print All Labels (${totalLabels})`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
