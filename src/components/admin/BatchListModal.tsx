import React from 'react';
import { Product, ProductBatch } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Layers, Calendar, Building2, Package, Tag, ArrowUpRight, Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Code39Barcode } from '@/components/pos/Code39Barcode';

interface BatchListModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const BatchListModal: React.FC<BatchListModalProps> = ({ isOpen, onClose, product }) => {
  const navigate = useNavigate();

  if (!isOpen || !product) return null;

  const batches = product.batches || [];
  const totalStock = batches.reduce((sum, b) => sum + b.quantityRemaining, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Product Suppliers & Barcodes • ${product.name}`} maxWidth="lg">
      <div className="space-y-4 text-xs">
        {/* Product Summary Header */}
        <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-cover border border-zinc-200 flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0"
                style={{ backgroundColor: product.imageColor || '#27140B' }}
              >
                {product.weight}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#27140B]">{product.name}</span>
                <span className="text-[10px] font-mono text-zinc-500 bg-white px-2 py-0.5 rounded-md border border-zinc-200">
                  {product.sku}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-[#FF5500] px-2 py-0.5 rounded-md">
                  {product.category}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Variant: <span className="font-semibold text-zinc-700">{product.weight}</span> • Selling Price:{' '}
                {product.price > 0 ? (
                  <span className="font-mono font-black text-[#27140B]">Rs. {product.price.toLocaleString()}</span>
                ) : (
                  <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    Not priced yet
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Unified POS Stock</span>
            <span className="text-lg font-black text-emerald-600 font-mono">
              {totalStock} units
            </span>
          </div>
        </div>

        {/* Suppliers & Barcode Cards List */}
        <div>
          <h4 className="font-bold text-zinc-800 text-xs mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Suppliers &amp; Generated Barcodes ({batches.length})</span>
          </h4>

          {batches.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-center">
                <Barcode className="w-6 h-6 text-[#FF5500]" />
              </div>
              <div>
                <p className="font-bold text-zinc-800 text-sm">No Suppliers Recorded Yet</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  This item is defined in the master catalog. Restock it to register suppliers and auto-generate stock pricing.
                </p>
              </div>

              {/* Master Barcode Preview */}
              <div className="bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-xs flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Master SKU Barcode Preview
                </span>
                <Code39Barcode value={product.barcode} height={36} showText={true} />
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/admin/restock?productId=${product.id}`);
                }}
                className="px-4 py-2 rounded-xl bg-[#27140B] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Restock First Batch from Supplier</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white rounded-2xl border border-zinc-200 p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 shadow-2xs hover:border-zinc-300 transition-colors"
                >
                  {/* Supplier & Batch Information */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/80 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-[#FF5500]" />
                      </div>
                      <div>
                        <h5 className="font-bold text-zinc-900 text-xs">{batch.supplierName}</h5>
                        <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200">
                          {batch.batchNumber}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-zinc-500 pt-1">
                      <div>
                        <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Cost Price</span>
                        <span className="font-mono font-bold text-zinc-800">Rs. {batch.costPrice.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Received / Expiry</span>
                        <span className="text-zinc-700 font-medium">
                          {batch.receivedDate} &bull; {batch.expiryDate || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 uppercase font-semibold">In Stock</span>
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            batch.quantityRemaining > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-400'
                          }`}
                        >
                          {batch.quantityRemaining} units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Generated Live Barcode Preview for this Supplier Batch */}
                  <div className="flex-shrink-0 bg-zinc-50/80 p-2.5 rounded-xl border border-zinc-200 flex flex-col items-center self-stretch md:self-auto justify-center">
                    <span className="text-[9px] font-mono text-zinc-400 font-semibold mb-0.5 uppercase tracking-wider">
                      Supplier Batch Barcode
                    </span>
                    <div className="bg-white px-2 py-1 rounded-lg border border-zinc-200/80 shadow-2xs">
                      <Code39Barcode value={batch.batchNumber || product.barcode} height={30} showText={true} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
          <span className="text-xs text-zinc-500">
            {batches.length} supplier {batches.length === 1 ? 'batch' : 'batches'} active
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/admin/restock?productId=${product.id}`);
              }}
              className="px-4 py-2 rounded-xl bg-[#27140B] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Restock Supplier Batch</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
