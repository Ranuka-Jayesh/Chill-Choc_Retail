/**
 * Date Validator & Masking Utility for YYYY / MM / DD Inputs
 * Chill & Choc Retail POS / Inventory
 */

/**
 * Calculates the exact number of days in a given year and month (1-indexed: 1 = Jan, 12 = Dec).
 * Accurately handles leap years for February (28 vs 29 days) and 30/31 day months.
 */
export const getDaysInMonth = (year: number, month: number): number => {
  if (!year || isNaN(year) || !month || isNaN(month)) return 31;
  // In JavaScript Date, day 0 of month (when 1-indexed) returns the last day of that month
  return new Date(year, month, 0).getDate();
};

/**
 * Intelligent date input formatter and validator for YYYY / MM / DD format.
 * 
 * Rules:
 * 1. Year: Cannot be in the past (minimum current year).
 * 2. Month: Strictly 1 to 12. If the entered year is the current year, month cannot be in the past (minimum current month).
 * 3. Day: Strictly 1 to maxDays for the selected year and month (e.g. Feb has 28 or 29 days in leap years, 30 days for Apr/Jun/Sep/Nov, 31 for others).
 *    If the entered year is current year and month is current month, day cannot be in the past (minimum today).
 */
export const formatDateYYYYMMDD = (rawVal: string, prevVal: string = ''): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed (1-12)
  const currentDay = now.getDate();

  let digits = rawVal.replace(/\D/g, '');
  const prevDigits = prevVal.replace(/\D/g, '');
  const isBackspacing = rawVal.length < prevVal.length;

  // If user hit backspace over a slash/space separator, remove preceding digit
  if (isBackspacing && prevDigits.length === digits.length) {
    digits = digits.slice(0, -1);
  }

  // Cap input at 8 numeric digits (YYYYMMDD)
  digits = digits.slice(0, 8);
  if (!digits) return '';

  // 1. Year segment (1 - 4 digits)
  let yearPart = digits.slice(0, 4);
  let yearNum = parseInt(yearPart, 10);

  // If full 4-digit year has been typed, ensure it is not in the past
  if (yearPart.length === 4) {
    if (yearNum < currentYear) {
      yearNum = currentYear;
      yearPart = String(currentYear);
    }
  }

  if (digits.length <= 4) {
    return yearPart;
  }

  // 2. Month segment (digits 5 and 6)
  const isCurrentYear = yearNum === currentYear;
  const monthDigitsRaw = digits.slice(4);

  let monthPart = '';
  let monthNum = 0;

  if (monthDigitsRaw.length === 1) {
    const firstMDigit = parseInt(monthDigitsRaw[0], 10);
    // If not backspacing and user typed 2..9 (no month starts with 2..9), auto-pad to 2 digits
    if (!isBackspacing && firstMDigit > 1) {
      let m = firstMDigit;
      if (isCurrentYear && m < currentMonth) {
        m = currentMonth;
      }
      monthNum = m;
      monthPart = String(monthNum).padStart(2, '0');
    } else {
      monthPart = monthDigitsRaw[0];
    }
  } else {
    // 2 digits of month entered
    let m = parseInt(monthDigitsRaw.slice(0, 2), 10);
    // Month strictly 1 to 12
    if (m > 12) m = 12;
    if (m < 1) m = 1;
    // Current year: month cannot be in past
    if (isCurrentYear && m < currentMonth) {
      m = currentMonth;
    }
    monthNum = m;
    monthPart = String(monthNum).padStart(2, '0');
  }

  if (digits.length <= 6 && monthDigitsRaw.length < 2 && monthPart.length === 1) {
    return `${yearPart} / ${monthPart}`;
  }

  // 3. Day segment (digits 7 and 8)
  const dayDigitsRaw = digits.slice(monthDigitsRaw.length === 1 && monthPart.length === 2 ? 5 : 6);

  if (!dayDigitsRaw) {
    return `${yearPart} / ${monthPart}`;
  }

  const maxDays = getDaysInMonth(yearNum, monthNum || 1);

  let dayPart = '';
  if (dayDigitsRaw.length === 1) {
    const firstDDigit = parseInt(dayDigitsRaw[0], 10);
    // If not backspacing and user types 4..9 (no month has 40+ days), auto-convert to 04..09
    if (!isBackspacing && firstDDigit > 3) {
      let d = firstDDigit;
      if (d > maxDays) d = maxDays;
      if (isCurrentYear && monthNum === currentMonth && d < currentDay) {
        d = currentDay;
      }
      dayPart = String(d).padStart(2, '0');
    } else {
      dayPart = dayDigitsRaw[0];
    }
  } else {
    let d = parseInt(dayDigitsRaw.slice(0, 2), 10);
    if (d > maxDays) d = maxDays;
    if (d < 1) d = 1;
    if (isCurrentYear && monthNum === currentMonth && d < currentDay) {
      d = currentDay;
    }
    dayPart = String(d).padStart(2, '0');
  }

  return `${yearPart} / ${monthPart} / ${dayPart}`;
};
