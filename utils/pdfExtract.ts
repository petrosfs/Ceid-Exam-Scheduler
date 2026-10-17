// pdf.js-specific part: turns a PDF into plain page data (text positions and drawn horizontal lines).
// Kept separate from the parsing logic so the parser can be tested without pdf.js.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export { pdfjs };
import type { HSeg, PageData, TextItem } from './scheduleParser';

type PdfPage = pdfjs.PDFPageProxy;
const r2 = (n: number) => Math.round(n * 100) / 100;


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
          segs.push({ x0: r2(Math.min(ax, bx)), x1: r2(Math.max(ax, bx)), y: r2((ay + by) / 2) });
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
    out.push({ str, x: r2(t[4]), y: r2(t[5]), w: r2(it.width), size: r2(Math.hypot(t[2], t[3]) || it.height) });
  }
  return out;
}


/** Reads every page of the PDF. The file is only read for its text and drawn lines; nothing in it is rendered or executed. */
export async function extractPages(data: ArrayBuffer, onProgress?: (fraction: number) => void): Promise<PageData[]> {
  const task = pdfjs.getDocument({ data: new Uint8Array(data), enableXfa: false });
  try {
    const doc = await task.promise;
    const pages: PageData[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      pages.push({ width: page.view[2], height: page.view[3], items: await textItems(page), segs: await horizontalSegments(page) });
      onProgress?.(p / doc.numPages);
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
