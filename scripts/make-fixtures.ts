// Turns sample exam PDFs into small JSON fixtures (text positions + lines) for the parser tests,
// and stores the parser's current output as the expected result.
// Usage: npm run fixtures -- <name>=<file.pdf> ...
import fs from 'node:fs';
import path from 'node:path';
import { extractPages } from '../utils/pdfExtract';
import { parseSchedule } from '../utils/scheduleParser';

const dir = path.resolve(process.cwd(), 'tests/fixtures');
for (const arg of process.argv.slice(2)) {
  const [name, file] = arg.split('=');
  const buf = fs.readFileSync(file);
  const pages = await extractPages(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  fs.writeFileSync(path.join(dir, `${name}.pages.json`), JSON.stringify(pages));
  const result = parseSchedule(pages);
  const strip = (list: typeof result.exams) => list.map(({ id, ...rest }) => rest);
  fs.writeFileSync(path.join(dir, `${name}.expected.json`),
    JSON.stringify({ exams: strip(result.exams), unnamed: strip(result.unnamed) }, null, 1) + '\n');
  console.log(name, result.exams.length, 'exams,', result.unnamed.length, 'unnamed');
}
