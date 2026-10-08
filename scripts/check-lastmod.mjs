import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const expected = process.env.REQUIRED_LASTMOD ?? '';
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
  }
}
walk(path.join(root, 'content'));

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const value = source.match(/^lastmod:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
  assert.ok(value && /^\d{4}-\d{2}-\d{2}$/.test(value), `${path.relative(root, file)}: invalid or missing lastmod`);
  if (expected) assert.equal(value, expected, `${path.relative(root, file)}: expected lastmod ${expected}, found ${value}`);
}

console.log(`Lastmod checks passed: ${files.length} Markdown pages${expected ? ` all set to ${expected}` : ''}.`);
