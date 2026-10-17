import { Language } from '../types';

export const translations = {
  el: {
    appTitle: "Πρόγραμμα CEID",
    uploadTitle: "Μεταφόρτωση Προγράμματος",
    uploadDesc: "Επιλέξτε το PDF με το πρόγραμμα εξεταστικής του τμήματος.\nΗ ανάγνωση γίνεται μόνο στη συσκευή σας· το αρχείο δεν ανεβαίνει πουθενά.",
    selectFile: "Επιλογή Αρχείου PDF",
    analyzingTitle: "Ανάλυση Προγράμματος...",
    analyzingDesc: "Αναγνώριση μαθημάτων, ημερομηνιών και αιθουσών. Παρακαλώ περιμένετε.",
    searchPlaceholder: "Αναζήτηση μαθήματος, αίθουσας, εξαμήνου...",
    selectAll: "Επιλογή Όλων",
    deselectAll: "Αποεπιλογή Όλων",
    examsShown: "μαθήματα",
    selected: "επιλεγμένα",
    filterSelected: "ΕΠΙΛΕΓΜΕΝΑ",
    downloadICS: "Λήψη ICS",
    addToGCal: "Προσθήκη στο GCal",
    syncWarning: "Πρόκειται να ανοίξουν {count} νέες καρτέλες στον περιηγητή σας. Θέλετε να συνεχίσετε;",
    uploadNew: "Νέο Αρχείο",
    error: "Αποτυχία επεξεργασίας αρχείου. Βεβαιωθείτε ότι είναι έγκυρο PDF και δοκιμάστε ξανά.",
    noExamsTitle: "Δεν βρέθηκαν μαθήματα",
    noExamsDesc: "Δοκιμάστε να αλλάξετε τους όρους αναζήτησης ή τα φίλτρα.",
    room: "Αίθουσα",
    semester: "Εξάμηνο",
    duration: "Διάρκεια",
    minutes: "λ",
    lowCountTitle: "Εντοπίστηκαν λίγα μαθήματα",
    lowCountDesc: "Βρέθηκαν μόνο {count} μαθήματα στο αρχείο.\n\nΕίναι το σωστό αρχείο ή μερικό πρόγραμμα;",
    noExamsInFile: "Δεν βρέθηκαν εξετάσεις. Βεβαιωθείτε ότι είναι το PDF του προγράμματος εξεταστικής του CEID.",
    unknownCourse: "Άγνωστο μάθημα",
    unnamedTitle: "Κελιά χωρίς όνομα μαθήματος",
    unnamedDesc: "Το PDF έχει {count} κελιά με ώρα και αίθουσα αλλά χωρίς όνομα μαθήματος.\nΘέλετε να εμφανιστούν ως «Άγνωστο μάθημα»;",
    unnamedSkip: "Παράλειψη",
    unnamedInclude: "Εμφάνιση",
    tryAgain: "Όχι, ξαναπροσπαθήστε",
    continue: "Ναι, συνέχεια",
    uploadNewShort: "Νέο",
    
    // Labels
    curriculum: "Πρόγραμμα",
    format: "Τύπος",
    formatNone: "Δεν ορίζεται",

    // Reminders
    reminder: "Υπενθύμιση",
    reminders: "Υπενθυμίσεις",
    addReminder: "Προσθήκη...",
    setAllReminders: "Ορισμός όλων:",
    reminderNone: "Καμία",
    reminder15m: "15λ πριν",
    reminder30m: "30λ πριν",
    reminder1h: "1 ώρα πριν",
    reminder2h: "2 ώρες πριν",
    reminder1d: "1 μέρα πριν",
    reminder2d: "2 μέρες πριν",


    // Sorting
    sortBy: "Ταξινόμηση:",
    sortDate: "Ημερομηνία",
    sortName: "Όνομα",
    sortSemester: "Εξάμηνο",

    // Theme
    toggleTheme: "Αλλαγή θέματος",

    // Date formatting locale
    locale: 'el-GR'
  },
  en: {
    appTitle: "CEID Scheduler",
    uploadTitle: "Upload Exam Schedule",
    uploadDesc: "Select the department's exam schedule PDF.\nIt is read only on your device; the file is never uploaded.",
    selectFile: "Select PDF File",
    analyzingTitle: "Analyzing Schedule...",
    analyzingDesc: "Identifying exams, dates, and rooms. Please wait.",
    searchPlaceholder: "Search exams, rooms, semesters...",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    examsShown: "exams shown",
    selected: "selected",
    filterSelected: "SELECTED ONLY",
    downloadICS: "Download ICS",
    addToGCal: "Add to GCal",
    syncWarning: "This will open {count} new browser tabs. Do you want to continue?",
    uploadNew: "Upload New File",
    error: "Failed to process the file. Please ensure it's a valid PDF and try again.",
    noExamsTitle: "No exams found matching your filters",
    noExamsDesc: "Try adjusting your search terms or filters.",
    room: "Room",
    semester: "Semester",
    duration: "Duration",
    minutes: "m",
    lowCountTitle: "Low Exam Count Detected",
    lowCountDesc: "We only found {count} exams in the file.\n\nIs this the correct file, or a partial schedule?",
    noExamsInFile: "No exams were found. Make sure this is the CEID exam schedule PDF.",
    unknownCourse: "Unknown course",
    unnamedTitle: "Cells without a course name",
    unnamedDesc: "The PDF has {count} cells with a time and room but no course name.\nShow them as \"Unknown course\"?",
    unnamedSkip: "Skip",
    unnamedInclude: "Show",
    tryAgain: "No, Try Again",
    continue: "Yes, Continue",
    uploadNewShort: "New Upload",

    // Labels
    curriculum: "Curriculum",
    format: "Format",
    formatNone: "Not specified",

    // Reminders
    reminder: "Reminder",
    reminders: "Reminders",
    addReminder: "Add...",
    setAllReminders: "Set all to:",
    reminderNone: "None",
    reminder15m: "15m before",
    reminder30m: "30m before",
    reminder1h: "1h before",
    reminder2h: "2h before",
    reminder1d: "1d before",
    reminder2d: "2d before",


    // Sorting
    sortBy: "Sort by:",
    sortDate: "Date",
    sortName: "Name",
    sortSemester: "Semester",
    
    // Theme
    toggleTheme: "Toggle theme",

    // Date formatting locale
    locale: 'en-US'
  }
};

export const toGreekUpperCase = (text: any): string => {
  if (text === null || text === undefined) return '';
  // Ensure we are working with a string
  const str = String(text);
  const map: Record<string, string> = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω'
  };
  return str.replace(/[άέήίόύώΆΈΉΊΌΎΏ]/g, match => map[match] || match).toUpperCase();
};

export const formatDate = (dateString: string, locale: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(locale, { 
      day: 'numeric', 
      month: 'short',
      weekday: 'short'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};