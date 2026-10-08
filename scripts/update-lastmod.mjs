import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const date = process.argv[2] ?? '2026-10-08';
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid lastmod date: ${date}`);

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
  }
}
walk(path.join(root, 'content'));

let changed = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^lastmod:\s*.+$/m);
  if (!match) throw new Error(`Missing lastmod field: ${path.relative(root, file)}`);
  const updated = source.replace(/^(lastmod:\s*).+$/m, `$1"${date}"`);
  if (updated !== source) {
    fs.writeFileSync(file, updated);
    changed += 1;
  }
}

console.log(`Updated lastmod to ${date} on ${changed} of ${files.length} Markdown pages.`);
