import React, { useState, useMemo, useEffect } from 'react';
import { downloadICS } from './utils/ics';
import { Exam, ExamWithSelection, UploadStatus, CourseCategory, Language, Theme } from './types';
import { ExamList } from './components/ExamList';
import { CalendarView } from './components/CalendarView';
import { PrintView } from './components/PrintView';
import { GoogleImportGuide } from './components/GoogleImportGuide';
import { translations, toGreekUpperCase, formatDate, fill } from './utils/i18n';
import { findConflicts, studyGaps, isMyCourse, updateMyCourses, diffSchedules, ExamChange } from './utils/schedule';
import { load, save, remove, KEYS } from './utils/storage';

type SortField = 'date' | 'name' | 'semester';
type SortOrder = 'asc' | 'desc';
type View = 'list' | 'calendar';

const DEFAULT_REMINDERS = [60]; // 1 hour by default
const LOW_COUNT_THRESHOLD = 20;

const initialLanguage = (): Language => (load<string>(KEYS.language) === 'en' ? 'en' : 'el');

interface ErrorBoundaryState { hasError: boolean; error: any }

// Catches render crashes (most likely corrupted saved data) and offers a reset.
class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, ErrorBoundaryState> {
  declare props: { children?: React.ReactNode };
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = () => {
    remove(KEYS.exams);
    remove(KEYS.theme);
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children || null;
    const t = translations[initialLanguage()];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold mb-2">{t.crashTitle}</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t.crashDesc}</p>
          {this.state.error && (
            <div className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg text-xs font-mono text-left mb-6 overflow-auto max-h-32 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button onClick={this.handleReset} className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition">
            {t.crashReset}
          </button>
        </div>
      </div>
    );
  }
}

/** Validates exams restored from localStorage (older versions stored slightly different shapes). */
function restoreExams(raw: unknown): ExamWithSelection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e: any) => e && typeof e === 'object')
    .map((e: any) => {
      let cat = e.category || e.type;
      if (!Object.values(CourseCategory).includes(cat)) cat = CourseCategory.UNKNOWN;
      let reminders = e.reminders;
      if (!Array.isArray(reminders)) {
        reminders = typeof e.reminderMinutes === 'number' && e.reminderMinutes > 0 ? [e.reminderMinutes] : DEFAULT_REMINDERS;
      }
      return {
        id: String(e.id || `restored-${Math.random()}`),
        name: String(e.name || ''),
        code: e.code ? String(e.code) : undefined,
        semester: String(e.semester || ''),
        room: String(e.room || ''),
        date: String(e.date || ''),
        time: String(e.time || ''),
        duration: Number(e.duration) || 120,
        category: cat,
        format: e.format ? String(e.format) : undefined,
        selected: e.selected !== false,
        reminders,
      };
    });
}

const stripSelection = (list: ExamWithSelection[]): Exam[] =>
  list.map(({ selected, reminders, ...e }) => e);

function AppContent() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamWithSelection[]>([]);
  const [pendingExams, setPendingExams] = useState<ExamWithSelection[]>([]);
  const [unnamedExams, setUnnamedExams] = useState<ExamWithSelection[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUnnamedModal, setShowUnnamedModal] = useState(false);
  const [showGcalGuide, setShowGcalGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<CourseCategory[]>([]);
  const [semesterFilter, setSemesterFilter] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [view, setView] = useState<View>('list');
  const [foundCount, setFoundCount] = useState(0);
  const [globalReminder, setGlobalReminder] = useState<number>(60);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [myCourses, setMyCourses] = useState<Set<string>>(() => new Set(load<string[]>(KEYS.myCourses) ?? []));
  const [autoSelected, setAutoSelected] = useState(0);
  const [changes, setChanges] = useState<ExamChange[] | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = load<string>(KEYS.theme);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const t = translations[language];

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    save(KEYS.theme, theme);
  }, [theme]);

  // Language
  useEffect(() => {
    document.documentElement.lang = language;
    save(KEYS.language, language);
  }, [language]);

  // Restore the last schedule once on start
  useEffect(() => {
    const restored = restoreExams(load(KEYS.exams));
    if (restored.length) {
      setExams(restored);
      setStatus('success');
    }
  }, []);

  // Persist the schedule and "my courses" whenever the selection changes
  useEffect(() => {
    if (status === 'success' && exams.length > 0) {
      save(KEYS.exams, exams);
      setMyCourses(prev => {
        const next = updateMyCourses(prev, exams);
        save(KEYS.myCourses, [...next]);
        return next;
      });
    } else if (status === 'idle') {
      remove(KEYS.exams);
    }
  }, [exams, status]);

  // ---------- derived data ----------

  const semesters = useMemo(
    () => [...new Set<string>(exams.map(e => e.semester).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'el', { numeric: true })),
    [exams],
  );
  const hasUnknownCategory = exams.some(e => e.category === CourseCategory.UNKNOWN);
  const categoryChips = Object.values(CourseCategory).filter(c => c !== CourseCategory.UNKNOWN || hasUnknownCategory);

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = exams.filter(exam => {
      const haystack = [exam.name, exam.code, exam.room, exam.semester, exam.format].join(' ').toLowerCase();
      return (!q || haystack.includes(q))
        && (activeFilters.length === 0 || activeFilters.includes(exam.category))
        && (!semesterFilter || exam.semester === semesterFilter)
        && (!showSelectedOnly || exam.selected);
    });
    return filtered.sort((a, b) => {
      let c = 0;
      if (sortField === 'date') c = (a.date + a.time).localeCompare(b.date + b.time);
      else if (sortField === 'name') c = a.name.localeCompare(b.name, language === 'el' ? 'el' : 'en');
      else c = a.semester.localeCompare(b.semester, undefined, { numeric: true });
      return sortOrder === 'asc' ? c : -c;
    });
  }, [exams, searchQuery, activeFilters, semesterFilter, showSelectedOnly, sortField, sortOrder, language]);

  const selectedExams = useMemo(() => exams.filter(e => e.selected), [exams]);
  const selectedCount = selectedExams.length;
  const conflicts = useMemo(() => findConflicts(exams), [exams]);
  const gaps = useMemo(() => studyGaps(exams), [exams]);
  const nameById = useMemo(() => new Map(exams.map(e => [e.id, e.name])), [exams]);

  // Exams in the current list that were changed or added since the previous PDF
  const changedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!changes) return ids;
    for (const c of changes) {
      if (!c.after) continue;
      const match = exams.find(e => e.date === c.after!.date && e.time === c.after!.time && e.name === c.after!.name);
      if (match) ids.add(match.id);
    }
    return ids;
  }, [changes, exams]);

  // ---------- import ----------

  const toSelectable = (list: Exam[]): ExamWithSelection[] =>
    list.map(e => ({ ...e, selected: true, reminders: DEFAULT_REMINDERS, category: e.category || CourseCategory.UNKNOWN }));

  // Applies "my courses", compares with the previous PDF and shows the result.
  const commitImport = (list: ExamWithSelection[]) => {
    const previous = load<{ exams: Exam[] }>(KEYS.lastImport);
    setChanges(previous?.exams?.length ? diffSchedules(previous.exams, stripSelection(list)) : null);
    save(KEYS.lastImport, { savedAt: new Date().toISOString(), exams: stripSelection(list) });

    // Pre-select the courses chosen in earlier schedules; if none match (or all do), keep everything selected.
    const matches = myCourses.size ? list.filter(e => isMyCourse(e, myCourses)).length : 0;
    const useMine = matches > 0 && matches < list.length;
    const finalList = useMine ? list.map(e => ({ ...e, selected: isMyCourse(e, myCourses) })) : list;
    setAutoSelected(useMine ? matches : 0);
    setExams(finalList);
    setSearchQuery('');
    setSemesterFilter('');
    setActiveFilters([]);
    setStatus('success');
  };

  // Last check before showing: warn when suspiciously few exams were found.
  const finishImport = (list: ExamWithSelection[]) => {
    setFoundCount(list.length);
    setPendingExams(list);
    if (list.length < LOW_COUNT_THRESHOLD) {
      setStatus('confirming');
      setShowConfirmModal(true);
    } else {
      commitImport(list);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setStatus('parsing');
    setAnalysisProgress(0);
    setErrorMessage(null);

    try {
      // The PDF is read locally in the browser; nothing is uploaded anywhere.
      // pdf.js is only downloaded at this point (dynamic import).
      const [{ parseSchedulePdf }, data] = await Promise.all([import('./utils/importPdf'), file.arrayBuffer()]);
      const result = await parseSchedulePdf(data, f => setAnalysisProgress(f * 100));

      if (result.exams.length === 0 && result.unnamed.length === 0) throw new Error(t.noExamsInFile);

      const named = toSelectable(result.exams);
      if (result.unnamed.length > 0) {
        setPendingExams(named);
        setUnnamedExams(toSelectable(result.unnamed.map(e => ({ ...e, name: t.unknownCourse }))));
        setStatus('confirming');
        setShowUnnamedModal(true);
      } else {
        finishImport(named);
      }
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error?.message || 'Unknown error occurred');
    }
  };

  const handleUnnamedChoice = (include: boolean) => {
    setShowUnnamedModal(false);
    const list = include ? [...pendingExams, ...unnamedExams] : pendingExams;
    setUnnamedExams([]);
    finishImport(list);
  };

  const handleConfirmCount = (confirmed: boolean) => {
    setShowConfirmModal(false);
    if (confirmed) commitImport(pendingExams);
    else setStatus('idle');
    setPendingExams([]);
  };

  const clearData = () => {
    setStatus('idle');
    setExams([]);
    setPendingExams([]);
    setErrorMessage(null);
    setSearchQuery('');
    setFoundCount(0);
    setChanges(null);
    setAutoSelected(0);
    remove(KEYS.exams);
  };

  // ---------- edits ----------

  const toggleSelect = (id: string) => setExams(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  const updateExamDuration = (id: string, duration: number) => setExams(prev => prev.map(e => e.id === id ? { ...e, duration } : e));
  const updateExamReminders = (id: string, reminders: number[]) => setExams(prev => prev.map(e => e.id === id ? { ...e, reminders } : e));

  const handleGlobalReminderChange = (minutes: number) => {
    setGlobalReminder(minutes);
    setExams(prev => prev.map(e => ({ ...e, reminders: minutes === 0 ? [] : [minutes] })));
  };

  const toggleSelectAll = () => {
    const allSelected = filteredExams.every(e => e.selected);
    const ids = new Set(filteredExams.map(e => e.id));
    setExams(prev => prev.map(e => ids.has(e.id) ? { ...e, selected: !allSelected } : e));
  };

  const selectEverything = () => {
    setExams(prev => prev.map(e => ({ ...e, selected: true })));
    setAutoSelected(0);
  };

  // Forget the remembered courses and go back to the default (everything selected).
  const forgetMyCourses = () => {
    setMyCourses(new Set());
    save(KEYS.myCourses, []);
    selectEverything();
  };

  const toggleFilter = (category: CourseCategory) =>
    setActiveFilters(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);

  const handleExport = () => downloadICS(selectedExams);

  // ---------- render ----------

  const renderUpload = () => (
    <div className="max-w-xl mx-auto mt-20 text-center px-4">
      <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.uploadTitle}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 whitespace-pre-line">{t.uploadDesc}</p>

        <label className="relative inline-flex items-center justify-center px-8 py-4 font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer overflow-hidden dark:bg-indigo-500 dark:hover:bg-indigo-600">
          <span className="relative z-10 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t.selectFile}
          </span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </label>

        {status === 'error' && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-100 dark:border-red-900/30">
            <p className="font-semibold mb-1">{t.error}</p>
            {errorMessage && <p className="opacity-80 text-xs font-mono wrap-break-word">{errorMessage}</p>}
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{t.version} {__APP_VERSION__}</p>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-100 dark:border-slate-700 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
        <div className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{Math.round(analysisProgress)}%</div>
      </div>
      <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{t.analyzingTitle}</h3>
      <p className="text-slate-500 dark:text-slate-400 mt-2">{t.analyzingDesc}</p>
    </div>
  );

  const changeLabel = (c: ExamChange) => ({
    moved: t.changeMoved, room: t.changeRoom, duration: t.changeDuration, added: t.changeAdded, removed: t.changeRemoved,
  })[c.kind];
  const describe = (e?: Exam) => e ? `${formatDate(e.date, t.locale)} ${e.time} · ${e.room}` : '';

  const renderNotices = () => {
    const conflictCount = [...conflicts.keys()].length;
    return (
      <div className="space-y-3 mb-6">
        {conflictCount > 0 && (
          <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200">
            {fill(t.conflictsBanner, { n: conflictCount })}
          </div>
        )}
        {autoSelected > 0 && (
          <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 text-sm text-indigo-900 dark:text-indigo-100 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex-1 min-w-48">{fill(t.myCoursesApplied, { n: autoSelected })}</span>
            <button onClick={selectEverything} className="font-semibold underline">{t.myCoursesSelectAll}</button>
            <button onClick={forgetMyCourses} className="font-semibold underline">{t.myCoursesForget}</button>
            <button onClick={() => setAutoSelected(0)} className="opacity-70" aria-label={t.hide}>✕</button>
          </div>
        )}
        {changes && (
          <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 text-sm text-orange-900 dark:text-orange-100">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold">{changes.length ? t.changesTitle : t.changesNone}</span>
              <button onClick={() => setChanges(null)} className="opacity-70" aria-label={t.hide}>✕</button>
            </div>
            {changes.length > 0 && (
              <ul className="space-y-1 max-h-48 overflow-auto">
                {changes.map((c, i) => (
                  <li key={i}>
                    <span className="font-semibold">{changeLabel(c)}:</span> {(c.after ?? c.before)!.name}
                    {' — '}
                    {c.before && c.after ? <>{describe(c.before)} → {describe(c.after)}</> : describe(c.after ?? c.before)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const chipClass = (active: boolean, color = 'indigo') => `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${active
    ? (color === 'blue' ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500' : 'bg-indigo-600 text-white shadow-md dark:bg-indigo-500')
    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`;

  const renderDashboard = () => (
    <div className="pb-28">
      <div className="md:sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs py-4 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center items-center">
              <button onClick={() => setShowSelectedOnly(!showSelectedOnly)} className={`${chipClass(showSelectedOnly, 'blue')} flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full ${showSelectedOnly ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                {t.filterSelected}
              </button>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
              {categoryChips.map(category => (
                <button key={category} onClick={() => toggleFilter(category)} className={chipClass(activeFilters.includes(category))}>
                  {toGreekUpperCase(category === CourseCategory.UNKNOWN ? t.noCategory : category)}
                </button>
              ))}
              <select
                value={semesterFilter}
                onChange={e => setSemesterFilter(e.target.value)}
                aria-label={t.semester}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                <option value="">{t.allSemesters}</option>
                {semesters.map(s => <option key={s} value={s}>{/^\d+$/.test(s) ? `${s}ο ${t.semester}` : s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={toggleSelectAll} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">
                {filteredExams.every(e => e.selected) && filteredExams.length > 0 ? t.deselectAll : t.selectAll}
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span>{filteredExams.length} {t.examsShown}</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {(['list', 'calendar'] as View[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 text-xs font-semibold ${view === v ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  >
                    {v === 'list' ? t.viewList : t.viewCalendar}
                  </button>
                ))}
              </div>
              <button onClick={() => window.print()} className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300" disabled={selectedCount === 0}>
                {t.print}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">{t.sortBy}</label>
                <select value={sortField} onChange={e => setSortField(e.target.value as SortField)} className="bg-transparent text-slate-700 dark:text-slate-200 font-medium text-sm focus:outline-hidden cursor-pointer">
                  <option value="date" className="dark:bg-slate-800">{t.sortDate}</option>
                  <option value="name" className="dark:bg-slate-800">{t.sortName}</option>
                  <option value="semester" className="dark:bg-slate-800">{t.sortSemester}</option>
                </select>
                <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="p-1 rounded-sm text-slate-500 hover:text-indigo-600" aria-label={t.sortBy}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">{t.setAllReminders}</label>
                <select value={globalReminder} onChange={e => handleGlobalReminderChange(Number(e.target.value))} className="bg-transparent text-slate-700 dark:text-slate-200 font-medium text-sm focus:outline-hidden cursor-pointer">
                  <option value={0} className="dark:bg-slate-800">{t.reminderNone}</option>
                  <option value={15} className="dark:bg-slate-800">{t.reminder15m}</option>
                  <option value={30} className="dark:bg-slate-800">{t.reminder30m}</option>
                  <option value={60} className="dark:bg-slate-800">{t.reminder1h}</option>
                  <option value={120} className="dark:bg-slate-800">{t.reminder2h}</option>
                  <option value={1440} className="dark:bg-slate-800">{t.reminder1d}</option>
                  <option value={2880} className="dark:bg-slate-800">{t.reminder2d}</option>
                </select>
              </div>
              <div className="font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md hidden md:block">
                {selectedCount} {t.selected}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderNotices()}
        {view === 'list' ? (
          <ExamList
            exams={filteredExams}
            onToggleSelect={toggleSelect}
            onUpdateDuration={updateExamDuration}
            onUpdateReminders={updateExamReminders}
            language={language}
            conflicts={conflicts}
            changedIds={changedIds}
            gaps={gaps}
            nameOf={id => nameById.get(id) ?? ''}
          />
        ) : (
          <CalendarView exams={selectedExams} conflicts={conflicts} gaps={gaps} language={language} />
        )}
      </div>

      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full px-4 md:w-auto">
          <div className="flex flex-row gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-3xl shadow-2xl border border-white/20">
            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 sm:px-6 py-3 rounded-2xl hover:scale-[1.02] transition-all">
              <span className="font-semibold whitespace-nowrap">{t.downloadICS}</span>
              <span className="bg-white/20 dark:bg-slate-900/10 text-[10px] px-1.5 py-0.5 rounded-full">{selectedCount}</span>
            </button>
            <button onClick={() => setShowGcalGuide(true)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-4 sm:px-6 py-3 rounded-2xl hover:scale-[1.02] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold whitespace-nowrap">{t.addToGCal}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors font-sans print:hidden">
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <button onClick={clearData} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group" aria-label="Home">
                <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">{t.appTitle}</h1>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{toGreekUpperCase(t.university)}</p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setTheme(p => p === 'light' ? 'dark' : 'light')} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title={t.toggleTheme} aria-label={t.toggleTheme}>
                  {theme === 'light' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  )}
                </button>
                <button onClick={() => setLanguage(l => l === 'el' ? 'en' : 'el')} className="px-3 py-1 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                  {language === 'el' ? 'EN' : 'EL'}
                </button>
                {(status === 'success' || status === 'confirming') && (
                  <button onClick={clearData} className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-medium">
                    {t.uploadNewShort}
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main>
          {(status === 'idle' || status === 'error') && renderUpload()}
          {status === 'parsing' && renderLoading()}

          {status === 'confirming' && showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.lowCountTitle}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 whitespace-pre-line">{fill(t.lowCountDesc, { count: foundCount })}</p>
                <div className="flex gap-3">
                  <button onClick={() => handleConfirmCount(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl">{t.tryAgain}</button>
                  <button onClick={() => handleConfirmCount(true)} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl">{t.continue}</button>
                </div>
              </div>
            </div>
          )}

          {status === 'confirming' && showUnnamedModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.unnamedTitle}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 whitespace-pre-line">{fill(t.unnamedDesc, { count: unnamedExams.length })}</p>
                <ul className="text-xs text-left text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-6 max-h-40 overflow-auto space-y-1">
                  {unnamedExams.map(e => <li key={e.id}>{formatDate(e.date, t.locale)} · {e.time} · {e.room} · {e.semester}</li>)}
                </ul>
                <div className="flex gap-3">
                  <button onClick={() => handleUnnamedChoice(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl">{t.unnamedSkip}</button>
                  <button onClick={() => handleUnnamedChoice(true)} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl">{t.unnamedInclude}</button>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && renderDashboard()}
        </main>
      </div>

      {status === 'success' && <PrintView exams={selectedExams} language={language} />}
      {showGcalGuide && (
        <GoogleImportGuide count={selectedCount} language={language} onDownload={handleExport} onClose={() => setShowGcalGuide(false)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
