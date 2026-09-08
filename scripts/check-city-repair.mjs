#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'docs/seo-aeo-repair/city-facts.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const languageDirs = {
  en: 'content/en/portuguese-teaching-locations',
  es: 'content/es/ubicaciones-clases-portugues',
  'pt-br': 'content/pt-br/locais-de-aulas-de-portugues',
};
const countryCodes = {
  Australia: 'AU', Canada: 'CA', Germany: 'DE', 'United States': 'US', 'United Kingdom': 'GB',
  Italy: 'IT', Netherlands: 'NL', Spain: 'ES', France: 'FR', Switzerland: 'CH',
  'United Arab Emirates': 'AE', India: 'IN', 'South Africa': 'ZA', Ireland: 'IE', Sweden: 'SE',
  Portugal: 'PT', Japan: 'JP', Austria: 'AT', 'New Zealand': 'NZ', Belgium: 'BE', Denmark: 'DK',
  Norway: 'NO', Brazil: 'BR', 'South Korea': 'KR', Singapore: 'SG', Israel: 'IL',
};
const requiredAdministrativeAreas = new Map([
  ['location-labrador', 'Queensland, Australia (Gold Coast)'],
  ['location-hamilton', 'Ontario, Canada'],
  ['location-kingston', 'Ontario, Canada'],
  ['location-richmond', 'British Columbia, Canada'],
  ['location-victoria', 'British Columbia, Canada'],
  ['location-austin', 'Texas, United States'],
  ['location-abbotsford', 'British Columbia, Canada'],
  ['location-saint-john', 'New Brunswick, Canada'],
]);

function scalar(raw, key) {
  return raw.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?$`, 'm'))?.[1]?.trim() ?? '';
}

function frontMatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, `Missing front matter: ${path.relative(root, file)}`);
  return { text, raw: match[1] };
}

assert.equal(manifest.schema_version, 1, 'City facts manifest schema is unsupported.');
assert.equal(manifest.time_zone_data_version, '2026c', 'City facts manifest must record the IANA data version.');
assert.equal(manifest.records.length, 191, 'City facts manifest must contain 191 locations.');
const seenKeys = new Set();
const failures = [];

for (const record of manifest.records) {
  if (seenKeys.has(record.translationKey)) failures.push(`${record.translationKey}: duplicate manifest record`);
  seenKeys.add(record.translationKey);
  if (record.status !== 'verified') failures.push(`${record.translationKey}: unresolved factual record`);
  if (!Array.isArray(record.source_paths) || record.source_paths.length !== 3) failures.push(`${record.translationKey}: missing translation source paths`);
  if (!record.evidence_urls?.includes('https://www.iana.org/time-zones')) failures.push(`${record.translationKey}: missing IANA evidence URL`);
  const geoEvidence = record.evidence_urls?.find((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname === 'www.geonames.org' && parsed.pathname === '/search.html';
    } catch (_) {
      return false;
    }
  });
  if (!geoEvidence) {
    failures.push(`${record.translationKey}: missing location-specific GeoNames evidence URL`);
  } else {
    const parsed = new URL(geoEvidence);
    if (parsed.searchParams.get('q') !== record.city || parsed.searchParams.get('country') !== countryCodes[record.country]) {
      failures.push(`${record.translationKey}: GeoNames evidence does not identify the manifest city and country`);
    }
  }
  const requiredArea = requiredAdministrativeAreas.get(record.translationKey);
  if (requiredArea && record.administrative_area !== requiredArea) {
    failures.push(`${record.translationKey}: missing required administrative area (${requiredArea})`);
  }

  for (const [language, relativeDir] of Object.entries(languageDirs)) {
    const relativeFile = `${relativeDir}/${record.slug}/index.md`;
    if (!record.source_paths?.includes(relativeFile)) failures.push(`${record.translationKey}: manifest omits ${relativeFile}`);
    const file = path.join(root, relativeFile);
    if (!fs.existsSync(file)) {
      failures.push(`${record.translationKey}: missing ${relativeFile}`);
      continue;
    }
    const { text, raw } = frontMatter(file);
    if (scalar(raw, 'translationKey') !== record.translationKey) failures.push(`${relativeFile}: translationKey disagrees with manifest`);
    const expectedCity = record.city_display_names?.[language] ?? record.city;
    if (scalar(raw, 'city') !== expectedCity) failures.push(`${relativeFile}: city disagrees with manifest`);
    if (scalar(raw, 'country') !== record.country) failures.push(`${relativeFile}: country disagrees with manifest`);
    if (scalar(raw, 'time_zone') !== record.time_zone) failures.push(`${relativeFile}: time_zone disagrees with manifest`);
    if (scalar(raw, 'editorial_reviewed') !== 'true') failures.push(`${relativeFile}: page is not marked editorial_reviewed`);
    if (!scalar(raw, 'local_context')) failures.push(`${relativeFile}: local_context is empty`);
    const context = scalar(raw, 'local_context');
    if (/\bLocal\s+(?:goals?|focus|context|set)\s*:/i.test(context) || /location set used/i.test(context)) {
      failures.push(`${relativeFile}: editorial label remains in local_context`);
    }
    const ordinaryContext = context.replaceAll(record.time_zone, '');
    const occurrences = ordinaryContext.match(new RegExp(expectedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'))?.length ?? 0;
    if (occurrences > 2) failures.push(`${relativeFile}: locality appears ${occurrences} times in local_context`);
    if (language === 'es' && record.country_display_names?.es === undefined) failures.push(`${relativeFile}: missing Spanish country display name`);
    if (language === 'pt-br' && record.country_display_names?.['pt-br'] === undefined) failures.push(`${relativeFile}: missing Portuguese country display name`);
    if (!text.includes(expectedCity)) failures.push(`${relativeFile}: city is absent from page text`);
  }
}

assert.equal(seenKeys.size, 191, 'City facts manifest contains duplicate or missing translation keys.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('City repair checks passed: 191 verified locations, three translations each, aligned facts, concise contexts and complete review records.');
