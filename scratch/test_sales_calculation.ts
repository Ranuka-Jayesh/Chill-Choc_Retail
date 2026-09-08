import { INITIAL_SALES } from '../src/data/mockSales';
import { MOCK_SALESPERSONS } from '../src/data/mockEmployees';
import { CompletedSale } from '../src/types';

console.log('--- TEST 1: Baseline Today Aggregation ---');

const isDateMatching = (saleDateStr: string, targetDate: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isTargetToday =
    targetDate.getDate() === today.getDate() &&
    targetDate.getMonth() === today.getMonth() &&
    targetDate.getFullYear() === today.getFullYear();

  const isTargetYesterday =
    targetDate.getDate() === yesterday.getDate() &&
    targetDate.getMonth() === yesterday.getMonth() &&
    targetDate.getFullYear() === yesterday.getFullYear();

  const lower = (saleDateStr || '').toLowerCase().trim();

  if (lower === 'today' || lower.startsWith('today')) {
    return isTargetToday;
  }
  if (lower === 'yesterday') {
    return isTargetYesterday;
  }

  const parsed = new Date(saleDateStr);
  if (!isNaN(parsed.getTime())) {
    return (
      parsed.getDate() === targetDate.getDate() &&
      parsed.getMonth() === targetDate.getMonth() &&
      parsed.getFullYear() === targetDate.getFullYear()
    );
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const isoPrefix = `${y}-${m}-${d}`;
  return saleDateStr.startsWith(isoPrefix);
};

function computeReportData(sales: CompletedSale[], selectedDate: Date) {
  const daySales = sales.filter(
    (s) => s.status !== 'Returned' && isDateMatching(s.date, selectedDate)
  );

  const spStats: Record<
    string,
    { totalSales: number; billCount: number; itemCount: number }
  > = {};
  const spBills: Record<string, Set<string>> = {};

  MOCK_SALESPERSONS.forEach((sp) => {
    spStats[sp.id] = { totalSales: 0, billCount: 0, itemCount: 0 };
    spBills[sp.id] = new Set();
  });

  daySales.forEach((sale) => {
    const billRep =
      sale.salesperson ||
      sale.items.find((i) => i.salesperson)?.salesperson ||
      null;

    sale.items.forEach((item) => {
      const rep = item.salesperson || billRep;
      const repId = rep?.id;

      if (repId && spStats[repId]) {
        const itemDiscountVal = item.discount
          ? item.discount.type === 'percentage'
            ? (item.unitPrice * item.quantity * item.discount.value) / 100
            : item.discount.value
          : 0;
        const lineTotal = Math.max(0, item.unitPrice * item.quantity - itemDiscountVal);

        spStats[repId].totalSales += lineTotal;
        spStats[repId].itemCount += item.quantity;
        spBills[repId].add(sale.id || sale.invoiceNumber);
      }
    });
  });

  MOCK_SALESPERSONS.forEach((sp) => {
    spStats[sp.id].billCount = spBills[sp.id].size;
  });

  const list = MOCK_SALESPERSONS.map((sp) => {
    const stats = spStats[sp.id];
    return {
      ...sp,
      totalSales: stats.totalSales,
      billCount: stats.billCount,
      itemCount: stats.itemCount,
      avgBill: stats.billCount > 0 ? Math.round(stats.totalSales / stats.billCount) : 0,
    };
  });

  list.sort((a, b) => b.totalSales - a.totalSales);

  const totalTeamSales = list.reduce((sum, item) => sum + item.totalSales, 0);
  const totalBills = daySales.length;
  const totalItems = list.reduce((sum, item) => sum + item.itemCount, 0);

  return {
    salespersons: list,
    totalTeamSales,
    totalBills,
    totalItems,
    topPerformer: totalTeamSales > 0 ? list[0] : null,
  };
}

const todayResult = computeReportData(INITIAL_SALES, new Date());
console.log('Total Team Sales:', todayResult.totalTeamSales);
console.log('Total Bills:', todayResult.totalBills);
console.log('Total Items:', todayResult.totalItems);
console.log('Top Performer:', todayResult.topPerformer?.name);
console.table(
  todayResult.salespersons.map((sp) => ({
    Rank: sp.name,
    Code: sp.code,
    Bills: sp.billCount,
    Units: sp.itemCount,
    Pct: Math.round((sp.totalSales / todayResult.totalTeamSales) * 100) + '%',
    Sales: 'Rs. ' + sp.totalSales.toLocaleString('en-LK', { minimumFractionDigits: 2 }),
  }))
);

if (
  todayResult.totalTeamSales === 64090 &&
  todayResult.totalBills === 21 &&
  todayResult.totalItems === 65
) {
  console.log('✓ TEST 1 PASSED: Baseline exactly matches 21 bills, 65 units, Rs. 64,090.00!');
} else {
  console.error('✗ TEST 1 FAILED!');
  process.exit(1);
}

console.log('\n--- TEST 2: Dynamic Live POS Sale Simulation ---');
const newSale: CompletedSale = {
  id: 'sale-live-test',
  invoiceNumber: 'INV-001831',
  timestamp: '12:00 PM',
  date: 'Today',
  cashier: 'Nimal Perera',
  salesperson: MOCK_SALESPERSONS[4], // Dilan Perera
  customer: { id: 'cust-walkin', name: 'Walk-in Customer', isWalkIn: true, phone: '' },
  items: [
    {
      id: 'item-live-1',
      product: {
        id: 'prod-kitkat',
        name: 'KitKat Chunky',
        weight: '40g',
        price: 450,
        category: 'chocolate',
        barcode: '890123456789',
        sku: 'CC-KIT-040',
        stock: 24,
        brand: 'Nestle',
        supplierId: 'sup-nestle',
        supplierName: 'Nestle',
      },
      quantity: 1,
      unitPrice: 450,
      salesperson: MOCK_SALESPERSONS[4],
    },
  ],
  subtotal: 450,
  discountTotal: 0,
  tax: 0,
  total: 450,
  tenders: [{ method: 'cash', amount: 500 }],
  change: 50,
  status: 'Completed',
};

const updatedSales = [newSale, ...INITIAL_SALES];
const updatedResult = computeReportData(updatedSales, new Date());
console.log('Updated Total Team Sales:', updatedResult.totalTeamSales);
console.log('Updated Total Bills:', updatedResult.totalBills);
console.log('Updated Total Items:', updatedResult.totalItems);
const dilan = updatedResult.salespersons.find((s) => s.id === 'sp-5');
console.log('Dilan Updated Stats:', dilan);

if (
  updatedResult.totalTeamSales === 64540 &&
  updatedResult.totalBills === 22 &&
  updatedResult.totalItems === 66 &&
  dilan?.totalSales === 3850 &&
  dilan?.billCount === 3 &&
  dilan?.itemCount === 5
) {
  console.log('✓ TEST 2 PASSED: Live POS sale instantly and perfectly attributes to Dilan!');
} else {
  console.error('✗ TEST 2 FAILED!');
  process.exit(1);
}

console.log('\n--- TEST 3: Yesterday Filter ---');
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayResult = computeReportData(INITIAL_SALES, yesterday);
console.log('Yesterday Total Team Sales:', yesterdayResult.totalTeamSales);
console.log('Yesterday Total Bills:', yesterdayResult.totalBills);
console.log('Yesterday Total Items:', yesterdayResult.totalItems);
console.table(
  yesterdayResult.salespersons.map((sp) => ({
    Rank: sp.name,
    Code: sp.code,
    Bills: sp.billCount,
    Units: sp.itemCount,
    Pct: (yesterdayResult.totalTeamSales > 0 ? Math.round((sp.totalSales / yesterdayResult.totalTeamSales) * 100) : 0) + '%',
    Sales: 'Rs. ' + sp.totalSales.toLocaleString('en-LK', { minimumFractionDigits: 2 }),
  }))
);

if (yesterdayResult.totalTeamSales > 0 && yesterdayResult.totalBills === 5) {
  console.log('✓ TEST 3 PASSED: Yesterday sales calculated dynamically from completed sales!');
} else {
  console.error('✗ TEST 3 FAILED!');
  process.exit(1);
}

console.log('\nALL TESTS PASSED WITH 100% MATHEMATICAL PRECISION!');
