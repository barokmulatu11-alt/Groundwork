/**
 * lib/dateUtils.ts
 *
 * Safe local calendar date formatting and parsing utilities.
 * Prevents unintended day-shifts caused by UTC conversions (e.g. toISOString().split('T')[0]).
 */

/**
 * Format a Date object into YYYY-MM-DD using local calendar year, month, and day.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object set at noon to prevent timezone boundary shifts.
 */
export function parseLocalDateString(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.trim().split('-');
  if (parts.length < 3) return new Date();
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Returns tomorrow's date string in local calendar format (YYYY-MM-DD).
 */
export function getTomorrowDateString(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return getLocalDateString(d);
}

/**
 * Format local date for section headers (e.g. MONDAY, OCT 14)
 */
export function formatHeaderDate(date: Date = new Date()): string {
  return date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase()
    .replace(',', ' /');
}

/**
 * Returns a date string (YYYY-MM-DD) shifted by N days in local calendar.
 */
export function getDaysAheadDateString(days: number, date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

/**
 * Returns a friendly label for a date string (Today, Tomorrow, or formatted date).
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return 'No date set';
  const today = getLocalDateString();
  const tomorrow = getTomorrowDateString();
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  const d = parseLocalDateString(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Returns true if the given date string is strictly after the reference date string (local calendar).
 */
export function isFutureLocalDate(dateStr: string, referenceDateStr: string = getLocalDateString()): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return dateStr > referenceDateStr;
}

/**
 * Returns true if the given date string is strictly before the reference date string (local calendar).
 */
export function isPastLocalDate(dateStr: string, referenceDateStr: string = getLocalDateString()): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return dateStr < referenceDateStr;
}

/**
 * Returns true if the given date string matches the reference date string.
 */
export function isTodayLocalDate(dateStr: string, referenceDateStr: string = getLocalDateString()): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return dateStr === referenceDateStr;
}

/**
 * Validates whether string is in valid YYYY-MM-DD format.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const testDate = new Date(year, month - 1, day, 12, 0, 0, 0);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === month - 1 &&
    testDate.getDate() === day
  );
}


