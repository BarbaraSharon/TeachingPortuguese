import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const facts = JSON.parse(fs.readFileSync(path.join(root, 'data/seo-aeo-repair/city-facts.json'), 'utf8'));
const delivery = JSON.parse(fs.readFileSync(path.join(root, 'data/seo-aeo-repair/gold-coast-delivery.json'), 'utf8'));
const languages = [
  ['en', 'content/en/portuguese-teaching-locations', /## In-person option for /i],
  ['pt-br', 'content/pt-br/locais-de-aulas-de-portugues', /## Opção presencial para /i],
  ['es', 'content/es/ubicaciones-clases-portugues', /## Opción presencial para /i],
];

function flattenLocations() {
  const result = new Map();
  for (const [band, slugs] of Object.entries(delivery.locations)) {
    assert.ok(delivery.travel_bands[band], `Missing travel band: ${band}`);
    for (const slug of slugs) {
      assert.ok(!result.has(slug), `Duplicate delivery location: ${slug}`);
      result.set(slug, { band, ...delivery.travel_bands[band], ...(delivery.location_overrides?.[slug] ?? {}) });
    }
  }
  return result;
}

function scalar(raw, key) {
  return raw.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?$`, 'm'))?.[1]?.trim() ?? '';
}

const locations = flattenLocations();
assert.equal(locations.size, 60, 'Gold Coast delivery map must cover 60 driving-distance locations.');
const factsBySlug = new Map(facts.records.map((record) => [record.slug, record]));
assert.equal(factsBySlug.size, 191, 'City facts must cover all 191 locations.');
const nearbyLocations = new Set(delivery.nearby_locations ?? []);
for (const slug of nearbyLocations) assert.ok(locations.has(slug), `Nearby location is missing from delivery map: ${slug}`);
assert.equal(delivery.maximum_drive_minutes, 60, 'Delivery map must use a one-hour maximum drive threshold.');

for (const [slug, travel] of locations) {
  const record = factsBySlug.get(slug);
  assert.ok(record, `Delivery map location is missing from city facts: ${slug}`);
  assert.equal(record.service_scope, 'online_plus_confirmed_gold_coast_venue', `${slug}: city facts must allow confirmed Gold Coast delivery.`);
}

for (const [language, directory, heading] of languages) {
  const entries = fs.readdirSync(path.join(root, directory), { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.equal(entries.length, 191, `${language}: expected 191 location pages.`);
  for (const entry of entries) {
    const slug = entry.name;
    const file = path.join(root, directory, slug, 'index.md');
    const text = fs.readFileSync(file, 'utf8');
    const front = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    assert.ok(front, `${language}/${slug}: missing front matter.`);
    const [, raw, body] = front;
    const travel = locations.get(slug);
    if (travel) {
      assert.equal(scalar(raw, 'service_scope'), 'online_plus_confirmed_gold_coast_venue', `${language}/${slug}: delivery scope missing.`);
      const driveRange = travel.drive_time.split(/\s+/u)[0];
      assert.ok(raw.includes(driveRange), `${language}/${slug}: approximate drive time missing.`);
      const upperBound = Number(travel.drive_time.match(/(\d+)\s+minutes$/u)?.[1]);
      assert.ok(Number.isFinite(upperBound) && upperBound <= delivery.maximum_drive_minutes, `${slug}: drive time exceeds the one-hour delivery threshold.`);
      assert.equal(scalar(raw, 'region_group'), nearbyLocations.has(slug) ? 'Australia & New Zealand' : 'Gold Coast', `${language}/${slug}: nearby locations must not be grouped as Gold Coast suburbs.`);
      assert.match(body, heading, `${language}/${slug}: in-person section missing.`);
    } else {
      assert.equal(scalar(raw, 'service_scope'), 'online_only', `${language}/${slug}: unexpected in-person scope.`);
    }
  }
}

console.log(`Gold Coast delivery checks passed: ${locations.size} locations within the one-hour driving threshold, three languages, nearby-region labels, confirmed-venue wording and approximate travel notes.`);
