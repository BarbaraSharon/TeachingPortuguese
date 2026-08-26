#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const origin = 'https://barbarasharon.com.au';

const languages = {
  en: {
    section: 'answers',
    hubTitle: 'Portuguese Learning Answers and Lesson Guidance',
    hreflang: 'en-au',
    authorLabel: 'About the author',
    reviewLabel: 'current Google reviews',
    contactLabel: 'Contact Barbara',
    homeId: 'popular-portuguese-questions',
    homeCopy: 'Private and group Brazilian Portuguese lessons online worldwide',
    onlinePath: 'portuguese-teaching-services/online-portuguese-lessons',
    onlineCopy: 'Choose private or group lessons online',
    privatePath: 'portuguese-teaching-services/portuguese-tutoring-gold-coast',
    privateCopy: 'Build confidence with focused one-to-one Brazilian Portuguese lessons',
    ordinaryPath: 'howto-learn-portuguese',
    hiddenLocation: '/en/portuguese-teaching-locations/advancetown/',
    answers: [
      ['answer-learn-portuguese-gold-coast', 'where-to-learn-portuguese-gold-coast', 'Where Can I Learn Portuguese on the Gold Coast?'],
      ['answer-choose-portuguese-tutor-gold-coast', 'best-portuguese-tutor-gold-coast', 'How to Choose the Best Portuguese Tutor on the Gold Coast'],
      ['answer-learn-brazilian-portuguese-method', 'best-way-to-learn-brazilian-portuguese', 'What Is the Best Way to Learn Brazilian Portuguese?'],
      ['answer-private-portuguese-lessons-australia', 'private-portuguese-lessons-australia', 'Where Can I Find Private Portuguese Lessons in Australia?'],
      ['answer-choose-online-brazilian-portuguese-lessons', 'best-online-brazilian-portuguese-lessons', 'How to Choose the Best Online Brazilian Portuguese Lessons'],
      ['answer-tutor-marketplaces-vs-independent-portuguese-teacher', 'tutor-marketplaces-vs-independent-portuguese-teacher', 'Preply or Superprof vs an Independent Portuguese Teacher'],
      ['answer-portuguese-travel-conversation', 'learn-portuguese-for-travel-and-conversation', 'How Can I Learn Portuguese for Travel and Conversation?'],
      ['answer-portuguese-lesson-cost-australia', 'how-much-portuguese-lessons-cost-australia', 'How Much Do Portuguese Lessons Cost in Australia?'],
      ['answer-private-vs-group-portuguese-lessons', 'private-vs-group-portuguese-lessons', 'Private or Group Portuguese Lessons: Which Is Better?'],
      ['answer-time-to-learn-brazilian-portuguese', 'how-long-learn-brazilian-portuguese', 'How Long Does It Take to Learn Brazilian Portuguese?'],
      ['answer-brazilian-portuguese-difficulty-english', 'is-brazilian-portuguese-hard-english-speakers', 'Is Brazilian Portuguese Hard for English Speakers?'],
      ['answer-online-portuguese-effective-beginners', 'online-portuguese-lessons-effective-beginners', 'Are Online Portuguese Lessons Effective for Beginners?'],
      ['answer-portuguese-lesson-frequency', 'how-often-take-portuguese-lessons', 'How Often Should I Take Portuguese Lessons?'],
      ['answer-adults-learn-brazilian-portuguese', 'can-adults-learn-brazilian-portuguese', 'Can Adults Learn Brazilian Portuguese?'],
      ['answer-understand-portuguese-cannot-speak', 'understand-portuguese-but-cannot-speak', 'Why Can I Understand Portuguese but Not Speak It?'],
      ['answer-grammar-to-speak-portuguese', 'need-grammar-to-speak-portuguese', 'Do I Need Grammar to Speak Portuguese?'],
      ['answer-improve-brazilian-portuguese-pronunciation', 'improve-brazilian-portuguese-pronunciation', 'How Can I Improve Brazilian Portuguese Pronunciation?'],
      ['answer-portuguese-spanish-similarity', 'how-similar-portuguese-spanish', 'How Similar Are Portuguese and Spanish?'],
      ['answer-portuguese-brazilian-partner-family', 'learn-portuguese-brazilian-partner', 'How Can I Learn Portuguese for a Brazilian Partner?'],
    ],
  },
  es: {
    section: 'respuestas',
    hubTitle: 'Respuestas para aprender portugués brasileño',
    hreflang: 'es',
    authorLabel: 'Sobre la autora',
    reviewLabel: 'opiniones actuales en Google',
    contactLabel: 'Contacta con Barbara',
    homeId: 'preguntas-populares-portugues',
    homeCopy: 'Clases particulares y grupales de portugués brasileño en línea en todo el mundo',
    onlinePath: 'servicios-clases-portugues/clases-portugues-online',
    onlineCopy: 'Elige clases particulares o grupales en línea',
    privatePath: 'servicios-clases-portugues/clases-particulares-portugues-gold-coast',
    privateCopy: 'Gana confianza con clases individuales y concentradas de portugués brasileño',
    ordinaryPath: 'como-aprender-portugues',
    hiddenLocation: '/es/ubicaciones-clases-portugues/advancetown/',
    answers: [
      ['answer-learn-portuguese-gold-coast', 'donde-aprender-portugues-gold-coast', '¿Dónde aprender portugués en Gold Coast?'],
      ['answer-choose-portuguese-tutor-gold-coast', 'mejor-profesor-portugues-gold-coast', 'Cómo elegir al mejor profesor de portugués en Gold Coast'],
      ['answer-learn-brazilian-portuguese-method', 'mejor-forma-aprender-portugues-brasileno', '¿Cuál es la mejor forma de aprender portugués brasileño?'],
      ['answer-private-portuguese-lessons-australia', 'clases-privadas-portugues-australia', '¿Dónde buscar clases privadas de portugués en Australia?'],
      ['answer-choose-online-brazilian-portuguese-lessons', 'mejores-clases-portugues-online', 'Cómo elegir las mejores clases de portugués online'],
      ['answer-tutor-marketplaces-vs-independent-portuguese-teacher', 'plataformas-tutores-vs-profesora-portugues-independiente', 'Preply, Superprof o profesora independiente de portugués'],
      ['answer-portuguese-travel-conversation', 'aprender-portugues-viajes-conversacion', '¿Cómo aprender portugués para viajes y conversación?'],
      ['answer-portuguese-lesson-cost-australia', 'cuanto-cuestan-clases-portugues-australia', '¿Cuánto cuestan las clases de portugués en Australia?'],
      ['answer-private-vs-group-portuguese-lessons', 'clases-portugues-privadas-o-grupales', 'Clases de portugués privadas o grupales: ¿cuál elegir?'],
      ['answer-time-to-learn-brazilian-portuguese', 'cuanto-se-tarda-aprender-portugues-brasileno', '¿Cuánto se tarda en aprender portugués brasileño?'],
      ['answer-brazilian-portuguese-difficulty-english', 'es-dificil-portugues-brasileno-anglohablantes', '¿Es difícil el portugués brasileño para anglohablantes?'],
      ['answer-online-portuguese-effective-beginners', 'clases-online-portugues-principiantes', 'Clases online de portugués para principiantes: ¿funcionan?'],
      ['answer-portuguese-lesson-frequency', 'frecuencia-clases-portugues', '¿Con qué frecuencia debo tomar clases de portugués?'],
      ['answer-adults-learn-brazilian-portuguese', 'adultos-aprender-portugues-brasileno', '¿Pueden los adultos aprender portugués brasileño?'],
      ['answer-understand-portuguese-cannot-speak', 'entender-portugues-no-hablarlo', '¿Por qué entiendo portugués pero no puedo hablarlo?'],
      ['answer-grammar-to-speak-portuguese', 'necesito-gramatica-hablar-portugues', '¿Necesito gramática para hablar portugués?'],
      ['answer-improve-brazilian-portuguese-pronunciation', 'mejorar-pronunciacion-portugues-brasileno', '¿Cómo mejorar mi pronunciación en portugués brasileño?'],
      ['answer-portuguese-spanish-similarity', 'similitud-portugues-espanol', '¿Cuánto se parecen el portugués y el español?'],
      ['answer-portuguese-brazilian-partner-family', 'aprender-portugues-pareja-brasilena', '¿Cómo aprender portugués para una pareja brasileña?'],
    ],
  },
  'pt-br': {
    section: 'respostas',
    hubTitle: 'Respostas para aprender português brasileiro',
    hreflang: 'pt-BR',
    authorLabel: 'Sobre a autora',
    reviewLabel: 'avaliações atuais no Google',
    contactLabel: 'Fale com a Barbara',
    homeId: 'perguntas-populares-portugues',
    homeCopy: 'Aulas particulares e em grupo de português brasileiro, online para todo o mundo',
    onlinePath: 'aulas-de-portugues/aulas-online',
    onlineCopy: 'Escolha aulas particulares ou em grupo online',
    privatePath: 'aulas-de-portugues/aulas-particulares-portugues-gold-coast',
    privateCopy: 'Desenvolva confiança com aulas individuais e direcionadas de português brasileiro',
    ordinaryPath: 'como-aprender-portugues',
    hiddenLocation: '/pt-br/locais-de-aulas-de-portugues/advancetown/',
    answers: [
      ['answer-learn-portuguese-gold-coast', 'onde-aprender-portugues-gold-coast', 'Onde aprender português na Gold Coast?'],
      ['answer-choose-portuguese-tutor-gold-coast', 'melhor-professor-portugues-gold-coast', 'Melhor professor de português na Gold Coast: como escolher'],
      ['answer-learn-brazilian-portuguese-method', 'melhor-forma-aprender-portugues-brasileiro', 'Qual é a melhor forma de aprender português brasileiro?'],
      ['answer-private-portuguese-lessons-australia', 'aulas-particulares-portugues-australia', 'Onde buscar aulas particulares de português na Austrália?'],
      ['answer-choose-online-brazilian-portuguese-lessons', 'melhores-aulas-portugues-online', 'Como escolher as melhores aulas de português online'],
      ['answer-tutor-marketplaces-vs-independent-portuguese-teacher', 'plataformas-professores-vs-professora-portugues-independente', 'Preply, Superprof ou professora independente de português'],
      ['answer-portuguese-travel-conversation', 'aprender-portugues-viagens-conversacao', 'Como aprender português para viagens e conversação?'],
      ['answer-portuguese-lesson-cost-australia', 'quanto-custam-aulas-portugues-australia', 'Quanto custam as aulas de português na Austrália?'],
      ['answer-private-vs-group-portuguese-lessons', 'aulas-particulares-ou-em-grupo', 'Aulas particulares ou em grupo: qual escolher?'],
      ['answer-time-to-learn-brazilian-portuguese', 'quanto-tempo-aprender-portugues-brasileiro', 'Quanto tempo leva para aprender português brasileiro?'],
      ['answer-brazilian-portuguese-difficulty-english', 'portugues-brasileiro-dificil-falantes-ingles', 'Português brasileiro é difícil para falantes de inglês?'],
      ['answer-online-portuguese-effective-beginners', 'aulas-online-portugues-iniciantes', 'Aulas online de português funcionam para iniciantes?'],
      ['answer-portuguese-lesson-frequency', 'frequencia-aulas-portugues', 'Com que frequência devo fazer aulas de português?'],
      ['answer-adults-learn-brazilian-portuguese', 'adultos-aprender-portugues-brasileiro', 'Adultos conseguem aprender português brasileiro?'],
      ['answer-understand-portuguese-cannot-speak', 'entender-portugues-nao-falar', 'Por que entendo português, mas não consigo falar?'],
      ['answer-grammar-to-speak-portuguese', 'preciso-gramatica-falar-portugues', 'Preciso de gramática para falar português?'],
      ['answer-improve-brazilian-portuguese-pronunciation', 'melhorar-pronuncia-portugues-brasileiro', 'Como melhorar a pronúncia do português brasileiro?'],
      ['answer-portuguese-spanish-similarity', 'semelhanca-portugues-espanhol', 'Qual é a semelhança entre português e espanhol?'],
      ['answer-portuguese-brazilian-partner-family', 'aprender-portugues-parceiro-brasileiro', 'Como aprender português para um parceiro brasileiro?'],
    ],
  },
};

const comparisonPageChecks = {
  en: {
    costLabel: 'No marketplace fee layer between learner and teacher',
    dependsLabel: 'Teacher-dependent — not star-rated',
    costSummary: 'Working directly removes that marketplace fee layer',
  },
  es: {
    costLabel: 'Sin una capa de cargos de plataforma entre estudiante y docente',
    dependsLabel: 'Depende del docente — sin estrellas',
    costSummary: 'El trato directo elimina esa capa de cargos',
  },
  'pt-br': {
    costLabel: 'Sem uma camada de cobrança da plataforma entre aluno e professor',
    dependsLabel: 'Depende do professor — sem estrelas',
    costSummary: 'A contratação direta elimina essa camada de cobrança',
  },
};

function read(relative) {
  return fs.readFileSync(path.join(projectRoot, relative), 'utf8');
}

function frontMatter(source, relative) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${relative}: missing YAML front matter`);
  return match[1];
}

function scalar(raw, key) {
  const value = raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  return value;
}

function decodeHtml(value) {
  const named = { amp: '&', quot: '"', apos: "'", '#39': "'", nbsp: ' ' };
  return value.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(amp|quot|apos|#39|nbsp));/gi, (entity, hexadecimal, decimal, name) => {
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    return named[name.toLowerCase()] ?? entity;
  });
}

function normalize(value) {
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonLdNodes(html) {
  return [...html.matchAll(/<script[^>]+type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => {
      const object = JSON.parse(match[1]);
      return object['@graph'] ?? [object];
    });
}

function hasType(node, type) {
  return node['@type'] === type || (Array.isArray(node['@type']) && node['@type'].includes(type));
}

function assertCanonical(html, canonical, outputPath) {
  const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(html, new RegExp(`<link[^>]+rel=["']?canonical["']?[^>]+href=["']?${escaped}["']?`, 'i'), `${outputPath}: self-canonical is missing`);
}

function assertAlternate(html, hreflang, canonical, outputPath) {
  const expected = `rel=alternate hreflang=${hreflang} href=${canonical}`;
  const quoted = `rel="alternate" hreflang="${hreflang}" href="${canonical}"`;
  assert.ok(html.includes(expected) || html.includes(quoted), `${outputPath}: missing ${hreflang} alternate ${canonical}`);
}

const translationsByKey = new Map();
for (const [language, config] of Object.entries(languages)) {
  for (const [translationKey, slug] of config.answers) {
    const routes = translationsByKey.get(translationKey) ?? {};
    routes[language] = `/${language}/${config.section}/${slug}/`;
    translationsByKey.set(translationKey, routes);
  }
}

for (const [language, config] of Object.entries(languages)) {
  const sitemap = read(`public/${language}/sitemap.xml`);
  const languageTitles = new Set();
  const languageDescriptions = new Set();

  for (const [translationKey, slug, expectedTitle] of config.answers) {
    const sourcePath = `content/${language}/${config.section}/${slug}/index.md`;
    const outputPath = `public/${language}/${config.section}/${slug}/index.html`;
    const source = read(sourcePath);
    const raw = frontMatter(source, sourcePath);
    const title = scalar(raw, 'title');
    const description = scalar(raw, 'description');
    const question = scalar(raw, 'question');
    const directAnswer = scalar(raw, 'direct_answer');
    const wordCount = directAnswer.trim().split(/\s+/).length;
    const route = `/${language}/${config.section}/${slug}/`;
    const canonical = `${origin}${route}`;

    assert.equal(scalar(raw, 'translationKey'), translationKey, `${sourcePath}: translationKey is incorrect`);
    assert.equal(scalar(raw, 'type'), 'answers', `${sourcePath}: type must be answers`);
    assert.equal(title, expectedTitle, `${sourcePath}: title does not match the approved localized answer title`);
    assert.equal(question, expectedTitle, `${sourcePath}: question must match the H1`);
    assert.ok(description, `${sourcePath}: description is required`);
    assert.ok(wordCount >= 40 && wordCount <= 80, `${sourcePath}: direct answer has ${wordCount} words; expected 40–80`);
    assert.match(raw, /^authors:\s*\[me\]$/m, `${sourcePath}: authors must be [me]`);
    assert.match(raw, /^date:\s*\d{4}-\d{2}-\d{2}$/m, `${sourcePath}: date is required`);
    assert.match(raw, /^lastmod:\s*\d{4}-\d{2}-\d{2}$/m, `${sourcePath}: lastmod is required`);
    assert.match(raw, /^robots:\s*index, follow, max-image-preview:large$/m, `${sourcePath}: robots directive is incorrect`);
    assert.match(raw, /^image:\n\s+filename:/m, `${sourcePath}: image is required`);
    assert.match(raw, /^related_pages:\n/m, `${sourcePath}: related pages are required`);
    const relatedUrls = [...raw.matchAll(/^\s+url:\s*(\/(?:en|es|pt-br)\/[^\s]+)$/gm)].map((match) => match[1]);
    assert.ok(relatedUrls.length >= 5, `${sourcePath}: expected at least five related internal links`);
    assert.ok(relatedUrls.every((url) => url.startsWith(`/${language}/`)), `${sourcePath}: related links must stay in the page language`);
    assert.ok(!languageTitles.has(title), `${sourcePath}: duplicate localized answer title`);
    assert.ok(!languageDescriptions.has(description), `${sourcePath}: duplicate localized answer description`);
    languageTitles.add(title);
    languageDescriptions.add(description);

    const html = read(outputPath);
    const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    assert.equal(h1s.length, 1, `${outputPath}: expected exactly one H1`);
    assert.equal(normalize(h1s[0][1]), expectedTitle, `${outputPath}: rendered H1 is incorrect`);
    assert.match(html, /<\/h1>\s*<p\b[^>]*data-direct-answer[^>]*>/i, `${outputPath}: direct answer must immediately follow the H1`);
    assert.ok(normalize(html).includes(directAnswer), `${outputPath}: direct answer is not visible`);
    assertCanonical(html, canonical, outputPath);
    assert.match(html, /<meta\s+name=["']?robots["']?\s+content=["']?index, follow, max-image-preview:large["']?/i, `${outputPath}: robots meta is incorrect`);
    assert.ok(html.includes('data-pagefind-body'), `${outputPath}: Pagefind body marker is missing`);
    assert.ok(normalize(html).includes(config.authorLabel), `${outputPath}: localized author credentials are not visible`);
    assert.ok(normalize(html).includes(config.reviewLabel), `${outputPath}: localized review evidence is not visible`);
    assert.ok(normalize(html).includes(config.contactLabel), `${outputPath}: localized contact CTA is missing`);

    if (translationKey === 'answer-tutor-marketplaces-vs-independent-portuguese-teacher') {
      const check = comparisonPageChecks[language];
      const comparisonTable = html.match(/<table\b[^>]*>[\s\S]*?comparison-stars[\s\S]*?<\/table>/i)?.[0] ?? '';
      assert.ok(comparisonTable, `${outputPath}: star comparison table is missing`);
      assert.equal((comparisonTable.match(/class=comparison-stars|class="comparison-stars"/g) ?? []).length, 8, `${outputPath}: expected eight star ratings`);
      assert.equal((comparisonTable.match(/class=comparison-depends|class="comparison-depends"/g) ?? []).length, 2, `${outputPath}: both teacher-quality cells must be unranked`);
      assert.equal((comparisonTable.match(/<strong>[1-5]\/5<\/strong>/g) ?? []).length, 8, `${outputPath}: every star rating needs a visible numeric score`);
      assert.equal((comparisonTable.match(/<tr\b/g) ?? []).length, 6, `${outputPath}: comparison table must have one header and five criteria rows`);
      assert.ok(normalize(comparisonTable).includes(check.costLabel), `${outputPath}: marketplace fee comparison is missing`);
      assert.equal(normalize(comparisonTable).split(check.dependsLabel).length - 1, 2, `${outputPath}: teacher-dependent caveat must appear in both routes`);
      assert.ok(normalize(html).includes(check.costSummary), `${outputPath}: plain-language cost summary is missing`);
    }

    for (const relatedUrl of relatedUrls) {
      assert.ok(html.includes(`href=${relatedUrl}`) || html.includes(`href="${relatedUrl}"`), `${outputPath}: related link ${relatedUrl} is missing`);
    }

    const nodes = jsonLdNodes(html);
    for (const type of ['Article', 'WebPage', 'BreadcrumbList', 'Person', 'Organization']) {
      assert.ok(nodes.some((node) => hasType(node, type)), `${outputPath}: JSON-LD is missing ${type}`);
    }
    assert.ok(!nodes.some((node) => hasType(node, 'QAPage')), `${outputPath}: must not emit QAPage`);
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${outputPath}: canonical URL is missing from the sitemap`);

    const translatedRoutes = translationsByKey.get(translationKey);
    for (const [translatedLanguage, translatedRoute] of Object.entries(translatedRoutes)) {
      assertAlternate(html, languages[translatedLanguage].hreflang, `${origin}${translatedRoute}`, outputPath);
    }
    assertAlternate(html, 'x-default', `${origin}${translatedRoutes.en}`, outputPath);
  }

  const hubRoute = `/${language}/${config.section}/`;
  const hubPath = `public${hubRoute}index.html`;
  const hub = read(hubPath);
  const hubNodes = jsonLdNodes(hub);
  const faq = hubNodes.find((node) => hasType(node, 'FAQPage'));
  assert.ok(faq, `${hubPath}: answer hub must emit FAQPage JSON-LD`);
  assert.equal(faq.mainEntity?.length, config.answers.length, `${hubPath}: FAQPage must contain ${config.answers.length} visible questions`);
  assert.ok(!hubNodes.some((node) => hasType(node, 'QAPage')), `${hubPath}: answer hub must not emit QAPage`);
  assert.equal(normalize(hub.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''), config.hubTitle, `${hubPath}: localized hub H1 is incorrect`);
  for (const [, slug, question] of config.answers) {
    assert.ok(hub.includes(`/${language}/${config.section}/${slug}/`), `${hubPath}: answer hub is missing ${slug}`);
    assert.ok(normalize(hub).includes(question), `${hubPath}: answer hub is missing visible question ${question}`);
  }

  const home = read(`public/${language}/index.html`);
  assert.ok(home.includes(hubRoute), `${language}: Resources navigation is missing the localized answer hub`);
  assert.ok(home.includes(config.homeId), `${language}: homepage is missing the localized popular-questions section`);

  for (const [outputPath, requiredText] of [
    [`public/${language}/index.html`, config.homeCopy],
    [`public/${language}/${config.onlinePath}/index.html`, config.onlineCopy],
    [`public/${language}/${config.privatePath}/index.html`, config.privateCopy],
  ]) {
    const html = read(outputPath);
    const noScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(normalize(noScripts).includes(requiredText), `${outputPath}: primary copy disappears without scripts`);
    assert.ok(normalize(noScripts).includes(config.contactLabel), `${outputPath}: localized CTA disappears without scripts`);
    assert.equal((noScripts.match(/<h1\b/gi) ?? []).length, 1, `${outputPath}: expected one server-rendered H1`);
  }

  const ordinaryArticle = read(`public/${language}/${config.ordinaryPath}/index.html`);
  const beforeMain = ordinaryArticle.slice(0, ordinaryArticle.indexOf('<main'));
  assert.ok(!beforeMain.includes(config.hiddenLocation), `${language}: ordinary article exposes the hidden site-wide location tree before <main>`);
}

console.log('Multilingual AI answer-page and crawler-visible HTML checks passed.');
