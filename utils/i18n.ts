import { Language } from '../types';

const el = {
  appTitle: 'Πρόγραμμα CEID',
  university: 'Πανεπιστήμιο Πατρών',
  version: 'Έκδοση',
  uploadTitle: 'Μεταφόρτωση Προγράμματος',
  uploadDesc: 'Επιλέξτε το PDF με το πρόγραμμα εξεταστικής του τμήματος.\nΗ ανάγνωση γίνεται μόνο στη συσκευή σας· το αρχείο δεν ανεβαίνει πουθενά.',
  selectFile: 'Επιλογή Αρχείου PDF',
  analyzingTitle: 'Ανάλυση Προγράμματος...',
  analyzingDesc: 'Αναγνώριση μαθημάτων, ημερομηνιών και αιθουσών. Παρακαλώ περιμένετε.',
  searchPlaceholder: 'Αναζήτηση μαθήματος, κωδικού, αίθουσας...',
  selectAll: 'Επιλογή Όλων',
  deselectAll: 'Αποεπιλογή Όλων',
  examsShown: 'μαθήματα',
  selected: 'επιλεγμένα',
  filterSelected: 'ΕΠΙΛΕΓΜΕΝΑ',
  downloadICS: 'Λήψη .ics',
  addToGCal: 'Google Calendar',
  addOneToGCal: 'Προσθήκη αυτής της εξέτασης στο Google Calendar',
  error: 'Αποτυχία επεξεργασίας αρχείου. Βεβαιωθείτε ότι είναι έγκυρο PDF και δοκιμάστε ξανά.',
  noExamsTitle: 'Δεν βρέθηκαν μαθήματα',
  noExamsDesc: 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης ή τα φίλτρα.',
  room: 'Αίθουσα',
  semester: 'Εξάμηνο',
  allSemesters: 'Όλα τα εξάμηνα',
  duration: 'Διάρκεια',
  minutes: 'λ',
  lowCountTitle: 'Εντοπίστηκαν λίγα μαθήματα',
  lowCountDesc: 'Βρέθηκαν μόνο {count} μαθήματα στο αρχείο.\n\nΕίναι το σωστό αρχείο ή μερικό πρόγραμμα;',
  noExamsInFile: 'Δεν βρέθηκαν εξετάσεις. Βεβαιωθείτε ότι είναι το PDF του προγράμματος εξεταστικής του CEID.',
  unknownCourse: 'Άγνωστο μάθημα',
  noCategory: 'Χωρίς κατηγορία',
  unnamedTitle: 'Κελιά χωρίς όνομα μαθήματος',
  unnamedDesc: 'Το PDF έχει {count} κελιά με ώρα και αίθουσα αλλά χωρίς όνομα μαθήματος.\nΘέλετε να εμφανιστούν ως «Άγνωστο μάθημα»;',
  unnamedSkip: 'Παράλειψη',
  unnamedInclude: 'Εμφάνιση',
  tryAgain: 'Όχι, ξαναπροσπαθήστε',
  continue: 'Ναι, συνέχεια',
  uploadNewShort: 'Νέο',

  reminders: 'Υπενθυμίσεις',
  addReminder: 'Προσθήκη...',
  setAllReminders: 'Ορισμός όλων:',
  reminderNone: 'Καμία',
  reminder15m: '15λ πριν',
  reminder30m: '30λ πριν',
  reminder1h: '1 ώρα πριν',
  reminder2h: '2 ώρες πριν',
  reminder1d: '1 μέρα πριν',
  reminder2d: '2 μέρες πριν',

  sortBy: 'Ταξινόμηση:',
  sortDate: 'Ημερομηνία',
  sortName: 'Όνομα',
  sortSemester: 'Εξάμηνο',
  toggleTheme: 'Αλλαγή θέματος',

  // Views
  viewList: 'Λίστα',
  viewCalendar: 'Ημερολόγιο',
  print: 'Εκτύπωση / PDF',
  calendarEmpty: 'Επιλέξτε εξετάσεις για να εμφανιστούν στο ημερολόγιο.',
  weekdaysShort: ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'],
  studyDays: '{n} μέρες διάβασμα πριν',
  studyDay: '1 μέρα διάβασμα πριν',
  studyNone: 'Χωρίς κενή μέρα πριν',
  printTitle: 'Το πρόγραμμα εξεταστικής μου',
  printDate: 'Ημερομηνία',
  printTime: 'Ώρα',
  printCourse: 'Μάθημα',
  printCode: 'Κωδικός',
  printGenerated: 'Δημιουργήθηκε με το CEID Exam Scheduler',

  // Conflicts
  conflict: 'Σύγκρουση',
  conflictWith: 'Συγκρούεται με: {names}',
  conflictsBanner: '{n} επιλεγμένες εξετάσεις συμπίπτουν χρονικά με άλλες. Δείτε τις κόκκινες σημάνσεις.',

  // My courses
  myCoursesApplied: 'Επιλέχθηκαν αυτόματα {n} μαθήματα που είχατε επιλέξει σε προηγούμενο πρόγραμμα.',
  myCoursesSelectAll: 'Επιλογή όλων',
  myCoursesForget: 'Ξέχασε τις επιλογές μου',

  // Changes between PDF versions
  changesTitle: 'Αλλαγές σε σχέση με το προηγούμενο PDF',
  changesNone: 'Καμία αλλαγή σε σχέση με το προηγούμενο PDF αυτής της εξεταστικής.',
  changeMoved: 'Μετακινήθηκε',
  changeRoom: 'Άλλαξε αίθουσα',
  changeDuration: 'Άλλαξε διάρκεια',
  changeAdded: 'Νέα εξέταση',
  changeRemoved: 'Αφαιρέθηκε',
  changed: 'Άλλαξε',
  hide: 'Απόκρυψη',

  // Google Calendar import guide
  gcalTitle: 'Εισαγωγή όλων στο Google Calendar',
  gcalIntro: 'Το Google Calendar δέχεται όλες τις εξετάσεις μαζί από αρχείο .ics. Η εισαγωγή γίνεται μόνο από υπολογιστή (calendar.google.com), όχι από την εφαρμογή του κινητού.',
  gcalStep1: 'Κατεβάστε το αρχείο με τις {n} επιλεγμένες εξετάσεις.',
  gcalStep2: 'Προαιρετικά, φτιάξτε ξεχωριστό ημερολόγιο «Εξεταστική», ώστε να μπορείτε να τις σβήσετε όλες μαζί αργότερα.',
  gcalStep3: 'Ανοίξτε τη σελίδα «Εισαγωγή και εξαγωγή», επιλέξτε το αρχείο, διαλέξτε ημερολόγιο και πατήστε «Εισαγωγή».',
  gcalCreateCalendar: 'Νέο ημερολόγιο',
  gcalOpenImport: 'Άνοιγμα εισαγωγής',
  gcalReminderNote: 'Σημείωση: το Google Calendar αγνοεί τις υπενθυμίσεις του αρχείου και βάζει τις προεπιλεγμένες ειδοποιήσεις του ημερολογίου. Οι υπενθυμίσεις λειτουργούν σε Apple Calendar και Outlook.',
  gcalOtherApps: 'Σε iPhone, Mac ή Outlook αρκεί να ανοίξετε το αρχείο .ics.',
  close: 'Κλείσιμο',

  // Error boundary
  crashTitle: 'Κάτι πήγε στραβά',
  crashDesc: 'Η εφαρμογή συνάντησε σφάλμα. Πιθανότατα φταίνε αποθηκευμένα δεδομένα που χάλασαν.',
  crashReset: 'Επαναφορά και διαγραφή δεδομένων',

  // Install / offline
  offlineReady: 'Η εφαρμογή λειτουργεί και χωρίς σύνδεση.',

  locale: 'el-GR',
};

type Strings = typeof el;

const en: Strings = {
  appTitle: 'CEID Scheduler',
  university: 'University of Patras',
  version: 'Version',
  uploadTitle: 'Upload Exam Schedule',
  uploadDesc: "Select the department's exam schedule PDF.\nIt is read only on your device; the file is never uploaded.",
  selectFile: 'Select PDF File',
  analyzingTitle: 'Analyzing Schedule...',
  analyzingDesc: 'Identifying exams, dates, and rooms. Please wait.',
  searchPlaceholder: 'Search course, code, room...',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  examsShown: 'exams shown',
  selected: 'selected',
  filterSelected: 'SELECTED ONLY',
  downloadICS: 'Download .ics',
  addToGCal: 'Google Calendar',
  addOneToGCal: 'Add this exam to Google Calendar',
  error: "Failed to process the file. Please ensure it's a valid PDF and try again.",
  noExamsTitle: 'No exams found matching your filters',
  noExamsDesc: 'Try adjusting your search terms or filters.',
  room: 'Room',
  semester: 'Semester',
  allSemesters: 'All semesters',
  duration: 'Duration',
  minutes: 'm',
  lowCountTitle: 'Low Exam Count Detected',
  lowCountDesc: 'We only found {count} exams in the file.\n\nIs this the correct file, or a partial schedule?',
  noExamsInFile: 'No exams were found. Make sure this is the CEID exam schedule PDF.',
  unknownCourse: 'Unknown course',
  noCategory: 'No category',
  unnamedTitle: 'Cells without a course name',
  unnamedDesc: 'The PDF has {count} cells with a time and room but no course name.\nShow them as "Unknown course"?',
  unnamedSkip: 'Skip',
  unnamedInclude: 'Show',
  tryAgain: 'No, Try Again',
  continue: 'Yes, Continue',
  uploadNewShort: 'New',

  reminders: 'Reminders',
  addReminder: 'Add...',
  setAllReminders: 'Set all to:',
  reminderNone: 'None',
  reminder15m: '15m before',
  reminder30m: '30m before',
  reminder1h: '1h before',
  reminder2h: '2h before',
  reminder1d: '1d before',
  reminder2d: '2d before',

  sortBy: 'Sort by:',
  sortDate: 'Date',
  sortName: 'Name',
  sortSemester: 'Semester',
  toggleTheme: 'Toggle theme',

  viewList: 'List',
  viewCalendar: 'Calendar',
  print: 'Print / PDF',
  calendarEmpty: 'Select exams to see them on the calendar.',
  weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  studyDays: '{n} study days before',
  studyDay: '1 study day before',
  studyNone: 'No free day before',
  printTitle: 'My exam schedule',
  printDate: 'Date',
  printTime: 'Time',
  printCourse: 'Course',
  printCode: 'Code',
  printGenerated: 'Created with CEID Exam Scheduler',

  conflict: 'Conflict',
  conflictWith: 'Overlaps with: {names}',
  conflictsBanner: '{n} selected exams overlap with others. Look for the red marks.',

  myCoursesApplied: 'Automatically selected {n} courses you chose in a previous schedule.',
  myCoursesSelectAll: 'Select all',
  myCoursesForget: 'Forget my choices',

  changesTitle: 'Changes since the previous PDF',
  changesNone: 'No changes since the previous PDF of this exam period.',
  changeMoved: 'Moved',
  changeRoom: 'Room changed',
  changeDuration: 'Duration changed',
  changeAdded: 'New exam',
  changeRemoved: 'Removed',
  changed: 'Changed',
  hide: 'Hide',

  gcalTitle: 'Import everything into Google Calendar',
  gcalIntro: 'Google Calendar accepts all exams at once from an .ics file. Importing only works on a computer (calendar.google.com), not in the mobile app.',
  gcalStep1: 'Download the file with the {n} selected exams.',
  gcalStep2: 'Optionally, create a separate "Exams" calendar so you can delete them all at once later.',
  gcalStep3: 'Open the "Import & export" page, choose the file, pick a calendar and press "Import".',
  gcalCreateCalendar: 'New calendar',
  gcalOpenImport: 'Open import',
  gcalReminderNote: "Note: Google Calendar ignores the file's reminders and uses the calendar's default notifications. Reminders do work in Apple Calendar and Outlook.",
  gcalOtherApps: 'On iPhone, Mac or Outlook, simply open the .ics file.',
  close: 'Close',

  crashTitle: 'Something went wrong',
  crashDesc: 'The application hit an error. This is most likely caused by corrupted saved data.',
  crashReset: 'Reset app & clear data',

  offlineReady: 'The app also works offline.',

  locale: 'en-US',
};

export const translations: Record<Language, Strings> = { el, en };

export const toGreekUpperCase = (text: any): string => {
  if (text === null || text === undefined) return '';
  const str = String(text);
  const map: Record<string, string> = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
  };
  return str.replace(/[άέήίόύώΆΈΉΊΌΎΏ]/g, match => map[match] || match).toUpperCase();
};

export const formatDate = (dateString: string, locale: string): string => {
  try {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', weekday: 'short' }).format(date);
  } catch {
    return dateString;
  }
};

export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
