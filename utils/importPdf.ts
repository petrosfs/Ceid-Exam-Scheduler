// Loaded on demand (dynamic import) so pdf.js is only downloaded when a file is chosen.
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { extractPages, pdfjs } from './pdfExtract';
import { parseSchedule, type ParseOutput } from './scheduleParser';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function parseSchedulePdf(data: ArrayBuffer, onProgress?: (fraction: number) => void): Promise<ParseOutput> {
  const pages = await extractPages(data, f => onProgress?.(f * 0.95));
  const result = parseSchedule(pages);
  onProgress?.(1);
  return result;
}
