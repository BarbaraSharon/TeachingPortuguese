import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const sets = [
  ['en', 'content/en/portuguese-teaching-locations'],
  ['es', 'content/es/ubicaciones-clases-portugues'],
  ['pt-br', 'content/pt-br/locais-de-aulas-de-portugues'],
];
const outputPath = path.join(root, 'docs/seo-aeo-repair/location-restoration-audit.json');
const serviceConflict = /in-person|face-to-face|presencial|presenciais|presencialmente|online e presencial|online y presencial|both online and in-person|both in-person and online|local tutor like Barbara|tutora local|tutor local/iu;
const exclusionRules = [
  ['copied population or foreign-born statistics', /(?:over\s+1[.,]6\s+(?:million|millones|milhão)|1[.,]6\s+(?:million|millones|milhão)|(?:over\s+)?31[.,]5\s*%|(?:over\s+)?31\s*%\s+(?:of|de|dos|das))/iu],
  ['wrong Palm Beach identity', /Palm Beach County|Condado de Palm Beach|Portuguese American Cultural Society of Palm Beach County|Barbora Sharon/iu],
  ['unsupported European Portuguese teaching offer', /(?:European Portuguese (?:teacher|tutor|lessons|instruction)|both (?:European and )?Brazilian Portuguese|Brazilian or European Portuguese|both dialects|each dialect|ambos dialectos|dois dialetos|ambos os dialetos|ambas variedades)/iu],
  ['unsupported free-trial offer', /free trial|trial lesson|aula (?:experimental )?(?:gratuita|grátis)|clase de prueba gratuita/iu],
  ['unsupported permanent or local office claim', /permanent office|local office|escritório permanente|oficina local/iu],
  ['foreign location incorrectly described as Australia', /^#{1,6}[^\n]*,\s*(?:Australia|Austrália)\b|from anywhere in Australia|desde cualquier lugar de Australia|de qualquer lugar (?:na|da) Austrália/imu],
  ['Portugal incorrectly placed in South America', /países (?:lusófonos de Sudamérica|de língua portuguesa na América do Sul).{0,80}Portugal/iu],
  ['online-only service-scope conflict', serviceConflict],
  ['teacher incorrectly based in a service city', /(?:teacher|tutor|instructor) based in (?!Australia\b|the Gold Coast\b)|radicada en (?!Australia\b|Gold Coast\b)|baseada em (?!Austr[aá]lia\b|Gold Coast\b)/iu],
  ['unapproved Alberta organisation outside Calgary or Edmonton', /Brazilian Community Association of Alberta|BCAAB/iu],
];

function parse(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(match, 'Missing front matter');
  return { front: match[1], body: match[2].trim() };
}

function scalar(front, key) {
  return front.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim() ?? '';
}

function words(body) {
  return body.split(/\s+/u).filter(Boolean).length;
}

function blocks(body) {
  return body.split(/\n\s*\n/u).map((block) => block
    .replaceAll(' ,', ',')
    .replaceAll(' .', '.')
    .replaceAll(' :', ':')
    .replaceAll(')page', ') page')
    .replaceAll(')or', ') or')
    .replaceAll(')include', ') include')
    .replaceAll('book your lesson options today', 'book a Portuguese lesson today')
    .replace(/\s{2,}/gu, ' ')
    .trim()).filter(Boolean);
}

function headings(body) {
  return [...body.matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) => match[1].trim());
}

function headingsForBlock(blocksList, index) {
  const inlineHeadings = [...blocksList[index].matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) => match[1].trim());
  if (inlineHeadings.length > 0) return inlineHeadings;
  for (let i = index; i >= 0; i -= 1) {
    const headingsInBlock = [...blocksList[i].matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) => match[1].trim());
    if (headingsInBlock.length > 0) return headingsInBlock;
  }
  return ['(introductory content)'];
}

function exclusionReasons(block, front, slug) {
  const reasons = [];
  for (const [label, pattern] of exclusionRules) {
    if (pattern.test(block)
      && (label !== 'online-only service-scope conflict' || scalar(front, 'service_scope') === 'online_only')
      && (label !== 'foreign location incorrectly described as Australia' || scalar(front, 'country') !== 'Australia')
      && (label !== 'unapproved Alberta organisation outside Calgary or Edmonton' || !['calgary', 'edmonton'].includes(slug))) {
      reasons.push(label);
    }
  }
  return reasons;
}

function links(body) {
  return [...body.matchAll(/\[[^\]]+\]\((\/[^)#]+)(?:#[^)]*)?\)/gu)].map((match) => match[1]);
}

function resolveLocalLink(url) {
  const withoutLanguage = url.replace(/^\/(?:en|es|pt-br)\//u, '');
  const language = url.match(/^\/(en|es|pt-br)\//u)?.[1];
  if (!language) return true;
  const languageRoot = language === 'en' ? 'content/en' : language === 'es' ? 'content/es' : 'content/pt-br';
  const candidates = [
    path.join(root, languageRoot, withoutLanguage, 'index.md'),
    path.join(root, languageRoot, withoutLanguage, '_index.md'),
    path.join(root, languageRoot, `${withoutLanguage}.md`),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function source(relative) {
  return execFileSync('git', ['show', `HEAD:${relative}`], { cwd: root, encoding: 'utf8' });
}

const records = [];
const translationKeys = new Map();
for (const [language, directory] of sets) {
  const fullDirectory = path.join(root, directory);
  const entries = fs.readdirSync(fullDirectory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(entries.length, 191, `${language}: expected 191 location pages`);
  for (const entry of entries) {
    const relative = `${directory}/${entry.name}/index.md`;
    const current = parse(fs.readFileSync(path.join(root, relative), 'utf8'));
    const before = parse(source(relative));
    const currentHeadings = headings(current.body);
    const beforeHeadings = headings(before.body);
    const currentLinks = links(current.body);
    const missingLinks = currentLinks.filter((url) => !resolveLocalLink(url));
    const scope = scalar(current.front, 'service_scope');
    const key = scalar(current.front, 'translationKey');
    const beforeBlocks = blocks(before.body);
    const currentBlocks = blocks(current.body);
    const usedCurrentBlocks = new Set();
    const excludedBlocks = [];
    const unexplainedExclusions = [];
    for (let index = 0; index < beforeBlocks.length; index += 1) {
      const block = beforeBlocks[index];
      const matchingIndex = currentBlocks.findIndex((candidate, candidateIndex) => candidate === block && !usedCurrentBlocks.has(candidateIndex));
      if (matchingIndex >= 0) {
        usedCurrentBlocks.add(matchingIndex);
        continue;
      }
      const reasons = exclusionReasons(block, current.front, entry.name);
      const blockHeadings = headingsForBlock(beforeBlocks, index);
      if (reasons.length === 0 && /^#{1,6}\s+/u.test(block)) reasons.push('empty heading after excluded claim blocks');
      if (reasons.length === 0 && currentBlocks.includes(block)) reasons.push('duplicate block removed');
      const record = { heading: blockHeadings.at(-1), headings: blockHeadings, reasons, excerpt: block.slice(0, 240) };
      excludedBlocks.push(record);
      if (reasons.length === 0) unexplainedExclusions.push(record);
    }
    const excludedSections = beforeHeadings
      .filter((heading) => !currentHeadings.includes(heading))
      .map((heading) => ({
        heading,
        reasons: [...new Set(excludedBlocks.filter((block) => block.headings.includes(heading)).flatMap((block) => block.reasons))],
      }));
    records.push({
      language,
      slug: entry.name,
      translationKey: key,
      bodyWordsBefore: words(before.body),
      bodyWordsAfter: words(current.body),
      restoredSections: beforeHeadings.filter((heading) => currentHeadings.includes(heading)),
      excludedSections,
      excludedBlocks,
      unexplainedExclusions,
      currentOnlySections: currentHeadings.filter((heading) => !beforeHeadings.includes(heading)),
      internalLinkCount: currentLinks.length,
      brokenInternalLinks: missingLinks,
      serviceScopeConflict: scope === 'online_only' && serviceConflict.test(current.body),
    });
    if (!translationKeys.has(key)) translationKeys.set(key, new Set());
    translationKeys.get(key).add(language);
  }
}

assert.equal(records.length, 573, 'Restoration audit must cover 573 location pages');
const incompleteKeys = [...translationKeys.entries()].filter(([, languages]) => languages.size !== 3).map(([key]) => key);
const brokenLinks = records.filter((record) => record.brokenInternalLinks.length > 0);
const conflicts = records.filter((record) => record.serviceScopeConflict);
const unexplained = records.filter((record) => record.unexplainedExclusions.length > 0);
assert.equal(incompleteKeys.length, 0, `Translation-key parity failed: ${incompleteKeys.join(', ')}`);
assert.equal(brokenLinks.length, 0, brokenLinks.map((record) => `${record.language}/${record.slug}: ${record.brokenInternalLinks.join(', ')}`).join('\n'));
assert.equal(conflicts.length, 0, conflicts.map((record) => `${record.language}/${record.slug}`).join('\n'));
assert.equal(unexplained.length, 0, unexplained.map((record) => `${record.language}/${record.slug}: ${record.unexplainedExclusions.map((block) => block.excerpt).join(' | ')}`).join('\n'));

const report = {
  baseline: '833132016181a6b663ecbb29eff925ae2b7cc0e6',
  generatedAt: '2026-10-08',
  pageCount: records.length,
  translationKeyCount: translationKeys.size,
  totals: {
    bodyWordsBefore: records.reduce((sum, record) => sum + record.bodyWordsBefore, 0),
    bodyWordsAfter: records.reduce((sum, record) => sum + record.bodyWordsAfter, 0),
    excludedSectionCount: records.reduce((sum, record) => sum + record.excludedSections.length, 0),
    excludedBlockCount: records.reduce((sum, record) => sum + record.excludedBlocks.length, 0),
    internalLinkCount: records.reduce((sum, record) => sum + record.internalLinkCount, 0),
  },
  records,
};

if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`Location restoration audit passed: ${records.length} pages, ${translationKeys.size} translation keys, every excluded block has an explicit reason, no broken restored links or service-scope conflicts.`);
