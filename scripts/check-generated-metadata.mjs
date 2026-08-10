import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const origin = 'https://barbarasharon.com.au';
const organizationId = `${origin}#organization`;

function readOutput(path) {
  return fs.readFileSync(new URL(`../public${path}`, import.meta.url), 'utf8');
}

function assertIncludes(html, value, message) {
  assert.ok(html.includes(value), message);
}

function jsonLdObjects(html) {
  return [...html.matchAll(/<script[^>]+type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

function outputFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return outputFiles(entryPath);
    return entry.name === 'index.html' ? [entryPath] : [];
  });
}

function hasType(node, type) {
  return node['@type'] === type || (Array.isArray(node['@type']) && node['@type'].includes(type));
}

const root = readOutput('/index.html');
assert.ok(!/http-equiv=["']?refresh/i.test(root), 'Root must not contain a meta refresh.');
assertIncludes(root, `<link rel="canonical" href="${origin}/">`, 'Root canonical is missing.');
assertIncludes(root, `hreflang="x-default" href="${origin}/"`, 'Root x-default is missing.');
assertIncludes(root, 'name="twitter:image"', 'Root Twitter image is missing.');
assertIncludes(root, 'property="og:image:alt"', 'Root Open Graph image alt text is missing.');

const rootGraph = jsonLdObjects(root).flatMap((object) => object['@graph'] || [object]);
for (const type of ['WebSite', 'Organization', 'Person']) {
  assert.ok(
    rootGraph.some((node) => node['@type'] === type || (Array.isArray(node['@type']) && node['@type'].includes(type))),
    `Root JSON-LD is missing ${type}.`,
  );
}

for (const [language, path, locale, hreflang] of [
  ['English', '/en/index.html', 'en_AU', 'en-au'],
  ['Portuguese', '/pt-br/index.html', 'pt_BR', 'pt-BR'],
  ['Spanish', '/es/index.html', 'es_ES', 'es'],
]) {
  const html = readOutput(path);
  assertIncludes(html, `hreflang=x-default href=${origin}/`, `${language} homepage x-default is incorrect.`);
  assertIncludes(html, `property="og:locale" content="${locale}"`, `${language} Open Graph locale is incorrect.`);
  assert.ok(/<meta name=["']?twitter:image["']? /i.test(html), `${language} Twitter image must use the name attribute.`);
  assert.ok(!/<meta property=["']?twitter:image["']? /i.test(html), `${language} Twitter image uses the wrong attribute.`);

  const nodes = jsonLdObjects(html).flatMap((object) => object['@graph'] || [object]);
  for (const type of ['Organization', 'Person', 'VideoObject']) {
    assert.ok(
      nodes.some((node) => node['@type'] === type || (Array.isArray(node['@type']) && node['@type'].includes(type))),
      `${language} homepage JSON-LD is missing ${type}.`,
    );
  }

  const sitemap = readOutput(path.replace('index.html', 'sitemap.xml'));
  assertIncludes(sitemap, `hreflang="${hreflang}"`, `${language} sitemap locale is incorrect.`);
  assert.ok(
    sitemap.includes(`hreflang="x-default" href="${origin}/"`),
    `${language} sitemap homepage x-default is incorrect.`,
  );
}

const serviceObjects = outputFiles(fileURLToPath(new URL('../public/', import.meta.url)))
  .flatMap((file) => jsonLdObjects(fs.readFileSync(file, 'utf8')))
  .flatMap((object) => object['@graph'] || [object])
  .filter((node) => hasType(node, 'Service'));

assert.equal(serviceObjects.length, 600, 'Expected 600 rendered Service JSON-LD objects.');
for (const service of serviceObjects) {
  assert.equal(service.provider?.['@id'], organizationId, `Service ${service.name} must use the canonical Organization ID.`);
  assert.ok(service.areaServed, `Service ${service.name} is missing areaServed.`);
}

const locationServices = serviceObjects.filter((service) => service.availableChannel);
assert.equal(locationServices.length, 573, 'Expected 573 location Service JSON-LD objects with an online channel.');
for (const service of locationServices) {
  assert.equal(service.areaServed?.['@type'], 'City', `Location Service ${service.name} must be served in its city.`);
  assert.equal(service.availableChannel?.['@type'], 'ServiceChannel', `Location Service ${service.name} must use a ServiceChannel.`);
  assert.ok(service.availableChannel?.serviceUrl?.startsWith(`${origin}/`), `Location Service ${service.name} must link to an online lesson page.`);
}

const spanishDirectory = readOutput('/es/ubicaciones-clases-portugues/index.html');
assert.ok(/>Ver clases\s*</.test(spanishDirectory), 'Spanish location cards must use the localized CTA.');
assert.ok(!/>View lessons\s*</.test(spanishDirectory), 'Spanish location cards must not use the English CTA.');

console.log('Generated metadata checks passed.');
