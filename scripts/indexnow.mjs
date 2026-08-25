#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MAX_URLS_PER_REQUEST = 10000;
const DEFAULT_HOST = "barbarasharon.com.au";
const DEFAULT_KEY = "f25f2ae156e844228b12042703fb53ed";
const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";

function usage() {
  console.error(`Usage:
  node scripts/indexnow.mjs prepare --public-dir public --before-url https://barbarasharon.com.au/sitemap.xml --out indexnow-changes.txt --all-out indexnow-all.txt
  node scripts/indexnow.mjs submit --urls-file indexnow-changes.txt [--all-file indexnow-all.txt] [--full] [--dry-run]
`);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const equals = token.indexOf("=");
    if (equals > 2) {
      options[token.slice(2, equals)] = token.slice(equals + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return options;
}

function decodeXml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

function tagValue(block, tag) {
  const expression = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = String(block).match(expression);
  return match ? decodeXml(match[1]) : "";
}

function blocks(xml, tag) {
  const expression = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  return [...String(xml).matchAll(expression)].map((match) => match[1]);
}

function normaliseUrl(value) {
  const url = new URL(value);
  url.hash = "";
  return url.href;
}

async function loadSource(source, localRoot = null) {
  if (localRoot) {
    return fs.readFile(source, "utf8");
  }
  const response = await fetch(source, {redirect: "follow"});
  if (!response.ok) throw new Error(`Could not download sitemap ${source}: HTTP ${response.status}`);
  return response.text();
}

async function collectSitemap(source, {localRoot = null, host, seen = new Set(), urls = new Map()} = {}) {
  const seenKey = localRoot ? path.resolve(source) : normaliseUrl(source);
  if (seen.has(seenKey)) return urls;
  seen.add(seenKey);

  const xml = await loadSource(source, localRoot);
  if (/<sitemapindex\b/i.test(xml)) {
    for (const block of blocks(xml, "sitemap")) {
      const loc = tagValue(block, "loc");
      if (!loc) continue;
      if (localRoot) {
        const child = new URL(loc);
        await collectSitemap(path.join(localRoot, decodeURIComponent(child.pathname.replace(/^\//, ""))), {localRoot, host, seen, urls});
      } else {
        await collectSitemap(normaliseUrl(loc), {host, seen, urls});
      }
    }
    return urls;
  }

  for (const block of blocks(xml, "url")) {
    const loc = tagValue(block, "loc");
    if (!loc) continue;
    const url = normaliseUrl(loc);
    if (new URL(url).hostname !== host) continue;
    urls.set(url, tagValue(block, "lastmod"));
  }
  return urls;
}

async function readLines(file) {
  const contents = await fs.readFile(file, "utf8");
  return [...new Set(contents.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].sort();
}

async function writeLines(file, values) {
  await fs.writeFile(file, values.length ? `${values.join("\n")}\n` : "", "utf8");
}

function ensureHost(urls, host) {
  for (const value of urls) {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.hostname !== host) {
      throw new Error(`URL is outside the configured IndexNow host ${host}: ${value}`);
    }
  }
}

async function prepare(options) {
  const host = options.host || process.env.INDEXNOW_HOST || DEFAULT_HOST;
  const publicDir = path.resolve(options["public-dir"] || "public");
  const out = path.resolve(options.out || "indexnow-changes.txt");
  const allOut = path.resolve(options["all-out"] || "indexnow-all.txt");
  const current = await collectSitemap(path.join(publicDir, "sitemap.xml"), {localRoot: publicDir, host});
  const currentUrls = [...current.keys()].sort();
  ensureHost(currentUrls, host);

  let changedUrls = currentUrls;
  if (!options.all) {
    let previous;
    if (options["before-file"]) {
      const beforeFile = path.resolve(options["before-file"]);
      previous = await collectSitemap(beforeFile, {localRoot: path.dirname(beforeFile), host});
    } else if (options["before-url"]) {
      previous = await collectSitemap(normaliseUrl(options["before-url"]), {host});
    } else {
      throw new Error("prepare requires --before-url, --before-file, or --all");
    }

    const candidates = new Set([...current.keys(), ...previous.keys()]);
    changedUrls = [...candidates].filter((url) => current.get(url) !== previous.get(url)).sort();
    ensureHost(changedUrls, host);
  }

  await writeLines(out, changedUrls);
  await writeLines(allOut, currentUrls);
  console.log(`IndexNow manifest prepared: ${currentUrls.length} current URL(s), ${changedUrls.length} changed URL(s).`);
  console.log(`Changed URLs: ${out}`);
  console.log(`All current URLs: ${allOut}`);
}

async function verifyKey(keyLocation, key, dryRun) {
  if (dryRun) return;
  const response = await fetch(keyLocation, {redirect: "follow"});
  if (!response.ok) throw new Error(`IndexNow key file is unavailable: ${keyLocation} (HTTP ${response.status})`);
  const contents = (await response.text()).trim();
  if (contents !== key) throw new Error(`IndexNow key file does not contain the configured key: ${keyLocation}`);
}

async function submit(options) {
  const host = options.host || process.env.INDEXNOW_HOST || DEFAULT_HOST;
  const key = options.key || process.env.INDEXNOW_KEY || DEFAULT_KEY;
  const endpoint = options.endpoint || process.env.INDEXNOW_ENDPOINT || DEFAULT_ENDPOINT;
  const keyLocation = options["key-location"] || process.env.INDEXNOW_KEY_LOCATION || `https://${host}/${key}.txt`;
  const file = options.full ? options["all-file"] : options["urls-file"];
  if (!file) throw new Error(options.full ? "--full requires --all-file" : "submit requires --urls-file");
  const urls = await readLines(path.resolve(file));
  if (!urls.length) {
    console.log("IndexNow: no URLs to submit.");
    return;
  }
  ensureHost(urls, host);
  await verifyKey(keyLocation, key, Boolean(options["dry-run"]));

  const logFile = path.resolve(options.log || "indexnow-status.log");
  const timestamp = new Date().toISOString();
  const lines = [`${timestamp} host=${host} mode=${options.full ? "full" : "changed"} urls=${urls.length}`];
  for (let start = 0; start < urls.length; start += MAX_URLS_PER_REQUEST) {
    const batch = urls.slice(start, start + MAX_URLS_PER_REQUEST);
    if (options["dry-run"]) {
      lines.push(`${timestamp} dry-run batch=${Math.floor(start / MAX_URLS_PER_REQUEST) + 1} urls=${batch.length}`);
      continue;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {"content-type": "application/json; charset=utf-8"},
      body: JSON.stringify({host, key, keyLocation, urlList: batch}),
    });
    const responseBody = (await response.text()).trim();
    if (!response.ok) throw new Error(`IndexNow batch failed: HTTP ${response.status}${responseBody ? ` ${responseBody}` : ""}`);
    lines.push(`${timestamp} batch=${Math.floor(start / MAX_URLS_PER_REQUEST) + 1} urls=${batch.length} status=${response.status}${responseBody ? ` response=${responseBody}` : ""}`);
  }
  await fs.appendFile(logFile, `${lines.join("\n")}\n`, "utf8");
  console.log(lines.join("\n"));
}

const command = process.argv[2];
const options = parseArgs(process.argv.slice(3));
try {
  if (command === "prepare") await prepare(options);
  else if (command === "submit") await submit(options);
  else {
    usage();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`IndexNow error: ${error.message}`);
  process.exitCode = 1;
}
