import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const origin = 'https://barbarasharon.com.au';
const organizationId = `${origin}#organization`;
const personId = `${origin}#person`;
const authorImage = `${origin}/media/barbara-sharon.jpg`;
const authorSameAs = [
  'https://www.youtube.com/@PortugueseWithBarbaraSharon',
  'https://www.instagram.com/portuguesewithbarbarasharon?igsh=MXVsaWJvOGdiZngxZw%3D%3D&utm_source=website',
  'https://www.tiktok.com/@bahteachmeportuguese',
  'https://www.facebook.com/barbara.sharon1',
];

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

assert.equal(countType('Article'), 102, 'Expected 102 rendered Article nodes.');
assert.equal(countType('Course'), 27, 'Expected twelve page Course nodes plus fifteen homepage review Course nodes.');
assert.equal(countType('FAQPage'), 39, 'Expected thirty-nine rendered FAQPage nodes.');
assert.equal(countType('WebPage'), 93, 'Expected 93 rendered answer WebPage nodes.');
assert.equal(countType('ProfilePage'), 3, 'Expected one localized ProfilePage node per language.');

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

const authorProfiles = [
  {
    language: 'en',
    route: '/en/about-barbara-sharon/',
    hreflang: 'en-au',
    inLanguage: 'en-AU',
    title: 'About Barbara Sharon, Portuguese Teacher and Author',
    jobTitle: 'Brazilian Portuguese Teacher',
    contactLabels: ['Email Barbara', 'Chat with Barbara on WhatsApp'],
    resources: [
      '/en/answers/best-way-to-learn-brazilian-portuguese/',
      '/en/answers/improve-brazilian-portuguese-pronunciation/',
      '/en/answers/what-good-brazilian-portuguese-lesson-includes/',
      '/en/answers/native-speaker-vs-qualified-portuguese-teacher/',
    ],
  },
  {
    language: 'es',
    route: '/es/sobre-barbara-sharon/',
    hreflang: 'es',
    inLanguage: 'es',
    title: 'Sobre Barbara Sharon, profesora y autora',
    jobTitle: 'Profesora de portugués brasileño',
    contactLabels: ['Enviar un correo electrónico a Barbara', 'Contactar con Barbara por WhatsApp'],
    resources: [
      '/es/respuestas/mejor-forma-aprender-portugues-brasileno/',
      '/es/respuestas/mejorar-pronunciacion-portugues-brasileno/',
      '/es/respuestas/que-incluye-buena-clase-portugues-brasileno/',
      '/es/respuestas/hablante-nativo-o-profesor-portugues-cualificado/',
    ],
  },
  {
    language: 'pt-br',
    route: '/pt-br/sobre-barbara-sharon/',
    hreflang: 'pt-BR',
    inLanguage: 'pt-BR',
    title: 'Sobre Barbara Sharon, professora e autora',
    jobTitle: 'Professora de português brasileiro',
    contactLabels: ['Enviar e-mail para Barbara', 'Falar com a Barbara pelo WhatsApp'],
    resources: [
      '/pt-br/respostas/melhor-forma-aprender-portugues-brasileiro/',
      '/pt-br/respostas/melhorar-pronuncia-portugues-brasileiro/',
      '/pt-br/respostas/o-que-boa-aula-portugues-brasileiro-deve-incluir/',
      '/pt-br/respostas/falante-nativo-ou-professor-portugues-qualificado/',
    ],
  },
];

for (const profile of authorProfiles) {
  const outputPath = `${profile.route}index.html`;
  const html = readOutput(outputPath);
  const canonical = `${origin}${profile.route}`;
  assert.ok(
    html.includes(`<link rel=canonical href=${canonical}`) || html.includes(`<link rel="canonical" href="${canonical}"`),
    `${outputPath}: canonical is incorrect.`,
  );
  assert.match(html, /<meta\s+name=["']?robots["']?\s+content=["']?noindex, follow["']?/i, `${outputPath}: profile must remain noindex until editorial approval.`);
  assert.ok(!html.includes('/authors/'), `${outputPath}: retired plural author URL leaked into the rendered profile.`);
  assertIncludes(html, profile.title, `${outputPath}: localized profile title is missing.`);
  for (const label of ['YouTube', 'Instagram', 'TikTok', 'Facebook']) {
    assert.match(html, new RegExp(`aria-label=["']?${label}["']?`), `${outputPath}: ${label} profile label is missing.`);
  }
  for (const label of profile.contactLabels) {
    assert.ok(
      html.includes(`aria-label=${label}`) || html.includes(`aria-label="${label}"`),
      `${outputPath}: localized contact label ${label} is missing.`,
    );
  }
  for (const resource of profile.resources) {
    assert.ok(html.includes(`href=${resource}`) || html.includes(`href="${resource}"`), `${outputPath}: selected resource ${resource} is missing.`);
  }

  const nodes = jsonLdObjects(html).flatMap((object) => object['@graph'] || [object]);
  const profilePage = nodes.find((node) => hasType(node, 'ProfilePage'));
  const person = nodes.find((node) => hasType(node, 'Person') && node['@id'] === personId);
  assert.ok(profilePage, `${outputPath}: ProfilePage JSON-LD is missing.`);
  assert.equal(profilePage['@id'], `${canonical}#profile-page`, `${outputPath}: ProfilePage ID is incorrect.`);
  assert.equal(profilePage.url, canonical, `${outputPath}: ProfilePage URL is incorrect.`);
  assert.equal(profilePage.inLanguage, profile.inLanguage, `${outputPath}: ProfilePage language is incorrect.`);
  assert.equal(profilePage.mainEntity?.['@id'], personId, `${outputPath}: ProfilePage mainEntity is incorrect.`);
  assert.ok(profilePage.dateCreated, `${outputPath}: ProfilePage dateCreated is missing.`);
  assert.ok(profilePage.dateModified, `${outputPath}: ProfilePage dateModified is missing.`);
  assert.ok(person, `${outputPath}: Barbara's Person node is missing.`);
  assert.equal(person.url, canonical, `${outputPath}: Person URL is incorrect.`);
  assert.equal(person.jobTitle, profile.jobTitle, `${outputPath}: Person job title is not localized.`);
  assert.equal(person.image, authorImage, `${outputPath}: Person image is incorrect.`);
  assert.deepEqual(person.sameAs, authorSameAs, `${outputPath}: Person sameAs profiles changed.`);

  const sitemap = readOutput(`/${profile.language}/sitemap.xml`);
  assert.ok(!sitemap.includes(`<loc>${canonical}</loc>`), `${outputPath}: unapproved profile must not appear in the sitemap.`);
  for (const alternate of authorProfiles) {
    const expected = `hreflang=${alternate.hreflang} href=${origin}${alternate.route}`;
    const quoted = `hreflang="${alternate.hreflang}" href="${origin}${alternate.route}"`;
    assert.ok(html.includes(expected) || html.includes(quoted), `${outputPath}: ${alternate.hreflang} alternate is missing.`);
  }
  assert.ok(
    html.includes(`hreflang=x-default href=${origin}/en/about-barbara-sharon/`) || html.includes(`hreflang="x-default" href="${origin}/en/about-barbara-sharon/"`),
    `${outputPath}: x-default is incorrect.`,
  );
}

for (const oldOutput of ['/en/authors/index.html', '/es/authors/index.html', '/pt-br/authors/index.html']) {
  assert.equal(fs.existsSync(new URL(`../public${oldOutput}`, import.meta.url)), false, `${oldOutput}: retired author page must not be generated.`);
}

const redirects = readOutput('/_redirects');
for (const rule of [
  '/en/authors/ /en/about-barbara-sharon/ 301',
  '/es/authors/ /es/sobre-barbara-sharon/ 301',
  '/pt-br/authors/ /pt-br/sobre-barbara-sharon/ 301',
]) {
  assertIncludes(redirects, rule, `Missing author profile redirect: ${rule}`);
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
