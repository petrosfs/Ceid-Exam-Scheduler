// iCalendar (.ics) export, written to be accepted by Google Calendar, Apple Calendar and Outlook:
// CRLF line endings, escaped text, folded long lines, a VTIMEZONE for Europe/Athens and stable unique UIDs.
import { Exam, ExamWithSelection } from '../types';

const TZID = 'Europe/Athens';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date-time "YYYYMMDDTHHMMSS" for date + time + offset in minutes, without timezone conversion. */
function localStamp(date: string, time: string, addMinutes = 0): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh || 0, (mm || 0) + addMinutes));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

/** Escapes TEXT values (RFC 5545 §3.3.11). */
export const escapeText = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Folds a content line to at most 75 octets per line (RFC 5545 §3.1), never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** Small deterministic hash (FNV-1a) used to build UIDs that stay the same when the same exam is exported again. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const examUid = (e: Exam): string =>
  `${hash(`${e.code || e.name}|${e.date}|${e.time}|${e.room}`)}-${hash(`${e.name}|${e.date}`)}@ceid-exam-scheduler`;

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'TZNAME:EEST',
  'DTSTART:19700329T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'TZNAME:EET',
  'DTSTART:19701025T040000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

function alarm(minutes: number): string[] {
  const trigger = minutes % 1440 === 0 ? `-P${minutes / 1440}D`
    : minutes % 60 === 0 ? `-PT${minutes / 60}H` : `-PT${minutes}M`;
  return ['BEGIN:VALARM', `TRIGGER:${trigger}`, 'ACTION:DISPLAY', 'DESCRIPTION:Εξέταση', 'END:VALARM'];
}

export function generateICS(exams: ExamWithSelection[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CEID Exam Scheduler//EL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Εξεταστική CEID',
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
  ];

  for (const exam of exams) {
    const details = [
      exam.code ? `Κωδικός: ${exam.code}` : '',
      `Εξάμηνο: ${exam.semester}`,
      `Αίθουσα: ${exam.room}`,
      `Πρόγραμμα: ${exam.category}`,
      exam.format ? `Τύπος: ${exam.format}` : '',
    ].filter(Boolean).join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${examUid(exam)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${TZID}:${localStamp(exam.date, exam.time)}`,
      `DTEND;TZID=${TZID}:${localStamp(exam.date, exam.time, exam.duration)}`,
      `SUMMARY:${escapeText(exam.name)}`,
      `DESCRIPTION:${escapeText(details)}`,
      `LOCATION:${escapeText(exam.room)}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      ...[...new Set(exam.reminders || [])].filter(m => m > 0).flatMap(alarm),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export const downloadICS = (exams: ExamWithSelection[], filename = 'ceid-exams.ics') => {
  const blob = new Blob([generateICS(exams)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Link that opens Google Calendar's "new event" page pre-filled with one exam (in Greek time). */
export const getGoogleCalendarLink = (exam: Exam): string => {
  const details = [
    exam.code ? `Κωδικός: ${exam.code}` : '',
    `Εξάμηνο: ${exam.semester}`,
    `Πρόγραμμα: ${exam.category}`,
    exam.format ? `Τύπος: ${exam.format}` : '',
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: exam.name,
    dates: `${localStamp(exam.date, exam.time)}/${localStamp(exam.date, exam.time, exam.duration)}`,
    ctz: TZID,
    details,
    location: exam.room,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
