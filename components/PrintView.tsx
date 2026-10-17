import React from 'react';
import { ExamWithSelection, Language } from '../types';
import { translations, formatDate } from '../utils/i18n';
import { startMinutes } from '../utils/schedule';

const endTime = (e: ExamWithSelection) => {
  const m = startMinutes(e) + e.duration;
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Plain table of the selected exams, shown only when printing (or saving as PDF from the print dialog). */
export const PrintView: React.FC<{ exams: ExamWithSelection[]; language: Language }> = ({ exams, language }) => {
  const t = translations[language];
  const sorted = [...exams].sort((a, b) => startMinutes(a) - startMinutes(b));
  return (
    <div className="hidden print:block text-black bg-white p-4 text-sm">
      <h1 className="text-xl font-bold mb-1">{t.printTitle}</h1>
      <p className="text-xs text-gray-600 mb-4">{t.appTitle} · {t.university}</p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b-2 border-black">
            <th className="py-1 pr-2">{t.printDate}</th>
            <th className="py-1 pr-2">{t.printTime}</th>
            <th className="py-1 pr-2">{t.printCourse}</th>
            <th className="py-1 pr-2">{t.printCode}</th>
            <th className="py-1 pr-2">{t.room}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(e => (
            <tr key={e.id} className="border-b border-gray-300 align-top break-inside-avoid">
              <td className="py-1 pr-2 whitespace-nowrap capitalize">{formatDate(e.date, t.locale)}</td>
              <td className="py-1 pr-2 whitespace-nowrap">{e.time}–{endTime(e)}</td>
              <td className="py-1 pr-2">{e.name}</td>
              <td className="py-1 pr-2 whitespace-nowrap">{e.code ?? ''}</td>
              <td className="py-1 pr-2">{e.room}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-500 mt-4">{t.printGenerated}</p>
    </div>
  );
};
