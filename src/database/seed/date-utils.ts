/**
 * Dynamic date utilities for seeding.
 * All dates are calculated relative to the current date at seed time.
 */

export interface SemesterInfo {
  /** e.g. "Fall 2026" */
  sessionName: string;
  /** e.g. "1st" */
  ordinal: string;
  /** e.g. "Fall Semester" */
  semesterName: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

/**
 * Determine the current US academic term from a date.
 * Fall: Aug-Dec, Spring: Jan-May, Summer: Jun-Jul
 */
function getTerm(date: Date): 'fall' | 'spring' | 'summer' {
  const month = date.getMonth(); // 0-indexed
  if (month >= 7 && month <= 11) return 'fall'; // Aug-Dec
  if (month >= 0 && month <= 4) return 'spring'; // Jan-May
  return 'summer'; // Jun-Jul
}

function getAcademicYear(date: Date): number {
  const term = getTerm(date);
  const year = date.getFullYear();
  return term === 'fall' ? year : year - 1;
}

function termStartEnd(
  year: number,
  term: 'fall' | 'spring',
): { start: Date; end: Date } {
  if (term === 'fall') {
    return {
      start: new Date(year, 7, 24), // ~Aug 24
      end: new Date(year, 11, 12), // ~Dec 12
    };
  }
  // spring
  return {
    start: new Date(year + 1, 0, 12), // ~Jan 12
    end: new Date(year + 1, 4, 8), // ~May 8
  };
}

/**
 * Get the current and previous semester info.
 * Returns [currentSemester, previousSemester]
 */
export function getSemesters(): [SemesterInfo, SemesterInfo] {
  const now = new Date();
  const term = getTerm(now);
  const academicYear = getAcademicYear(now);

  const termOrder: Array<'fall' | 'spring'> = ['fall', 'spring'];
  const currentTermIndex = term === 'fall' ? 0 : 1;

  const currentTerm = termOrder[currentTermIndex];
  const prevTerm = termOrder[1 - currentTermIndex];

  const currentYear = currentTerm === 'fall' ? academicYear : academicYear;
  const prevYear = currentTerm === 'fall' ? academicYear - 1 : academicYear;

  const currentDates = termStartEnd(currentYear, currentTerm);
  const prevDates = termStartEnd(prevYear, prevTerm);

  const isCurrent = now >= currentDates.start && now <= currentDates.end;

  const sessionName = (y: number, t: string) =>
    `${t === 'fall' ? 'Fall' : 'Spring'} ${t === 'fall' ? y : y + 1}`;

  const ordinalMap: Record<string, string> = {
    fall: '1st',
    spring: '2nd',
  };

  const nameMap: Record<string, string> = {
    fall: 'Fall Semester',
    spring: 'Spring Semester',
  };

  return [
    {
      sessionName: sessionName(currentYear, currentTerm),
      ordinal: ordinalMap[currentTerm],
      semesterName: nameMap[currentTerm],
      startDate: currentDates.start,
      endDate: currentDates.end,
      isCurrent,
    },
    {
      sessionName: sessionName(prevYear, prevTerm),
      ordinal: ordinalMap[prevTerm],
      semesterName: nameMap[prevTerm],
      startDate: prevDates.start,
      endDate: prevDates.end,
      isCurrent: false,
    },
  ];
}

/**
 * Get a date N days ago from now.
 */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Get a date N weeks from now.
 */
export function weeksFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n * 7);
  return d;
}

/**
 * Get a date N days from now.
 */
export function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Get a date N months ago.
 */
export function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

/**
 * Get N random dates within a range.
 */
export function randomDatesInRange(
  start: Date,
  end: Date,
  count: number,
): Date[] {
  const range = end.getTime() - start.getTime();
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const t = start.getTime() + Math.random() * range;
    dates.push(new Date(t));
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Generate school days (Mon-Fri) between two dates.
 */
export function schoolDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/**
 * Format a date as ISO date string (YYYY-MM-DD).
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a date as ISO datetime string.
 */
export function toISODateTime(date: Date): string {
  return date.toISOString();
}
