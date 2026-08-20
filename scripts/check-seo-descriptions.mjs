#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const args = new Map(process.argv.slice(2).flatMap((argument, index, values) => (
  argument.startsWith('--') ? [[argument.slice(2), values[index + 1]]] : []
)));
const contentRoot = path.resolve(projectRoot, args.get('content') ?? 'content');
const siteRoot = path.resolve(projectRoot, args.get('site') ?? 'public');
const minimumCharacters = 120;
const maximumCharacters = 155;
const maximumPixels = 920;
const expectedSourcePageCount = 738;

const languageMarkers = {
  en: /\b(?:barbara|brazilian|portuguese|lessons?|learning|teaching|privacy|newsletter|conversation|cultural|travel)\b/i,
  es: /\b(?:barbara|portugués|clases|aprende|aprendizaje|conversación|cultura|privacidad|boletín|viaje)\b/i,
  'pt-br': /\b(?:barbara|português|aulas|aprenda|aprendizagem|conversação|cultura|privacidade|newsletter|viagem)\b/i,
};
const unsupportedClaimPattern = /\b(?:best|top[- ]?rated|certified|proven(?: results)?|guaranteed|free trial|fastest|expert|mejor(?:es)?|mejor valorad[oa]s?|certificad[oa]s?|resultados comprobados|garantizad[oa]s?|prueba gratis|experta?|melhor(?:es)?|certificad[oa]s?|resultados comprovados|garantid[oa]s?|aula experimental gratuita|especialista)\b/i;
const locationDirectories = new Map([
  ['en', 'portuguese-teaching-locations'],
  ['es', 'ubicaciones-clases-portugues'],
  ['pt-br', 'locais-de-aulas-de-portugues'],
]);
const locationCityOverrides = {
  muenster: { en: 'Münster', es: 'Münster', 'pt-br': 'Münster' },
  'niagara-falls': { en: 'Niagara Falls', es: 'Niagara Falls', 'pt-br': 'Niagara Falls' },
  'prince-george': { en: 'Prince George', es: 'Prince George', 'pt-br': 'Prince George' },
  'quebec-city': { en: 'Quebec City', es: 'Ciudad de Quebec', 'pt-br': 'Cidade de Quebec' },
  'saint-john': { en: 'Saint John', es: 'Saint John', 'pt-br': 'Saint John' },
};
const narrowCharacters = new Set([..." ilI1'`.,:;!|()[]{}’"]);
const mediumCharacters = new Set([..."fjrt-_/\\"]);
const wideCharacters = new Set([...'mwMW@%&QO']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : entry.name.endsWith('.md') ? [entryPath] : [];
  });
}

function parseFrontMatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${filePath}: missing YAML front matter`);
  return match[1];
}

function rawLine(frontMatter, fieldName) {
  return frontMatter.match(new RegExp(`^${fieldName}:.*$`, 'm'))?.[0] ?? '';
}

function readScalar(frontMatter, fieldName) {
  return frontMatter.match(new RegExp(`^${fieldName}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

function hasVerifiedGoldCoastInPersonOption(frontMatter) {
  return unquote(readScalar(frontMatter, 'region_group')) === 'Gold Coast'
    && unquote(readScalar(frontMatter, 'service_scope')) === 'online_plus_confirmed_gold_coast_venue';
}

function unquote(value) {
  if (!value.startsWith('"') || !value.endsWith('"')) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\\\', '\\');
  }
}

function decodeHtml(value) {
  const named = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>' };
  return value.replace(/&(amp|quot|#39|apos|lt|gt);|&#x([0-9a-f]+);|&#(\d+);/gi, (entity, _named, hexadecimal, decimal) => {
    if (hexadecimal) return String.fromCodePoint(parseInt(hexadecimal, 16));
    if (decimal) return String.fromCodePoint(parseInt(decimal, 10));
    return named[entity.toLowerCase()] ?? entity;
  });
}

function normalize(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

// Conservative approximation of 14px Arial glyph widths. It is deliberately
// deterministic so the source and audit CSV use the same internal quality gate.
function estimatedPixels(description) {
  return Math.round([...description].reduce((width, character) => {
    if (character === ' ') return width + 3.5;
    if (narrowCharacters.has(character)) return width + 3;
    if (mediumCharacters.has(character)) return width + 5;
    if (wideCharacters.has(character)) return width + 8.5;
    if (/[A-ZÀ-ÖØ-Þ]/u.test(character)) return width + 7;
    return width + 6;
  }, 0));
}

function routeFor(language, contentPath, frontMatter) {
  const configuredUrl = unquote(readScalar(frontMatter, 'url'));
  if (configuredUrl) return configuredUrl.replace(/^https?:\/\/[^/]+/i, '').replace(/\/?$/, '/');
  if (contentPath === '_index.md') return `/${language}/`;
  return `/${language}/${path.posix.dirname(contentPath)}/`.replace('/./', '/');
}

function htmlFileFor(route) {
  return path.join(siteRoot, route.replace(/^\//, ''), 'index.html');
}

function metaContent(html, attribute, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = tags.find((candidate) => new RegExp(`\\b${attribute}\\s*=\\s*(?:"${escapedValue}"|'${escapedValue}'|${escapedValue})(?:\\s|>|/)`, 'i').test(candidate));
  const content = tag?.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  return content?.[1] ?? content?.[2] ?? content?.[3] ?? '';
}

function isLocationPage(language, contentPath) {
  return contentPath.startsWith(`${locationDirectories.get(language)}/`) && contentPath !== `${locationDirectories.get(language)}/_index.md`;
}

function cityForLocation(language, contentPath, title, frontMatter) {
  const configuredCity = unquote(readScalar(frontMatter, 'city'));
  if (configuredCity) return configuredCity;
  const slug = path.basename(path.dirname(contentPath));
  const override = locationCityOverrides[slug]?.[language];
  if (override) return override;
  const separator = language === 'en' ? ' in ' : language === 'es' ? ' en ' : ' em ';
  const city = title.split(separator).at(-1);
  return city && city !== title ? city : '';
}

function repeatedPhrase(description) {
  const normalized = description.toLocaleLowerCase();
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const counts = new Map();
  for (const word of words.filter((word) => [...word].length >= 4)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts].find(([, count]) => count > 3)?.[0] ?? '';
}

function repeatedConsecutiveWords(description) {
  return description.match(/(?:^|[^\p{L}])(\p{L}+)\s+\1(?:$|[^\p{L}])/iu)?.[1] ?? '';
}

function siteDescription(language) {
  const source = fs.readFileSync(path.join(projectRoot, 'i18n', `${language}.yaml`), 'utf8');
  const match = source.match(/- id: site_description\n\s+translation:\s*(.+)\n/);
  if (!match) throw new Error(`i18n/${language}.yaml: missing site_description translation`);
  return normalize(unquote(match[1].trim()));
}

const errors = [];
const records = [];
const descriptionsByLanguage = new Map();

for (const filePath of walk(contentRoot).sort()) {
  const source = fs.readFileSync(filePath, 'utf8');
  const frontMatter = parseFrontMatter(source, filePath);
  const relative = path.relative(contentRoot, filePath).split(path.sep).join('/');
  const [language, ...rest] = relative.split('/');
  const contentPath = rest.join('/');
  const descriptionLine = rawLine(frontMatter, 'description');
  const description = normalize(unquote(readScalar(frontMatter, 'description')));
  const summary = normalize(unquote(readScalar(frontMatter, 'summary')));
  const title = normalize(unquote(readScalar(frontMatter, 'title')));
  const translationKey = readScalar(frontMatter, 'translationKey');
  const route = routeFor(language, contentPath, frontMatter);
  const characterCount = [...description].length;
  const pixelWidth = estimatedPixels(description);
  const descriptionLineIndex = frontMatter.split('\n').findIndex((line) => line.startsWith('description:'));
  const nextLine = frontMatter.split('\n')[descriptionLineIndex + 1] ?? '';

  if (!descriptionLine) errors.push(`${relative}: missing description`);
  if (!/^description:\s+"(?:[^"\\]|\\.)*"$/.test(descriptionLine)) {
    errors.push(`${relative}: description must be a single-line double-quoted YAML scalar`);
  }
  if (/^\s+\S/.test(nextLine)) errors.push(`${relative}: description must not use a folded or multiline continuation`);
  if (characterCount < minimumCharacters || characterCount > maximumCharacters) {
    errors.push(`${relative}: ${characterCount} description characters (expected ${minimumCharacters}–${maximumCharacters})`);
  }
  if (pixelWidth > maximumPixels) errors.push(`${relative}: estimated description width is ${pixelWidth}px (maximum ${maximumPixels}px)`);
  if (!languageMarkers[language]?.test(description)) errors.push(`${relative}: description lacks a ${language} language marker`);
  if (unsupportedClaimPattern.test(description)) errors.push(`${relative}: description contains an unsupported promotional claim`);
  const repeatedWord = repeatedConsecutiveWords(description);
  if (repeatedWord) errors.push(`${relative}: description repeats “${repeatedWord}” consecutively`);
  const repeated = repeatedPhrase(description);
  if (repeated) errors.push(`${relative}: description repeats “${repeated}” too often`);

  if (isLocationPage(language, contentPath)) {
    const city = cityForLocation(language, contentPath, title, frontMatter);
    if (!/\bonline\b/i.test(description)) errors.push(`${relative}: location description must state the truthful online delivery mode`);
    if (/\b(?:in-person|presencial(?:es|mente)?|face to face)\b/i.test(description) && !hasVerifiedGoldCoastInPersonOption(frontMatter)) {
      errors.push(`${relative}: location description must not imply unverified in-person delivery`);
    }
    if (!city || !description.toLocaleLowerCase().includes(city.toLocaleLowerCase())) {
      errors.push(`${relative}: location description must name the page city`);
    }
  }

  if ((translationKey === 'home' || translationKey === 'may-2025') && summary !== description) {
    errors.push(`${relative}: summary must match the approved description because Hugo uses summary for this page`);
  }

  const languageDescriptions = descriptionsByLanguage.get(language) ?? new Map();
  const pages = languageDescriptions.get(description) ?? [];
  pages.push({ relative, route, translationKey });
  languageDescriptions.set(description, pages);
  descriptionsByLanguage.set(language, languageDescriptions);
  records.push({ relative, language, contentPath, route, description, translationKey });
}

if (records.length !== expectedSourcePageCount) errors.push(`content: found ${records.length} Markdown pages (expected ${expectedSourcePageCount})`);

for (const [language, descriptions] of descriptionsByLanguage) {
  for (const [description, pages] of descriptions) {
    if (pages.length < 2) continue;
    const isCanonicalHomePair = pages.every((page) => page.route === `/${language}/`) && new Set(pages.map((page) => page.translationKey)).size === 2 && pages.some((page) => page.translationKey === 'home') && pages.some((page) => page.translationKey === 'language-home');
    if (!isCanonicalHomePair) errors.push(`${language}: duplicate description across distinct canonical pages: ${description}`);
  }
}

for (const language of ['en', 'es', 'pt-br']) {
  const home = records.find((record) => record.language === language && record.translationKey === 'home');
  if (!home) {
    errors.push(`${language}: missing localized homepage source record`);
  } else if (siteDescription(language) !== home.description) {
    errors.push(`i18n/${language}.yaml: site_description must match the approved homepage description`);
  }
}

for (const record of records) {
  const filePath = htmlFileFor(record.route);
  if (!fs.existsSync(filePath)) {
    errors.push(`${record.relative}: rendered page missing at ${path.relative(projectRoot, filePath)}`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const metaDescription = normalize(metaContent(html, 'name', 'description'));
  const openGraphDescription = normalize(metaContent(html, 'property', 'og:description'));
  const twitterDescription = normalize(metaContent(html, 'name', 'twitter:description'));
  for (const [label, value] of [['rendered meta description', metaDescription], ['Open Graph description', openGraphDescription], ['Twitter description', twitterDescription]]) {
    if (value !== record.description) errors.push(`${record.relative}: ${label} does not match the approved description`);
  }
}

if (errors.length) {
  console.error(`SEO description check failed with ${errors.length} issue(s):\n${errors.join('\n')}`);
  process.exit(1);
}

console.log(`SEO description check passed for ${records.length} Markdown pages.`);
