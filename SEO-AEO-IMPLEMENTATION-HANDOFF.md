# SEO and AEO repair handoff

Updated 2026-09-08 from starting revision `9c0df8fe804d96c5a62d3455b0b5e67912aad77`. The four defects in the repair plan are implemented and verified. Hugo, the existing design, URLs, language routing, indexing settings, prices, consent behaviour and domain are unchanged. Deployment was not triggered.

## Repairs delivered

### City-page wording and facts

- Rewrote `local_context` in all 191 existing city translation keys and their three existing language files (573 pages). The new text is short scheduling/location context, removes `Local goals:`, `Local focus:` and location-set editorial wording, and keeps online availability and the existing Gold Coast in-person scope explicit.
- Corrected verified facts consistently across translations and repeated scheduling/FAQ fields. Examples: Los Angeles changed from Canada / `America/Toronto` to United States / `America/Los_Angeles`; `Ikaluit` changed to `Iqaluit` / `America/Iqaluit` while its `ikaluit` URL slug remains; Tweed Heads and Kingscliff use `Australia/Sydney`.
- Recorded one verified factual record per translation key, including source paths, country display names, IANA identifier/version, evidence URLs and status, in [`docs/seo-aeo-repair/city-facts.json`](docs/seo-aeo-repair/city-facts.json).
- The 15-location pilot and all 20 controlled batches were reviewed in English, Spanish and Brazilian Portuguese. The unchanged similarity checker still passes its `0.35` pairwise and unique-five-word requirements. The manifest-backed guardrail checker verifies facts, translations, editorial review marks and concise context.

Before/after example (English Brussels):

```text
Before: Brussels is in the Europe scheduling region ... Local goals: ... Local focus: ...
After:  Online Brazilian Portuguese lessons for Brussels; flexible scheduling can be confirmed for Brussels using Europe/Brussels.
```

### A$290 enquiry selection and contact attribution

- Changed the registry offer ID to `term_10_week` while retaining the translation label `enquiry_offer_term_10_week_1_hour` and all six approved selectable offers.
- Updated [`assets/js/enquiry-context.js`](assets/js/enquiry-context.js) to cover Contact hero, contact-information and footer actions. It detects email, phone and WhatsApp by protocol/exact host, saves original href and lesson format in a `WeakMap`, preserves unrelated parameters, leaves telephone URLs unchanged, applies localized messages and summaries, and restores originals for missing or invalid fragments.
- The script applies after deferred hero rendering and on `DOMContentLoaded`, `hashchange`, `popstate` and `pageshow`, with listeners registered once. Existing `contact_click` fields and consent handling are unchanged.
- Added [`scripts/check-enquiry-context.mjs`](scripts/check-enquiry-context.mjs) and wired it into both `npm run check` and the post-generation `npm run build` checks.

### Private-lesson structured data

- Set `delivery_modes: [online, in_person]` on the three private Gold Coast lesson pages (EN, ES and PT-BR), matching the visible offer of worldwide online lessons and Gold Coast in-person lessons.
- Updated the expected source mode in [`scripts/check-content-quality.mjs`](scripts/check-content-quality.mjs).
- Added rendered JSON-LD assertions in [`scripts/check-generated-metadata.mjs`](scripts/check-generated-metadata.mjs) for private, online-only, Gold Coast group, service-overview and children pages in all three languages. The 15 cases require one Service node, stable canonical ID, exact localized offer names and no duplicates.

## Exact source and generated changes

The complete non-generated source list is [`docs/seo-aeo-repair/changed-sources.txt`](docs/seo-aeo-repair/changed-sources.txt). It includes the 573 city files, the enquiry/layout/checker/package files, the three private pages and this handoff; the repair records are listed separately in the same directory. Generated HTML/assets were regenerated under `public/` by the normal Hugo build; no generated file was edited directly.

The orchestrator record, disjoint ownership, 20 city batches, factual evidence ([`city-facts.json`](docs/seo-aeo-repair/city-facts.json) and [`factual-audit.md`](docs/seo-aeo-repair/factual-audit.md)), review notes and scope record are in [`docs/seo-aeo-repair/`](docs/seo-aeo-repair/). The original [`scripts/check-locations.mjs`](scripts/check-locations.mjs) checksum remains `e1cb3e9b27cbb209474cb13a4c5c278ff08ebf62a99dcfe4d960ec93bfe500bb`.

## Verification evidence

- `npm run build` — passed, including Hugo generation, Pagefind, redirects and all source/generated checkers.
- `npm run check` — passed.
- `git diff HEAD --check` — passed.
- Generated output: 990 HTML files (781 non-redirect pages and 209 redirects), 250 page URLs per language sitemap (750 total) and 603 Service JSON-LD nodes.
- Before/after inventories are identical for HTML paths, canonical URLs, hreflang pairs, robots directives, redirect destinations and sitemap page URL membership. No internal page target changed.
- Chrome with external analytics and messaging requests blocked: 21 core routes in EN, ES and PT-BR at approximately 1365px and 390px passed headings, settled layout/overflow and page-error checks. The deferred Contact hero, channel destinations, clear/invalid restoration and consent-gated analytics were exercised without sending messages. A second browser run followed all 12 exact A$290 source journeys and confirmed the final rendered Contact selection and summary. A further city smoke run covered 20 batches × 3 languages × 2 viewports (120 rendered pages), and a separate pilot smoke run covered all 15 pilot locations (90 rendered pages).

These checks verify the repair is ready for review; they do not claim improved rankings, snippets or AI citations. Release and post-release Search Console/enquiry measurement remain manual.

## Out of scope

Travel-article rewrites and the wider unfinished implementation plan remain separate work. No city pages were added, URLs consolidated, course dates or venues invented, hosting changed or website deployed. Population/community claims and other unrelated legacy content were left unchanged.

## Release handoff

After review, deploy with the existing project workflow. No deployment command is included here and none was run during this repair.
