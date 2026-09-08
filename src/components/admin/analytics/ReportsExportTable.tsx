import React, { useState, useMemo } from 'react';
import {
  Download,
  Printer,
  Search,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { CompletedSale, Product, StaffMember } from '@/types';
import { BatchExpiryAlert } from './ExpiryRiskMatrix';
import { RepSalesStat } from './StaffSalesLeaderboard';

type ReportTab = 'sales' | 'products' | 'expiry' | 'commission';

interface ReportsExportTableProps {
  sales: CompletedSale[];
  products: Product[];
  expiryAlerts: BatchExpiryAlert[];
  staffStats: RepSalesStat[];
  periodLabel: string;
}

export const ReportsExportTable: React.FC<ReportsExportTableProps> = ({
  sales,
  products,
  expiryAlerts,
  staffStats,
  periodLabel,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Tab 1: Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cashier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customer?.name && s.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.salesperson?.name && s.salesperson.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [sales, searchQuery]);

  // Tab 2: Product Velocity & Margins
  const productPerformance = useMemo(() => {
    const itemMap = new Map<string, { unitsSold: number; revenue: number }>();
    sales.forEach((sale) => {
      sale.items.forEach((it) => {
        const prev = itemMap.get(it.product.id) || { unitsSold: 0, revenue: 0 };
        itemMap.set(it.product.id, {
          unitsSold: prev.unitsSold + it.quantity,
          revenue: prev.revenue + it.quantity * it.unitPrice,
        });
      });
    });

    return products
      .map((p) => {
        const perf = itemMap.get(p.id) || { unitsSold: 0, revenue: 0 };
        const costPrice = p.costPrice || (p.batches && p.batches[0]?.costPrice) || Math.round(p.price * 0.65);
        const totalCost = perf.unitsSold * costPrice;
        const totalProfit = perf.revenue - totalCost;
        const profitMargin = perf.revenue > 0 ? (totalProfit / perf.revenue) * 100 : 0;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          stock: p.stock,
          sellingPrice: p.price,
          costPrice,
          unitsSold: perf.unitsSold,
          revenue: perf.revenue,
          profit: totalProfit,
          margin: profitMargin,
        };
      })
      .filter((p) => {
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales, products, selectedCategory, searchQuery]);

  // Tab 3: Expiry Audit
  const filteredExpiry = useMemo(() => {
    return expiryAlerts.filter((e) => {
      const matchSearch =
        e.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [expiryAlerts, searchQuery, selectedCategory]);

  // Tab 4: Staff Commission
  const filteredStaff = useMemo(() => {
    return staffStats.filter((sp) =>
      sp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staffStats, searchQuery]);

  // Export CSV Function
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `ChillChoc_${activeTab}_Report_${periodLabel.replace(/\s+/g, '_')}.csv`;

    if (activeTab === 'sales') {
      headers = ['Invoice Number', 'Date', 'Time', 'Cashier', 'Salesperson', 'Customer', 'Items Count', 'Subtotal (Rs)', 'Discount (Rs)', 'Total (Rs)', 'Tender Methods', 'Status'];
      rows = filteredSales.map((s) => [
        s.invoiceNumber,
        s.date,
        s.timestamp,
        `"${s.cashier}"`,
        `"${s.salesperson?.name || 'Store Terminal'}"`,
        `"${s.customer?.name || 'Walk-in'}"`,
        String(s.items.reduce((sum, it) => sum + it.quantity, 0)),
        String(s.subtotal),
        String(s.discountTotal),
        String(s.total),
        `"${s.tenders.map((t) => `${t.method}: ${t.amount}`).join('; ')}"`,
        s.status,
      ]);
    } else if (activeTab === 'products') {
      headers = ['Product Name', 'SKU', 'Category', 'Current Stock', 'Cost Price (Rs)', 'Selling Price (Rs)', 'Units Sold', 'Total Revenue (Rs)', 'Gross Profit (Rs)', 'Margin (%)'];
      rows = productPerformance.map((p) => [
        `"${p.name}"`,
        p.sku,
        p.category,
        String(p.stock),
        String(p.costPrice),
        String(p.sellingPrice),
        String(p.unitsSold),
        String(p.revenue),
        String(p.profit),
        p.margin.toFixed(1),
      ]);
    } else if (activeTab === 'expiry') {
      headers = ['Product Name', 'Batch Number', 'SKU', 'Supplier', 'Units Remaining', 'Unit Cost (Rs)', 'Capital at Risk (Rs)', 'Expiry Date', 'Days Left', 'Risk Tier'];
      rows = filteredExpiry.map((e) => [
        `"${e.productName}"`,
        e.batchNumber,
        e.sku,
        `"${e.supplierName}"`,
        String(e.quantityRemaining),
        String(e.costPrice),
        String(e.totalCostAtRisk),
        e.expiryDateStr,
        String(e.daysRemaining),
        e.riskTier,
      ]);
    } else if (activeTab === 'commission') {
      headers = ['Staff Name', 'Role', 'Bills Handled', 'Units Sold', 'Total Attributed Sales (Rs)', 'Store Sales Share (%)', 'Recommended Incentive (Rs)'];
      rows = filteredStaff.map((sp) => [
        `"${sp.name}"`,
        sp.role,
        String(sp.totalBills),
        String(sp.totalUnits),
        String(sp.totalRevenue),
        sp.percentageOfStoreSales.toFixed(1),
        String(sp.recommendedBonus),
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs space-y-4">
      {/* Top Header & Tab Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-50 text-[#FF5500]">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Interactive Reports &amp; Ledger Audit
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              Export verified ledgers or print executive summaries ({periodLabel})
            </p>
          </div>
        </div>

        {/* Action Controls: Export CSV & Print */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors border border-zinc-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex p-0.5 rounded-xl bg-zinc-100 border border-zinc-200/70 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-white text-zinc-900 shadow-xs font-black'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Sales Ledger ({filteredSales.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-white text-zinc-900 shadow-xs font-black'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Product Profitability ({productPerformance.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expiry')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'expiry'
                ? 'bg-white text-zinc-900 shadow-xs font-black'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Expiry &amp; Aging ({filteredExpiry.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commission')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'commission'
                ? 'bg-white text-zinc-900 shadow-xs font-black'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Staff Commission ({filteredStaff.length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-[#FF5500] capitalize"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-[#FF5500] w-40 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Table Display */}
      <div className="overflow-x-auto rounded-xl border border-zinc-100 max-h-96 overflow-y-auto">
        {activeTab === 'sales' && (
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5">Invoice #</th>
                <th className="py-2.5 px-3.5">Date / Time</th>
                <th className="py-2.5 px-3.5">Cashier</th>
                <th className="py-2.5 px-3.5">Salesperson</th>
                <th className="py-2.5 px-3.5 text-right">Subtotal</th>
                <th className="py-2.5 px-3.5 text-right">Discount</th>
                <th className="py-2.5 px-3.5 text-right">Total Net</th>
                <th className="py-2.5 px-3.5">Tender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/60">
                  <td className="py-2.5 px-3.5 font-mono font-bold text-zinc-900">
                    {s.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px] text-zinc-500">
                    {s.date} • {s.timestamp}
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-700">{s.cashier}</td>
                  <td className="py-2.5 px-3.5 text-zinc-700">
                    {s.salesperson?.name || <span className="text-zinc-400 italic">Terminal</span>}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-zinc-600">
                    Rs. {s.subtotal.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-purple-600">
                    {s.discountTotal > 0 ? `- Rs. ${s.discountTotal.toLocaleString('en-LK')}` : '—'}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-black text-zinc-900">
                    Rs. {s.total.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 capitalize">
                      {s.tenders[0]?.method || 'Cash'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'products' && (
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5">Product Name</th>
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3.5 text-right">Current Stock</th>
                <th className="py-2.5 px-3.5 text-right">Units Sold</th>
                <th className="py-2.5 px-3.5 text-right">Unit Price</th>
                <th className="py-2.5 px-3.5 text-right">Gross Revenue</th>
                <th className="py-2.5 px-3.5 text-right">Gross Profit</th>
                <th className="py-2.5 px-3.5 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {productPerformance.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/60">
                  <td className="py-2.5 px-3.5">
                    <span className="font-bold text-zinc-900 block">{p.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{p.sku}</span>
                  </td>
                  <td className="py-2.5 px-3.5 capitalize text-zinc-600 text-[11px]">{p.category}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-800">
                    {p.stock}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-black text-emerald-700">
                    {p.unitsSold}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-zinc-600">
                    Rs. {p.sellingPrice.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-900">
                    Rs. {p.revenue.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600">
                    Rs. {p.profit.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-black text-zinc-800">
                    {p.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'expiry' && (
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5">Product &amp; Batch</th>
                <th className="py-2.5 px-3.5">Supplier</th>
                <th className="py-2.5 px-3.5 text-center">Expiry Date</th>
                <th className="py-2.5 px-3.5 text-center">Days Remaining</th>
                <th className="py-2.5 px-3.5 text-right">Units Remaining</th>
                <th className="py-2.5 px-3.5 text-right">Wholesale Cost</th>
                <th className="py-2.5 px-3.5 text-right">Capital at Risk</th>
                <th className="py-2.5 px-3.5">Risk Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {filteredExpiry.map((e) => (
                <tr key={`${e.productId}-${e.batchNumber}`} className="hover:bg-zinc-50/60">
                  <td className="py-2.5 px-3.5">
                    <span className="font-bold text-zinc-900 block">{e.productName}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{e.batchNumber}</span>
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-600 text-[11px]">{e.supplierName}</td>
                  <td className="py-2.5 px-3.5 text-center font-mono text-zinc-700">{e.expiryDateStr}</td>
                  <td className="py-2.5 px-3.5 text-center font-mono font-bold">
                    {e.daysRemaining} days
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-900">
                    {e.quantityRemaining}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-zinc-600">
                    Rs. {e.costPrice.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600">
                    Rs. {e.totalCostAtRisk.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      e.riskTier === 'critical'
                        ? 'bg-rose-100 text-rose-700'
                        : e.riskTier === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {e.riskTier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'commission' && (
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5">Staff Member</th>
                <th className="py-2.5 px-3.5">Role</th>
                <th className="py-2.5 px-3.5 text-right">Bills Handled</th>
                <th className="py-2.5 px-3.5 text-right">Units Sold</th>
                <th className="py-2.5 px-3.5 text-right">Attributed Sales</th>
                <th className="py-2.5 px-3.5 text-right">Store Share</th>
                <th className="py-2.5 px-3.5 text-right">Recommended Bonus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {filteredStaff.map((sp) => (
                <tr key={sp.id} className="hover:bg-zinc-50/60">
                  <td className="py-2.5 px-3.5 font-bold text-zinc-900">{sp.name}</td>
                  <td className="py-2.5 px-3.5 text-zinc-500 text-[11px]">{sp.role}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-700">
                    {sp.totalBills}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-700">
                    {sp.totalUnits}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-black text-zinc-900">
                    Rs. {sp.totalRevenue.toLocaleString('en-LK')}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-zinc-700">
                    {sp.percentageOfStoreSales.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-black text-emerald-600">
                    Rs. {sp.recommendedBonus.toLocaleString('en-LK')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
