import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { getProductStockExpiryStatus } from '@/stores/productStore';
import { Modal } from '@/components/common/Modal';
import { Code39Barcode } from '@/components/pos/Code39Barcode';
import { useSales } from '@/stores/salesStore';
import { useReturns } from '@/stores/returnsStore';
import {
  Building2,
  Calendar,
  Barcode,
  Package,
  Plus,
  Tag,
  TrendingUp,
  RotateCcw,
  Pencil,
  Clock,
  Layers,
  CheckCircle2,
  Ban,
  AlertTriangle,
} from 'lucide-react';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: (product: Product) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
}) => {
  const navigate = useNavigate();
  const { sales } = useSales();
  const { returnRequests } = useReturns();
  const [imageError, setImageError] = useState(false);

  // Reset image error state when product changes
  React.useEffect(() => {
    setImageError(false);
  }, [product?.id]);

  // Calculate Product Sales & Returns
  const { totalSold, totalReturned, batchStatsMap } = useMemo(() => {
    if (!product) {
      return { totalSold: 0, totalReturned: 0, batchStatsMap: new Map<string, { sold: number; returned: number }>() };
    }

    const batches = product.batches || [];
    const map = new Map<string, { sold: number; returned: number }>();

    // Initial batch deduction baseline
    batches.forEach((b) => {
      const soldFromDelta = Math.max(b.quantityReceived - b.quantityRemaining, 0);
      map.set(b.id, { sold: soldFromDelta, returned: 0 });
    });

    // Check store sales
    let storeSoldTotal = 0;
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (item.product.id === product.id) {
          storeSoldTotal += item.quantity;
        }
      });
    });

    if (batches.length > 0 && storeSoldTotal > 0) {
      const firstBatch = batches[0];
      const current = map.get(firstBatch.id);
      if (current) {
        map.set(firstBatch.id, {
          ...current,
          sold: Math.max(current.sold, storeSoldTotal),
        });
      }
    }

    // Check return requests
    let totalRetCount = 0;
    returnRequests.forEach((req) => {
      req.items.forEach((item) => {
        if (item.productId === product.id) {
          totalRetCount += item.quantity;
          const matchedBatch = batches.find(
            (b) => b.batchNumber === item.batchNumber || b.supplierId === item.supplierId
          );
          if (matchedBatch && map.has(matchedBatch.id)) {
            const current = map.get(matchedBatch.id)!;
            map.set(matchedBatch.id, {
              ...current,
              returned: current.returned + item.quantity,
            });
          } else if (batches[0] && map.has(batches[0].id)) {
            const current = map.get(batches[0].id)!;
            map.set(batches[0].id, {
              ...current,
              returned: current.returned + item.quantity,
            });
          }
        }
      });
    });

    let totalSoldCount = 0;
    map.forEach((stat) => {
      totalSoldCount += stat.sold;
    });

    return {
      totalSold: totalSoldCount,
      totalReturned: totalRetCount,
      batchStatsMap: map,
    };
  }, [product, sales, returnRequests]);

  if (!isOpen || !product) return null;

  const batches = product.batches || [];
  const totalStock = batches.length > 0
    ? batches.reduce((sum, b) => sum + b.quantityRemaining, 0)
    : product.stock;

  const isOutOfStock = totalStock <= 0;
  const isLowStock = !isOutOfStock && totalStock <= (product.lowStockThreshold || 5);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Details & Multi-Supplier Inventory"
      maxWidth="6xl"
      bodyClassName="p-4 sm:p-5"
    >
      <div className="space-y-3 text-xs">
        {/* Single Minimal Product & Metric Row */}
        <div className="p-2.5 sm:p-3 bg-zinc-50/90 rounded-2xl border border-zinc-200/90 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Product Thumbnail + Title + Meta Details */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {product.imageUrl && !imageError ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                onError={() => setImageError(true)}
                className="w-10 h-10 rounded-xl object-cover border border-zinc-200 shadow-2xs bg-white flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0 shadow-2xs"
                style={{ backgroundColor: product.imageColor || '#27140B' }}
              >
                <Tag className="w-4 h-4 text-white/90" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-[#27140B] truncate">
                  {product.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#27140B] text-white text-[10px] font-bold capitalize shadow-2xs">
                  {product.category}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-600 font-mono text-[10px] font-bold">
                  {product.sku}
                </span>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {product.weight}
                </span>
                {product.brand && (
                  <span className="text-[11px] text-zinc-400">
                    • {product.brand}
                  </span>
                )}
                <span className="text-[11px] text-zinc-400 font-mono">
                  • Barcode: <strong className="text-zinc-700 font-bold">{product.barcode}</strong>
                </span>
                {/* Available / Unavailable Status */}
                {product.isAvailable !== false ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Available
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                    <Ban className="w-3 h-3 text-rose-600" />
                    Unavailable
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Integrated Metrics & Retail Price */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between xl:justify-end flex-shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-zinc-200/70">
            {/* KPI Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono text-xs">
              {(() => {
                const stockStatus = getProductStockExpiryStatus(product);
                return (
                  <div className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center gap-1.5 flex-shrink-0">
                    <Package
                      className={`w-3.5 h-3.5 ${
                        stockStatus.isOutOfStock || stockStatus.isAllExpired
                          ? 'text-rose-600'
                          : stockStatus.isPartialExpired
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    />
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider hidden 2xl:inline">Stock</span>
                    <span
                      className={`font-bold ${
                        stockStatus.isOutOfStock || stockStatus.isAllExpired
                          ? 'text-rose-700'
                          : stockStatus.isPartialExpired
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {stockStatus.displayText}
                    </span>
                  </div>
                );
              })()}

              <div className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center gap-1.5 flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider hidden 2xl:inline">Sold</span>
                <span className="font-bold text-blue-700">{totalSold} sold</span>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center gap-1.5 flex-shrink-0">
                <RotateCcw className={`w-3.5 h-3.5 ${totalReturned > 0 ? 'text-rose-600' : 'text-zinc-400'}`} />
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider hidden 2xl:inline">Ret</span>
                <span className={`font-bold ${totalReturned > 0 ? 'text-rose-700' : 'text-zinc-500'}`}>
                  {totalReturned} ret
                </span>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center gap-1.5 flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-[#FF5500]" />
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider hidden 2xl:inline">Suppliers</span>
                <span className="font-bold text-zinc-800">{batches.length} active</span>
              </div>
            </div>

            {/* Retail Price in Confectionery Orange */}
            <div className="pl-2.5 border-l border-zinc-200/80 flex items-center flex-shrink-0">
              <span className="text-base sm:text-lg font-black text-[#FF5500] font-mono whitespace-nowrap">
                {product.price > 0 ? `Rs. ${product.price.toLocaleString('en-LK')}` : 'Not Priced'}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Supplier Records (Clean Minimal Rows / Table) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>In-Stock Supplier Records &amp; Barcodes ({batches.length})</span>
            </h4>
            <span className="text-[10px] text-zinc-400 font-medium">
              Sorted by active inventory batches
            </span>
          </div>

          {batches.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-center text-zinc-400">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-zinc-800 text-xs">No Supplier Batches Registered Yet</p>
                <p className="text-zinc-500 text-[11px] mt-0.5">
                  Restock this product to record supplier pricing, batches, and auto-generate stock barcodes.
                </p>
              </div>

              {/* Master SKU Barcode */}
              <div className="bg-white p-2 rounded-xl border border-zinc-200 shadow-2xs flex flex-col items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                  Master SKU Barcode
                </span>
                <Code39Barcode value={product.barcode} height={24} showText={true} />
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/admin/restock?productId=${product.id}`);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Restock First Batch</span>
              </button>
            </div>
          ) : (
            <div className="border border-zinc-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
              {/* Desktop & Tablet Table View (Guaranteed No Overlapping with min-w-[880px]) */}
              <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
                <table className="w-full text-left border-collapse min-w-[880px]">
                  <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3.5 min-w-[200px]">Supplier</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Restock &amp; Expiry</th>
                      <th className="py-2.5 px-3 text-center min-w-[125px]" title="Current Stock / Returns / Total Supplied">Stock</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Cost &amp; Selling</th>
                      <th className="py-2.5 px-3.5 text-right min-w-[180px]">Barcode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {batches.map((batch) => {
                      const stats = batchStatsMap.get(batch.id) || { sold: 0, returned: 0 };
                      const barcodeValue = product.barcode || batch.batchNumber;

                      return (
                        <tr
                          key={batch.id}
                          className="hover:bg-orange-50/20 transition-colors h-10"
                        >
                          {/* 1. Supplier Name (Single Line, No Supplier ID / Lot Pill, No Profile Icon) */}
                          <td className="py-2 px-3.5 whitespace-nowrap min-w-[200px]">
                            <span
                              className="font-bold text-zinc-900 text-xs truncate block max-w-[240px]"
                              title={batch.supplierName}
                            >
                              {batch.supplierName}
                            </span>
                          </td>

                          {/* 2. Restock Date & Expiry Date (Single Line) */}
                          <td className="py-2 px-3 whitespace-nowrap min-w-[170px]">
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                              <span className="flex items-center gap-1 font-medium">
                                <Calendar className="w-3 h-3 text-zinc-400" />
                                {batch.receivedDate}
                              </span>
                              <span className="text-zinc-300">•</span>
                              {batch.expiryDate ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                                  Exp: {batch.expiryDate}
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-400">No Exp</span>
                              )}
                            </div>
                          </td>

                          {/* 3. Stock: Current / Returned / Total Supplied */}
                          <td className="py-2 px-3 text-center whitespace-nowrap min-w-[125px]">
                            <span
                              className="font-mono text-xs inline-flex items-center justify-center"
                              title={`Current: ${batch.quantityRemaining} | Returned: ${stats.returned} | Total Supplied: ${batch.quantityReceived}`}
                            >
                              <strong className="text-emerald-600 font-bold">{batch.quantityRemaining}</strong>
                              <span className="text-zinc-300 mx-1">/</span>
                              <strong className={stats.returned > 0 ? "text-rose-600 font-bold" : "text-zinc-400 font-bold"}>
                                {stats.returned}
                              </strong>
                              <span className="text-zinc-300 mx-1">/</span>
                              <span className="text-zinc-700 font-semibold">{batch.quantityReceived}</span>
                            </span>
                          </td>

                          {/* 4. Cost Price & Selling Price (Single Line, Generous Spacing) */}
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] min-w-[160px]">
                            <span className="text-zinc-400">Cost:</span> <strong className="text-zinc-700">Rs. {batch.costPrice.toLocaleString('en-LK')}</strong>
                            <span className="text-zinc-300 mx-1.5">•</span>
                            <span className="text-zinc-400">Sale:</span> <strong className="text-[#FF5500] font-bold">Rs. {batch.sellingPrice.toLocaleString('en-LK')}</strong>
                          </td>

                          {/* 5. Barcode & Mini Scan (Single Line) */}
                          <td className="py-2 px-3.5 text-right whitespace-nowrap min-w-[180px]">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-mono text-[10px] font-bold text-zinc-600">
                                {barcodeValue}
                              </span>
                              <div className="bg-zinc-50 px-1 py-0.5 rounded border border-zinc-200 inline-flex flex-shrink-0">
                                <Code39Barcode value={barcodeValue} height={16} showText={false} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-zinc-200/80">
          <div className="flex items-center gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                <span>Edit Product</span>
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/admin/restock?productId=${product.id}`);
              }}
              className="px-4 py-1.5 rounded-xl bg-[#FF5500] hover:bg-[#e04b00] active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Restock Supplier Batch</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
