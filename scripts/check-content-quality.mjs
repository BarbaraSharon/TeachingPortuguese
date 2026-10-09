#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const contentDirs = ["content/en", "content/es", "content/pt-br"];
const badPhrases = /\b(?:una clases|una opciones|tu opciones|uma aulas|sua aulas|uma classes)\b/i;
const exposedConfig = /(?:^|\s)(?:price_prefix|related_offers|currency_note):/m;

function files(dir, extension = ".md") {
  const absolute = path.join(root, dir);
  return fs.readdirSync(absolute, {withFileTypes: true}).flatMap((entry) => {
    const file = path.join(absolute, entry.name);
    if (entry.isDirectory()) return files(path.relative(root, file), extension);
    return entry.name.endsWith(extension) ? [file] : [];
  });
}

const sourceFiles = contentDirs.flatMap((dir) => files(dir));
const sourceErrors = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (badPhrases.test(text)) sourceErrors.push(`${path.relative(root, file)} contains an ungrammatical translated phrase`);
  const frontMatterEnd = text.indexOf("\n---", 4);
  if (frontMatterEnd >= 0 && exposedConfig.test(text.slice(frontMatterEnd + 4))) {
    sourceErrors.push(`${path.relative(root, file)} exposes pricing configuration in page prose`);
  }
}

const services = sourceFiles.filter((file) => /^service:\s*$/m.test(fs.readFileSync(file, "utf8")));
const expectedModes = {
  "aulas-de-portugues": "online, in_person",
  "aulas-online": "online",
  "online-group-portuguese-classes": "online",
  "aulas-particulares-portugues-gold-coast": "online, in_person",
  "escola-de-portugues-gold-coast": "in_person",
  "ensino-de-portugues-gold-coast": "in_person",
  "portugues-para-iniciantes": "online, in_person",
  "portugues-intermediario": "online, in_person",
  "portugues-avancado": "online, in_person",
  "portugues-para-criancas": "in_person",
  "clube-de-conversacao": "online, in_person",
};
assert.equal(services.length, 33, `Expected 33 service pages, found ${services.length}`);
for (const file of services) {
  const text = fs.readFileSync(file, "utf8");
  const key = text.match(/^translationKey:\s*([^\n]+)/m)?.[1]?.trim();
  const modes = text.match(/^  delivery_modes:\s*\[([^\]]+)\]/m)?.[1]?.replaceAll(" ", "") ?? "";
  assert.equal(modes, expectedModes[key]?.replaceAll(" ", ""), `${path.relative(root, file)} has unexpected delivery_modes`);
}

const publicFiles = fs.existsSync(publicDir) ? files("public", ".html") : [];
const publicErrors = [];
for (const file of publicFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (badPhrases.test(html)) publicErrors.push(`${path.relative(root, file)} contains an ungrammatical phrase`);
  if (exposedConfig.test(html)) publicErrors.push(`${path.relative(root, file)} exposes pricing configuration`);
  if (/regional time zone|zona horaria regional|fuso horário regional/i.test(html)) publicErrors.push(`${path.relative(root, file)} contains an inaccurate regional time-zone claim`);
}

for (const [language, route] of Object.entries({
  en: "en/answers/how-much-portuguese-lessons-cost-australia/index.html",
  es: "es/respuestas/cuanto-cuestan-clases-portugues-australia/index.html",
  "pt-br": "pt-br/respostas/quanto-custam-aulas-portugues-australia/index.html",
})) {
  const html = fs.readFileSync(path.join(publicDir, route), "utf8");
  assert.ok(html.includes({en: "A$290", es: "A$290", "pt-br": "A$290"}[language]), `${language} pricing answer is missing the group price`);
  assert.ok(html.includes("A$370") && html.includes("A$260") && html.includes("A$70") && html.includes("A$25") && html.includes("A$50") && html.includes("A$20"), `${language} pricing answer is missing an approved fee`);
  assert.ok(!html.includes("[[term_10_week_price]]") && !html.includes("[[private_4_week_price]]"), `${language} pricing answer has unresolved answer tokens`);
}

for (const [language, route] of Object.entries({
  en: "en/answers/how-much-portuguese-lessons-cost-australia/index.html",
  es: "es/respuestas/cuanto-cuestan-clases-portugues-australia/index.html",
  "pt-br": "pt-br/respostas/quanto-custam-aulas-portugues-australia/index.html",
})) {
  const html = fs.readFileSync(path.join(publicDir, route), "utf8");
  const expected = {en: "/en/about-learning-portuguese/", es: "/es/sobre-aprender-portugues/", "pt-br": "/pt-br/sobre-aprendizagem-portuguesa/"}[language];
  assert.ok(html.includes(expected), `${language} answer does not link to the indexed About page`);
}

const serviceOverview = fs.readFileSync(path.join(publicDir, "en/portuguese-teaching-services/index.html"), "utf8");
assert.ok(serviceOverview.includes("#enquiry-group-term_10_week"), "service overview is missing the group enquiry context");
assert.ok(serviceOverview.includes("#enquiry-private-private_4_week"), "service overview is missing the private enquiry context");
assert.ok(serviceOverview.includes("#enquiry-online"), "service overview is missing the online enquiry context");
const onlineService = fs.readFileSync(path.join(publicDir, "en/portuguese-teaching-services/online-portuguese-lessons/index.html"), "utf8");
assert.ok(onlineService.includes("data-enquiry-intent=online"), "online service actions must carry online intent");
const contactPage = fs.readFileSync(path.join(publicDir, "en/contact-portuguese-teacher/index.html"), "utf8");
assert.ok(contactPage.includes("data-enquiry-context-summary"), "contact page is missing the enquiry selection summary");
for (const channel of ["email", "whatsapp", "phone"]) {
  assert.ok(contactPage.includes(`data-contact-action=${channel}`), `contact page is missing the ${channel} fallback action`);
}
const enquiryScript = fs.readdirSync(path.join(publicDir, "js")).find((file) => file.startsWith("enquiry-context.") && file.endsWith(".js"));
assert.ok(enquiryScript, "enquiry context script is missing from the generated assets");
const enquirySource = fs.readFileSync(path.join(publicDir, "js", enquiryScript), "utf8");
assert.ok(enquirySource.includes("validIntents") && enquirySource.includes("hashchange"), "enquiry context script must validate fragments and handle fragment changes");
const analyticsSource = fs.readFileSync(path.join(publicDir, "js", fs.readdirSync(path.join(publicDir, "js")).find((file) => file.startsWith("analytics-consent.") && file.endsWith(".js"))), "utf8");
assert.ok(!analyticsSource.includes("path.includes(\"online\")"), "analytics must not infer lesson format from URL substrings");

if (publicErrors.length || sourceErrors.length) {
  console.error([...sourceErrors, ...publicErrors].join("\n"));
  process.exit(1);
}
console.log(`Content-quality checks passed: ${services.length} services, ${sourceFiles.length} source pages, and ${publicFiles.length} generated HTML files.`);
