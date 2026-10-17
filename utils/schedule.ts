// Pure helpers on exam lists: conflicts, course identity ("my courses"), study gaps and PDF version diffs.
import { Exam, ExamWithSelection } from '../types';

/** Minutes since epoch for the exam start, timezone-independent (the schedule is in Greek local time). */
export const startMinutes = (e: Pick<Exam, 'date' | 'time'>): number => {
  const [y, m, d] = e.date.split('-').map(Number);
  const [hh, mm] = e.time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh || 0, mm || 0) / 60000;
};

const dayNumber = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
};

/** For every selected exam, the ids of other selected exams that overlap with it in time. */
export function findConflicts(exams: ExamWithSelection[]): Map<string, string[]> {
  const sel = exams.filter(e => e.selected && e.date && e.time)
    .map(e => ({ id: e.id, start: startMinutes(e), end: startMinutes(e) + (e.duration || 0) }))
    .sort((a, b) => a.start - b.start);
  const out = new Map<string, string[]>();
  const add = (a: string, b: string) => out.set(a, [...(out.get(a) ?? []), b]);
  for (let i = 0; i < sel.length; i++) {
    for (let j = i + 1; j < sel.length && sel[j].start < sel[i].end; j++) {
      add(sel[i].id, sel[j].id);
      add(sel[j].id, sel[i].id);
    }
  }
  return out;
}

/** For every selected exam, the free days since the previous selected exam (on an earlier day); undefined for the first. */
export function studyGaps(exams: ExamWithSelection[]): Map<string, number> {
  const sel = exams.filter(e => e.selected && e.date).sort((a, b) => startMinutes(a) - startMinutes(b));
  const out = new Map<string, number>();
  let prevDay: number | undefined;
  for (const e of sel) {
    const day = dayNumber(e.date);
    if (prevDay !== undefined && day > prevDay) out.set(e.id, day - prevDay - 1);
    if (prevDay === undefined || day > prevDay) prevDay = day;
  }
  return out;
}

// ---------- course identity ----------

// Greek capitals that look like Latin ones; the PDFs mix them freely in course codes (e.g. "ΝΥ381" / "NΥ381").
const LOOKALIKE: Record<string, string> = {
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O',
  'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
};

export const normalizeCode = (s: string): string =>
  s.toUpperCase().replace(/./gu, ch => LOOKALIKE[ch] ?? ch).replace(/[^A-Z0-9Α-Ω]/gu, '');

const normalizeName = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Every code that appears in the exam's code field, e.g. "24Y351 - NY451" -> ["24Y351", "NY451"]. */
export function codeTokens(exam: Pick<Exam, 'code'>): string[] {
  if (!exam.code) return [];
  return exam.code.split(/[\s\-/&(),]+/).map(normalizeCode).filter(t => /\d/.test(t));
}

/** Keys that identify a course across different PDFs: its codes, plus its name. */
export function courseKeys(exam: Pick<Exam, 'code' | 'name'>): string[] {
  const keys = codeTokens(exam).map(c => `code:${c}`);
  const name = normalizeName(exam.name || '');
  if (name) keys.push(`name:${name}`);
  return keys;
}

const primaryKey = (exam: Pick<Exam, 'code' | 'name'>): string => courseKeys(exam)[0] ?? `name:${exam.name}`;

export const isMyCourse = (exam: Pick<Exam, 'code' | 'name'>, myCourses: Set<string>): boolean =>
  courseKeys(exam).some(k => myCourses.has(k));

/**
 * Updates the saved "my courses": courses present in the current schedule take their current selection,
 * courses not in it (e.g. from another exam period) are kept as they were.
 */
export function updateMyCourses(saved: Set<string>, exams: ExamWithSelection[]): Set<string> {
  const present = new Set(exams.flatMap(courseKeys));
  const next = new Set([...saved].filter(k => !present.has(k)));
  for (const e of exams) if (e.selected) courseKeys(e).forEach(k => next.add(k));
  return next;
}

// ---------- differences between two versions of a schedule PDF ----------

export type ChangeKind = 'moved' | 'room' | 'duration' | 'added' | 'removed';
export interface ExamChange { kind: ChangeKind; before?: Exam; after?: Exam }

const sameSession = (a: Exam, b: Exam) =>
  a.date === b.date && a.time === b.time && a.room === b.room && a.duration === b.duration;

function dateRange(list: Exam[]): [number, number] | null {
  const days = list.filter(e => e.date).map(e => dayNumber(e.date));
  return days.length ? [Math.min(...days), Math.max(...days)] : null;
}

/**
 * Changes from a previous import to a new one. Returns null when the two lists are different
 * exam periods (their dates don't overlap), so there is nothing meaningful to compare.
 */
export function diffSchedules(prev: Exam[], next: Exam[]): ExamChange[] | null {
  const a = dateRange(prev), b = dateRange(next);
  if (!a || !b || a[1] < b[0] || b[1] < a[0]) return null;

  const group = (list: Exam[]) => {
    const m = new Map<string, Exam[]>();
    for (const e of list) m.set(primaryKey(e), [...(m.get(primaryKey(e)) ?? []), e]);
    for (const v of m.values()) v.sort((x, y) => startMinutes(x) - startMinutes(y));
    return m;
  };
  const before = group(prev), after = group(next);
  const changes: ExamChange[] = [];

  for (const [key, olds] of before) {
    const news = after.get(key) ?? [];
    if (olds.length === news.length) {
      olds.forEach((o, i) => {
        const n = news[i];
        if (o.date !== n.date || o.time !== n.time) changes.push({ kind: 'moved', before: o, after: n });
        else if (o.room !== n.room) changes.push({ kind: 'room', before: o, after: n });
        else if (o.duration !== n.duration) changes.push({ kind: 'duration', before: o, after: n });
      });
    } else {
      olds.filter(o => !news.some(n => sameSession(o, n))).forEach(o => changes.push({ kind: 'removed', before: o }));
      news.filter(n => !olds.some(o => sameSession(o, n))).forEach(n => changes.push({ kind: 'added', after: n }));
    }
  }
  for (const [key, news] of after) {
    if (!before.has(key)) news.forEach(n => changes.push({ kind: 'added', after: n }));
  }
  const when = (c: ExamChange) => startMinutes((c.after ?? c.before)!);
  return changes.sort((x, y) => when(x) - when(y));
}
