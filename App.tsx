import React, { useState, useMemo, useEffect } from 'react';
import { fileToBase64 } from './utils/file';
import { downloadICS, getGoogleCalendarLink } from './utils/ics';
import { ExamWithSelection, UploadStatus, CourseCategory, Language, Theme } from './types';
import { ExamList } from './components/ExamList';
import { translations, toGreekUpperCase } from './utils/i18n';

type SortField = 'date' | 'name' | 'semester';
type SortOrder = 'asc' | 'desc';

const STORAGE_KEY = 'ceid_scheduler_last_exams';
const DEFAULT_REMINDERS = [60]; // 1 hour by default

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary Component to catch render crashes
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props!: ErrorBoundaryProps;
  // Fix: Declare state as class property to ensure it's typed correctly on 'this'
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('theme');
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              The application encountered a critical error while rendering. This is likely due to corrupted saved data.
            </p>
            
            {this.state.error && (
              <div className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg text-xs font-mono text-left mb-6 overflow-auto max-h-32 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            
            <button 
              onClick={this.handleReset}
              className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              Reset App & Clear Data
            </button>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}

function AppContent() {
  // State
  const [language, setLanguage] = useState<Language>('el');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamWithSelection[]>([]);
  const [originalExams, setOriginalExams] = useState<ExamWithSelection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<CourseCategory[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMissingFileModal, setShowMissingFileModal] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const [globalReminder, setGlobalReminder] = useState<number>(60); 
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as Theme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const t = translations[language];

  // Helper for progress simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'uploading' || status === 'parsing') {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 99) return prev;
          
          let increment = 0;
          if (status === 'uploading') {
            // Uploading: Reach ~90% in about 3 seconds
            // 3s / 0.4s = 7.5 ticks. 90 / 7.5 = 12% per tick.
            increment = Math.random() * 5 + 10;
          } else {
            // Parsing: Slightly faster deceleration to reach ~99% within 3m 10s
            const remaining = 100 - prev;
            // Slightly reduced factors to speed up progress by ~5-10%
            const factor = 310 + (prev * 4.2); 
            increment = (remaining / factor) * (Math.random() * 0.3 + 0.85);
          }
          return Math.min(prev + increment, 99);
        });
      }, 400);
    } else {
      setAnalysisProgress(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Load persisted data on mount
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);

    try {
      const savedExams = localStorage.getItem(STORAGE_KEY);
      if (savedExams) {
        const parsed = JSON.parse(savedExams);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          // Strict Validation & Migration
          const validated = parsed
            .filter((e: any) => e && typeof e === 'object')
            .map((e: any) => {
               // Safely determine category
               let cat = e.category || e.type;
               // If cat is not one of the enum values, default to UNKNOWN
               if (!Object.values(CourseCategory).includes(cat)) {
                 cat = CourseCategory.UNKNOWN;
               }
               
               // Migrate old single reminder to array
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
                 reminders: reminders
               };
            });
            
          setExams(validated);
          setOriginalExams(validated);
          setStatus('success');
        }
      }
    } catch (e) {
      console.error("Critical error loading saved exams:", e);
      localStorage.removeItem(STORAGE_KEY);
      setExams([]);
      setStatus('idle');
    }
  }, [theme]);

  // Persist data when exams change
  useEffect(() => {
    if (status === 'success' && exams.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
      } catch (e) {
        console.error("Failed to save exams", e);
      }
    } else if (status === 'idle') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [exams, status]);

  // Derived state
  const filteredExams = useMemo(() => {
    const filtered = exams.filter(exam => {
      // Defensive checks against bad data during runtime
      const eName = (exam.name || '').toLowerCase();
      const eRoom = (exam.room || '').toLowerCase();
      const eSem = (exam.semester || '').toLowerCase();
      const eFormat = (exam.format || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = 
        eName.includes(q) ||
        eRoom.includes(q) ||
        eSem.includes(q) ||
        eFormat.includes(q);
      
      const matchesFilter = activeFilters.length === 0 || activeFilters.includes(exam.category);
      const matchesSelected = !showSelectedOnly || exam.selected;
      
      return matchesSearch && matchesFilter && matchesSelected;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        comparison = (a.date || '').localeCompare(b.date || '');
        if (comparison === 0) {
          comparison = (a.time || '').localeCompare(b.time || '');
        }
      } else if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '', language === 'el' ? 'el' : 'en');
      } else if (sortField === 'semester') {
        comparison = (a.semester || '').localeCompare(b.semester || '', undefined, { numeric: true });
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [exams, searchQuery, activeFilters, showSelectedOnly, sortField, sortOrder, language]);

  const selectedCount = exams.filter(e => e.selected).length;

  // Handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setAnalysisProgress(0);
    setErrorMessage(null);
    
    try {
      const base64 = await fileToBase64(file);
      
      // Artificial delay for better "feel" of uploading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus('parsing');
      setAnalysisProgress(0);
      
      const response = await fetch('/api/parse-exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ base64Data: base64 })
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {
          // ignore
        }
        throw new Error(errData?.error?.message || `Error ${response.status}: Failed to parse PDF`);
      }

      const { exams: result } = await response.json();
      
      const examsWithSelection = result.map(e => ({ 
        ...e, 
        selected: true,
        reminders: DEFAULT_REMINDERS,
        category: e.category || CourseCategory.UNKNOWN
      }));
      
      setFoundCount(result.length);
      setOriginalExams(examsWithSelection);

      if (result.length < 50) {
        setStatus('confirming');
        setShowConfirmModal(true);
      } else {
        setExams(examsWithSelection);
        setStatus('success');
      }
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      if (error.message === 'RATE_LIMIT_ERROR') {
        setErrorMessage((translations[language] as any).rateLimitError);
      } else {
        setErrorMessage(error.message || 'Unknown error occurred');
      }
    }
    
    event.target.value = '';
  };

  const handleAppDownload = (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    fetch(url, { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
           const link = document.createElement('a');
           link.href = url;
           link.download = filename;
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
        } else {
           setShowMissingFileModal(true);
        }
      })
      .catch(() => {
         setShowMissingFileModal(true);
      });
  };

  const handleConfirmCount = (confirmed: boolean) => {
    setShowConfirmModal(false);
    if (confirmed) {
      setExams(originalExams);
      setStatus('success');
    } else {
      setStatus('idle');
      setOriginalExams([]);
    }
  };

  const clearData = () => {
    setStatus('idle');
    setExams([]);
    setOriginalExams([]);
    setErrorMessage(null);
    setSearchQuery('');
    setFoundCount(0);
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleSelect = (id: string) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  const updateExamDuration = (id: string, duration: number) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, duration } : e));
  };

  const updateExamReminders = (id: string, reminders: number[]) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, reminders } : e));
  };

  const handleGlobalReminderChange = (minutes: number) => {
    setGlobalReminder(minutes);
    if (minutes === 0) {
        setExams(prev => prev.map(e => ({ ...e, reminders: [] })));
    } else {
        // Replace all reminders with just this one
        setExams(prev => prev.map(e => ({ ...e, reminders: [minutes] })));
    }
  };

  const toggleSelectAll = () => {
    const allSelected = filteredExams.every(e => e.selected);
    const idsToUpdate = new Set(filteredExams.map(e => e.id));
    
    setExams(prev => prev.map(e => 
      idsToUpdate.has(e.id) ? { ...e, selected: !allSelected } : e
    ));
  };

  const toggleFilter = (category: CourseCategory) => {
    setActiveFilters(prev => 
      prev.includes(category) ? prev.filter(t => t !== category) : [...prev, category]
    );
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleExport = () => {
    const selectedExams = exams.filter(e => e.selected);
    downloadICS(selectedExams);
  };

  const handleGCalSync = () => {
    const selectedExams = exams.filter(e => e.selected);
    if (selectedExams.length === 0) return;

    const count = selectedExams.length;
    if (count > 1) {
      const confirmText = t.syncWarning.replace('{count}', count.toString());
      if (!window.confirm(confirmText)) return;
    }

    selectedExams.forEach((exam) => {
       const link = getGoogleCalendarLink(exam);
       window.open(link, '_blank');
    });
  };

  // UI Render Methods
  const renderUpload = () => (
    <div className="max-w-xl mx-auto mt-20 text-center px-4">
      <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">{t.uploadTitle}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 whitespace-pre-line transition-colors">
          {t.uploadDesc}
        </p>
        
        <label className="relative inline-flex items-center justify-center px-8 py-4 font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer overflow-hidden group dark:bg-indigo-500 dark:hover:bg-indigo-600">
          <span className="relative z-10 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t.selectFile}
          </span>
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          />
        </label>
        
        {status === 'error' && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-100 dark:border-red-900/30">
            <p className="font-semibold mb-1">{t.error}</p>
            {errorMessage && <p className="opacity-80 text-xs font-mono break-words">{errorMessage}</p>}
          </div>
        )}

        {/* Apps Download Section */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.appsDescription}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {/* Android Button - Uses custom handler */}
            <button 
              onClick={(e) => handleAppDownload(e, '/ceid-scheduler.apk', 'ceid-scheduler.apk')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.603 12.015l2.096-3.63a.625.625 0 10-1.083-.625l-2.122 3.675A9.873 9.873 0 0012 10.25c-1.284 0-2.5.253-3.626.71L6.376 7.425a.625.625 0 00-1.05.688l2.052 3.553A10.603 10.603 0 003 18.25c0 .167.01.332.03.496h17.94c.02-.164.03-.33.03-.496a10.6 10.6 0 00-4.397-6.235zM8.5 16.5a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              {t.downloadApk}
            </button>
            
            {/* Desktop Button - Uses custom handler */}
            <button 
              onClick={(e) => handleAppDownload(e, '/ceid-scheduler-setup.exe', 'ceid-scheduler-setup.exe')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.606L24 0v11.023H10.949V1.843zm-10.949 9.967H9.75V21.9L0 20.551v-8.741zm10.949 0H24V24l-13.051-1.843v-10.314z"/>
              </svg>
              {t.downloadDesktop}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoading = () => {
    const isUploading = status === 'uploading';
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-100 dark:border-slate-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
          <div className="text-indigo-600 dark:text-indigo-400 font-bold text-lg animate-pulse">
            {Math.round(analysisProgress)}%
          </div>
        </div>
        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">
          {isUploading ? (t as any).uploadingTitle : t.analyzingTitle}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          {isUploading ? (t as any).uploadingDesc : t.analyzingDesc}
        </p>
        {!isUploading && (
          <p className="text-indigo-600/70 dark:text-indigo-400/70 text-xs mt-4 font-medium italic">
            {(t as any).averageTime}
          </p>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="pb-24">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm py-4 mb-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                  ${showSelectedOnly
                    ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}
                `}
              >
                <div className={`w-2 h-2 rounded-full ${showSelectedOnly ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                {t.filterSelected}
              </button>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

              {Object.values(CourseCategory).filter(t => t !== CourseCategory.UNKNOWN).map((category) => (
                <button
                  key={category}
                  onClick={() => toggleFilter(category)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${activeFilters.includes(category)
                      ? 'bg-indigo-600 text-white shadow-md dark:bg-indigo-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}
                  `}
                >
                  {toGreekUpperCase(category)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 gap-4 transition-colors">
             <div className="flex items-center gap-2">
                <button 
                  onClick={toggleSelectAll}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                  {filteredExams.every(e => e.selected) && filteredExams.length > 0 ? t.deselectAll : t.selectAll}
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>{filteredExams.length} {t.examsShown}</span>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">{t.sortBy}</label>
                    <div className="flex items-center">
                      <select 
                          value={sortField}
                          onChange={(e) => setSortField(e.target.value as SortField)}
                          className="bg-transparent text-slate-700 dark:text-slate-200 font-medium text-sm focus:outline-none cursor-pointer pr-1"
                      >
                          <option value="date" className="dark:bg-slate-800">{t.sortDate}</option>
                          <option value="name" className="dark:bg-slate-800">{t.sortName}</option>
                          <option value="semester" className="dark:bg-slate-800">{t.sortSemester}</option>
                      </select>
                      <button 
                        onClick={toggleSortOrder}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                         {sortOrder === 'asc' ? (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                           </svg>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                           </svg>
                         )}
                      </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">{t.setAllReminders}</label>
                    <select 
                        value={globalReminder} 
                        onChange={(e) => handleGlobalReminderChange(Number(e.target.value))}
                        className="bg-transparent text-slate-700 dark:text-slate-200 font-medium text-sm focus:outline-none cursor-pointer"
                    >
                        <option value={0} className="dark:bg-slate-800">{t.reminderNone}</option>
                        <option value={15} className="dark:bg-slate-800">{t.reminder15m}</option>
                        <option value={30} className="dark:bg-slate-800">{t.reminder30m}</option>
                        <option value={60} className="dark:bg-slate-800">{t.reminder1h}</option>
                        <option value={120} className="dark:bg-slate-800">{t.reminder2h}</option>
                        <option value={1440} className="dark:bg-slate-800">{t.reminder1d}</option>
                        <option value={2880} className="dark:bg-slate-800">{t.reminder2d}</option>
                    </select>
                </div>

                <div className="font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md hidden md:block transition-colors">
                    {selectedCount} {t.selected}
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ExamList 
          exams={filteredExams} 
          onToggleSelect={toggleSelect} 
          onUpdateDuration={updateExamDuration} 
          onUpdateReminders={updateExamReminders}
          language={language}
        />
      </div>

      {selectedCount > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 w-full px-4 md:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-3xl shadow-2xl border border-white/20">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-2xl hover:bg-slate-800 dark:hover:bg-white hover:scale-[1.02] transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold whitespace-nowrap">{t.downloadICS}</span>
            </button>
            
            <button
              onClick={handleGCalSync}
              className="flex items-center justify-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:scale-[1.02] transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold whitespace-nowrap">{t.addToGCal}</span>
              <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full ml-1">{selectedCount}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/50">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <button 
              onClick={clearData}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
              aria-label="Home"
            >
              <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-colors group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                  {t.appTitle}
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest font-semibold">University of Patras</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
               <button
                 onClick={toggleTheme}
                 className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                 title={t.toggleTheme}
               >
                 {theme === 'light' ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                   </svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                   </svg>
                 )}
               </button>
               <button 
                 onClick={() => setLanguage(l => l === 'el' ? 'en' : 'el')}
                 className="px-3 py-1 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
               >
                 {language === 'el' ? 'EN' : 'EL'}
               </button>
               {(status === 'success' || status === 'confirming') && (
                 <button 
                   onClick={clearData}
                   className="hidden md:block px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium"
                 >
                   {t.uploadNewShort}
                 </button>
               )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        {status === 'idle' && renderUpload()}
        {(status === 'parsing' || status === 'uploading') && renderLoading()}
        {status === 'confirming' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
               <div className="text-center">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.lowCountTitle}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 whitespace-pre-line">
                    {t.lowCountDesc.replace('{count}', foundCount.toString())}
                  </p>
                  <div className="flex gap-3">
                     <button 
                       onClick={() => handleConfirmCount(false)}
                       className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                     >
                       {t.tryAgain}
                     </button>
                     <button 
                       onClick={() => handleConfirmCount(true)}
                       className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                     >
                       {t.continue}
                     </button>
                  </div>
               </div>
             </div>
          </div>
        )}
        
        {/* Missing File Modal */}
        {showMissingFileModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
               <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.fileNotFound}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 whitespace-pre-line text-left bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    {t.fileNotFoundDesc}
                  </p>
                  <button 
                     onClick={() => setShowMissingFileModal(false)}
                     className="w-full px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"
                  >
                     {t.close}
                  </button>
               </div>
             </div>
          </div>
        )}

        {status === 'success' && renderDashboard()}
        
        {/* Error State if not parsing/confirming but has error */}
        {status === 'error' && status !== 'parsing' && renderUpload()}
      </main>
    </div>
  );
}

// Export Wrapped App
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}