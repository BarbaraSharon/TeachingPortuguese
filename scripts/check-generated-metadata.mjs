import assert from 'node:assert/strict';
import fs from 'node:fs';

const origin = 'https://barbarasharon.com.au';

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

console.log('Generated metadata checks passed.');
