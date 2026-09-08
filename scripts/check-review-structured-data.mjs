#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicArgumentIndex = process.argv.indexOf("--public-dir");
const publicDir = path.resolve(publicArgumentIndex >= 0 ? process.argv[publicArgumentIndex + 1] : path.join(projectRoot, "public"));
const languages = ["en", "pt-br", "es"];
const languageCodes = {en: "en-AU", "pt-br": "pt-BR", es: "es"};
const origin = "https://barbarasharon.com.au";
const organizationId = `${origin}#organization`;
const expectedCourseIds = [
  "intensive-portuguese",
  "intermediate-portuguese",
  "beginner-portuguese",
  "beginner-intermediate-portuguese",
];
const expectedAssignments = {
  "Mariano J. Ponce": "intensive-portuguese",
  "Helena Jose": "intensive-portuguese",
  "Nicolas Germain": "intermediate-portuguese",
  "Amy Eagle": "beginner-portuguese",
  "Zoe Lec": "beginner-intermediate-portuguese",
};

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
let totalAggregateRatings = 0;
for (const language of languages) {
  const file = path.join(publicDir, language, "index.html");
  if (!fs.existsSync(file)) {
    errors.push(`${language}: homepage output is missing at ${file}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const objects = jsonLdObjects(html, file);
  const nodes = objects.flatMap((object) => object["@graph"] || [object]);
  const courseNodes = nodes.filter((node) => hasType(node, "Course") && Array.isArray(node.review));
  const reviews = courseNodes.flatMap((course) => course.review.map((review) => ({course, review})));
  totalReviews += reviews.length;

  if (objects.some((object) => object["@context"] !== "https://schema.org")) errors.push(`${language}: every JSON-LD object must use the schema.org context`);
  const nodeIds = nodes.map((node) => node["@id"]).filter(Boolean);
  if (new Set(nodeIds).size !== nodeIds.length) errors.push(`${language}: homepage JSON-LD contains duplicate @id values`);

  const organizations = nodes.filter((node) => hasType(node, "Organization"));
  const people = nodes.filter((node) => hasType(node, "Person") && node["@id"] === `${origin}#person`);
  const videos = nodes.filter((node) => hasType(node, "VideoObject"));
  if (organizations.length !== 1) errors.push(`${language}: expected one Organization node, found ${organizations.length}`);
  if (people.length !== 1) errors.push(`${language}: expected one canonical Person node, found ${people.length}`);
  if (videos.length !== 1) errors.push(`${language}: expected one VideoObject node, found ${videos.length}`);

  const organization = organizations[0];
  for (const property of ["@id", "name", "url", "description", "email", "telephone", "address", "areaServed", "sameAs"]) {
    if (!organization?.[property]) errors.push(`${language}: Organization is missing ${property}`);
  }
  const person = people[0];
  for (const property of ["@id", "name", "url", "description", "image", "jobTitle", "knowsLanguage", "sameAs", "worksFor"]) {
    if (!person?.[property]) errors.push(`${language}: Person is missing ${property}`);
  }
  const video = videos[0];
  for (const property of ["@id", "name", "description", "thumbnailUrl", "uploadDate", "duration", "contentUrl", "embedUrl", "url"]) {
    if (!video?.[property]) errors.push(`${language}: VideoObject is missing ${property}`);
  }

  if (courseNodes.length !== 4) errors.push(`${language}: expected four review Course nodes, found ${courseNodes.length}`);
  if (reviews.length !== 5) errors.push(`${language}: expected five nested Review nodes, found ${reviews.length}`);
  for (const courseId of expectedCourseIds) {
    if (!courseNodes.some((course) => course["@id"] === `${origin}/${language}/#course-review-${courseId}`)) {
      errors.push(`${language}: missing review Course node for ${courseId}`);
    }
  }

  for (const course of courseNodes) {
    const aggregate = course.aggregateRating;
    const expectedRating = course.review.reduce((sum, review) => sum + review.reviewRating.ratingValue, 0) / course.review.length;
    totalAggregateRatings += aggregate ? 1 : 0;
    if (course.inLanguage !== languageCodes[language]) errors.push(`${language}: ${course.name} has the wrong inLanguage value`);
    if (course.provider?.["@id"] !== organizationId) errors.push(`${language}: ${course.name} does not reference the canonical Organization`);
    if (aggregate?.["@type"] !== "AggregateRating") {
      errors.push(`${language}: ${course.name} is missing AggregateRating`);
    } else {
      if (aggregate.reviewCount !== course.review.length) errors.push(`${language}: ${course.name} aggregate reviewCount does not match its reviews`);
      if (aggregate.ratingValue !== expectedRating) errors.push(`${language}: ${course.name} aggregate ratingValue does not match its review average`);
      if (aggregate.bestRating !== 5 || aggregate.worstRating !== 1) errors.push(`${language}: ${course.name} aggregate rating does not use the 1-5 scale`);
    }
  }

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
    const expectedCourse = expectedAssignments[review.author?.name];
    if (expectedCourse && !course["@id"].endsWith(`#course-review-${expectedCourse}`)) {
      errors.push(`${language}: ${review.author.name} is attached to ${course["@id"]}, expected ${expectedCourse}`);
    }
    if (review.author?.name === "Angus Robert") errors.push(`${language}: Angus Robert must not be nested under a Course`);
  }

  for (const node of nodes.filter((candidate) => hasType(candidate, "Organization") || hasType(candidate, "ProfessionalService") || hasType(candidate, "LocalBusiness"))) {
    if (node.review || node.aggregateRating) errors.push(`${language}: business-level review markup must not be emitted`);
  }
}

if (totalReviews !== 15) errors.push(`Expected fifteen translated Review nodes, found ${totalReviews}`);
if (totalAggregateRatings !== 12) errors.push(`Expected four AggregateRating objects per language, found ${totalAggregateRatings}`);
if (errors.length) {
  console.error(`Review structured-data check failed with ${errors.length} issue(s):\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("Homepage JSON-LD check passed: complete Organization, Person, VideoObject, and four reviewed Course nodes per language, with AggregateRating on every Course.");
