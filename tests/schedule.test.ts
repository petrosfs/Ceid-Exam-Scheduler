import { describe, expect, it } from 'vitest';
import { findConflicts, studyGaps, isMyCourse, updateMyCourses, diffSchedules, codeTokens } from '../utils/schedule';
import { CourseCategory, ExamWithSelection } from '../types';

let n = 0;
const ex = (date: string, time: string, duration = 180, over: Partial<ExamWithSelection> = {}): ExamWithSelection => ({
  id: `e${n++}`, name: 'Μάθημα', code: undefined, semester: '1', room: 'Γ', date, time, duration,
  category: CourseCategory.PPS, selected: true, reminders: [], ...over,
});

describe('conflicts', () => {
  it('finds overlapping selected exams only', () => {
    const a = ex('2026-01-20', '09:00'), b = ex('2026-01-20', '11:00'), c = ex('2026-01-20', '12:00');
    const d = ex('2026-01-20', '10:00', 60, { selected: false });
    const m = findConflicts([a, b, c, d]);
    expect(m.get(a.id)).toEqual([b.id]);
    expect(m.get(b.id)).toEqual([a.id, c.id]);
    expect(m.has(d.id)).toBe(false);
  });
});

describe('study gaps', () => {
  it('counts free days between exam days', () => {
    const a = ex('2026-01-20', '09:00'), b = ex('2026-01-23', '09:00'), c = ex('2026-01-24', '09:00');
    const g = studyGaps([c, a, b]);
    expect(g.has(a.id)).toBe(false);
    expect(g.get(b.id)).toBe(2);
    expect(g.get(c.id)).toBe(0);
  });
});

describe('my courses', () => {
  it('treats Greek and Latin look-alike letters in codes as the same', () => {
    expect(codeTokens({ code: '24Υ381/ΝΥ381' })).toEqual(['24Y381', 'NY381']);
    const saved = new Set(['code:NY381']);
    expect(isMyCourse({ code: 'NΥ381', name: 'x' }, saved)).toBe(true);
  });

  it('keeps courses from other periods and updates the ones in the current schedule', () => {
    const saved = new Set(['code:NY101', 'code:NY999']);
    const list = [ex('2026-01-20', '09:00', 180, { code: 'ΝΥ101', name: 'Α', selected: false }), ex('2026-01-21', '09:00', 180, { code: 'ΝΥ102', name: 'Β' })];
    const next = updateMyCourses(saved, list);
    expect(next.has('code:NY999')).toBe(true);
    expect(next.has('code:NY101')).toBe(false);
    expect(next.has('code:NY102')).toBe(true);
  });
});

describe('PDF version diff', () => {
  const base = [
    ex('2026-01-20', '09:00', 180, { code: 'ΝΥ101', name: 'Α', room: 'Γ' }),
    ex('2026-01-21', '09:00', 180, { code: 'ΝΥ102', name: 'Β', room: 'Γ' }),
    ex('2026-01-22', '09:00', 180, { code: 'ΝΥ103', name: 'Γ', room: 'Γ' }),
  ];
  it('reports moved, room changes, added and removed exams', () => {
    const next = [
      { ...base[0], date: '2026-01-27' },
      { ...base[1], room: 'ΑΦΕ' },
      ex('2026-01-23', '09:00', 180, { code: 'ΝΥ104', name: 'Δ' }),
    ];
    const kinds = diffSchedules(base, next)!.map(c => c.kind).sort();
    expect(kinds).toEqual(['added', 'moved', 'removed', 'room']);
  });
  it('returns null for a different exam period', () => {
    expect(diffSchedules(base, [ex('2026-06-10', '09:00')])).toBeNull();
  });
  it('returns no changes for the same schedule', () => {
    expect(diffSchedules(base, base)).toEqual([]);
  });
});
