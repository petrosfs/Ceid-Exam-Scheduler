import { describe, expect, it } from 'vitest';
import { generateICS, escapeText, foldLine, examUid, getGoogleCalendarLink } from '../utils/ics';
import { CourseCategory, ExamWithSelection } from '../types';

const exam = (over: Partial<ExamWithSelection> = {}): ExamWithSelection => ({
  id: 'x', name: 'Θεωρία Σημάτων & Συστημάτων', code: '23Υ207 - ΝΥ282', semester: '4', room: 'ΑΦΕ,Γ,Β',
  date: '2026-02-10', time: '22:00', duration: 180, category: CourseCategory.PPS, selected: true, reminders: [60, 1440],
  ...over,
});

describe('ics', () => {
  const ics = generateICS([exam()], new Date('2026-01-01T00:00:00Z'));
  const lines = ics.split('\r\n');

  it('uses CRLF line endings and no bare LF', () => {
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('folds lines to 75 octets', () => {
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('escapes commas in text values', () => {
    expect(escapeText('ΑΦΕ,Γ;Β\\x\ny')).toBe('ΑΦΕ\\,Γ\\;Β\\\\x\\ny');
    expect(ics.replace(/\r\n /g, '')).toContain('LOCATION:ΑΦΕ\\,Γ\\,Β');
  });

  it('includes the Athens timezone and crosses midnight correctly', () => {
    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(ics).toContain('DTSTART;TZID=Europe/Athens:20260210T220000');
    expect(ics).toContain('DTEND;TZID=Europe/Athens:20260211T010000');
  });

  it('writes reminders', () => {
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('TRIGGER:-P1D');
  });

  it('gives different exams different UIDs and the same exam the same UID', () => {
    expect(examUid(exam())).toBe(examUid(exam({ id: 'other-id' })));
    expect(examUid(exam())).not.toBe(examUid(exam({ date: '2026-02-11' })));
  });

  it('never splits a multi-byte character when folding', () => {
    const folded = foldLine('SUMMARY:' + 'Ψ'.repeat(100));
    expect(folded.replace(/\r\n /g, '')).toBe('SUMMARY:' + 'Ψ'.repeat(100));
  });

  it('builds a Google Calendar link in Athens time', () => {
    const url = new URL(getGoogleCalendarLink(exam()));
    expect(url.searchParams.get('dates')).toBe('20260210T220000/20260211T010000');
    expect(url.searchParams.get('ctz')).toBe('Europe/Athens');
  });
});
