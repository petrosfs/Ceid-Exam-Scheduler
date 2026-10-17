import React from 'react';
import { ExamWithSelection, Language } from '../types';
import { getGoogleCalendarLink } from '../utils/ics';
import { translations, toGreekUpperCase, formatDate } from '../utils/i18n';

interface ExamListProps {
  exams: ExamWithSelection[];
  onToggleSelect: (id: string) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onUpdateReminders: (id: string, reminders: number[]) => void;
  language: Language;
}

export const ExamList: React.FC<ExamListProps> = ({ exams, onToggleSelect, onUpdateDuration, onUpdateReminders, language }) => {
  const t = translations[language];

  const reminderOptions = [
    { value: 15, label: t.reminder15m },
    { value: 30, label: t.reminder30m },
    { value: 60, label: t.reminder1h },
    { value: 120, label: t.reminder2h },
    { value: 1440, label: t.reminder1d },
    { value: 2880, label: t.reminder2d },
  ];

  const handleAddReminder = (examId: string, currentReminders: number[], minutes: number) => {
    if (minutes === 0) return;
    if (!currentReminders.includes(minutes)) {
      onUpdateReminders(examId, [...currentReminders, minutes].sort((a, b) => a - b));
    }
  };

  const handleRemoveReminder = (examId: string, currentReminders: number[], minutes: number) => {
    onUpdateReminders(examId, currentReminders.filter(m => m !== minutes));
  };

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noExamsTitle}</p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{t.noExamsDesc}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exams.map((exam) => (
        <div 
          key={exam.id} 
          className={`
            relative p-5 rounded-xl border transition-all duration-200 group flex flex-col h-full
            ${exam.selected 
              ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20 shadow-md shadow-indigo-100 dark:shadow-none' 
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
            }
          `}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={exam.selected}
                onChange={() => onToggleSelect(exam.id)}
                className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 cursor-pointer transition-colors"
              />
              <div className="flex flex-wrap gap-1.5">
                <span className={`
                  text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase
                  ${exam.category === 'Νέο ΠΠΣ' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                    exam.category === 'ΠΠΣ' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' :
                    exam.category === 'Επί Διπλώματι' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' :
                    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}
                `}>
                  {toGreekUpperCase(exam.category)}
                </span>
                {exam.code && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                    {exam.code}
                  </span>
                )}
              </div>
            </div>
            
            <a 
              href={getGoogleCalendarLink(exam)} 
              target="_blank" 
              rel="noreferrer"
              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
              title="Add this exam to Google Calendar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </a>
          </div>

          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight mb-2 min-h-[3.5rem] flex items-center">
            {exam.name}
          </h3>

          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 flex-grow">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-slate-900 dark:text-slate-200 capitalize">{formatDate(exam.date, t.locale)}</span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span className="font-medium text-slate-900 dark:text-slate-200">{exam.time}</span>
            </div>

            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{t.room}: <span className="font-semibold text-slate-700 dark:text-slate-300">{exam.room}</span></span>
            </div>

            {/* Exam Format if present */}
            {exam.format && (
              <div className="flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <span className="text-slate-600 dark:text-slate-400">{exam.format}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 19.477 5.754 20 7.5 20s3.332-.477 4.5-1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 19.477 18.247 20 16.5 20c-1.746 0-3.332-.477-4.5-1.253" />
                </svg>
                <span>{t.semester}: {exam.semester}</span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{t.duration}</span>
                <input 
                  type="number"
                  min="1"
                  max="1440"
                  value={exam.duration}
                  onChange={(e) => onUpdateDuration(exam.id, Number(e.target.value))}
                  className="w-10 bg-transparent text-center font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 text-sm"
                />
                <span className="text-xs text-slate-400 dark:text-slate-500">{t.minutes}</span>
              </div>
            </div>
          </div>

          {/* Multiple Reminders UI */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
             <div className="flex items-start gap-1.5 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mt-0.5 text-slate-400 dark:text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.reminders}</span>
             </div>
             
             <div className="flex flex-wrap gap-2">
                {exam.reminders.map(mins => {
                  const option = reminderOptions.find(o => o.value === mins);
                  return (
                    <span key={mins} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {option ? option.label : `${mins}m`}
                      <button 
                        onClick={() => handleRemoveReminder(exam.id, exam.reminders, mins)}
                        className="hover:text-red-500 focus:outline-none"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
                
                <div className="relative group">
                  <select
                    value={0}
                    onChange={(e) => handleAddReminder(exam.id, exam.reminders, Number(e.target.value))}
                    className="appearance-none bg-transparent pl-2 pr-6 py-0.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer focus:outline-none hover:underline"
                  >
                    <option value={0} disabled>{t.addReminder}</option>
                    {reminderOptions.filter(o => !exam.reminders.includes(o.value)).map(o => (
                       <option key={o.value} value={o.value} className="dark:bg-slate-800 dark:text-slate-200">{o.label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-indigo-600 dark:text-indigo-400">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </div>
                </div>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};