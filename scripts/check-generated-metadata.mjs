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
const rootSource = fs.readFileSync(new URL('../static/index.html', import.meta.url), 'utf8');
assert.equal(root, rootSource, 'Root language-selection page must match its static source.');
assertIncludes(root, `<link rel="canonical" href="${origin}/en/">`, 'Root router must canonicalize to the English homepage.');
assertIncludes(root, `<meta property="og:url" content="${origin}/en/">`, 'Root router Open Graph URL must match its canonical.');
assertIncludes(root, `<meta name="twitter:url" content="${origin}/en/">`, 'Root router Twitter URL must match its canonical.');
assert.ok(!/hreflang=/i.test(root), 'Non-canonical root router must not emit hreflang annotations.');

for (const [language, path, locale, hreflang] of [
  ['English', '/en/index.html', 'en_AU', 'en-au'],
  ['Portuguese', '/pt-br/index.html', 'pt_BR', 'pt-BR'],
  ['Spanish', '/es/index.html', 'es_ES', 'es'],
]) {
  const html = readOutput(path);
  assertIncludes(html, `hreflang=x-default href=${origin}/en/`, `${language} homepage x-default is incorrect.`);
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
    sitemap.includes(`hreflang="x-default" href="${origin}/en/"`),
    `${language} sitemap homepage x-default is incorrect.`,
  );
}

const serviceObjects = outputFiles(fileURLToPath(new URL('../public/', import.meta.url)))
  .flatMap((file) => jsonLdObjects(fs.readFileSync(file, 'utf8')))
  .flatMap((object) => object['@graph'] || [object])
  .filter((node) => hasType(node, 'Service'));

assert.equal(serviceObjects.length, 603, 'Expected 603 rendered Service JSON-LD objects.');
for (const service of serviceObjects) {
  assert.ok(service['@id']?.endsWith('#service'), `Service ${service.name} must have a stable @id.`);
  assert.ok(service.url?.startsWith(`${origin}/`), `Service ${service.name} must have a canonical URL.`);
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

const renderedPages = outputFiles(fileURLToPath(new URL('../public/', import.meta.url))).map((file) => ({
  file,
  html: fs.readFileSync(file, 'utf8'),
}));
const pageNodes = renderedPages.map(({ file, html }) => ({
  file,
  html,
  nodes: jsonLdObjects(html).flatMap((object) => object['@graph'] || [object]),
}));
const countType = (type) => pageNodes.flatMap((page) => page.nodes).filter((node) => hasType(node, type)).length;

assert.equal(countType('Article'), 63, 'Expected sixty-three rendered Article nodes.');
assert.equal(countType('Course'), 12, 'Expected twelve rendered Course nodes.');
assert.equal(countType('FAQPage'), 39, 'Expected thirty-nine rendered FAQPage nodes.');
assert.equal(countType('WebPage'), 54, 'Expected fifty-four rendered answer WebPage nodes.');

for (const page of pageNodes) {
  const ids = page.nodes.map((node) => node['@id']).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, `${page.file} contains duplicate JSON-LD @id values.`);

  const noindex = /<meta\s+name=robots\s+content=["']?[^>]*noindex/i.test(page.html);
  const isAlias = /http-equiv=["']?refresh/i.test(page.html);
  const breadcrumbs = page.nodes.filter((node) => hasType(node, 'BreadcrumbList'));
  const isRoot = page.file.endsWith(`${path.sep}public${path.sep}index.html`);
  const isLanguageHome = ['en', 'es', 'pt-br'].some((language) => page.file.endsWith(`${path.sep}public${path.sep}${language}${path.sep}index.html`));
  // Breadcrumb JSON-LD is required on every eligible page, regardless of
  // whether that page layout also renders a visible breadcrumb trail.
  if (noindex || isAlias || isRoot || isLanguageHome) {
    assert.equal(breadcrumbs.length, 0, `${page.file} must not emit breadcrumbs.`);
  } else {
    assert.equal(breadcrumbs.length, 1, `${page.file} must emit exactly one breadcrumb list.`);
    const items = breadcrumbs[0].itemListElement;
    assert.ok(Array.isArray(items) && items.length >= 2, `${page.file} breadcrumb list must contain at least two items.`);
    assert.deepEqual(items.map((item) => item.position), items.map((_, index) => index + 1), `${page.file} breadcrumb positions are invalid.`);
  }

  const twitterAlt = page.html.match(/<meta\s+name=["']?twitter:image:alt["']?\s+content=["']([^"']+)/i)?.[1];
  const ogAlt = page.html.match(/<meta\s+property=["']?og:image:alt["']?\s+content=["']([^"']+)/i)?.[1];
  if (twitterAlt) assert.equal(ogAlt, twitterAlt, `${page.file} Open Graph image alt text must match Twitter image alt text.`);

  for (const article of page.nodes.filter((node) => hasType(node, 'Article'))) {
    for (const property of ['headline', 'description', 'url', 'inLanguage', 'datePublished', 'dateModified', 'image', 'author', 'publisher']) {
      assert.ok(article[property], `${page.file} Article is missing ${property}.`);
    }
    assert.equal(article.mainEntityOfPage?.['@id'], article.url, `${page.file} Article canonical URL is inconsistent.`);
  }

  for (const faq of page.nodes.filter((node) => hasType(node, 'FAQPage'))) {
    for (const question of faq.mainEntity || []) {
      assert.ok(question.name, `${page.file} FAQ item is missing its question.`);
      assert.ok(question.acceptedAnswer?.text, `${page.file} FAQ question is missing an accepted answer.`);
    }
  }
}

for (const [relative, expectedType] of [
  ['/en/howto-learn-portuguese/index.html', 'article'],
  ['/en/portuguese-beginner-phrases/index.html', 'article'],
  ['/en/newsletter/may-2025/index.html', 'article'],
  ['/en/portuguese-teaching-services/online-portuguese-lessons/index.html', 'website'],
  ['/en/portuguese-for-travel/index.html', 'website'],
  ['/en/portuguese-teaching-locations/advancetown/index.html', 'website'],
  ['/en/contact-portuguese-teacher/index.html', 'website'],
  ['/en/privacy/index.html', 'website'],
]) {
  const html = readOutput(relative);
  assertIncludes(html, `property="og:type" content="${expectedType}"`, `${relative} Open Graph type is incorrect.`);
  const hasArticleTimes = html.includes('property="article:published_time"');
  assert.equal(hasArticleTimes, expectedType === 'article', `${relative} article timestamps do not match its Open Graph type.`);
}

const spanishDirectory = readOutput('/es/ubicaciones-clases-portugues/index.html');
assert.ok(/>Ver clases\s*</.test(spanishDirectory), 'Spanish location cards must use the localized CTA.');
assert.ok(!/>View lessons\s*</.test(spanishDirectory), 'Spanish location cards must not use the English CTA.');

console.log('Generated metadata checks passed.');
