import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useCashier } from '@/stores/cashierStore';
import { CustomDatePicker, DateFilterMode } from '@/components/common/CustomDatePicker';
import { cashSyncSocket } from '@/services/cashSyncSocket';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Search,
  Wifi,
  Sparkles,
  DollarSign,
  TrendingDown,
  Layers,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export const AdminCashAudits: React.FC = () => {
  const { session, cashMovements, cashier, isWsConnected } = useCashier();

  // Date & Period Filter State
  const [filterMode, setFilterMode] = useState<DateFilterMode>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Movement Type Filter & Search
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'Expense' | 'Cash In' | 'Cash Out'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live real-time toast banner
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  // Subscribe to real-time events to display instantaneous live alerts
  useEffect(() => {
    const unsub = cashSyncSocket.subscribe((msg) => {
      if (msg.type === 'DRAWER_OPENED') {
        setLiveNotification(
          `Cash Drawer opened with Rs. ${msg.payload.session.openingCash.toLocaleString()} float by ${msg.payload.session.cashier}`
        );
      } else if (msg.type === 'DRAWER_CLOSED') {
        const s = msg.payload.session;
        const diffText =
          s.difference === 0
            ? 'Balanced'
            : s.difference && s.difference > 0
            ? `+Rs. ${s.difference.toLocaleString()} Over`
            : `-Rs. ${Math.abs(s.difference || 0).toLocaleString()} Short`;
        setLiveNotification(`Cash Drawer closed & audited (Counted: Rs. ${s.countedCash?.toLocaleString() || '0'}, ${diffText})`);
      } else if (msg.type === 'CASH_MOVEMENT') {
        const mov = msg.payload.movement;
        setLiveNotification(
          `Real-time: ${mov.type} of Rs. ${mov.amount.toLocaleString()} logged (${mov.reason})`
        );
      } else if (msg.type === 'CASH_SALE') {
        setLiveNotification(`Real-time: POS Cash Sale of +Rs. ${msg.payload.amount.toLocaleString()} added to drawer`);
      } else if (msg.type === 'CASH_REFUND') {
        setLiveNotification(`Real-time: Cash Refund of -Rs. ${msg.payload.amount.toLocaleString()} disbursed from drawer`);
      }

      const timer = setTimeout(() => setLiveNotification(null), 6000);
      return () => clearTimeout(timer);
    });

    return unsub;
  }, []);

  // Filter movements by search, type, and date/month/year
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const filteredMovements = cashMovements.filter((mov) => {
    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matches =
        mov.reason.toLowerCase().includes(q) ||
        (mov.reference && mov.reference.toLowerCase().includes(q)) ||
        mov.cashier.toLowerCase().includes(q) ||
        mov.type.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // 2. Movement Type Filter
    if (movementTypeFilter !== 'all') {
      if (movementTypeFilter === 'Expense') {
        if (mov.type !== 'Expense' && mov.type !== 'Petty Cash') return false;
      } else if (movementTypeFilter === 'Cash In') {
        if (mov.type !== 'Cash In') return false;
      } else if (movementTypeFilter === 'Cash Out') {
        if (mov.type !== 'Cash Out' && mov.type !== 'Bank Drop') return false;
      }
    }

    // 3. Date / Month / Year Filter
    const movDate = mov.date || todayStr;

    if (filterMode === 'all') return true;

    if (filterMode === 'today') {
      return movDate === todayStr || !mov.date;
    }

    if (filterMode === 'yesterday') {
      return movDate === yesterdayStr;
    }

    if (filterMode === 'month') {
      const targetMonth = selectedDate || todayStr.slice(0, 7);
      return movDate.startsWith(targetMonth) || (!mov.date && todayStr.startsWith(targetMonth));
    }

    if (filterMode === 'year') {
      const targetYear = selectedDate || todayStr.slice(0, 4);
      return movDate.startsWith(targetYear) || (!mov.date && todayStr.startsWith(targetYear));
    }

    if (filterMode === 'custom' && selectedDate) {
      return movDate === selectedDate || (!mov.date && selectedDate === todayStr);
    }

    return true;
  });

  // Calculate filtered totals
  const totalIn = filteredMovements
    .filter((m) => m.type === 'Cash In')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalOut = filteredMovements
    .filter((m) => m.type === 'Cash Out' || m.type === 'Bank Drop')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExpenses = filteredMovements
    .filter((m) => m.type === 'Expense' || m.type === 'Petty Cash')
    .reduce((sum, m) => sum + m.amount, 0);

  // Counts for tabs
  const allCount = cashMovements.length;
  const expenseCount = cashMovements.filter((m) => m.type === 'Expense' || m.type === 'Petty Cash').length;
  const cashInCount = cashMovements.filter((m) => m.type === 'Cash In').length;
  const cashOutCount = cashMovements.filter((m) => m.type === 'Cash Out' || m.type === 'Bank Drop').length;

  return (
    <AdminLayout
      title="Cash Session & Drawer Audits"
      subtitle="Real-time register float, mid-shift store expenses, cash movements & end-of-shift reconciliation"
    >
      <div className="space-y-6">
        {/* Real-time Notification Banner */}
        {liveNotification && (
          <div className="bg-gradient-to-r from-orange-500 to-[#FF5500] text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <Sparkles className="w-4 h-4 text-white" />
              <span>{liveNotification}</span>
            </div>
            <button
              onClick={() => setLiveNotification(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}

        {/* Top Control Bar: Live WebSocket Status & Custom Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5">
            {/* WebSocket Live Connection Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 select-none ${
                isWsConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
                }`}
              />
              <Wifi className="w-3.5 h-3.5" />
              <span>{isWsConnected ? 'Live WebSocket Connected' : 'Sync Channel Active'}</span>
            </div>

            <span className="text-zinc-300 hidden sm:inline">|</span>

            <span className="text-xs font-semibold text-zinc-500 hidden sm:inline">
              Outlet: <strong>Colombo Flagship (02)</strong>
            </span>
          </div>

          {/* Customer-Designed Date / Month / Year Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 hidden md:inline">Audit Period:</span>
            <CustomDatePicker
              selectedDate={selectedDate}
              filterMode={filterMode}
              onSelectPeriod={(mode, dateStr) => {
                setFilterMode(mode);
                setSelectedDate(dateStr || null);
              }}
            />
          </div>
        </div>

        {/* Active Drawer Session Card (or Reconciled Closed Session Card) */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3.5 rounded-2xl border ${
                  session.isClosed
                    ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    : 'bg-orange-50 text-[#FF5500] border-orange-200/60'
                }`}
              >
                <Wallet className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-zinc-900">
                    Register {session.register || 'POS-01'}
                  </h3>
                  {session.isClosed ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-300 text-[10px] font-black uppercase tracking-wider">
                      Shift Closed &amp; Audited
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Session
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500 mt-1">
                  Assigned Cashier: <strong>{session.cashier || cashier.name}</strong> &bull;{' '}
                  Shift Started at <strong>{session.startedAt || '09:12 AM'}</strong>
                  {session.closedAt && (
                    <span> &bull; Closed at <strong>{session.closedAt}</strong></span>
                  )}
                </p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {session.isClosed ? 'Reconciled Drawer Cash' : 'Current Net Drawer Cash'}
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#FF5500]">
                Rs. {session.expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Closed Session Reconciliation Box (Shown if session is closed) */}
          {session.isClosed && (
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Shift Cashier Reconciliation Summary</span>
                </div>
                <p className="text-zinc-600">
                  Counted Cash: <strong className="font-mono text-zinc-900">Rs. {(session.countedCash || 0).toLocaleString()}</strong> &bull;{' '}
                  Expected Cash: <strong className="font-mono text-zinc-900">Rs. {session.expectedCash.toLocaleString()}</strong>
                </p>
                {session.differenceReason && (
                  <p className="text-zinc-500 text-[11px] italic">
                    Reason: &ldquo;{session.differenceReason}&rdquo;
                  </p>
                )}
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black font-mono inline-flex items-center gap-1 border ${
                    (session.difference || 0) === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : (session.difference || 0) > 0
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {(session.difference || 0) === 0
                    ? 'Balanced (Rs. 0.00)'
                    : (session.difference || 0) > 0
                    ? `+Rs. ${(session.difference || 0).toLocaleString()} (Over)`
                    : `-Rs. ${Math.abs(session.difference || 0).toLocaleString()} (Short)`}
                </span>
              </div>
            </div>
          )}

          {/* Financial Breakdown Grid: 5 Essential Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {/* Opening Float */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                <Wallet className="w-3 h-3 text-zinc-400" />
                Opening Float
              </span>
              <p className="text-sm sm:text-base font-mono font-black text-zinc-800">
                Rs. {session.openingCash.toLocaleString()}
              </p>
            </div>

            {/* Cash Sales */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                Cash Sales
              </span>
              <p className="text-sm sm:text-base font-mono font-black text-emerald-600">
                + Rs. {session.cashSales.toLocaleString()}
              </p>
            </div>

            {/* Cash In (Adjustments) */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-blue-500" />
                Cash In (Float)
              </span>
              <p className="text-sm sm:text-base font-mono font-black text-blue-600">
                + Rs. {session.cashIn.toLocaleString()}
              </p>
            </div>

            {/* Cash Out / Drops */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-500" />
                Cash Out / Drops
              </span>
              <p className="text-sm sm:text-base font-mono font-black text-rose-600">
                - Rs. {session.cashOut.toLocaleString()}
              </p>
            </div>

            {/* Store Expenses */}
            <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/70 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider flex items-center gap-1">
                <Receipt className="w-3 h-3 text-[#FF5500]" />
                Store Expenses
              </span>
              <p className="text-sm sm:text-base font-mono font-black text-[#FF5500]">
                - Rs. {session.cashExpenses.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Mid-Shift Cash Movements & Expenses Table Section */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
          {/* Header Bar with Filter Tabs & Search */}
          <div className="p-4 border-b border-zinc-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <span>Manager-Authorized Cash Movements &amp; Expenses</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                    {filteredMovements.length} records
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Detailed live audit trail of mid-shift Cash In, Cash Out, Petty Cash &amp; Store Expenses
                </p>
              </div>

              {/* Total summary badges */}
              <div className="flex items-center gap-2 text-xs font-mono font-bold flex-wrap">
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70">
                  In: Rs. {totalIn.toLocaleString()}
                </span>
                <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/70">
                  Out: Rs. {totalOut.toLocaleString()}
                </span>
                <span className="text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/70">
                  Expenses: Rs. {totalExpenses.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Filter Tabs & Search Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movementTypeFilter === 'all'
                      ? 'bg-white text-zinc-900 shadow-2xs font-black'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  All ({allCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('Expense')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movementTypeFilter === 'Expense'
                      ? 'bg-[#FF5500] text-white shadow-2xs font-black'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Expenses ({expenseCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('Cash In')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movementTypeFilter === 'Cash In'
                      ? 'bg-emerald-600 text-white shadow-2xs font-black'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Cash In ({cashInCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('Cash Out')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    movementTypeFilter === 'Cash Out'
                      ? 'bg-rose-600 text-white shadow-2xs font-black'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Cash Out ({cashOutCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reason, ref, cashier..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl border border-zinc-200 bg-white text-xs font-medium focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Movements Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[11px] uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Time &amp; Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-4">Reason / Description</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-3">Auth Level</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto px-4">
                        <Receipt className="w-8 h-8 text-zinc-300 stroke-1" />
                        <span className="font-bold text-xs text-zinc-700">
                          {movementTypeFilter === 'Cash Out'
                            ? 'No Cash Out / Bank Drop movements recorded yet.'
                            : movementTypeFilter === 'Expense'
                            ? 'No Store Expenses recorded yet.'
                            : movementTypeFilter === 'Cash In'
                            ? 'No Cash In / Float movements found.'
                            : 'No cash adjustments or expenses match the selected filters.'}
                        </span>
                        <p className="text-[11px] text-zinc-400">
                          {movementTypeFilter === 'Cash Out'
                            ? 'To review store expenses (tea, repairs, supplies), switch to the Expenses or All tab.'
                            : movementTypeFilter === 'Expense'
                            ? 'When cashiers log mid-shift expenses at the POS (F10), they will appear here instantaneously in real-time via WebSocket.'
                            : 'All mid-shift Cash In, Cash Out, and Store Expenses logged by cashiers sync here live.'}
                        </p>
                        {(movementTypeFilter !== 'all' || searchQuery || filterMode !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setMovementTypeFilter('all');
                              setSearchQuery('');
                              setFilterMode('all');
                              setSelectedDate(null);
                            }}
                            className="text-xs font-bold text-[#FF5500] hover:underline cursor-pointer mt-1"
                          >
                            View All Cash Movements &amp; Expenses
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => {
                    const isExpense = mov.type === 'Expense' || mov.type === 'Petty Cash';
                    const isCashIn = mov.type === 'Cash In';

                    return (
                      <tr key={mov.id} className="hover:bg-zinc-50/70 transition-colors">
                        {/* Timestamp & Date */}
                        <td className="py-3 px-4 font-mono text-zinc-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                            <span>{mov.timestamp}</span>
                            {mov.date && (
                              <span className="text-[10px] text-zinc-400 font-sans ml-1">
                                &bull; {mov.date}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Movement Type Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border ${
                              isExpense
                                ? 'bg-orange-50 text-[#FF5500] border-orange-200/80'
                                : isCashIn
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border-rose-200/80'
                            }`}
                          >
                            {isExpense ? (
                              <Receipt className="w-3 h-3" />
                            ) : isCashIn ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            <span>{mov.type}</span>
                          </span>
                        </td>

                        {/* Reason / Description */}
                        <td className="py-3 px-4 font-semibold text-zinc-800">
                          <div className="flex items-center gap-2">
                            <span>{mov.reason}</span>
                            {mov.reference && (
                              <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 font-mono text-[10px] font-bold">
                                #{mov.reference}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cashier Name */}
                        <td className="py-3 px-3 text-zinc-600 whitespace-nowrap">
                          {mov.cashier}
                        </td>

                        {/* Auth Level */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Manager Verified</span>
                          </span>
                        </td>

                        {/* Amount */}
                        <td
                          className={`py-3 px-4 text-right font-mono font-black text-sm whitespace-nowrap ${
                            isExpense
                              ? 'text-[#FF5500]'
                              : isCashIn
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {isCashIn ? '+' : '-'} Rs. {mov.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
