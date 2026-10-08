import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const languages = [
  { code: 'en', dir: 'content/en/portuguese-teaching-locations', service: '/en/portuguese-teaching-services/online-portuguese-lessons/' },
  { code: 'pt-br', dir: 'content/pt-br/locais-de-aulas-de-portugues', service: '/pt-br/aulas-de-portugues/aulas-online/' },
  { code: 'es', dir: 'content/es/ubicaciones-clases-portugues', service: '/es/servicios-clases-portugues/clases-portugues-online/' },
];
const cityFacts = JSON.parse(fs.readFileSync(path.join(root, 'data/seo-aeo-repair/city-facts.json'), 'utf8'));
const cityFactsBySlug = new Map(cityFacts.records.map((record) => [record.slug, record]));
const delivery = JSON.parse(fs.readFileSync(path.join(root, 'data/seo-aeo-repair/gold-coast-delivery.json'), 'utf8'));
const deliveryBySlug = new Map(Object.entries(delivery.locations).flatMap(([band, slugs]) => slugs.map((slug) => [slug, { band, ...delivery.travel_bands[band] }])));
if (deliveryBySlug.size !== 60) throw new Error(`Expected 60 Gold Coast driving-distance locations, found ${deliveryBySlug.size}`);
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
  const overrides = { ikaluit: { en: 'Iqaluit', 'pt-br': 'Iqaluit', es: 'Iqaluit' }, muenster: { en: 'Münster', 'pt-br': 'Münster', es: 'Münster' }, 'quebec-city': { en: 'Quebec City', 'pt-br': 'Cidade de Quebec', es: 'Ciudad de Quebec' } };
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
function regionFor(slug) { if (deliveryBySlug.has(slug)) return 'Gold Coast'; return Object.entries(regionSets).find(([, values]) => values.has(slug))?.[0] ?? 'International'; }
function metadata(slug) {
  const region = regionFor(slug);
  const record = cityFactsBySlug.get(slug);
  const [country, zone] = record ? [record.country, record.time_zone] : locations[slug] ?? fallbackByRegion[region] ?? ['International', 'UTC'];
  return { region, country, zone };
}
function descriptionFor(language, city, isGoldCoast) {
  if (isGoldCoast) {
    return language.code === 'en'
      ? `Portuguese lessons in ${city}: in-person Gold Coast classes and online options, in private or group formats subject to confirmation.`
      : language.code === 'pt-br'
        ? `Aulas de português em ${city}: opções presenciais na Gold Coast e online, particulares ou em grupo, sujeitas a confirmação.`
        : `Clases de portugués en ${city}: opciones presenciales en Gold Coast y online, privadas o en grupo, sujetas a confirmación.`;
  }
  const base = language.code === 'en'
    ? `Online Brazilian Portuguese lessons in ${city}, with Barbara Sharon. Private and group formats available online.`
    : language.code === 'pt-br'
      ? `Aulas online de português brasileiro em ${city}, com Barbara Sharon. Formatos particular e em grupo conforme disponibilidade.`
      : `Clases online de portugués brasileño en ${city}, con Barbara Sharon. Formatos individual y grupal según disponibilidad.`;
  if (base.length >= 120) return base;
  return `${base}${language.code === 'en' ? ' Start at your pace.' : language.code === 'pt-br' ? ' Comece no seu ritmo.' : ' A tu ritmo.'}`;
}

function deliveryCopy(language, city, travel) {
  const venues = delivery.venue_names.join(', ').replace(/, ([^,]+)$/, ' or $1');
  if (language.code === 'pt-br') {
    return `As aulas online estão disponíveis em todo o mundo. Para estudantes em ${city}, também é possível solicitar uma aula presencial em um local confirmado na Gold Coast, como ${venues}. O local mais próximo costuma ser ${travel.nearest}, a aproximadamente ${travel.drive_time} de carro em condições normais de trânsito. O local e a disponibilidade são confirmados antes da reserva.`;
  }
  if (language.code === 'es') {
    return `Las clases online están disponibles en todo el mundo. Para estudiantes en ${city}, también se puede solicitar una clase presencial en un lugar confirmado de Gold Coast, como ${venues}. El lugar más cercano suele ser ${travel.nearest}, a unos ${travel.drive_time} en coche con tráfico normal. El lugar y la disponibilidad se confirman antes de reservar.`;
  }
  return `Online lessons are available worldwide. Learners in ${city} can also request an in-person lesson at a confirmed Gold Coast venue such as ${venues}. The nearest practical option is usually ${travel.nearest}, approximately ${travel.drive_time} by car in typical traffic. The venue and availability are confirmed before booking.`;
}

function deliverySection(language, city, travel) {
  const venues = delivery.venue_names.join(', ').replace(/, ([^,]+)$/, ' or $1');
  if (language.code === 'pt-br') return `## Opção presencial para ${city}\n\nQuem está em ${city} pode solicitar uma aula presencial em um local confirmado na Gold Coast, como ${venues}. O local mais próximo costuma ser ${travel.nearest}, a aproximadamente ${travel.drive_time} de carro em condições normais de trânsito. Fale com Barbara antes de reservar para confirmar o local, o horário e a disponibilidade. As aulas online continuam disponíveis.`;
  if (language.code === 'es') return `## Opción presencial para ${city}\n\nQuienes están en ${city} pueden solicitar una clase presencial en un lugar confirmado de Gold Coast, como ${venues}. El lugar más cercano suele ser ${travel.nearest}, a unos ${travel.drive_time} en coche con tráfico normal. Contacta con Barbara antes de reservar para confirmar el lugar, el horario y la disponibilidad. Las clases online siguen disponibles.`;
  return `## In-person option for ${city}\n\nLearners in ${city} can request an in-person lesson at a confirmed Gold Coast venue such as ${venues}. The nearest practical option is usually ${travel.nearest}, approximately ${travel.drive_time} by car in typical traffic. Contact Barbara before booking to confirm the venue, timing, and availability. Online lessons remain available.`;
}

function render(slug, language, old) {
  const city = displayCity(slug, language.code); const meta = metadata(slug); const l = { ...labels[language.code], code: language.code }; const travel = deliveryBySlug.get(slug);
  const isGoldCoast = meta.region === 'Gold Coast';
  const scope = travel ? 'online_plus_confirmed_gold_coast_venue' : 'online_only';
  const serviceText = travel ? deliveryCopy(language, city, travel) : l.online;
  const parity = slug.length % 2 === 0;
  const facts = language.code === 'en'
    ? [`Learners in ${city} can use the online lessons from ${meta.country === city ? 'the listed country' : meta.country}.`, `Scheduling uses the ${meta.region === city ? 'local' : meta.region} time-zone group as a planning reference.`]
    : language.code === 'pt-br'
      ? [`Estudantes em ${city} podem fazer as aulas online a partir de ${meta.country === city ? 'o país indicado' : meta.country}.`, `O agendamento usa o grupo de fuso horário ${meta.region === city ? 'local' : meta.region} como referência de planejamento.`]
      : [`Los estudiantes de ${city} pueden hacer las clases online desde ${meta.country === city ? 'el país indicado' : meta.country}.`, `La programación usa el grupo horario ${meta.region === city ? 'local' : meta.region} como referencia de planificación.`];
  const intro = language.code === 'en' ? `${l.intro} ${city}. ${serviceText}` : language.code === 'pt-br' ? `${l.intro} ${city}. ${serviceText}` : `${l.intro} ${city}. ${serviceText}`;
  const context = travel
    ? language.code === 'en' ? `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} An in-person lesson can be requested at a confirmed Gold Coast venue; the nearest practical option is usually ${travel.nearest}, approximately ${travel.drive_time} by car in typical traffic.`
      : language.code === 'pt-br' ? `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} É possível solicitar uma aula presencial em um local confirmado na Gold Coast; o local mais próximo costuma ser ${travel.nearest}, a aproximadamente ${travel.drive_time} de carro em condições normais de trânsito.`
        : `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} Se puede solicitar una clase presencial en un lugar confirmado de Gold Coast; el lugar más cercano suele ser ${travel.nearest}, a unos ${travel.drive_time} en coche con tráfico normal.`
    : language.code === 'en' ? `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} This page keeps the local reference specific to ${city} while the teaching service remains online-first.` : language.code === 'pt-br' ? `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} Esta página mantém a referência local específica de ${city}, enquanto o serviço de ensino continua priorizando o formato online.` : `${facts[parity ? 0 : 1]} ${facts[parity ? 1 : 0]} Esta página mantiene la referencia local específica de ${city}, mientras que el servicio de enseñanza sigue priorizando el formato online.`;
  const scheduling = language.code === 'en' ? `${l.scheduling} ${city}: ${serviceText} The IANA time zone is ${meta.zone}; use it as a planning reference rather than a promise of a particular class time.` : language.code === 'pt-br' ? `${l.scheduling} ${city}: ${serviceText} O fuso horário IANA é ${meta.zone}; use-o como referência de planejamento, não como promessa de um horário específico.` : `${l.scheduling} ${city}: ${serviceText} La zona horaria IANA es ${meta.zone}; úsala como referencia de planificación, no como promesa de una hora concreta.`;
  const useCase = travel
    ? language.code === 'en' ? `${l.useCase} ${city}: choose an online lesson or request an in-person lesson at a confirmed Gold Coast venue, depending on your goal and availability.` : language.code === 'pt-br' ? `${l.useCase} ${city}: escolha uma aula online ou solicite uma aula presencial em um local confirmado na Gold Coast, conforme seu objetivo e a disponibilidade.` : `${l.useCase} ${city}: elige una clase online o solicita una clase presencial en un lugar confirmado de Gold Coast, según tu objetivo y la disponibilidad.`
    : language.code === 'en' ? `${l.useCase} ${city}: you might use an online lesson to prepare for travel, family communication, work conversations, or a personal interest in Brazilian Portuguese.` : language.code === 'pt-br' ? `${l.useCase} ${city}: você pode usar uma aula online para se preparar para viagens, comunicação familiar, conversas de trabalho ou um interesse pessoal pelo português brasileiro.` : `${l.useCase} ${city}: puedes usar una clase online para prepararte para viajes, comunicación familiar, conversaciones de trabajo o un interés personal por el portugués brasileño.`;
  const faqA = travel
    ? language.code === 'en' ? `Yes. You can choose online lessons or request an in-person lesson at a confirmed Gold Coast venue such as ${delivery.venue_names.join(', ')}. The venue and timing are agreed in advance using ${meta.zone}; contact Barbara to confirm current availability.` : language.code === 'pt-br' ? `Sim. Você pode escolher aulas online ou solicitar uma aula presencial em um local confirmado na Gold Coast, como ${delivery.venue_names.join(', ')}. O local e o horário são combinados com antecedência usando ${meta.zone}; fale com Barbara para confirmar a disponibilidade atual.` : `Sí. Puedes elegir clases online o solicitar una clase presencial en un lugar confirmado de Gold Coast, como ${delivery.venue_names.join(', ')}. El lugar y el horario se acuerdan con antelación usando ${meta.zone}; contacta con Barbara para confirmar la disponibilidad actual.`
    : l.faqA.replaceAll('{city}', city).replaceAll('{zone}', meta.zone);
  const preserved = frontMatter(old);
  const image = field(preserved, 'filename') || field(preserved, 'image.filename');
  const alt = field(preserved, 'alt_text') || field(preserved, 'image.alt_text') || yaml(`Barbara Sharon teaching Brazilian Portuguese online for learners in ${city}`);
  const key = quoted(field(preserved, 'translationKey')) || `location-${slug}`;
  const aliasLine = block(preserved, 'aliases');
  const onlineTitle = `${l.title} ${city}`;
  if (onlineTitle.length > 58) l.title = language.code === 'en' ? 'Online Portuguese Lessons in' : language.code === 'pt-br' ? 'Aulas online de português em' : 'Clases online de portugués en';
  const title = travel
    ? language.code === 'en' ? `Portuguese in ${city}: In-Person & Online`
      : language.code === 'pt-br' ? `Português em ${city}: Presenciais e Online`
        : `Portugués en ${city}: Presenciales y Online`
    : `${l.title} ${city}`;
  return `---\ntranslationKey: ${key}\ntitle: ${yaml(title)}\ndescription: ${yaml(`${l.description} ${city}, with Barbara Sharon. Online private and group formats are arranged around goals and availability.`)}\ndate: 2026-08-05\nlastmod: "2026-10-08"\n${aliasLine ? `${aliasLine}\n` : ''}image:\n  filename: ${image}\n  alt_text: ${alt}\nrobots: index, follow, max-image-preview:large\ncategories:\n- ${language.code === 'en' ? 'Portuguese teaching locations' : language.code === 'pt-br' ? 'Locais de aulas de português' : 'Ubicaciones para aprender portugués'}\ncity: ${yaml(city)}\ncountry: ${yaml(meta.country)}\nregion_group: ${yaml(meta.region)}\ntime_zone: ${yaml(meta.zone)}\nservice_scope: ${scope}\nlocal_intro: ${yaml(intro)}\nlocal_context: ${yaml(context)}\nscheduling: ${yaml(scheduling)}\nlearner_use_case: ${yaml(useCase)}\ncta:\n  label: ${yaml(`${l.cta} ${city}`)}\n  url: ${l.code === 'en' ? '/en/contact-portuguese-teacher/' : l.code === 'pt-br' ? '/pt-br/contato-professora-portugues/' : '/es/contacto-profesora-portugues/'}\nfaq:\n  - question: ${yaml(`${l.faqQ} ${city}?`)}\n    answer: ${yaml(faqA)}\neditorial_reviewed: true\n---\n`;
}

for (const language of languages) {
  const directory = path.join(root, language.dir);
  const slugs = fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== '_index.md').map((entry) => entry.name).sort();
  if (slugs.length !== 191) throw new Error(`${language.code}: expected 191 locations, found ${slugs.length}`);
  for (const slug of slugs) {
    const file = path.join(directory, slug, 'index.md');
    const old = originalSource(path.relative(root, file)) || fs.readFileSync(file, 'utf8');
    const city = displayCity(slug, language.code);
    const travel = deliveryBySlug.get(slug);
    const rendered = render(slug, language, old)
      .replace(/^description:.*$/m, `description: ${yaml(descriptionFor(language, city, metadata(slug).region === 'Gold Coast'))}`)
      .replace('robots: noindex, follow, max-image-preview:large', 'robots: index, follow, max-image-preview:large')
      .replace('editorial_reviewed: false', 'editorial_reviewed: true');
    const body = originalBody(old);
    fs.writeFileSync(file, `${rendered}\n${travel ? `${body}\n\n${deliverySection(language, city, deliveryBySlug.get(slug))}` : body}\n`);
  }
}
console.log('Remediated 573 location pages across 3 languages.');
