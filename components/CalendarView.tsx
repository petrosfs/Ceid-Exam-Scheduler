import React from 'react';
import { ExamWithSelection, Language } from '../types';
import { translations, formatDate, fill } from '../utils/i18n';
import { startMinutes } from '../utils/schedule';

interface Props {
  exams: ExamWithSelection[];          // selected exams only
  conflicts: Map<string, string[]>;
  gaps: Map<string, number>;
  language: Language;
}

const iso = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };

/** Month-like grid (Mon–Sun) of the selected exams on wide screens, a day-by-day agenda on phones. */
export const CalendarView: React.FC<Props> = ({ exams, conflicts, gaps, language }) => {
  const t = translations[language];
  const sorted = [...exams].sort((a, b) => startMinutes(a) - startMinutes(b));

  if (sorted.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {t.calendarEmpty}
      </div>
    );
  }

  const byDay = new Map<string, ExamWithSelection[]>();
  for (const e of sorted) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  // Weeks from the Monday before the first exam to the Sunday after the last.
  const first = parse(sorted[0].date);
  const last = parse(sorted[sorted.length - 1].date);
  const start = new Date(first); start.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const end = new Date(last); end.setUTCDate(last.getUTCDate() + (6 - ((last.getUTCDay() + 6) % 7)));
  const days: string[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(iso(d));

  const gapLabel = (id: string) => {
    const g = gaps.get(id);
    if (g === undefined) return null;
    return g === 0 ? t.studyNone : g === 1 ? t.studyDay : fill(t.studyDays, { n: g });
  };

  const chip = (e: ExamWithSelection) => {
    const conflict = conflicts.has(e.id);
    return (
      <div
        key={e.id}
        className={`rounded-md px-1.5 py-1 text-[11px] leading-tight border ${conflict
          ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
          : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100'}`}
        title={`${e.name} · ${e.time} · ${e.room}`}
      >
        <div className="font-semibold">{e.time}</div>
        <div className="line-clamp-3">{e.name}</div>
        <div className="opacity-70">{e.room}</div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop / tablet: week grid */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          {t.weekdaysShort.map(d => (
            <div key={d} className="px-2 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(day => {
            const list = byDay.get(day) ?? [];
            const d = parse(day);
            const inRange = d >= first && d <= last;
            return (
              <div
                key={day}
                className={`min-h-24 p-1.5 border-b border-r border-slate-100 dark:border-slate-700/60 space-y-1 ${inRange ? '' : 'bg-slate-50/60 dark:bg-slate-900/30'}`}
              >
                <div className={`text-[11px] font-medium ${list.length ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {d.getUTCDate()}/{d.getUTCMonth() + 1}
                </div>
                {list.map(chip)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phones: agenda */}
      <div className="md:hidden space-y-3">
        {[...byDay.entries()].map(([day, list]) => (
          <div key={day}>
            {gapLabel(list[0].id) && (
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center my-2">· {gapLabel(list[0].id)} ·</div>
            )}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize mb-2">{formatDate(day, t.locale)}</div>
              <div className="space-y-1.5">{list.map(chip)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
