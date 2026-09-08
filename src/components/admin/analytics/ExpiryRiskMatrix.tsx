import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, ShieldCheck, ArrowRight, DollarSign } from 'lucide-react';
import { Product, ProductBatch } from '@/types';

export interface BatchExpiryAlert {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  batchNumber: string;
  supplierName: string;
  expiryDateStr: string;
  daysRemaining: number;
  quantityRemaining: number;
  costPrice: number;
  sellingPrice: number;
  totalCostAtRisk: number;
  totalRetailAtRisk: number;
  riskTier: 'critical' | 'warning' | 'safe';
}

interface ExpiryRiskMatrixProps {
  alerts: BatchExpiryAlert[];
  totalStockCostValuation: number;
  totalStockRetailValuation: number;
}

export const ExpiryRiskMatrix: React.FC<ExpiryRiskMatrixProps> = ({
  alerts,
  totalStockCostValuation,
  totalStockRetailValuation,
}) => {
  const navigate = useNavigate();

  const criticalBatches = alerts.filter((a) => a.riskTier === 'critical');
  const warningBatches = alerts.filter((a) => a.riskTier === 'warning');
  const safeBatches = alerts.filter((a) => a.riskTier === 'safe');

  const totalCostAtCriticalRisk = criticalBatches.reduce((sum, b) => sum + b.totalCostAtRisk, 0);
  const totalCostAtWarningRisk = warningBatches.reduce((sum, b) => sum + b.totalCostAtRisk, 0);

  return (
    <div className="space-y-4">
      {/* Top Valuation & Capital Exposure Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Stock Valuation */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
              Total Stock Capital
            </span>
            <div className="text-xl font-black text-zinc-900 mt-0.5">
              Rs. {totalStockCostValuation.toLocaleString('en-LK')}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Retail Value: <span className="font-bold text-zinc-800">Rs. {totalStockRetailValuation.toLocaleString('en-LK')}</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Critical Risk (< 30 Days) */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              Critical (&lt; 30 Days)
            </span>
            <div className="text-xl font-black text-rose-900 mt-0.5">
              Rs. {totalCostAtCriticalRisk.toLocaleString('en-LK')}
            </div>
            <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
              {criticalBatches.length} {criticalBatches.length === 1 ? 'batch' : 'batches'} facing expiry
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        {/* Warning Risk (30 - 60 Days) */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Impending (30–60 Days)
            </span>
            <div className="text-xl font-black text-amber-950 mt-0.5">
              Rs. {totalCostAtWarningRisk.toLocaleString('en-LK')}
            </div>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
              {warningBatches.length} batches require markdown
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Near Expiry Batches Table */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Expiring Batches &amp; Capital Exposure Matrix
            </h3>
          </div>
          <span className="text-[11px] font-bold text-zinc-400">
            {criticalBatches.length + warningBatches.length} batches requiring attention
          </span>
        </div>

        {criticalBatches.length === 0 && warningBatches.length === 0 ? (
          <div className="p-6 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">
              All inventory batches are healthy with over 60 days shelf life.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100 text-[11px]">
                  <th className="py-2.5 px-3.5">Product &amp; Batch</th>
                  <th className="py-2.5 px-3.5">Supplier</th>
                  <th className="py-2.5 px-3.5 text-center">Expiry Date</th>
                  <th className="py-2.5 px-3.5 text-center">Days Left</th>
                  <th className="py-2.5 px-3.5 text-right">Units</th>
                  <th className="py-2.5 px-3.5 text-right">Cost at Risk</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {[...criticalBatches, ...warningBatches].map((b) => {
                  const isCritical = b.riskTier === 'critical';
                  return (
                    <tr key={`${b.productId}-${b.batchNumber}`} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-zinc-900 block">{b.productName}</span>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">
                            {b.batchNumber}
                          </span>
                          <span>{b.sku}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-600 text-[11px] truncate max-w-[150px]">
                        {b.supplierName}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-[11px] text-zinc-700">
                        {b.expiryDateStr}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isCritical
                              ? 'bg-rose-100 text-rose-700 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.daysRemaining <= 0 ? 'EXPIRED' : `${b.daysRemaining} days`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-900">
                        {b.quantityRemaining} pcs
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600">
                        Rs. {b.totalCostAtRisk.toLocaleString('en-LK')}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/restock?productId=${b.productId}`)}
                          className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-[#FF5500] text-[#FF5500] hover:text-white transition-colors text-[10px] font-bold cursor-pointer"
                        >
                          Restock / RTV
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
