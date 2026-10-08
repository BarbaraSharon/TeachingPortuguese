import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const publicDir = path.join(root, "public");
assert.ok(fs.existsSync(publicDir), "public/ is missing; run the Hugo build first");

const expectedOffers = [
  "term_10_week",
  "term_10_week_1_5_hour",
  "private_4_week",
  "private_casual",
  "speaking_club_enrolled",
  "speaking_club_non_enrolled",
];
const expectedIntents = new Set([
  "online",
  "gold_coast_group",
  "gold_coast_private",
  "group",
  "private",
  "speaking_club",
  "unspecified",
]);
const languagePages = [
  {code: "en", path: "en/contact-portuguese-teacher/index.html", privatePath: "en/portuguese-teaching-services/portuguese-tutoring-gold-coast/index.html"},
  {code: "es", path: "es/contacto-profesora-portugues/index.html", privatePath: "es/servicios-clases-portugues/clases-particulares-portugues-gold-coast/index.html"},
  {code: "pt-br", path: "pt-br/contato-professora-portugues/index.html", privatePath: "pt-br/aulas-de-portugues/aulas-particulares-portugues-gold-coast/index.html"},
];

function decodeHtml(value) {
  return String(value || "").replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, token) => {
    const lower = token.toLowerCase();
    if (lower === "amp") return "&";
    if (lower === "lt") return "<";
    if (lower === "gt") return ">";
    if (lower === "quot") return '"';
    if (lower === "apos") return "'";
    if (lower === "#39") return "'";
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    return String.fromCodePoint(parseInt(lower.slice(1), 10));
  });
}

function attribute(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = String(tag).match(pattern);
  if (!match) return null;
  return decodeHtml(match[1] ?? match[2] ?? match[3] ?? "");
}

function anchorTags(html) {
  return [...String(html).matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);
}

function mailtoFields(href) {
  // Mail clients URI-decode fields; URLSearchParams would incorrectly treat
  // unescaped '+' as a space and hide a broken mailto serialization.
  return Object.fromEntries(new URL(href).search.slice(1).split("&").filter(Boolean).map((field) => {
    const separator = field.indexOf("=");
    assert.ok(separator >= 0, `mailto field has no value: ${field}`);
    return [decodeURIComponent(field.slice(0, separator)), decodeURIComponent(field.slice(separator + 1))];
  }));
}

function privatePricingJourneys(language, privatePath, contactPath) {
  const htmlPath = path.join(publicDir, privatePath);
  assert.ok(fs.existsSync(htmlPath), `generated ${language} private service page is missing`);
  const html = fs.readFileSync(htmlPath, "utf8");
  const privateOffers = ["private_4_week", "private_casual"];
  const tags = anchorTags(html).filter((tag) => privateOffers.includes(attribute(tag, "data-enquiry-offer")));
  assert.equal(tags.length, 2, `${language} private service must retain two private pricing journeys`);
  assert.deepEqual(tags.map((tag) => attribute(tag, "data-enquiry-offer")).sort(), [...privateOffers].sort(), `${language} private pricing offers are incorrect`);
  return tags.map((tag) => {
    const offerId = attribute(tag, "data-enquiry-offer");
    const url = new URL(attribute(tag, "href"), "https://barbarasharon.com.au/");
    assert.equal(attribute(tag, "data-enquiry-intent"), "private", `${language} ${offerId} must allow online and in-person enquiries`);
    assert.equal(attribute(tag, "data-lesson-format"), "private", `${language} ${offerId} analytics must allow both delivery modes`);
    assert.equal(url.pathname, `/${contactPath.replace(/index\.html$/, "")}`, `${language} ${offerId} must lead to its localized Contact page`);
    assert.equal(url.hash, `#enquiry-private-${offerId}`, `${language} ${offerId} must preserve the generic private context`);
    return {offerId, hash: url.hash};
  });
}

function channelForHref(href) {
  const value = String(href || "");
  const protocol = value.slice(0, value.indexOf(":") + 1).toLowerCase();
  if (protocol === "mailto:") return "email";
  if (protocol === "tel:") return "phone";
  try {
    const url = new URL(value, "https://barbarasharon.com.au/");
    if (url.protocol === "https:" && new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com"]).has(url.hostname.toLowerCase())) {
      return "whatsapp";
    }
  } catch (_) {
    // An invalid URL is not a contact action and is left to the production script.
  }
  return "";
}

function findScriptTag(html, name) {
  const tag = String(html).match(new RegExp(`<script\\b[^>]*${name}[^>]*>`, "i"));
  assert.ok(tag, `generated page is missing the ${name} script reference`);
  return tag[0];
}

function readGeneratedAsset(pageHtml, name) {
  const tag = findScriptTag(pageHtml, name);
  const src = attribute(tag, "src");
  assert.ok(src, `generated ${name} script reference has no src`);
  const assetPath = path.join(publicDir, src.replace(/^\/+/, "").split("?", 1)[0]);
  assert.ok(fs.existsSync(assetPath), `generated ${name} asset is missing: ${src}`);
  return {tag, source: fs.readFileSync(assetPath, "utf8")};
}

function readRegistry(pageHtml) {
  const tag = findScriptTag(pageHtml, "enquiry-context");
  const raw = attribute(tag, "data-registry");
  assert.ok(raw, "generated enquiry script has no data-registry");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`generated enquiry registry is not valid JSON: ${error.message}`);
  }
}

function findHeroActions(html) {
  const tag = String(html).match(/<div\b[^>]*data-block-type=hero[^>]*>/i);
  assert.ok(tag, "generated Contact page is missing its hero block");
  const props = attribute(tag[0], "data-props");
  assert.ok(props, "generated Contact hero is missing data-props");
  let parsed;
  try {
    parsed = JSON.parse(props);
  } catch (error) {
    throw new Error(`generated Contact hero props are not valid JSON: ${error.message}`);
  }
  const actions = [parsed?.content?.primary_action, parsed?.content?.secondary_action];
  assert.ok(actions.every((action) => action?.url), "generated Contact hero is missing an action URL");
  return actions;
}

function assertRegistry(registry, language) {
  assert.deepEqual(Object.keys(registry.offers || {}).sort(), [...expectedOffers].sort(), `${language} registry offer IDs changed`);
  assert.ok(registry.offers?.term_10_week, `${language} registry missing term_10_week`);
  assert.equal(registry.offers?.term_10_week_1_hour, undefined, `${language} registry still exposes the obsolete offer ID`);
  for (const intent of expectedIntents) assert.ok(registry.instructions?.[intent], `${language} registry is missing ${intent} instructions`);
}

class SimAnchor {
  constructor(href, lessonFormat = null) {
    this.attributes = new Map([["href", href]]);
    if (lessonFormat !== null) this.attributes.set("data-lesson-format", lessonFormat);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  get dataset() {
    const dataset = {};
    for (const [name, value] of this.attributes) {
      if (name.startsWith("data-")) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        dataset[key] = value;
      }
    }
    return dataset;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

function makeAnchorFromTag(tag) {
  const href = attribute(tag, "href");
  assert.ok(href, "contact anchor has no href");
  return new SimAnchor(href, attribute(tag, "data-lesson-format") || "unspecified");
}

function makeSimulation({html, registry, enquirySource, analyticsSource, language, pagePath, privateJourneys, rejected = false}) {
  const footerIndex = html.indexOf("<footer");
  assert.ok(footerIndex >= 0, `${language} generated Contact page is missing its footer`);
  const infoTags = anchorTags(html.slice(0, footerIndex)).filter((tag) => attribute(tag, "data-contact-action") && channelForHref(attribute(tag, "href")));
  const footerTags = anchorTags(html.slice(footerIndex)).filter((tag) => channelForHref(attribute(tag, "href")));
  assert.ok(infoTags.length >= 3, `${language} Contact page has fewer than three contact-info actions`);
  assert.ok(footerTags.length >= 2, `${language} Contact page has fewer than two footer contact actions`);

  const infoAnchors = infoTags.map(makeAnchorFromTag);
  const footerAnchors = footerTags.map(makeAnchorFromTag);
  const heroActions = findHeroActions(html);
  const heroAnchors = [];
  const anchors = [...infoAnchors, ...footerAnchors];
  const preservedParamAnchor = new SimAnchor("https://wa.me/61493837828?text=Original%20message&source=checker", "unspecified");
  const unsupportedWhatsappAnchor = new SimAnchor("https://example-wa.me/61493837828?text=Original%20message", "unspecified");
  const explicitlyFormattedAnchor = new SimAnchor("mailto:info+lessons@barbarasharon.com.au?cc=assistant+lessons%40example.com&source=level%20A%2BB&subject=Original%20subject&body=Original+message", "private");
  anchors.push(preservedParamAnchor, unsupportedWhatsappAnchor, explicitlyFormattedAnchor);
  const originals = [...infoAnchors, ...footerAnchors, preservedParamAnchor, explicitlyFormattedAnchor].map((anchor) => ({
    anchor,
    href: anchor.getAttribute("href"),
    lessonFormat: anchor.getAttribute("data-lesson-format"),
  }));
  const summary = {hidden: true, textContent: ""};
  const windowListeners = new Map();
  const documentListeners = new Map();
  const animationFrames = [];
  const dataLayer = [];
  const storage = new Map(rejected ? [["barbara-analytics-consent-v2", JSON.stringify({value: "rejected"})]] : []);
  const location = {
    hash: "#enquiry-online-term_10_week",
    href: `https://barbarasharon.com.au/${language}/contact-portuguese-teacher/`,
    hostname: "barbarasharon.com.au",
    pathname: pagePath,
    origin: "https://barbarasharon.com.au",
  };
  const document = {
    currentScript: {dataset: {registry: JSON.stringify(registry)}},
    readyState: "complete",
    documentElement: {lang: language},
    body: {appendChild() {}},
    head: {appendChild() {}},
    cookie: "",
    querySelector(selector) {
      return selector === "[data-enquiry-context-summary]" ? summary : null;
    },
    querySelectorAll(selector) {
      return selector === "a[href]" ? anchors : [];
    },
    addEventListener(type, listener) {
      const list = documentListeners.get(type) || [];
      list.push(listener);
      documentListeners.set(type, list);
    },
    getElementById() {
      return null;
    },
    createElement() {
      return {async: false, addEventListener() {}, setAttribute() {}, appendChild() {}};
    },
  };
  const window = {
    location,
    dataLayer,
    addEventListener(type, listener) {
      const list = windowListeners.get(type) || [];
      list.push(listener);
      windowListeners.set(type, list);
    },
    requestAnimationFrame(callback) {
      animationFrames.push(callback);
    },
    setTimeout(callback) {
      animationFrames.push(callback);
    },
    localStorage: {
      getItem(key) {
        return storage.get(key) || null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    },
    reload() {},
  };
  const dispatchWindow = (type) => {
    for (const listener of windowListeners.get(type) || []) listener(new Event(type));
  };
  const dispatchDocument = (type, target) => {
    const event = {target};
    for (const listener of documentListeners.get(type) || []) listener(event);
  };
  const sandbox = {
    window,
    document,
    URL,
    Set,
    JSON,
    Event,
    requestAnimationFrame: window.requestAnimationFrame,
    setTimeout: window.setTimeout,
    console,
  };
  vm.runInNewContext(enquirySource, sandbox, {filename: `enquiry-context.${language}.js`});

  // The hero renderer runs after the enquiry script in the deferred script queue.
  for (const action of heroActions) {
    const anchor = new SimAnchor(action.url, action.lesson_format || "unspecified");
    heroAnchors.push(anchor);
    anchors.push(anchor);
    originals.push({
      anchor,
      href: anchor.getAttribute("href"),
      lessonFormat: anchor.getAttribute("data-lesson-format"),
    });
  }
  while (animationFrames.length) animationFrames.shift()();

  const assertContextApplied = (intent, offerId) => {
    const expectedMessage = `${registry.greeting} ${registry.instructions[intent]} ${registry.selectedPrefix} ${registry.offers[offerId]}.`;
    for (const {anchor, href} of originals) {
      const channel = channelForHref(href);
      assert.equal(anchor.getAttribute("data-lesson-format"), intent, `${language} ${channel} did not receive ${intent}`);
      if (channel === "phone") {
        assert.equal(anchor.getAttribute("href"), href, `${language} phone href was changed`);
      } else if (channel === "email") {
        const fields = mailtoFields(anchor.getAttribute("href"));
        assert.equal(fields.subject, registry.emailSubject, `${language} URI-decoded email subject is wrong`);
        assert.equal(fields.body, expectedMessage, `${language} URI-decoded email body is wrong`);
      } else if (channel === "whatsapp") {
        const url = new URL(anchor.getAttribute("href"));
        assert.match(url.searchParams.get("text") || "", new RegExp(escapeRegExp(registry.offers[offerId])));
      }
    }
    const preservedUrl = new URL(preservedParamAnchor.getAttribute("href"));
    assert.equal(preservedUrl.searchParams.get("source"), "checker", `${language} WhatsApp unrelated parameter was lost`);
    const preservedEmail = new URL(explicitlyFormattedAnchor.getAttribute("href"));
    const fields = mailtoFields(preservedEmail.href);
    assert.equal(preservedEmail.pathname, "info+lessons@barbarasharon.com.au", `${language} email recipient plus was lost`);
    assert.equal(fields.cc, "assistant+lessons@example.com", `${language} email cc literal plus was lost`);
    assert.equal(fields.source, "level A+B", `${language} email unrelated parameter was changed`);
    assert.equal(unsupportedWhatsappAnchor.getAttribute("href"), "https://example-wa.me/61493837828?text=Original%20message", `${language} unsupported WhatsApp host was changed`);
    assert.equal(summary.hidden, false, `${language} selection summary was not shown`);
  };
  const assertRestored = () => {
    for (const {anchor, href, lessonFormat} of originals) {
      assert.equal(anchor.getAttribute("href"), href, `${language} invalid context did not restore href`);
      assert.equal(anchor.getAttribute("data-lesson-format"), lessonFormat, `${language} invalid context did not restore lesson format`);
    }
    assert.equal(summary.hidden, true, `${language} invalid context left the summary visible`);
    assert.equal(summary.textContent, "", `${language} invalid context left summary text`);
  };

  const setHash = (hash, eventName = "hashchange") => {
    location.hash = hash;
    dispatchWindow(eventName);
  };
  assertContextApplied("online", "term_10_week");
  setHash("#enquiry-gold_coast_group-term_10_week_1_5_hour");
  assertContextApplied("gold_coast_group", "term_10_week_1_5_hour");
  setHash("");
  assertRestored();
  setHash("#enquiry-online-does_not_exist");
  assertRestored();
  setHash("#enquiry-private-term_10_week", "popstate");
  assertContextApplied("private", "term_10_week");
  for (const {hash, offerId} of privateJourneys) {
    setHash(hash);
    assertContextApplied("private", offerId);
    assert.equal(summary.textContent, `${registry.selectedPrefix} ${registry.offers[offerId]}. ${registry.instructions.private}`, `${language} private pricing journey must ask for a delivery preference`);
  }
  setHash("#enquiry-group-term_10_week", "popstate");
  assertContextApplied("group", "term_10_week");
  setHash("#enquiry-group-term_10_week", "pageshow");
  assertContextApplied("group", "term_10_week");

  document.currentScript = {dataset: {
    gaId: "G-TEST",
    clarityId: "",
    privacyUrl: `/${language}/privacy/`,
  }};
  vm.runInNewContext(analyticsSource, sandbox, {filename: `analytics-consent.${language}.js`});
  dispatchDocument("click", {
    closest() {
      return infoAnchors.find((anchor) => channelForHref(anchor.getAttribute("href")) === "email");
    },
  });
  const contactEvents = dataLayer.filter((entry) => entry?.[0] === "event" && entry?.[1] === "contact_click");
  if (rejected) {
    assert.equal(contactEvents.length, 0, `${language} rejected consent still emitted a contact event`);
  } else {
    assert.equal(contactEvents.length, 1, `${language} repeated context changes emitted duplicate contact events`);
    const payload = contactEvents[0][2];
    assert.equal(payload.lesson_format, "group", `${language} analytics lesson format changed`);
    assert.equal(payload.language, language, `${language} analytics language changed`);
    assert.equal(payload.channel, "email", `${language} analytics channel changed`);
    assert.equal(payload.page_path, location.pathname, `${language} analytics page path changed`);
  }
  return {infoAnchors, footerAnchors, heroAnchors};
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const generated = languagePages.map(({code, path: relativePath, privatePath}) => {
  const htmlPath = path.join(publicDir, relativePath);
  assert.ok(fs.existsSync(htmlPath), `generated ${code} Contact page is missing`);
  const html = fs.readFileSync(htmlPath, "utf8");
  const enquiryAsset = readGeneratedAsset(html, "enquiry-context");
  const analyticsAsset = readGeneratedAsset(html, "analytics-consent");
  const registry = readRegistry(html);
  const privateJourneys = privatePricingJourneys(code, privatePath, relativePath);
  assertRegistry(registry, code);
  assert.match(enquiryAsset.source, /WeakMap/, `${code} enquiry script does not preserve original anchor state with WeakMap`);
  assert.match(enquiryAsset.source, /pageshow/, `${code} enquiry script does not handle restored pages`);
  assert.match(enquiryAsset.source, /DOMContentLoaded/, `${code} enquiry script does not wait for deferred rendering`);
  for (const host of ["wa.me", "api.whatsapp.com", "web.whatsapp.com"]) {
    assert.match(enquiryAsset.source, new RegExp(host.replace(".", "\\.")), `${code} enquiry script is missing the ${host} host`);
  }
  const pagePath = `/${relativePath.replace(/\/index\.html$/, "")}`;
  const simulation = {html, registry, enquirySource: enquiryAsset.source, analyticsSource: analyticsAsset.source, language: code, pagePath, privateJourneys};
  makeSimulation(simulation);
  makeSimulation({...simulation, rejected: true});
  makeSimulation({...simulation, registry: {...registry, greeting: `${registry.greeting} A+B`, emailSubject: `${registry.emailSubject} + A&B`}});
  return {code, html};
});

const journeyCounts = new Map();
for (const {code} of languagePages) journeyCounts.set(code, 0);
const allHtml = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name === "index.html") allHtml.push(full);
  }
}
visit(publicDir);
for (const htmlPath of allHtml) {
  const relative = path.relative(publicDir, htmlPath).replaceAll(path.sep, "/");
  const code = languagePages.find(({path: pagePath}) => relative.startsWith(pagePath.split("/")[0] + "/"))?.code;
  if (!code) continue;
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const tag of anchorTags(html)) {
    if (attribute(tag, "data-enquiry-offer") !== "term_10_week") continue;
    const intent = attribute(tag, "data-enquiry-intent");
    const href = attribute(tag, "href") || "";
    assert.ok(expectedIntents.has(intent), `${relative} has an unknown enquiry intent`);
    assert.ok(href.includes(`#enquiry-${intent}-term_10_week`), `${relative} lost the canonical A$290 enquiry context`);
    journeyCounts.set(code, journeyCounts.get(code) + 1);
  }
  assert.equal((html.match(/data-enquiry-offer=term_10_week_1_hour/g) || []).length, 0, `${relative} still uses the obsolete A$290 offer ID`);
}
for (const [code, count] of journeyCounts) assert.equal(count, 4, `${code} must retain four A$290 journeys`);
assert.equal([...journeyCounts.values()].reduce((sum, count) => sum + count, 0), 12, "all three languages must retain twelve A$290 journeys");

console.log("Enquiry context checks passed: canonical registry, 12 A$290 and six private pricing journeys, URI-encoded email text, all contact channels, deferred hero rendering, history restoration, and consent-gated analytics.");
