import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseSchedule, type PageData } from '../utils/scheduleParser';

// Fixtures: text positions and lines extracted from real CEID exam PDFs (see scripts/make-fixtures.ts).
const dir = path.resolve(__dirname, 'fixtures');
const load = (name: string) => ({
  pages: JSON.parse(fs.readFileSync(path.join(dir, `${name}.pages.json`), 'utf8')) as PageData[],
  expected: JSON.parse(fs.readFileSync(path.join(dir, `${name}.expected.json`), 'utf8')),
});
const run = (name: string) => {
  const { pages } = load(name);
  const result = parseSchedule(pages);
  const strip = (list: typeof result.exams) => list.map(({ id, ...rest }) => rest);
  return { exams: strip(result.exams), unnamed: strip(result.unnamed) };
};
const find = (name: string, code: string) => run(name).exams.filter(e => e.code?.includes(code));

describe.each(['feb2025', 'jun2025', 'sep2025', 'feb2026'])('%s schedule', name => {
  it('matches the reviewed output', () => {
    expect(run(name)).toEqual(load(name).expected);
  });
});

describe('details checked by hand against the PDFs', () => {
  it('counts', () => {
    expect(run('feb2025').exams).toHaveLength(78);
    expect(run('jun2025').exams).toHaveLength(35);
    expect(run('sep2025').exams).toHaveLength(52);
    expect(run('feb2026').exams).toHaveLength(50);
    expect(run('feb2026').unnamed).toHaveLength(3);
  });

  it('takes the year from the announcements page (January exams of a schedule created in December)', () => {
    const years = new Set(run('feb2026').exams.map(e => e.date.slice(0, 4)));
    expect([...years]).toEqual(['2026']);
  });

  it('handles a partial first week (Thursday-Friday)', () => {
    expect(find('sep2025', '22Y102')[0]).toMatchObject({ date: '2025-08-28', time: '09:00', duration: 180 });
  });

  it('handles a week that spans two months', () => {
    expect(find('jun2025', 'ΝΥ451')[0]).toMatchObject({ date: '2025-07-01', time: '12:00' });
  });

  it('reads merged cells as longer exams and keeps multi-session exams', () => {
    const sessions = find('feb2025', 'ΝΕ574');
    expect(sessions.map(e => [e.date, e.time, e.duration])).toEqual([
      ['2025-02-05', '09:00', 300],
      ['2025-02-06', '16:00', 300],
    ]);
    expect(sessions[0].format).toBe('Προφορική');
  });

  it('applies "starts at 8:00" notes', () => {
    expect(find('feb2026', 'ΝΣΜ04')[0]).toMatchObject({ date: '2026-01-20', time: '08:00', duration: 180, room: 'ΑΠ1' });
  });

  it('re-joins words broken across lines and splits the course code', () => {
    expect(find('feb2026', 'ΝΕ5038')[0].name).toBe('Σημασιολογία στην Επιστήμη των Υπολογιστών');
    expect(find('feb2025', '22Y101')[0]).toMatchObject({ code: '22Y101 - ΝΝΥ101', name: 'Διακριτά Μαθηματικά' });
  });

  it('keeps an exam that appears on two curriculum pages only once', () => {
    expect(find('feb2025', '22Y101')).toHaveLength(1);
  });
});
