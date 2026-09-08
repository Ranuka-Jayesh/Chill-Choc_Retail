import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Product } from '@/types';
import { usePrinter } from '@/hooks/usePrinter';
import { useToast } from '@/stores/toastStore';
import { generateTSPLLabel, LabelSize } from '@/services/tsplGenerator';
import { generateESCPOSLabel, generateBarcodeSvgHtml } from '@/services/escposLabelGenerator';
import {
  LABEL_SIZE_CONFIGS,
  ORDERED_LABEL_SIZES,
  formatDisplayTitle,
  extractProductMeasurement,
  getDynamicTitleSizePt,
} from '@/services/labelConfig';
import {
  Printer,
  Barcode,
  Tag,
  Copy,
  Code2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { ThermalLabelDiagramPreview } from '@/components/pos/ThermalLabelDiagramPreview';

interface ProductLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
}

export const ProductLabelModal: React.FC<ProductLabelModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProduct,
}) => {
  const { isConnected, printLabel, isPrinting } = usePrinter();
  const { showToast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || products[0]?.id || ''
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [labelSize, setLabelSize] = useState<LabelSize>('40x20');
  const labelType: 'barcode' | 'shelftag' = labelSize === '50x30' ? 'shelftag' : 'barcode';
  const [printerProtocol, setPrinterProtocol] = useState<'escpos' | 'tspl'>('escpos');
  const [copies, setCopies] = useState<number>(1);
  const [showRawTspl, setShowRawTspl] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initial product if it changes
  React.useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
      if (initialProduct.batches && initialProduct.batches.length > 0) {
        setSelectedBatchId(initialProduct.batches[0].id);
      } else {
        setSelectedBatchId('all');
      }
    } else if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
      if (products[0].batches && products[0].batches.length > 0) {
        setSelectedBatchId(products[0].batches[0].id);
      }
    }
  }, [initialProduct, products, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const activeBatch = selectedProduct?.batches?.find((b) => b.id === selectedBatchId);
  const activeBarcode = activeBatch?.batchNumber || selectedProduct?.barcode || '';

  if (!isOpen || !selectedProduct) return null;

  const tsplString = generateTSPLLabel(selectedProduct, {
    copies,
    labelType,
    labelSize,
    batchNumber: activeBatch?.batchNumber,
    storeName: 'Chill&Chock',
  });

  const printViaBrowser = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      showToast('Please allow popups to print labels via browser', 'error');
      return;
    }

    const cfg = LABEL_SIZE_CONFIGS[labelSize] || LABEL_SIZE_CONFIGS['40x20'];
    const formattedPrice = selectedProduct.price.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const { cleanTitle, measurement } = extractProductMeasurement(selectedProduct.name, selectedProduct.weight);
    const measurementSuffix = measurement ? `<span class="price-unit">/ ${measurement}</span>` : '';
    const dynamicTitleSizePt = getDynamicTitleSizePt(cleanTitle.length, cfg.titleFontSizePt);

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Label - ${selectedProduct.name}</title>
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
            font-size: ${dynamicTitleSizePt}pt;
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
            font-family: "Courier New", Courier, monospace, sans-serif;
            font-size: ${cfg.barcodeFontSizePt}pt;
            font-weight: 700;
            letter-spacing: 0.8px;
            line-height: 1;
            margin-top: 0.25mm;
            color: #000000;
          }
        </style>
      </head>
      <body>
    `;

    for (let c = 0; c < copies; c++) {
      htmlContent += `
        <div class="label-page">
          <div class="label-text-block">
            <div class="brand-title">Chill&amp;Chock</div>
            ${cfg.showTagline ? `<div class="brand-tagline">Cool vibe sweet bite</div>` : ''}
            <div class="prod-title">${cleanTitle}</div>
            <div class="price-big">Rs. ${formattedPrice}${measurementSuffix}</div>
          </div>
          <div class="barcode-box">
            ${generateBarcodeSvgHtml(activeBarcode, cfg.barcodeSvgHeight, 34)}
            <div class="barcode-text">${activeBarcode}</div>
          </div>
        </div>
      `;
    }

    htmlContent += `
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrint = async () => {
    if (!isConnected) {
      printViaBrowser();
      return;
    }

    setIsSubmitting(true);
    const jobId = 'label-' + Date.now();

    const printData =
      printerProtocol === 'escpos'
        ? generateESCPOSLabel(selectedProduct, {
            copies,
            labelType,
            labelSize,
            batchNumber: activeBatch?.batchNumber,
            storeName: 'Chill&Chock',
          })
        : tsplString;

    try {
      await printLabel({
        data: printData,
        jobId,
      });
      showToast(
        `Sent ${copies}x ${labelType === 'shelftag' ? 'shelf tag' : 'barcode'} to ${printerProtocol === 'escpos' ? 'XP-80TS' : 'label'} printer!`,
        'success'
      );
      onClose();
    } catch (err: any) {
      console.error('Failed to print label:', err);
      showToast(`Print agent error. Opening browser print...`, 'error');
      printViaBrowser();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thermal Label & Tag Printing"
      subtitle="TSPL-II RAW Barcode & Shelf Edge Generator"
      maxWidth="md"
    >
      <div className="space-y-4 select-none">
        {/* Connection status banner */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200'
              : 'bg-amber-50/90 text-amber-800 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {isConnected
                ? 'Label Printer Agent Ready (ws://127.0.0.1:17891)'
                : 'Print Agent Offline — check local desktop service'}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            TSPL-II
          </span>
        </div>

        {/* Product selector & Label mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Product selector */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 mb-1 uppercase tracking-wider">
              Selected Confection
            </label>
            <select
              value={selectedProduct.id}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.weight}) - Rs. {p.price}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Barcode Selector */}
          {selectedProduct.batches && selectedProduct.batches.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1 uppercase tracking-wider">
                Batch Number Barcode
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
              >
                <option value="all">Master SKU Barcode ({selectedProduct.barcode})</option>
                {selectedProduct.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Batch {b.batchNumber} • {b.supplierName} ({b.quantityRemaining} in stock)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Label Type & Printer Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                Format &amp; Mode
              </label>
              {/* Protocol selector */}
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPrinterProtocol('escpos')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    printerProtocol === 'escpos' ? 'bg-black text-white shadow-2xs' : 'text-zinc-600 hover:text-black'
                  }`}
                  title="ESC/POS commands for Xprinter XP-80TS"
                >
                  XP-80TS
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterProtocol('tspl')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    printerProtocol === 'tspl' ? 'bg-black text-white shadow-2xs' : 'text-zinc-600 hover:text-black'
                  }`}
                  title="TSPL for dedicated label printers (XP-365B, Zebra)"
                >
                  TSPL
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                Sticker Size
              </span>
              <span className="px-2 py-0.5 rounded-md bg-black text-white font-mono text-xs font-bold shadow-2xs">
                40 × 20 mm
              </span>
            </div>
          </div>
        </div>

        {/* Copies Counter */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-zinc-500" />
            <div>
              <span className="text-xs font-bold text-zinc-800 block leading-tight">
                Print Copies
              </span>
              <span className="text-[10px] text-zinc-400 block leading-tight">
                Total stickers to feed
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 5, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCopies(num)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  copies === num
                    ? 'bg-black text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {num}
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="99"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 h-7 rounded-lg border border-zinc-200 bg-white text-center text-xs font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#FF5500]"
            />
          </div>
        </div>

        {/* Realistic Label Visual Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Thermal Label Preview ({labelSize.replace('x', 'mm × ')}mm)
            </span>
            <button
              type="button"
              onClick={() => setShowRawTspl(!showRawTspl)}
              className="text-[10px] font-semibold text-zinc-500 hover:text-black flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              <span>{showRawTspl ? 'Hide RAW TSPL' : 'View RAW TSPL'}</span>
            </button>
          </div>

          {showRawTspl ? (
            <pre className="bg-zinc-900 text-emerald-400 font-mono text-[10px] p-3 rounded-xl overflow-x-auto max-h-40 border border-zinc-800 leading-tight">
              {tsplString}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-2xl border border-zinc-200">
              <div className="w-full flex justify-center py-1">
                <ThermalLabelDiagramPreview
                  labelSize={labelSize}
                  productName={selectedProduct.name}
                  weight={selectedProduct.weight}
                  price={selectedProduct.price}
                  barcode={activeBarcode}
                  storeName="Chill&Chock"
                  tagline="Cool vibe sweet bite"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={printViaBrowser}
            className="py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title="Print through Windows printer driver"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-600" />
            <span>Browser Print</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isSubmitting || isPrinting}
            className="flex-1 py-2 px-3 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {isSubmitting || isPrinting ? 'Printing...' : `Print ${copies} Label${copies > 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
