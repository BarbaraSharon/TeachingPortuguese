import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const languages = [
  { code: 'en', dir: 'content/en/portuguese-teaching-locations', service: '/en/portuguese-teaching-services/online-portuguese-lessons/' },
  { code: 'pt-br', dir: 'content/pt-br/locais-de-aulas-de-portugues', service: '/pt-br/aulas-de-portugues/aulas-online/' },
  { code: 'es', dir: 'content/es/ubicaciones-clases-portugues', service: '/es/servicios-clases-portugues/clases-portugues-online/' },
];

const goldCoast = new Set('advancetown alberton arundel ashmore austinville benowa biggera-waters bilinga bonogin broadbeach broadbeach-waters bundall burleigh-heads burleigh-waters carrara cedar-creek clagiraba clear-island-waters coolangatta coombabah coomera coomera-waters currumbin currumbin-valley currumbin-waters elanora ernest forest-hill foxwell gaven gilston gold-coast helensvale highland-park hollywell hope-island isle-of-capri jacobs-well kingscliff kingsholme labrador lower-beechmont maudsland mermaid-beach mermaid-waters merrimac mudgeeraba surfers-paradise'.split(' '));
const regionSets = {
  'Australia & New Zealand': new Set('adelaide auckland brisbane canberra guanaba melbourne nerang ormeau oxenford palm-beach parkside perth pimpama reedy-creek robina southport sydney tweed-heads upper-coomera varsity-lakes'.split(' ')),
  Asia: new Set('abu-dhabi bangalore dubai mumbai osaka seoul singapore tel-aviv tokyo'.split(' ')),
  Europe: new Set('amsterdam augsburg barcelona basel berlin birmingham bologna bonn bordeaux bremen bristol brussels cologne copenhagen cork dresden dublin duesseldorf edinburgh eindhoven florence frankfurt-am-main freiburg-im-breisgau geneva glasgow gothenburg hamburg hanover heidelberg karlsruhe lausanne leeds leipzig lisbon london lyon madrid malaga manchester mannheim milan muenster munich naples nice nuremberg oslo paris porto rome rotterdam salzburg seville stockholm stuttgart the-hague toulouse turin utrecht valencia vienna wiesbaden zurich'.split(' ')),
  'North America': new Set('abbotsford atlanta austin boston burnaby calgary charlottetown chicago chilliwack denver edmonton fredericton halifax hamilton houston ikaluit kamloops kelowna kingston los-angeles miami moncton montreal nanaimo new-york niagara-falls orlando ottawa philadelphia prince-george quebec-city regina richmond saint-john san-diego san-francisco san-jose saskatoon seattle surrey toronto vancouver vernon victoria washington-dc whitehorse winnipeg yellowknife'.split(' ')),
  'South America': new Set(['rio-de-janeiro']),
  Africa: new Set('cape-town johannesburg'.split(' ')),
};

const locations = {
  'abu-dhabi': ['United Arab Emirates', 'Asia/Dubai'], bangalore: ['India', 'Asia/Kolkata'], dubai: ['United Arab Emirates', 'Asia/Dubai'], mumbai: ['India', 'Asia/Kolkata'], osaka: ['Japan', 'Asia/Tokyo'], seoul: ['South Korea', 'Asia/Seoul'], singapore: ['Singapore', 'Asia/Singapore'], 'tel-aviv': ['Israel', 'Asia/Jerusalem'], tokyo: ['Japan', 'Asia/Tokyo'],
  amsterdam: ['Netherlands', 'Europe/Amsterdam'], augsburg: ['Germany', 'Europe/Berlin'], barcelona: ['Spain', 'Europe/Madrid'], basel: ['Switzerland', 'Europe/Zurich'], berlin: ['Germany', 'Europe/Berlin'], birmingham: ['United Kingdom', 'Europe/London'], bologna: ['Italy', 'Europe/Rome'], bonn: ['Germany', 'Europe/Berlin'], bordeaux: ['France', 'Europe/Paris'], bremen: ['Germany', 'Europe/Berlin'], bristol: ['United Kingdom', 'Europe/London'], brussels: ['Belgium', 'Europe/Brussels'], cologne: ['Germany', 'Europe/Berlin'], copenhagen: ['Denmark', 'Europe/Copenhagen'], cork: ['Ireland', 'Europe/Dublin'], dresden: ['Germany', 'Europe/Berlin'], dublin: ['Ireland', 'Europe/Dublin'], duesseldorf: ['Germany', 'Europe/Berlin'], edinburgh: ['United Kingdom', 'Europe/London'], eindhoven: ['Netherlands', 'Europe/Amsterdam'], florence: ['Italy', 'Europe/Rome'], 'frankfurt-am-main': ['Germany', 'Europe/Berlin'], 'freiburg-im-breisgau': ['Germany', 'Europe/Berlin'], geneva: ['Switzerland', 'Europe/Zurich'], glasgow: ['United Kingdom', 'Europe/London'], gothenburg: ['Sweden', 'Europe/Stockholm'], hamburg: ['Germany', 'Europe/Berlin'], hanover: ['Germany', 'Europe/Berlin'], heidelberg: ['Germany', 'Europe/Berlin'], karlsruhe: ['Germany', 'Europe/Berlin'], lausanne: ['Switzerland', 'Europe/Zurich'], leeds: ['United Kingdom', 'Europe/London'], leipzig: ['Germany', 'Europe/Berlin'], lisbon: ['Portugal', 'Europe/Lisbon'], london: ['United Kingdom', 'Europe/London'], lyon: ['France', 'Europe/Paris'], madrid: ['Spain', 'Europe/Madrid'], malaga: ['Spain', 'Europe/Madrid'], manchester: ['United Kingdom', 'Europe/London'], mannheim: ['Germany', 'Europe/Berlin'], milan: ['Italy', 'Europe/Rome'], muenster: ['Germany', 'Europe/Berlin'], munich: ['Germany', 'Europe/Berlin'], naples: ['Italy', 'Europe/Rome'], nice: ['France', 'Europe/Paris'], nuremberg: ['Germany', 'Europe/Berlin'], oslo: ['Norway', 'Europe/Oslo'], paris: ['France', 'Europe/Paris'], porto: ['Portugal', 'Europe/Lisbon'], rome: ['Italy', 'Europe/Rome'], rotterdam: ['Netherlands', 'Europe/Amsterdam'], salzburg: ['Austria', 'Europe/Vienna'], seville: ['Spain', 'Europe/Madrid'], stockholm: ['Sweden', 'Europe/Stockholm'], stuttgart: ['Germany', 'Europe/Berlin'], 'the-hague': ['Netherlands', 'Europe/Amsterdam'], toulouse: ['France', 'Europe/Paris'], turin: ['Italy', 'Europe/Rome'], utrecht: ['Netherlands', 'Europe/Amsterdam'], valencia: ['Spain', 'Europe/Madrid'], vienna: ['Austria', 'Europe/Vienna'], wiesbaden: ['Germany', 'Europe/Berlin'], zurich: ['Switzerland', 'Europe/Zurich'],
  auckland: ['New Zealand', 'Pacific/Auckland'], adelaide: ['Australia', 'Australia/Adelaide'], brisbane: ['Australia', 'Australia/Brisbane'], canberra: ['Australia', 'Australia/Sydney'], melbourne: ['Australia', 'Australia/Melbourne'], perth: ['Australia', 'Australia/Perth'], sydney: ['Australia', 'Australia/Sydney'], 'tweed-heads': ['Australia', 'Australia/Brisbane'],
  atlanta: ['United States', 'America/New_York'], austin: ['United States', 'America/Chicago'], boston: ['United States', 'America/New_York'], calgary: ['Canada', 'America/Edmonton'], chicago: ['United States', 'America/Chicago'], denver: ['United States', 'America/Denver'], edmonton: ['Canada', 'America/Edmonton'], houston: ['United States', 'America/Chicago'], miami: ['United States', 'America/New_York'], montreal: ['Canada', 'America/Toronto'], 'new-york': ['United States', 'America/New_York'], orlando: ['United States', 'America/New_York'], ottawa: ['Canada', 'America/Toronto'], philadelphia: ['United States', 'America/New_York'], regina: ['Canada', 'America/Regina'], 'san-diego': ['United States', 'America/Los_Angeles'], 'san-francisco': ['United States', 'America/Los_Angeles'], 'san-jose': ['United States', 'America/Los_Angeles'], seattle: ['United States', 'America/Los_Angeles'], toronto: ['Canada', 'America/Toronto'], vancouver: ['Canada', 'America/Vancouver'], 'washington-dc': ['United States', 'America/New_York'], winnipeg: ['Canada', 'America/Winnipeg'],
  'rio-de-janeiro': ['Brazil', 'America/Sao_Paulo'], 'cape-town': ['South Africa', 'Africa/Johannesburg'], johannesburg: ['South Africa', 'Africa/Johannesburg'],
};

const fallbackByRegion = {
  'Gold Coast': ['Australia', 'Australia/Brisbane'],
  'Australia & New Zealand': ['Australia', 'Australia/Brisbane'], Asia: ['Asia', 'Asia/Singapore'], Europe: ['Europe', 'Europe/Berlin'], 'North America': ['Canada', 'America/Toronto'], 'South America': ['Brazil', 'America/Sao_Paulo'], Africa: ['South Africa', 'Africa/Johannesburg'],
};

const labels = {
  en: { title: 'Online Brazilian Portuguese Lessons in', description: 'Online Brazilian Portuguese lessons for learners in', intro: 'Learn Brazilian Portuguese online from', context: 'Local context for learners in', scheduling: 'Scheduling from', useCase: 'A possible learner goal in', faq: 'Frequently asked questions', cta: 'Discuss lessons for', ctaButton: 'Contact Barbara', online: 'Lessons are delivered online. Choose a time that works in your local time zone, then confirm availability with Barbara.', venue: 'Online lessons are the standard option. A confirmed Gold Coast venue may also be available in Surfers Paradise, Broadbeach, or Kirra, subject to demand and confirmation.', faqQ: 'Can I study from', faqA: 'Yes. Lessons are online, so you can study from {city}. Times are agreed in advance using {zone} and current availability. Contact Barbara to discuss a suitable format.' },
  'pt-br': { title: 'Aulas online de português brasileiro em', description: 'Aulas online de português brasileiro para quem está em', intro: 'Aprenda português brasileiro online a partir de', context: 'Contexto local para estudantes em', scheduling: 'Horários para', useCase: 'Um possível objetivo de estudante em', faq: 'Perguntas frequentes', cta: 'Converse sobre aulas para', ctaButton: 'Fale com a Barbara', online: 'As aulas são online. Escolha um horário no seu fuso local e confirme a disponibilidade com Barbara.', venue: 'As aulas online são a opção padrão. Um local confirmado na Gold Coast também pode estar disponível em Surfers Paradise, Broadbeach ou Kirra, conforme a demanda e confirmação.', faqQ: 'Posso estudar a partir de', faqA: 'Sim. As aulas são online, então você pode estudar a partir de {city}. Os horários são combinados com antecedência usando {zone} e a disponibilidade atual. Fale com Barbara para escolher o formato.' },
  es: { title: 'Clases online de portugués brasileño en', description: 'Clases online de portugués brasileño para quienes están en', intro: 'Aprende portugués brasileño online desde', context: 'Contexto local para estudiantes en', scheduling: 'Horarios para', useCase: 'Un posible objetivo de aprendizaje en', faq: 'Preguntas frecuentes', cta: 'Habla sobre clases para', ctaButton: 'Contactar con Barbara', online: 'Las clases se imparten online. Elige un horario que funcione en tu zona horaria y confirma la disponibilidad con Barbara.', venue: 'Las clases online son la opción habitual. También puede haber un lugar confirmado en Gold Coast, en Surfers Paradise, Broadbeach o Kirra, según la demanda y la confirmación.', faqQ: '¿Puedo estudiar desde', faqA: 'Sí. Las clases son online, por lo que puedes estudiar desde {city}. Los horarios se acuerdan con antelación usando {zone} y la disponibilidad actual. Contacta con Barbara para hablar del formato.' },
};

function humanize(slug) { return slug.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '); }
function displayCity(slug, language) {
  const overrides = { muenster: { en: 'Münster', 'pt-br': 'Münster', es: 'Münster' }, 'quebec-city': { en: 'Quebec City', 'pt-br': 'Cidade de Quebec', es: 'Ciudad de Quebec' } };
  return overrides[slug]?.[language] ?? humanize(slug);
}
function yaml(value) { return JSON.stringify(value); }
function frontMatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? '';
}
function field(text, name) { return text.match(new RegExp(`^\\s*${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''; }
function block(text, name) { return text.match(new RegExp(`^${name}:\\n((?:- .*\\n|  .*\\n)+)`, 'm'))?.[0]?.trimEnd() ?? ''; }
function originalSource(relativePath) {
  try { return execFileSync('git', ['show', `HEAD:${relativePath}`], { cwd: root, encoding: 'utf8' }); } catch { return ''; }
}
function originalBody(source) { return source.match(/^---[\s\S]*?---\n([\s\S]*)$/)?.[1]?.trim() ?? ''; }
function quoted(value) { return value.replace(/^['"]|['"]$/g, ''); }
function regionFor(slug) { if (goldCoast.has(slug)) return 'Gold Coast'; return Object.entries(regionSets).find(([, values]) => values.has(slug))?.[0] ?? 'International'; }
function metadata(slug) { const region = regionFor(slug); const [country, zone] = locations[slug] ?? fallbackByRegion[region] ?? ['International', 'UTC']; return { region, country, zone }; }
function descriptionFor(language, city) {
  const base = language.code === 'en'
    ? `Online Brazilian Portuguese lessons in ${city}, with Barbara Sharon. Private and group formats available online.`
    : language.code === 'pt-br'
      ? `Aulas online de português brasileiro em ${city}, com Barbara Sharon. Formatos particular e em grupo conforme disponibilidade.`
      : `Clases online de portugués brasileño en ${city}, con Barbara Sharon. Formatos individual y grupal según disponibilidad.`;
  if (base.length >= 120) return base;
  return `${base}${language.code === 'en' ? ' Start at your pace.' : language.code === 'pt-br' ? ' Comece no seu ritmo.' : ' A tu ritmo.'}`;
}

function render(slug, language, old) {
  const city = displayCity(slug, language.code); const meta = metadata(slug); const l = { ...labels[language.code], code: language.code };
  const isGoldCoast = meta.region === 'Gold Coast';
  const scope = isGoldCoast ? 'online_plus_confirmed_gold_coast_venue' : 'online_only';
  const serviceText = isGoldCoast ? l.venue : l.online;
  const parity = slug.length % 2 === 0;
  const facts = language.code === 'en'
    ? [`${city} is located in ${meta.country}.`, `${city} is grouped in the ${meta.region} location set used for local scheduling and learner guidance.`]
    : language.code === 'pt-br'
      ? [`${city} está localizada em ${meta.country}.`, `${city} faz parte do conjunto regional ${meta.region} usado para orientar horários e objetivos de aprendizagem.`]
      : [`${city} está situada en ${meta.country}.`, `${city} forma parte del conjunto regional ${meta.region}, que se utiliza para orientar horarios y objetivos de aprendizaje.`];
  const intro = language.code === 'en' ? `${l.intro} ${city}. ${serviceText}` : language.code === 'pt-br' ? `${l.intro} ${city}. ${serviceText}` : `${l.intro} ${city}. ${serviceText}`;
  const context = language.code === 'en' ? `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} This page keeps the local reference specific to ${city} while the teaching service remains online-first.` : language.code === 'pt-br' ? `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} Esta página mantém a referência local específica de ${city}, enquanto o serviço de ensino continua priorizando o formato online.` : `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} Esta página mantiene la referencia local específica de ${city}, mientras que el servicio de enseñanza sigue priorizando el formato online.`;
  const scheduling = language.code === 'en' ? `${l.scheduling} ${city}: ${serviceText} The IANA time zone is ${meta.zone}; use it as a planning reference rather than a promise of a particular class time.` : language.code === 'pt-br' ? `${l.scheduling} ${city}: ${serviceText} O fuso horário IANA é ${meta.zone}; use-o como referência de planejamento, não como promessa de um horário específico.` : `${l.scheduling} ${city}: ${serviceText} La zona horaria IANA es ${meta.zone}; úsala como referencia de planificación, no como promesa de una hora concreta.`;
  const useCase = language.code === 'en' ? `${l.useCase} ${city}: you might use an online lesson to prepare for travel, family communication, work conversations, or a personal interest in Brazilian Portuguese.` : language.code === 'pt-br' ? `${l.useCase} ${city}: você pode usar uma aula online para se preparar para viagens, comunicação familiar, conversas de trabalho ou um interesse pessoal pelo português brasileiro.` : `${l.useCase} ${city}: puedes usar una clase online para prepararte para viajes, comunicación familiar, conversaciones de trabajo o un interés personal por el portugués brasileño.`;
  const faqA = l.faqA.replaceAll('{city}', city).replaceAll('{zone}', meta.zone);
  const preserved = frontMatter(old);
  const image = field(preserved, 'filename') || field(preserved, 'image.filename');
  const alt = field(preserved, 'alt_text') || field(preserved, 'image.alt_text') || yaml(`Barbara Sharon teaching Brazilian Portuguese online for learners in ${city}`);
  const key = quoted(field(preserved, 'translationKey')) || `location-${slug}`;
  const aliasLine = block(preserved, 'aliases');
  const candidateTitle = `${l.title} ${city}`;
  if (candidateTitle.length > 58) l.title = language.code === 'en' ? 'Online Portuguese Lessons in' : language.code === 'pt-br' ? 'Aulas online de português em' : 'Clases online de portugués en';
  return `---\ntranslationKey: ${key}\ntitle: ${yaml(`${l.title} ${city}`)}\ndescription: ${yaml(`${l.description} ${city}, with Barbara Sharon. Online private and group formats are arranged around goals and availability.`)}\ndate: 2026-08-05\nlastmod: 2026-08-10\n${aliasLine ? `${aliasLine}\n` : ''}image:\n  filename: ${image}\n  alt_text: ${alt}\nrobots: index, follow, max-image-preview:large\ncategories:\n- ${language.code === 'en' ? 'Portuguese teaching locations' : language.code === 'pt-br' ? 'Locais de aulas de português' : 'Ubicaciones para aprender portugués'}\ncity: ${yaml(city)}\ncountry: ${yaml(meta.country)}\nregion_group: ${yaml(meta.region)}\ntime_zone: ${yaml(meta.zone)}\nservice_scope: ${scope}\nlocal_intro: ${yaml(intro)}\nlocal_context: ${yaml(context)}\nscheduling: ${yaml(scheduling)}\nlearner_use_case: ${yaml(useCase)}\ncta:\n  label: ${yaml(`${l.cta} ${city}`)}\n  url: ${l.code === 'en' ? '/en/contact-portuguese-teacher/' : l.code === 'pt-br' ? '/pt-br/contato-professora-portugues/' : '/es/contacto-profesora-portugues/'}\nfaq:\n  - question: ${yaml(`${l.faqQ} ${city}?`)}\n    answer: ${yaml(faqA)}\neditorial_reviewed: true\n---\n`;
}

for (const language of languages) {
  const directory = path.join(root, language.dir);
  const slugs = fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== '_index.md').map((entry) => entry.name).sort();
  if (slugs.length !== 191) throw new Error(`${language.code}: expected 191 locations, found ${slugs.length}`);
  for (const slug of slugs) {
    const file = path.join(directory, slug, 'index.md');
    const old = originalSource(path.relative(root, file)) || fs.readFileSync(file, 'utf8');
    const city = displayCity(slug, language.code);
    const rendered = render(slug, language, old)
      .replace(/^description:.*$/m, `description: ${yaml(descriptionFor(language, city))}`)
      .replace('robots: noindex, follow, max-image-preview:large', 'robots: index, follow, max-image-preview:large')
      .replace('editorial_reviewed: false', 'editorial_reviewed: true');
    fs.writeFileSync(file, `${rendered}\n${originalBody(old)}\n`);
  }
}
console.log('Remediated 573 location pages across 3 languages.');
