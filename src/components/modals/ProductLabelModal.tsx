import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Product } from '@/types';
import { usePrinter } from '@/hooks/usePrinter';
import { useToast } from '@/stores/toastStore';
import { generateTSPLLabel } from '@/services/tsplGenerator';
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
  const [labelType, setLabelType] = useState<'barcode' | 'shelftag'>('barcode');
  const [copies, setCopies] = useState<number>(1);
  const [showRawTspl, setShowRawTspl] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initial product if it changes
  React.useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
    } else if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [initialProduct, products, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  if (!isOpen || !selectedProduct) return null;

  const tsplString = generateTSPLLabel(selectedProduct, {
    copies,
    labelType,
  });

  const handlePrint = async () => {
    if (!isConnected) {
      showToast('POS Print Agent is offline. Please start the agent at 127.0.0.1:17891', 'error');
      return;
    }

    setIsSubmitting(true);
    const jobId = 'label-' + Date.now();

    try {
      await printLabel({
        data: tsplString,
        jobId,
      });
      showToast(
        `Sent ${copies}x ${labelType === 'shelftag' ? 'shelf tag' : 'barcode'} to label printer!`,
        'success'
      );
      onClose();
    } catch (err: any) {
      console.error('Failed to print label:', err);
      showToast(`Print failed: ${err.message || 'Unknown error'}`, 'error');
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

          {/* Label Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 mb-1 uppercase tracking-wider">
              Label Format
            </label>
            <div className="grid grid-cols-2 gap-1.5 h-9 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={() => setLabelType('barcode')}
                className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                  labelType === 'barcode'
                    ? 'bg-white text-[#FF5500] shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Barcode (40x30)</span>
              </button>
              <button
                type="button"
                onClick={() => setLabelType('shelftag')}
                className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                  labelType === 'shelftag'
                    ? 'bg-white text-[#FF5500] shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Shelf Tag (50x30)</span>
              </button>
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
              Thermal Label Preview ({labelType === 'shelftag' ? '50mm × 30mm' : '40mm × 30mm'})
            </span>
            <button
              type="button"
              onClick={() => setShowRawTspl(!showRawTspl)}
              className="text-[10px] font-semibold text-zinc-500 hover:text-black flex items-center gap-1 transition-colors"
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
            <div className="flex justify-center p-3 bg-zinc-100/70 rounded-2xl border border-zinc-200/80">
              {labelType === 'shelftag' ? (
                /* Shelf Edge Tag Simulation (50x30mm) */
                <div className="w-[280px] bg-white rounded-lg shadow-md border-2 border-zinc-300 p-3 font-sans flex flex-col justify-between relative overflow-hidden">
                  <div className="border-b border-zinc-200 pb-1 flex items-center justify-between">
                    <span className="text-[9px] font-black tracking-widest text-[#FF5500] uppercase">
                      CHILL & CHOC
                    </span>
                    <span className="text-[8px] font-bold text-zinc-400 tracking-wider">
                      SHELF TAG
                    </span>
                  </div>
                  <div className="my-1">
                    <h4 className="text-xs font-black text-black leading-tight truncate">
                      {selectedProduct.name}
                    </h4>
                    <span className="text-[9px] text-zinc-500 font-medium">
                      {selectedProduct.weight} • SKU: {selectedProduct.sku}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mt-1 pt-1 border-t border-dashed border-zinc-200">
                    <div className="flex flex-col">
                      {/* Barcode graphic simulation */}
                      <div className="h-6 w-28 bg-[repeating-linear-gradient(90deg,#000,#000_1.5px,#fff_1.5px,#fff_3px)]" />
                      <span className="text-[8px] font-mono text-zinc-600 tracking-widest mt-0.5">
                        {selectedProduct.barcode}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-zinc-400 block uppercase">
                        Retail Price
                      </span>
                      <span className="text-sm font-black text-black font-mono leading-none">
                        Rs. {selectedProduct.price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Product Barcode Sticker Simulation (40x30mm) */
                <div className="w-[240px] bg-white rounded-lg shadow-md border-2 border-zinc-300 p-2.5 font-sans flex flex-col justify-between text-center relative">
                  <div>
                    <span className="text-[9px] font-black text-[#FF5500] uppercase tracking-wider block">
                      CHILL & CHOC
                    </span>
                    <h4 className="text-[11px] font-bold text-zinc-900 truncate leading-tight mt-0.5">
                      {selectedProduct.name}
                    </h4>
                    <span className="text-[8px] font-medium text-zinc-400">
                      {selectedProduct.weight} • {selectedProduct.sku}
                    </span>
                  </div>
                  <div className="my-1.5 flex flex-col items-center">
                    <div className="h-7 w-36 bg-[repeating-linear-gradient(90deg,#000,#000_1.5px,#fff_1.5px,#fff_3.5px)]" />
                    <span className="text-[8.5px] font-mono font-semibold text-zinc-700 tracking-widest mt-0.5">
                      {selectedProduct.barcode}
                    </span>
                  </div>
                  <div className="border-t border-zinc-100 pt-0.5">
                    <span className="text-xs font-black text-black font-mono">
                      Rs. {selectedProduct.price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
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
