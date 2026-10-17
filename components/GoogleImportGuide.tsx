import React from 'react';
import { Language } from '../types';
import { translations, fill } from '../utils/i18n';

interface Props {
  count: number;
  language: Language;
  onDownload: () => void;
  onClose: () => void;
}

const IMPORT_URL = 'https://calendar.google.com/calendar/r/settings/export';
const NEW_CALENDAR_URL = 'https://calendar.google.com/calendar/r/settings/createcalendar';

/** Step-by-step guide for importing the .ics file into Google Calendar (the only way to add many events at once). */
export const GoogleImportGuide: React.FC<Props> = ({ count, language, onDownload, onClose }) => {
  const t = translations[language];
  const step = (n: number, text: string, action?: React.ReactNode) => (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">{n}</span>
      <div className="flex-1">
        <p className="text-sm text-slate-700 dark:text-slate-200">{text}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </li>
  );
  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg';

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs print:hidden" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.gcalTitle}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t.gcalIntro}</p>
        <ol className="space-y-4 mb-5">
          {step(1, fill(t.gcalStep1, { n: count }),
            <button onClick={onDownload} className={`${btn} bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900`}>{t.downloadICS}</button>)}
          {step(2, t.gcalStep2,
            <a href={NEW_CALENDAR_URL} target="_blank" rel="noreferrer" className={`${btn} bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200`}>{t.gcalCreateCalendar} ↗</a>)}
          {step(3, t.gcalStep3,
            <a href={IMPORT_URL} target="_blank" rel="noreferrer" className={`${btn} bg-indigo-600 text-white`}>{t.gcalOpenImport} ↗</a>)}
        </ol>
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">{t.gcalReminderNote}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{t.gcalOtherApps}</p>
        <button onClick={onClose} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">
          {t.close}
        </button>
      </div>
    </div>
  );
};
