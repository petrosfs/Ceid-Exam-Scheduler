// Reads CEID exam schedule PDFs (exported from aSc Timetables) entirely in the browser.
// No AI and no server: the grid is reconstructed from the text positions and the drawn lines.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Exam, CourseCategory } from '../types';

type PdfDoc = pdfjs.PDFDocumentProxy;
type PdfPage = pdfjs.PDFPageProxy;

interface TextItem { str: string; x: number; y: number; w: number; size: number }
interface HSeg { x0: number; x1: number; y: number }

export interface ParseOutput {
  exams: Exam[];       // exams with a course name
  unnamed: Exam[];     // cells that have a room/time but no course name in the PDF
}

const DAYS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const TONOS = /[άέήίόύώΐΰΆΈΉΊΌΎΏ]/;
// Short Greek words that are never the tail of a word broken across lines.
const STANDALONE = new Set(['και', 'σε', 'με', 'στη', 'στην', 'στο', 'στον', 'στους', 'στις', 'στα',
  'των', 'του', 'της', 'τη', 'την', 'το', 'τον', 'τα', 'οι', 'η', 'ο', 'για', 'από', 'ή']);

// ---------- geometry helpers ----------

type Matrix = [number, number, number, number, number, number];
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Horizontal line segments drawn on the page, in PDF user space (y grows upwards). */
async function horizontalSegments(page: PdfPage): Promise<HSeg[]> {
  const { OPS } = pdfjs;
  const ops = await page.getOperatorList();
  const segs: HSeg[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args: any = ops.argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = mul(args as Matrix, ctm);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      if (Array.isArray(args?.[0]) && args[0].length === 6) ctm = mul(args[0] as Matrix, ctm);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.constructPath) {
      // pdf.js 5.x: [paintOp, [Float32Array of DrawOPS], minMax]
      const data = args?.[1]?.[0];
      if (!data || typeof data.length !== 'number') continue;
      let cx = 0, cy = 0, sx = 0, sy = 0, k = 0;
      const push = (x: number, y: number) => {
        const [ax, ay] = apply(ctm, cx, cy);
        const [bx, by] = apply(ctm, x, y);
        if (Math.abs(ay - by) < 0.5 && Math.abs(ax - bx) > 1) {
          segs.push({ x0: Math.min(ax, bx), x1: Math.max(ax, bx), y: (ay + by) / 2 });
        }
      };
      while (k < data.length) {
        const op = data[k++];
        if (op === 0) { cx = sx = data[k++]; cy = sy = data[k++]; }          // moveTo
        else if (op === 1) { const x = data[k++], y = data[k++]; push(x, y); cx = x; cy = y; } // lineTo
        else if (op === 2) { k += 4; cx = data[k++]; cy = data[k++]; }       // curveTo
        else if (op === 3) { k += 2; cx = data[k++]; cy = data[k++]; }       // quadraticCurveTo
        else if (op === 4) { push(sx, sy); cx = sx; cy = sy; }               // closePath
        else break;
      }
    }
  }
  return segs;
}

async function textItems(page: PdfPage): Promise<TextItem[]> {
  const tc = await page.getTextContent();
  const out: TextItem[] = [];
  for (const it of tc.items as any[]) {
    const str = (it.str ?? '').replace(/\s+/g, ' ').trim();
    if (!str) continue;
    const t = it.transform as number[];
    out.push({ str, x: t[4], y: t[5], w: it.width, size: Math.hypot(t[2], t[3]) || it.height });
  }
  return out;
}

// ---------- text helpers ----------

/** Joins the wrapped lines of a cell, re-gluing words that the PDF broke mid-word. */
// Words of CEID course titles, used to re-join words the PDF broke across lines.
const KNOWN_WORDS = 'Άλγεβρα Έννοιες Έργων Όραση Αγγλικά Αγγλική Αισθητήρων Αλγορίθμων Αλγοριθμικές Αλγοριθμική Αλγόριθμοι Αλγόριθμος Αλγόριθμους Ανάκτηση Ανάλυση Ανάπτυξη Αποφάσεων Αριθμητική Αριθμητικής Αρχές Αρχιτεκτονική Αρχιτεκτονικής Ασφάλεια Ασφάλειας Ασύρματα Αυτόματα Βάσεις Βάσεων Βασικά Βασικές Βελτιστοποίηση Βιντεοπαιχνιδιών Βιοπληροφορική Γενικά Γλωσσών Γλώσσα Γλώσσες Γραμμική Γραφημάτων Γραφικά Γραφική Δίκτυα Δεδομένων Δημόσιας Διαδραστικές Διακριτά Διασύνδεση Διαχείριση Διαχείρισης Δικτύου Δικτύων Δομές Ειδικού Εισαγωγή Εκτίμησης Ενσωματωμένα Ενσωματωμένων Εξόρυξη Επίδοσης Επεξεργασία Επικοινωνίας Επικοινωνίες Επικοινωνιών Επιστήμη Επιστήμης Επιστημονικός Επιχειρείν Ευέλικτες Ευρυζωνικές Ευφυή Ευφυείς Εφαρμογές Εφαρμοσμένα Εφαρμοσμένη Ηλεκτροακουστική Ηλεκτρονικά Ηλεκτρονική Θέματα Θεμελιώσεις Θεωρία Θεωρητική Ιστό Κατανεμημένα Κατανεμημένων Κοινωνικές Κρυπτογραφία Κυβερνοασφάλεια Κυκλώματα Λειτουργίας Λειτουργικά Λογική Λογισμικού Λογισμικό Μάθηση Μάθησης Μέθοδοι Μαθηματικά Μεγάλων Μεθόδους Μεταγλωττιστές Μεταφραστών Μηχανική Μηχανικής Μικροεπεξεργαστές Μικροϋπολογιστές Μικροϋπολογιστών Νοημοσύνη Νοημοσύνης Νομικές Οπτικά Οπτικές Οργάνωσης Παγκόσμιο Παιγνίων Παράλληλη Παράλληλοι Παράλληλων Περιβάλλοντα Πιθανοτήτων Πιθανότητες Πλευρές Πληροφορίας Πληροφοριακά Πληροφορική Πληροφορικής Πολυπλοκότητα Προγραμματισμού Προγραμματισμό Προγραμματισμός Προηγμένα Προηγμένες Προηγμένοι Προφορική Ρομποτική Σήματα Σημάτων Σημασιολογία Σκοπού Στατιστικές Στατιστική Στατιστικής Συνδυαστική Συστήματα Συστημάτων Σχεδίαση Σχεδιασμός Σύγχρονα Τεχνητή Τεχνητής Τεχνικές Τεχνολογία Τεχνολογίας Τεχνολογίες Τηλεπικοινωνίες Τυπικές Υλικό Υλοποίησης Υπολογισμού Υπολογισμός Υπολογιστική Υπολογιστικό Υπολογιστικών Υπολογιστών Υψηλής Χρήσης Ψηφιακές Ψηφιακή Ψηφιακό';

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Words that appear whole somewhere in the document (not at the edge of a wrapped line). */
function buildVocabulary(pages: TextItem[][]): Set<string> {
  const vocab = new Set<string>(KNOWN_WORDS.split(' ').map(norm));
  for (const items of pages) for (const it of items) {
    const toks = it.str.split(' ');
    for (let i = 1; i < toks.length - 1; i++) { const n = norm(toks[i]); if (n) vocab.add(n); }
  }
  return vocab;
}

function joinLines(lines: { str: string; w: number }[], cellWidth: number, vocab: Set<string>): string {
  let out = '';
  lines.forEach((line, i) => {
    const t = line.str;
    if (!out) { out = t; return; }
    const prevWord = out.split(/[\s/]/).pop() || '';
    const nextWord = t.split(' ')[0];
    const a = out[out.length - 1];
    const c = t[0];
    let glue = false;
    const joined = norm(prevWord + nextWord);
    if (/\p{L}/u.test(a) && /\p{Ll}/u.test(c) && vocab.has(joined)) glue = true;
    else if (/\p{L}/u.test(a) && /\p{Ll}/u.test(c) && vocab.has(norm(prevWord)) && vocab.has(norm(nextWord))) glue = false;
    else if (/\p{L}/u.test(a) && /\p{Ll}/u.test(c)) {
      if (norm(prevWord).length <= 2) glue = false;
      else if (/[βγδζθκλμπτφχψ]$/u.test(prevWord)) glue = true;          // Greek words don't end like this
      else if (STANDALONE.has(nextWord.toLowerCase())) glue = false;
      else if (c === 'ς') glue = true;                                 // final sigma never starts a word
      else if (TONOS.test(prevWord) && TONOS.test(nextWord)) glue = false; // two accents = two words
      else if (!TONOS.test(prevWord) && prevWord.length > 2) glue = true;  // fragment without accent
      else if (lines[i - 1].w > cellWidth * 0.8) glue = true;          // previous line filled the cell
    } else if (/\d/.test(c) && /\d/.test(prevWord) && /[\dA-ZΑ-Ω]/u.test(a)) glue = true; // split course code
    else if (/[-/_]/.test(a) && prevWord.length > 1) glue = true;
    else if (a === ':' && /\d/.test(c)) glue = true;                     // times like 8:00
    out += (glue ? '' : ' ') + t;
  });
  return out.replace(/\s+/g, ' ').trim();
}

const CODE_TOKEN = /^\(?[A-ZΑ-Ω]*\d+[A-ZΑ-Ω0-9]*\)?$/u;

/** "24Y351 - NY451 Τεχνητή Νοημοσύνη" -> code "24Y351 - NY451", name "Τεχνητή Νοημοσύνη" */
function splitCode(text: string): { code: string; name: string } {
  const underscore = text.match(/^([A-ZΑ-Ω]+\d+)_(.+)$/u);
  if (underscore) return { code: underscore[1], name: underscore[2].trim() };
  const tokens = text.split(' ');
  const code: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    const parts = tok.split(/[-/&]/).filter(Boolean);
    if (parts.length && parts.every(p => CODE_TOKEN.test(p))) { code.push(tok); i++; continue; }
    if (/^[-/&]$/.test(tok) && code.length && i + 1 < tokens.length && CODE_TOKEN.test(tokens[i + 1])) {
      code.push(tok); i++; continue;
    }
    break;
  }
  const name = tokens.slice(i).join(' ').replace(/^[-–]\s*/, '').trim();
  return { code: code.join(' ').replace(/\s*-\s*/g, ' - ').replace(/\s*\/\s*/g, '/').trim(), name };
}

function categoryOf(title: string): CourseCategory {
  if (/Επιλογής/i.test(title)) return CourseCategory.EPILOGIS;
  if (/Επί\s*Διπλώματι/i.test(title)) return CourseCategory.EPI_DIPLOMATI;
  if (/Νέο\s*ΠΠΣ/i.test(title)) return CourseCategory.NEO_PPS;
  if (/ΠΠΣ/i.test(title)) return CourseCategory.PPS;
  return CourseCategory.UNKNOWN;
}

function semesterOf(title: string): string {
  const m = title.match(/(\d+)\s*ο\s*Εξάμηνο/u);
  if (m) return m[1];
  const e = title.match(/Επιλογής\s+(\S+)/u);
  return e ? `Επιλογής ${e[1]}` : title;
}

// ---------- year detection ----------

interface YearInfo { year?: number; startsInJanuary?: boolean; createdYear?: number }

async function detectYear(doc: PdfDoc): Promise<YearInfo> {
  const info: YearInfo = {};
  // Rebuild the text line by line; pdf.js may split a word into touching pieces ("202" + "6.").
  const items = (await textItems(await doc.getPage(1))).sort((a, b) => b.y - a.y || a.x - b.x);
  let text = '';
  items.forEach((t, i) => {
    const prev = items[i - 1];
    const touching = prev && Math.abs(prev.y - t.y) < 1 && t.x - (prev.x + prev.w) < 1;
    text += (i === 0 ? '' : touching ? '' : ' ') + t.str;
  });
  // e.g. "εξεταστική Ιανουαρίου-Φεβρουαρίου 2026", "εξεταστική Σεπτεμβρίου 2025"
  const m = text.match(/εξεταστικ[ήη]ς?\s+([^\d]{0,60}?)((?:19|20)\d{2})/iu);
  if (m) {
    info.year = Number(m[2]);
    info.startsInJanuary = /^\s*Ιανουαρ/iu.test(m[1]);
  }
  // Fallback: the footer "Δημιουργία Προγράμματος: d/m/yyyy" (day/month order is not consistent, so only the year is used).
  for (let p = 2; p <= Math.min(doc.numPages, 3) && !info.createdYear; p++) {
    for (const it of await textItems(await doc.getPage(p))) {
      const c = it.str.match(/Δημιουργία\s+Προγράμματος:?\s*\d{1,2}\/\d{1,2}\/(\d{4})/u);
      if (c) { info.createdYear = Number(c[1]); break; }
    }
  }
  return info;
}

/** Picks the year for a day/month that has no year printed next to it. */
function resolveYear(month: number, y: YearInfo): number {
  if (y.year) return month === 12 && y.startsInJanuary ? y.year - 1 : y.year;
  if (y.createdYear) return y.createdYear;
  return new Date().getFullYear();
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- page parsing ----------

async function parsePage(page: PdfPage, items: TextItem[], pageNo: number, years: YearInfo, vocab: Set<string>): Promise<Exam[]> {
  const [W, H] = [page.view[2], page.view[3]];

  const titleItems = items.filter(t => t.y > H * 0.88);
  const title = titleItems.sort((a, b) => a.x - b.x).map(t => t.str).join(' ').trim();
  if (/^Εβδομάδα/u.test(title)) return []; // weekly overview pages repeat the same exams

  const days = items.filter(t => DAYS.includes(t.str)).sort((a, b) => a.x - b.x);
  const hours = items.filter(t => t.x < W * 0.15 && /^\d{1,2}-\d{1,2}$/.test(t.str)).sort((a, b) => b.y - a.y);
  const weeks = items.filter(t => /^\d{1,2}(\/\d{1,2})?\s*-\s*\d{1,2}\/\d{1,2}$/.test(t.str));
  if (days.length < 2 || hours.length < 2 || !weeks.length) return [];

  const centerX = (t: TextItem) => t.x + t.w / 2;
  const centerY = (t: TextItem) => t.y + t.size * 0.35;

  const rowCenters = hours.map(centerY);
  const rowH = (rowCenters[0] - rowCenters[rowCenters.length - 1]) / (rowCenters.length - 1);
  const gridTop = rowCenters[0] + rowH / 2;
  const gridBottom = rowCenters[rowCenters.length - 1] - rowH / 2;
  const hourOfRow = hours.map(h => Number(h.str.split('-')[0]));
  const rowIndexAt = (y: number) => {
    let best = 0;
    rowCenters.forEach((c, i) => { if (Math.abs(c - y) < Math.abs(rowCenters[best] - y)) best = i; });
    return best;
  };

  // Week label -> Monday of that week
  const weekStarts = weeks.map(w => {
    const m = w.str.match(/(\d{1,2})\/(\d{1,2})$/)!;
    const day = Number(m[1]), month = Number(m[2]);
    const end = new Date(resolveYear(month, years), month - 1, day);
    const monday = new Date(end);
    monday.setDate(end.getDate() - ((end.getDay() + 6) % 7));
    return { cx: centerX(w), monday };
  });

  const colCenters = days.map(centerX);
  const segs = await horizontalSegments(page);
  const category = categoryOf(title);
  const semester = semesterOf(title);
  const exams: Exam[] = [];

  days.forEach((dayItem, i) => {
    const cx = colCenters[i];
    const left = i > 0 ? (colCenters[i - 1] + cx) / 2 : cx - (colCenters[1] - colCenters[0]) / 2;
    const right = i < days.length - 1 ? (colCenters[i + 1] + cx) / 2 : cx + (cx - colCenters[i - 1]) / 2;

    const week = weekStarts.reduce((a, b) => (Math.abs(b.cx - cx) < Math.abs(a.cx - cx) ? b : a));
    const date = new Date(week.monday);
    date.setDate(date.getDate() + DAYS.indexOf(dayItem.str));

    // Row boundaries that are actually drawn in this column; merged cells have none inside.
    const ys = segs
      .filter(s => s.x0 <= cx && s.x1 >= cx && s.y <= gridTop + 3 && s.y >= gridBottom - 3)
      .map(s => s.y)
      .sort((a, b) => b - a);
    const bounds: number[] = [];
    for (const y of ys) if (!bounds.length || bounds[bounds.length - 1] - y > 3) bounds.push(y);

    for (let b = 0; b + 1 < bounds.length; b++) {
      const top = bounds[b], bottom = bounds[b + 1];
      const cell = items
        .filter(t => centerX(t) > left && centerX(t) < right && centerY(t) < top && centerY(t) > bottom)
        .sort((a, b2) => b2.y - a.y || a.x - b2.x);
      if (!cell.length) continue;

      const startRow = rowIndexAt(top - rowH / 2);
      const rows = Math.max(1, Math.round((top - bottom) / rowH));
      const roomZone = bottom + rowH * 0.6;
      const roomLines = cell.filter(t => t.y < roomZone);
      const nameLines = cell.filter(t => t.y >= roomZone);

      const text = joinLines(nameLines.map(t => ({ str: t.str, w: t.w })), right - left, vocab);
      const { code, name } = splitCode(text);
      const room = roomLines.map(t => t.str).join(',').replace(/,{2,}/g, ',').replace(/^,|,$/g, '');
      const format = /προφορικ/iu.test(name) ? 'Προφορική' : undefined;

      // Notes such as "(η εξέταση ξεκινά στις 8:00)" override the grid's start time.
      let startMin = hourOfRow[startRow] * 60;
      let duration = rows * 60;
      const note = name.match(/ξεκιν[άα]\s+στις\s+(\d{1,2})[:.](\d{2})/iu);
      if (note) {
        const noted = Number(note[1]) * 60 + Number(note[2]);
        duration += startMin - noted;
        startMin = noted;
      }

      exams.push({
        id: `p${pageNo}-c${i}-r${startRow}`,
        name,
        code: code || undefined,
        semester,
        room: room || 'TBA',
        date: iso(date),
        time: `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`,
        duration,
        category,
        format,
      });
    }
  });
  return exams;
}

export async function parseSchedulePdf(
  data: ArrayBuffer,
  onProgress?: (fraction: number) => void,
): Promise<ParseOutput> {
  // The file is only read for its text and drawn lines; nothing in it is rendered or executed.
  const task = pdfjs.getDocument({ data: new Uint8Array(data), enableXfa: false });
  const doc = await task.promise;
  try {
    const years = await detectYear(doc);
    const pages: PdfPage[] = [];
    const texts: TextItem[][] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      pages.push(page);
      texts.push(await textItems(page));
      onProgress?.(0.4 * p / doc.numPages);
    }
    const vocab = buildVocabulary(texts);
    const all: Exam[] = [];
    for (let p = 0; p < pages.length; p++) {
      all.push(...await parsePage(pages[p], texts[p], p + 1, years, vocab));
      onProgress?.(0.4 + 0.6 * (p + 1) / pages.length);
    }
    // The same exam can appear on several pages (e.g. old and new curriculum); keep the first.
    const seen = new Set<string>();
    const unique = all.filter(e => {
      const key = `${e.code || e.name}|${e.date}|${e.time}|${e.room}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      exams: unique.filter(e => e.name || e.code),
      unnamed: unique.filter(e => !e.name && !e.code),
    };
  } finally {
    await task.destroy();
  }
}
