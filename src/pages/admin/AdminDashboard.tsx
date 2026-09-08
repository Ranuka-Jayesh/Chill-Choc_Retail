import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { HourlyPerformanceChart } from '@/components/admin/HourlyPerformanceChart';
import { TopSellingItemsCard } from '@/components/admin/TopSellingItemsCard';
import { useProducts } from '@/stores/productStore';
import { useSales } from '@/stores/salesStore';
import { useReturns } from '@/stores/returnsStore';
import { useSupplierReturns } from '@/stores/supplierReturnsStore';
import { useSuppliers } from '@/stores/supplierStore';
import {
  DollarSign,
  Package,
  RotateCcw,
  Truck,
  AlertTriangle,
  ArrowRight,
  X,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { products } = useProducts();
  const { sales } = useSales();
  const { returnRequests } = useReturns();
  const { supplierReturns } = useSupplierReturns();
  const { suppliers } = useSuppliers();
  const [isDismissed, setIsDismissed] = useState(false);

  // Metrics calculation
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalUnitsInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const pendingRefunds = returnRequests.filter((r) => r.status === 'Pending Admin Approval');
  const activeSupplierClaims = supplierReturns.filter(
    (r) => r.claimStatus !== 'Credit Note Received' && r.claimStatus !== 'Replacement Received'
  );

  const lowStockProducts = products.filter((p) => p.stock <= (p.lowStockThreshold || 5));

  return (
    <AdminLayout title="Executive Dashboard">
      <div className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Revenue"
            value={`Rs. ${totalSalesRevenue.toLocaleString('en-LK', { minimumFractionDigits: 0 })}`}
            subtitle={`${sales.length} completed POS orders`}
            icon={DollarSign}
            badgeColor="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Unified Stock"
            value={`${totalUnitsInStock} units`}
            subtitle={`Across ${products.length} products & suppliers`}
            icon={Package}
            badgeColor="bg-blue-50 text-blue-600"
            onClick={() => navigate('/admin/products')}
          />

          <StatCard
            title="Pending Refunds"
            value={pendingRefunds.length}
            subtitle={pendingRefunds.length > 0 ? 'Requires admin approval' : 'All clear'}
            icon={RotateCcw}
            badgeColor={pendingRefunds.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-zinc-100 text-zinc-500'}
            onClick={() => navigate('/admin/returns')}
          />

          <StatCard
            title="Supplier Claims"
            value={activeSupplierClaims.length}
            subtitle={`${suppliers.length} active suppliers`}
            icon={Truck}
            badgeColor="bg-orange-50 text-[#FF5500]"
            onClick={() => navigate('/admin/returns')}
          />
        </div>

        {/* Attention Banner: Pending Customer Refund Approvals */}
        {pendingRefunds.length > 0 && !isDismissed && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in transition-all duration-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  {pendingRefunds.length} Customer Return {pendingRefunds.length === 1 ? 'Request' : 'Requests'} Waiting for Approval
                </h4>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Inspect customer return reasons, verify supplying vendors, and dispatch debit notes to suppliers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => navigate('/admin/returns')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Review Returns Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1 text-amber-700 hover:text-amber-950 transition-colors cursor-pointer"
                title="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Minimal Hourly Sales Performance */}
        <HourlyPerformanceChart />

        {/* Top Selling Items (Horizontal Row) */}
        <TopSellingItemsCard />

        {/* Stock Alerts & Critical Reorder Table */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Stock Alerts &amp; Reorder Triggers
              </h3>
            </div>
            <span className="text-[11px] font-bold text-zinc-400">
              {lowStockProducts.length} items critical
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100 text-[11px]">
                  <th className="py-2.5 px-3.5">Product</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5 text-right">Unified Qty</th>
                  <th className="py-2.5 px-3.5 text-right">Threshold</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 font-medium">
                {lowStockProducts.slice(0, 5).map((prod) => (
                  <tr key={prod.id} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3.5">
                      <span className="font-bold text-zinc-900 block">{prod.name}</span>
                      <span className="font-mono text-[10px] text-zinc-400">{prod.sku}</span>
                    </td>
                    <td className="py-2.5 px-3.5 capitalize text-zinc-500">{prod.category}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600">
                      {prod.stock}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-zinc-400">
                      {prod.lowStockThreshold}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/restock?productId=${prod.id}`)}
                        className="px-3 py-1 rounded-lg bg-orange-50 text-[#FF5500] hover:bg-[#FF5500] hover:text-white transition-colors text-[11px] font-bold cursor-pointer"
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
