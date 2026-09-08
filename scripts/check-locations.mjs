import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sets = [
  ['en', 'content/en/portuguese-teaching-locations'],
  ['pt-br', 'content/pt-br/locais-de-aulas-de-portugues'],
  ['es', 'content/es/ubicaciones-clases-portugues'],
];
const required = ['translationKey', 'title', 'description', 'city', 'country', 'region_group', 'time_zone', 'service_scope', 'local_intro', 'local_context', 'scheduling', 'learner_use_case', 'cta', 'faq', 'editorial_reviewed'];
const onlineWords = { en: /online/i, 'pt-br': /online/i, es: /online/i };
const prohibited = /\b(permanent office|local office|free trial|guaranteed class|guaranteed availability|escritório permanente|aula garantida|prueba gratuita|oficina local)\b/i;

function files(dir) { return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(); }
function frontMatter(file) { const text = fs.readFileSync(file, 'utf8'); const match = text.match(/^---\n([\s\S]*?)\n---/); assert.ok(match, `Missing front matter: ${file}`); return { text, raw: match[1] }; }
function scalar(raw, key) { return raw.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?$`, 'm'))?.[1]?.trim() ?? ''; }
function list(raw, key) { return raw.match(new RegExp(`^${key}:\\n((?:- .*\\n?)+)`, 'm'))?.[1] ?? ''; }
function normalize(value) { return value.toLowerCase().replace(/\d+/g, '#').replace(/[^\p{L}\s#]/gu, ' ').replace(/\s+/g, ' ').trim(); }
function grams(value) { const words = normalize(value).split(' ').filter(Boolean); const result = new Set(); for (let i = 0; i <= words.length - 5; i += 1) result.add(words.slice(i, i + 5).join(' ')); return result; }
const sharedTemplatePhrases = [
  'lessons are delivered online', 'as aulas são online', 'las clases se imparten online',
  'choose a time that works in your local time zone', 'escolha um horário no seu fuso local', 'elige un horario que funcione en tu zona horaria',
  'use it as a planning reference rather than a promise', 'use-o como referência de planejamento', 'úsala como referencia de planificación',
  'you might use an online lesson to prepare for travel', 'você pode usar uma aula online para se preparar para viagens', 'puedes usar una clase online para prepararte para viajes',
  'this page keeps the local reference specific', 'esta página mantém a referência local específica', 'esta página mantiene la referencia local específica',
  'is located in', 'is grouped in the', 'location set used for local scheduling and learner guidance',
  'está localizada em', 'faz parte do conjunto regional', 'usado para orientar horários e objetivos de aprendizagem',
  'está situada en', 'forma parte del conjunto regional', 'que se utiliza para orientar horarios y objetivos de aprendizaje',
  'specific to', 'while the teaching service remains online first', 'esta página mantém a referência local', 'específica de', 'enquanto o serviço de ensino continua priorizando o formato online', 'esta página mantiene la referencia local', 'mientras que el servicio de enseñanza sigue priorizando el formato online',
];
function localCorpus(raw) { return sharedTemplatePhrases.reduce((value, phrase) => value.replaceAll(phrase, ' '), raw.toLowerCase()); }

const inventories = new Map();
for (const [language, dir] of sets) {
  const slugs = files(dir);
  assert.equal(slugs.length, 191, `${language}: expected 191 location pages`);
  const records = new Map();
  for (const slug of slugs) {
    const file = path.join(root, dir, slug, 'index.md');
    const { text, raw } = frontMatter(file);
    for (const key of required) assert.ok(raw.includes(`${key}:`), `${language}/${slug}: missing ${key}`);
    const city = scalar(raw, 'city');
    assert.ok(city && text.includes(city), `${language}/${slug}: city missing from page`);
    assert.ok(onlineWords[language].test(scalar(raw, 'title')) && onlineWords[language].test(scalar(raw, 'description')), `${language}/${slug}: title/description must state online intent`);
    assert.ok(/^(online_only|online_plus_confirmed_gold_coast_venue)$/.test(scalar(raw, 'service_scope')), `${language}/${slug}: invalid service scope`);
    assert.ok(/^[A-Za-z_]+\/[A-Za-z_]+$/.test(scalar(raw, 'time_zone')), `${language}/${slug}: invalid IANA timezone`);
    assert.ok(/^faq:\n\s+- question:/m.test(raw), `${language}/${slug}: FAQ is empty`);
    assert.ok(['true', 'false'].includes(scalar(raw, 'editorial_reviewed')), `${language}/${slug}: missing editorial review state`);
    if (scalar(raw, 'editorial_reviewed') === 'false') assert.ok(/^robots:\s*noindex,\s*follow/m.test(raw), `${language}/${slug}: unreconciled page must be noindex, follow`);
    if (scalar(raw, 'service_scope') === 'online_only') assert.ok(!prohibited.test(raw), `${language}/${slug}: prohibited claim in structured location fields`);
    const local = localCorpus(['local_intro', 'local_context', 'scheduling', 'learner_use_case'].map((key) => scalar(raw, key)).join(' '));
    assert.ok(grams(local).size >= 10, `${language}/${slug}: local narrative is too short`);
    records.set(scalar(raw, 'translationKey'), slug);
  }
  inventories.set(language, records);
}
const keys = [...inventories.values()].map((records) => [...records.keys()].sort().join('\n'));
assert.equal(new Set(keys).size, 1, 'Translation sets do not match');

for (const [language, dir] of sets) {
  const pages = files(dir).map((slug) => frontMatter(path.join(root, dir, slug, 'index.md')).text).join('\n');
  const corpus = grams(pages);
  const pageGrams = files(dir).map((slug) => {
    const raw = frontMatter(path.join(root, dir, slug, 'index.md')).raw;
    return grams(localCorpus(scalar(raw, 'local_context')));
  });
  const uniqueCount = pageGrams.filter((page) => [...page].some((gram) => [...pageGrams].filter((other) => other !== page).every((other) => !other.has(gram)))).length;
  assert.ok(uniqueCount / pageGrams.length >= 0.6, `${language}: fewer than 60% of pages contain corpus-unique five-word sequences`);
  for (let i = 0; i < pageGrams.length; i += 1) for (let j = i + 1; j < pageGrams.length; j += 1) {
    const intersection = [...pageGrams[i]].filter((gram) => pageGrams[j].has(gram)).length;
    const union = new Set([...pageGrams[i], ...pageGrams[j]]).size;
    assert.ok(intersection / union <= 0.35, `${language}: repeated-content similarity exceeds 0.35 (${files(dir)[i]} vs ${files(dir)[j]}, ${intersection / union})`);
  }
  assert.ok(corpus.size > 0);
}
console.log('Location checks passed: 191 pages per language, matching translations, structured fields, online intent, and corpus differentiation.');
