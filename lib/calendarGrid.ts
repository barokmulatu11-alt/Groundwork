import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/** Monday-first single-letter labels (unique per column). */
export const WEEKDAY_LABELS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export function toLocalDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Empty cells before the 1st when weeks start on Monday. */
export function getMondayFirstLeadingBlanks(month: Date): number {
  return (getDay(startOfMonth(month)) + 6) % 7;
}

/** Month grid as week rows (Mon–Sun), each row exactly 7 cells. */
export function buildMondayFirstMonthWeeks(reference: Date = new Date()): (Date | null)[][] {
  const monthStart = startOfMonth(reference);
  const monthEnd = endOfMonth(reference);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leading = getMondayFirstLeadingBlanks(reference);
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Current calendar week Monday → Sunday (local). */
export function buildCurrentWeekDays(reference: Date = new Date()): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(reference, { weekStartsOn: 1 }),
    end: endOfWeek(reference, { weekStartsOn: 1 }),
  });
}
