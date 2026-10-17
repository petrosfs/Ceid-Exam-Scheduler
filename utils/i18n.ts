import { Language } from '../types';

export const translations = {
  el: {
    appTitle: "Πρόγραμμα CEID",
    uploadTitle: "Μεταφόρτωση Προγράμματος",
    uploadDesc: "Επιλέξτε το αρχείο PDF που δόθηκε από τη γραμματεία.\nΘα εξαγάγουμε τα μαθήματα για εσάς.",
    selectFile: "Επιλογή Αρχείου PDF",
    uploadingTitle: "Ανέβασμα Αρχείου...",
    uploadingDesc: "Προετοιμασία του αρχείου για επεξεργασία. Παρακαλώ περιμένετε.",
    analyzingTitle: "Ανάλυση Προγράμματος...",
    analyzingDesc: "Αναγνώριση μαθημάτων, ημερομηνιών και αιθουσών. Παρακαλώ περιμένετε.",
    averageTime: "Μέσος χρόνος ανάλυσης: 3-5 λεπτά",
    rateLimitError: "Το σύστημα ανάλυσης είναι προσωρινά υπερφορτωμένο (Quota Exceeded). Παρακαλώ περιμένετε 2-3 λεπτά και δοκιμάστε ξανά.",
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
    lowCountDesc: "Βρέθηκαν μόνο {count} μαθήματα στο αρχείο. Συνήθως το πρόγραμμα περιέχει 50+ μαθήματα.\n\nΑνεβάσατε το σωστό αρχείο ή είναι μερικό πρόγραμμα;",
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

    // Apps
    appsDescription: "Κατεβάστε την εφαρμογή για τη συσκευή σας:",
    downloadApk: "Android (.apk)",
    downloadDesktop: "Windows (.exe)",
    
    // File Not Found Modal
    fileNotFound: "Το αρχείο δεν βρέθηκε",
    fileNotFoundDesc: "Το αρχείο εγκατάστασης δεν εντοπίστηκε στον διακομιστή.\n\nΟδηγίες εγκατάστασης:\nΤοποθετήστε τα αρχεία .apk/.exe στο φάκελο 'public' της εφαρμογής.",
    close: "Κλείσιμο",

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
    uploadDesc: "Select the PDF file provided by the CEID department.\nWe'll extract the exams for you.",
    selectFile: "Select PDF File",
    uploadingTitle: "Uploading File...",
    uploadingDesc: "Preparing the file for processing. Please wait.",
    analyzingTitle: "Analyzing Schedule...",
    analyzingDesc: "Identifying exams, dates, and rooms. Please wait.",
    averageTime: "Average analysis time: 3-5 minutes",
    rateLimitError: "The analysis system is temporarily overloaded (Quota Exceeded). Please wait 2-3 minutes and try again.",
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
    lowCountDesc: "We only found {count} exams in the file. Usually, the schedule contains 50+ exams.\n\nDid you upload the correct file, or is this a partial schedule?",
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

    // Apps
    appsDescription: "Download the app for your device:",
    downloadApk: "Android (.apk)",
    downloadDesktop: "Windows (.exe)",

    // File Not Found Modal
    fileNotFound: "File Not Found",
    fileNotFoundDesc: "The installation file was not found on the server.\n\nSetup instructions:\nPlace the .apk/.exe files in the 'public' folder of the application.",
    close: "Close",

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