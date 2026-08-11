#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const args = new Map(process.argv.slice(2).flatMap((argument, index, values) => (
  argument.startsWith('--') ? [[argument.slice(2), values[index + 1]]] : []
)));
const contentRoot = path.resolve(projectRoot, args.get('content') ?? 'content');
const siteRoot = path.resolve(projectRoot, args.get('site') ?? 'public');
const maximumCharacters = 58;
const minimumCharacters = 35;
const maximumPixels = 560;
const languageMarkers = {
  en: /\b(?:advanced|about|barbara|beginner|brazilian|business|contact|conversation|learn|lesson|newsletter|portuguese|privacy|teaching)\b/i,
  es: /\b(?:aprende|aprender|boletín|brasileño|clases|contacta|conversación|evidencia|método|política|portugués|preguntas|rutas|sobre)\b/i,
  'pt-br': /\b(?:aprenda|aulas|brasileiro|caminhos|conversação|dúvidas|evidência|método|newsletter|política|português|sobre)\b/i,
};
const unsupportedClaimPattern = /\b(?:best|expert|certified|proven|guaranteed|free trial|mejor|experta?|certificada?|resultados comprobados|melhor|especialista|certificada?|resultados comprovados)\b/i;
const inPersonPattern = /\b(?:in-person|presencial(?:es|mente)?)\b/i;

const narrowCharacters = new Set([..." ilI1'`.,:;!|()[]{}"]);
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

function readScalar(raw, fieldName) {
  return raw.match(new RegExp(`^${fieldName}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
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

function estimatedPixels(title) {
  return Math.round([...title].reduce((width, character) => {
    if (character === ' ') return width + 5;
    if (narrowCharacters.has(character)) return width + 4;
    if (mediumCharacters.has(character)) return width + 7;
    if (wideCharacters.has(character)) return width + 15;
    if (/[A-ZÀ-ÖØ-Þ]/u.test(character)) return width + 12;
    return width + 10;
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

function languageSiteTitle(language) {
  const i18nFile = path.join(projectRoot, 'i18n', `${language}.yaml`);
  const source = fs.readFileSync(i18nFile, 'utf8');
  const match = source.match(/- id: site_title\n\s+translation:\s*(.+)\n/);
  if (!match) throw new Error(`${i18nFile}: missing site_title translation`);
  return normalize(unquote(match[1].trim()));
}

const errors = [];
const records = [];
const titlesByLanguage = new Map();

for (const filePath of walk(contentRoot).sort()) {
  const source = fs.readFileSync(filePath, 'utf8');
  const frontMatter = parseFrontMatter(source, filePath);
  const relative = path.relative(contentRoot, filePath).split(path.sep).join('/');
  const [language, ...rest] = relative.split('/');
  const contentPath = rest.join('/');
  const titleLine = frontMatter.match(/^title:\s*(.*)$/m)?.[0];
  const rawTitle = readScalar(frontMatter, 'title');
  const title = normalize(unquote(rawTitle));
  const route = routeFor(language, contentPath, frontMatter);
  const characterCount = [...title].length;
  const pixelWidth = estimatedPixels(title);

  if (!titleLine) errors.push(`${relative}: missing title`);
  if (!/^title:\s+"(?:[^"\\]|\\.)*"$/.test(titleLine ?? '')) {
    errors.push(`${relative}: title must be a single-line double-quoted YAML scalar`);
  }
  const titleLineIndex = frontMatter.split('\n').findIndex((line) => line.startsWith('title:'));
  const nextLine = frontMatter.split('\n')[titleLineIndex + 1] ?? '';
  if (/^\s+\S/.test(nextLine)) errors.push(`${relative}: title must not use a folded continuation line`);
  if (characterCount < minimumCharacters || characterCount > maximumCharacters) {
    errors.push(`${relative}: ${characterCount} characters (expected ${minimumCharacters}–${maximumCharacters})`);
  }
  if (pixelWidth > maximumPixels) errors.push(`${relative}: estimated ${pixelWidth}px (maximum ${maximumPixels}px)`);
  if (/[|]/.test(title)) errors.push(`${relative}: title contains a boilerplate separator`);
  if (/\b(\p{L}+)\s+\1\b/iu.test(title)) errors.push(`${relative}: title repeats a word`);
  if (!languageMarkers[language]?.test(title)) errors.push(`${relative}: title lacks a ${language} language marker`);
  if (unsupportedClaimPattern.test(title)) errors.push(`${relative}: title contains an unsupported marketing claim`);
  if (contentPath.includes('teaching-locations') || contentPath.includes('ubicaciones-clases-portugues') || contentPath.includes('locais-de-aulas-de-portugues')) {
    if (inPersonPattern.test(title) && !hasVerifiedGoldCoastInPersonOption(frontMatter)) {
      errors.push(`${relative}: location-page title must not imply unverified in-person delivery`);
    }
  }

  const languageTitles = titlesByLanguage.get(language) ?? new Map();
  const duplicate = languageTitles.get(title) ?? [];
  duplicate.push({ relative, route });
  languageTitles.set(title, duplicate);
  titlesByLanguage.set(language, languageTitles);
  records.push({ relative, language, contentPath, title, route, characterCount, pixelWidth });
}

for (const [language, titles] of titlesByLanguage) {
  for (const [title, pages] of titles) {
    const routes = new Set(pages.map((page) => page.route));
    if (routes.size > 1) errors.push(`${language}: duplicate title across canonical routes: ${title}`);
  }
}

for (const record of records) {
  const filePath = htmlFileFor(record.route);
  if (!fs.existsSync(filePath)) {
    errors.push(`${record.relative}: rendered page missing at ${path.relative(projectRoot, filePath)}`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const htmlTitle = normalize(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const ogTitle = normalize(metaContent(html, 'property', 'og:title'));
  const twitterTitle = normalize(metaContent(html, 'name', 'twitter:title'));
  const expectedTitle = record.contentPath === '_index.md' || record.contentPath === 'home/index.md'
    ? languageSiteTitle(record.language)
    : record.title;

  if (htmlTitle !== expectedTitle) errors.push(`${record.relative}: rendered title does not match the expected title`);
  if (ogTitle !== expectedTitle) errors.push(`${record.relative}: Open Graph title does not match the expected title`);
  if (twitterTitle !== expectedTitle) errors.push(`${record.relative}: Twitter title does not match the expected title`);
}

if (errors.length) {
  console.error(`SEO title check failed with ${errors.length} issue(s):\n${errors.join('\n')}`);
  process.exit(1);
}

console.log(`SEO title check passed for ${records.length} Markdown pages.`);
