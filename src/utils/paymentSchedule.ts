import { PurchaseOrder } from '@/types';

export interface PaymentScheduleInfo {
  dateDisplay: string;
  countDisplay: string;
  isOverdue: boolean;
  isDueToday: boolean;
  daysDiff: number; // >0 days left, <0 days overdue, 0 due today
  badgeClass: string;
}

/**
 * Robust date parser supporting YYYY/MM/DD, YYYY-MM-DD, Sep 3, Sep 08, 2026, etc.
 */
export const parseScheduleDate = (str?: string): Date | null => {
  if (!str || !str.trim() || str.trim().toUpperCase() === 'N/A') return null;
  const clean = str.trim();

  // Pattern 1: YYYY/MM/DD, YYYY-MM-DD, YYYY / MM / DD
  const ymdMatch = clean.match(/^(\d{4})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    return new Date(y, m, d);
  }

  // Pattern 2: Month Day Year or Month Day (e.g., "Sep 3", "Sep 3, 2026", "03 Sep 2026")
  const cleanParts = clean.replace(/,/g, '').split(/\s+/);
  const monthsMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  let m: number | null = null;
  let d: number | null = null;
  let y: number | null = null;

  for (const part of cleanParts) {
    const low = part.toLowerCase().slice(0, 3);
    if (low in monthsMap) {
      m = monthsMap[low];
    } else if (/^\d{4}$/.test(part)) {
      y = parseInt(part, 10);
    } else if (/^\d{1,2}$/.test(part)) {
      d = parseInt(part, 10);
    }
  }

  if (m !== null && d !== null) {
    return new Date(y || new Date().getFullYear(), m, d);
  }

  // Pattern 3: Standard JS date fallback
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
};

/**
 * Computes schedule date, days remaining, or days overdue for Cheque and Credit/Partial records.
 */
export const getPaymentScheduleInfo = (po: PurchaseOrder): PaymentScheduleInfo | null => {
  const isChequePending = po.paymentStatus === 'CHEQUE PENDING';
  const isCredit = po.paymentStatus === 'CREDIT';
  const isPartial = po.paymentStatus === 'PARTIAL' && po.balanceDue > 0;

  if (!isChequePending && !isCredit && !isPartial) {
    return null;
  }

  // 1. Raw date from payment breakdown
  const rawDate = isChequePending
    ? po.paymentBreakdown?.chequeDueDate
    : po.paymentBreakdown?.unpaidDueDate;

  let targetDate = parseScheduleDate(rawDate);

  // 2. Fallback: if no schedule date was explicitly entered, standard 14 days credit/cheque from PO date
  if (!targetDate) {
    const basePoDate = parseScheduleDate(po.date);
    if (basePoDate) {
      targetDate = new Date(basePoDate);
      targetDate.setDate(targetDate.getDate() + 14);
    }
  }

  if (!targetDate) return null;

  // 3. Difference in calendar days relative to today
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${months[targetDate.getMonth()]} ${String(targetDate.getDate()).padStart(2, '0')}${
    targetDate.getFullYear() !== today.getFullYear() ? `, ${targetDate.getFullYear()}` : ''
  }`;

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      dateDisplay: formattedDate,
      countDisplay: `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue`,
      isOverdue: true,
      isDueToday: false,
      daysDiff: diffDays,
      badgeClass: 'text-rose-600 font-bold',
    };
  }

  if (diffDays === 0) {
    return {
      dateDisplay: formattedDate,
      countDisplay: 'Due Today',
      isOverdue: false,
      isDueToday: true,
      daysDiff: 0,
      badgeClass: 'text-amber-700 font-bold',
    };
  }

  return {
    dateDisplay: formattedDate,
    countDisplay: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`,
    isOverdue: false,
    isDueToday: false,
    daysDiff: diffDays,
    badgeClass: 'text-stone-500 font-medium',
  };
};
