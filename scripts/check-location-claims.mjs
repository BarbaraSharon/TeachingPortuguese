import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const directories = [
  'content/en/portuguese-teaching-locations',
  'content/es/ubicaciones-clases-portugues',
  'content/pt-br/locais-de-aulas-de-portugues',
];

// These are known false or unsupported claims from the migrated location
// corpus. Verified local organisations, events, history and statistics are
// allowed; this is a regression guard, not a substitute for editorial review.
const prohibited = [
  ['copied population or foreign-born statistics', /(?:1[.,]6\s+(?:million|millones|milhão)|(?:over\s+)?31[.,]5\s*%|(?:over\s+)?31\s*%\s+(?:of|de|dos|das))/iu],
  ['wrong Palm Beach identity', /Palm Beach County|Condado de Palm Beach|Portuguese American Cultural Society of Palm Beach County|Barbora Sharon/iu],
  ['Portugal incorrectly placed in South America', /países (?:lusófonos de Sudamérica|de língua portuguesa na América do Sul).{0,80}Portugal/iu],
  ['unsupported European Portuguese teaching offer', /(?:European Portuguese (?:teacher|tutor|lessons|instruction)|(?:speciali[sz](?:es|ed)|teach(?:es|ing)?|instruction).{0,80}(?:both|either|each) (?:European|dialect)|(?:especializad[ao]|experiencia|experiência).{0,60}(?:ambos dialectos|dois dialetos)|(?:courses|lessons|instruction).{0,50}(?:each dialect|both dialects))/iu],
  ['unsupported free-trial offer', /free trial|trial lesson|aula (?:experimental )?(?:gratuita|grátis)|clase de prueba gratuita/iu],
  ['teacher incorrectly based in a service city', /(?:teacher|tutor|instructor) based in (?!Australia\b|the Gold Coast\b)|radicada en (?!Australia\b|Gold Coast\b)|baseada em (?!Austr[aá]lia\b|Gold Coast\b)/iu],
];

const errors = [];
let count = 0;
for (const directory of directories) {
  const entries = fs.readdirSync(path.join(root, directory), { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  assert.equal(entries.length, 191, `${directory}: expected 191 location pages`);
  for (const entry of entries) {
    const relative = `${directory}/${entry.name}/index.md`;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    assert.ok(match, `${relative}: missing YAML front matter`);
    const [, frontMatter, body] = match;
    for (const [label, pattern] of prohibited) {
      if (pattern.test(body)) errors.push(`${relative}: ${label}`);
    }
    const city = frontMatter.match(/^city:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim().toLowerCase() ?? '';
    if (/\bBCAAB\b|Brazilian Community Association of Alberta/iu.test(body) && !['calgary', 'edmonton'].includes(city)) {
      errors.push(`${relative}: Alberta community association is outside its approved city set`);
    }
    if (/^service_scope:\s*online_only\s*$/m.test(frontMatter)) {
      const localDeliveryClaim = /^## .*?(?:in-person|face-to-face|presencia)/mi.test(body)
        || /both in-person and online|both online and in-person|face-to-face classes near|face-to-face lessons or|clases presenciales cerca de|clases presenciales o sesiones|aulas presenciais perto de|aulas presenciais ou em sessões|presenciais e online|presenciales y en línea|online e presencial|en línea como presencialmente|local tutor like Barbara|tutora local como Barbara/iu.test(body);
      if (localDeliveryClaim) errors.push(`${relative}: local in-person offer conflicts with online-only scope`);
    }
    if (!/^country:\s*["']?Australia["']?\s*$/m.test(frontMatter)) {
      if (/^## .*?, Austr[aá]lia?\b|from anywhere in Australia|desde cualquier lugar de Australia|de qualquer lugar (?:na|da) Austrália/mi.test(body)) {
        errors.push(`${relative}: foreign location described as Australia`);
      }
    }
    if (/^#{2,6}[^\n]+\n\s*\n(?=#{2,6}|$)/m.test(body)) {
      errors.push(`${relative}: empty section after claim removal`);
    }
    if (body.trim().split(/\s+/u).length < 60) errors.push(`${relative}: missing substantive lesson guidance`);
    if (!body.includes('Barbara') || !/(?:https:\/\/barbarasharon\.com\.au)?\/(?:en|es|pt-br)\//.test(text)) {
      errors.push(`${relative}: missing teacher identity or useful internal links`);
    }
    count += 1;
  }
}

assert.equal(count, 573, 'Location-claims check must cover all three language corpora');
assert.equal(errors.length, 0, errors.join('\n'));
console.log(`Location-claims checks passed: ${count} source bodies; known false facts, unsupported offers and incomplete edits absent.`);
