# SEO and AEO implementation handoff

Updated 2026-09-08. The implementation is prepared for review. Deployment and external account work have not been run.

## Stage 1 — Baseline

- The working tree and project instructions were inspected before editing.
- The existing npm scripts and Hugo build were identified.
- Baseline `npm run check` passed all existing checks: locations, language routing, generated metadata, answer pages, SEO titles, descriptions and redirects.
- The translated page map uses the existing `translationKey` values:

| Page | English | Spanish | Portuguese |
|---|---|---|---|
| Home | `/en/` | `/es/` | `/pt-br/` |
| Service overview | `/en/portuguese-teaching-services/` | `/es/servicios-clases-portugues/` | `/pt-br/aulas-de-portugues/` |
| Online lessons | `/en/portuguese-teaching-services/online-portuguese-lessons/` | `/es/servicios-clases-portugues/clases-portugues-online/` | `/pt-br/aulas-de-portugues/aulas-online/` |
| Gold Coast group | `/en/portuguese-teaching-services/portuguese-school-gold-coast/` | `/es/servicios-clases-portugues/escuela-portugues-gold-coast/` | `/pt-br/aulas-de-portugues/escola-de-portugues-gold-coast/` |
| Gold Coast private | `/en/portuguese-teaching-services/portuguese-tutoring-gold-coast/` | `/es/servicios-clases-portugues/clases-particulares-portugues-gold-coast/` | `/pt-br/aulas-de-portugues/aulas-particulares-portugues-gold-coast/` |
| Contact | `/en/contact-portuguese-teacher/` | `/es/contacto-profesora-portugues/` | `/pt-br/contato-professora-portugues/` |
| Pricing answer | `/en/answers/how-much-portuguese-lessons-cost-australia/` | `/es/respuestas/cuanto-cuestan-clases-portugues-australia/` | `/pt-br/respostas/quanto-custam-aulas-portugues-australia/` |
| About | `/en/about-learning-portuguese/` | `/es/sobre-aprender-portugues/` | `/pt-br/sobre-aprendizagem-portuguesa/` |

## Stage 2 — One source for prices

- Added `data/lesson_pricing.yaml` as the shared source for group, private, speaking-club and book prices.
- Added the shared price partial, pricing block, Markdown shortcode and answer-token resolver.
- The supported answer tokens resolve to the shared A$290 group and A$260 private prices. The answer checker resolves and rejects unresolved tokens before checking visible text.
- The service templates and schema read delivery modes from front matter/data rather than translated wording.

Checks: the site built successfully; answer pages rendered the resolved prices; no unresolved pricing tokens remain in generated HTML.

## Stage 3 — Correct misleading offers

- Removed current free-trial and free-class invitations in English, Spanish and Portuguese, while retaining clearly historical newsletter material.
- Corrected current teaching claims to Brazilian Portuguese and retained useful educational comparisons and travel guidance.
- Corrected Gold Coast wording to say the next group is being organised/recruited; no dates, venues or seats were invented.
- Updated modification dates only on edited pages.

Checks: current content and generated current pages contain no free-trial promotion or European-Portuguese teaching promise. Historical newsletter references remain identifiable as historical.

## Stage 4 — Publish prices

- Added localized shared pricing blocks to all homepages, service overviews, online lessons, Gold Coast group pages and Gold Coast private pages.
- Added the full fee guide to each translated pricing answer, including 1-hour and 1.5-hour group terms, book options, the private package, casual private lessons, longer private-lesson enquiry wording and speaking-club prices.
- Added the Australian-dollar notice, package/availability enquiry instruction and links to the pricing answer.
- Preserved `from` for the approved starting-price offers and avoided describing them as hourly, weekly, subscription or instalment prices.

Checks: generated pages contain the relevant A$290, A$370, A$260, A$70, A$25, A$50 and A$20 values, with localized labels and no hardcoded duplicate amounts in the pricing blocks.

## Stage 5 — Enquiry paths

- Homepage primary actions now lead to online lessons and secondary actions to Gold Coast group classes.
- Gold Coast group pages prominently invite visitors to register interest in the next group and request level, age-group preference, suburb and availability.
- Added a shared enquiry-action resolver with the allowlisted intents `online`, `gold_coast_group`, `gold_coast_private`, `group`, `private`, `speaking_club` and `unspecified`.
- Pricing and service actions carry validated fragments such as `#enquiry-online-term_10_week_1_hour`; the contact page reads them without query parameters or persistent storage.
- Added one translated context registry for package labels and prefills. Email and WhatsApp messages request the fields appropriate to online, Gold Coast and mixed-format enquiries; phone links remain unchanged.
- Context is restored for missing or invalid fragments, updates on fragment changes and browser navigation, and remains available in the server-rendered fallback and hydrated Preact buttons.
- No booking system was added and opening WhatsApp is not described as completed registration.

Checks: generated desktop/mobile templates use direct, language-appropriate enquiry links and retain the existing layout and language chooser.

## Stage 6 — Structured data and identity

- Added and validated explicit `delivery_modes` to all 30 service pages and updated service schema for `online` and `in_person` without a silent in-person fallback.
- Organization coverage now describes worldwide online teaching and Gold Coast in-person provision.
- Byline and Person/Article identity links use each language's indexed About page.
- All 30 service-bearing pages show the verified UFRJ degree and TESOL qualification beside their enquiry action, linked to the indexed localized About page.
- Converted the three Lisbon pages from Course to Article structured data and removed their old tuition formats and schedules while retaining travel guidance and language comparisons.
- Associated Nicolas's review with the intermediate course in all languages, removed Angus's unsupported course association, and retained all six visible genuine testimonials.

Checks: generated metadata and schema checks passed for all languages; Spanish online lessons are classified as online; identity links resolve.

## Stage 7 — Content and trust

- Improved the existing beginner, private/group, Brazilian-partner and Gold Coast answers and linked them to priced services.
- Reused verified About-page qualifications near service enquiry actions.
- Kept genuine testimonials and did not invent reviews, placeholders or recent feedback.
- Removed internal location-set wording and continent-as-time-zone claims. Added translated, page-specific local learner context so the restored similarity threshold passes without new exclusions.
- Preserved city URLs and indexing settings. Consolidation candidates remain a later Search Console review task.

Checks: the location checker passed all 191 pages/language; no editorial location wording remains in the edited pages.

## Stage 8 — Measure enquiries

- Added consent-aware `contact_click` tracking for WhatsApp, email and telephone actions.
- Events include only `lesson_format`, `language`, `channel` and `page_path`; unselected formats use `unspecified` and no personal message/contact data is sent.
- Analytics now uses explicit action metadata instead of URL-substring classification. The generated checks assert the consent-aware event payload shape and reject URL inference; browser event confirmation remains a visual/manual follow-up because the desktop was locked during this run.
- The reporting split is online enquiries, Gold Coast group interest and completed enrolments; a contact click is not treated as an enrolment.

## Stage 9 — Validation and release preparation

- `npm run build` passed, including Hugo, location, language-routing, metadata, Pagefind and redirect checks.
- `npm run check` passed after the final edits.
- Generated HTML checks passed for prices, answer links, enquiry calls to action, canonicals, reciprocal language links and sitemap coverage.
- `git diff HEAD --check` passed.
- The generated public directory was rebuilt. Deployment remains separate and was not triggered.
- Static route smoke inspection passed for 21 homepage, service, contact and pricing routes across all three languages, including viewport, canonical, heading and reciprocal-language markup.
- The desktop/mobile visual inspection could not be opened because the host Mac was locked; no code or content change is blocked by that access condition.

## Stage 10 — External follow-up dependencies

These were deliberately left for account access and a separate authorization step:

- Google Business Profile edits, authentic supplied images and any review/community outreach drafts.
- Search Console and enquiry baselines, followed by 30/60/90-day comparison of online enquiries, Gold Coast group interest and enrolments.
- Any city-page consolidation or domain decision based on observed search performance.

## Unresolved business details

- Dates, venue, schedule, seat availability, materials/editions and cancellation terms for future groups.
- Pricing and availability for 1.5-hour and 2-hour private lessons.
- Which authentic classroom image and recent feedback may be supplied for publication.
