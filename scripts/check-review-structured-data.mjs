#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicArgumentIndex = process.argv.indexOf("--public-dir");
const publicDir = path.resolve(publicArgumentIndex >= 0 ? process.argv[publicArgumentIndex + 1] : path.join(projectRoot, "public"));
const languages = ["en", "pt-br", "es"];

function jsonLdObjects(html, file) {
  return [...html.matchAll(/<script[^>]+type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`${file}: invalid JSON-LD: ${error.message}`);
    }
  });
}

function hasType(node, type) {
  return node?.["@type"] === type || (Array.isArray(node?.["@type"]) && node["@type"].includes(type));
}

const errors = [];
let totalReviews = 0;
for (const language of languages) {
  const file = path.join(publicDir, language, "index.html");
  if (!fs.existsSync(file)) {
    errors.push(`${language}: homepage output is missing at ${file}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const nodes = jsonLdObjects(html, file).flatMap((object) => object["@graph"] || [object]);
  const courseNodes = nodes.filter((node) => hasType(node, "Course") && Array.isArray(node.review));
  const reviews = courseNodes.flatMap((course) => course.review.map((review) => ({course, review})));
  totalReviews += reviews.length;

  if (courseNodes.length !== 5) errors.push(`${language}: expected five review Course nodes, found ${courseNodes.length}`);
  if (reviews.length !== 6) errors.push(`${language}: expected six nested Review nodes, found ${reviews.length}`);

  for (const {course, review} of reviews) {
    if (!course.name || !course.url?.includes("#section-testimonials")) errors.push(`${language}: review Course is missing a visible homepage target`);
    if (!review.author?.name || review.author.name.includes(",")) errors.push(`${language}: review author must be a person name without location suffix`);
    if (!review.reviewBody) errors.push(`${language}: review is missing reviewBody`);
    if (review.reviewRating?.ratingValue !== 5 || review.reviewRating?.bestRating !== 5 || review.reviewRating?.worstRating !== 1) {
      errors.push(`${language}: ${review.author?.name || "review"} does not have a 5/5 rating scale`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review.datePublished || "")) errors.push(`${language}: ${review.author?.name || "review"} has an invalid ISO review date`);
    if (!html.includes(course.name)) errors.push(`${language}: course name is not visible in the rendered testimonials`);
    if (!html.includes(`${review.reviewRating.ratingValue}/${review.reviewRating.bestRating}`)) errors.push(`${language}: rating is not visible in the rendered testimonials`);
  }

  for (const node of nodes.filter((candidate) => hasType(candidate, "Organization") || hasType(candidate, "ProfessionalService") || hasType(candidate, "LocalBusiness"))) {
    if (node.review || node.aggregateRating) errors.push(`${language}: business-level review markup must not be emitted`);
  }
}

if (totalReviews !== 18) errors.push(`Expected eighteen translated Review nodes, found ${totalReviews}`);
if (errors.length) {
  console.error(`Review structured-data check failed with ${errors.length} issue(s):\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Review structured-data check passed: six reviews per language, nested under five Course nodes, with visible metadata.");
