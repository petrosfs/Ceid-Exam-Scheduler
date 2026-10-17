// Small wrapper around localStorage: data stays on this device only; failures (private mode, full storage) are ignored.
export const KEYS = {
  exams: 'ceid_scheduler_last_exams',
  lastImport: 'ceid_scheduler_last_import',
  myCourses: 'ceid_scheduler_my_courses',
  language: 'ceid_scheduler_language',
  theme: 'theme',
} as const;

export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}
