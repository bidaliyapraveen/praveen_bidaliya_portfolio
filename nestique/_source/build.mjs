import crypto from 'node:crypto';
// Builds the static Nestique site into ./dist from data/stays.json
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/stays.json'), 'utf8'));
const FORM_ACTION = `https://formsubmit.co/${data.email}`;
const SITE = (process.env.SITE_URL || 'https://praveenbidaliya.com/nestique').replace(/\/$/, '');
const BASE = process.env.BASE_PATH || '/nestique/';

const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
if (fs.existsSync(path.join(root, 'photos'))) fs.cpSync(path.join(root, 'photos'), path.join(dist, 'photos'), { recursive: true });

const ver = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(root, 'assets', f))).digest('hex').slice(0, 8);
const V = { css: ver('site.css'), js: ver('site.js') };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const city = (id) => data.cities.find((c) => c.id === id);
const cityName = (id) => city(id)?.name ?? '';
const val = (v) => (v === null || v === undefined || v === '' ? 'On request' : v);
const cityList = data.cities.map((c) => c.name).join(', ').replace(/, ([^,]*)$/, ' and $1');
const write = (rel, html) => {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // wrap each form label's text so it stays on one line above its field
  html = html.replace(/<label>([^<]*(?:<span class="opt">[^<]*<\/span>)?)\s*(?=<input|<textarea|\n\s*<select)/g, '<label><span class="lt">$1</span>');
  html = html.replace(/(href|src|action)="\/(?!\/)/g, `$1="${BASE}`);
  fs.writeFileSync(file, html);
};

const mailto = (stay) => {
  const subject = stay ? `Booking enquiry: ${stay.name}` : 'Booking enquiry';
  const body = `Hi Nestique,\n\nI'd like to book${stay ? ` ${stay.name} (${cityName(stay.city)})` : ''}.\n\nCheck-in date:\nCheck-out date:\nNumber of guests:\n\nThanks,\n`;
  return `mailto:${data.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const small = (src) => {
  const sm = src.replace(/\.jpg$/, '-sm.jpg');
  return fs.existsSync(path.join(root, sm)) ? sm : src;
};
const photo = (stay, i, cls = '', size = 'sm') => {
  const src0 = stay.images[i];
  const src = src0 && size === 'sm' ? small(src0) : src0;
  if (src && src0 !== src) return `<img class="${cls}" src="/${esc(src)}" srcset="${BASE}${esc(src)} 900w, ${BASE}${esc(src0)} 2000w" sizes="${i === 0 && size === 'full' ? '(max-width: 640px) 100vw, 60vw' : '(max-width: 640px) 100vw, 33vw'}" alt="${esc(stay.imageAlts?.[i] || `${stay.name}, photo ${i + 1}`)}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`;
  if (src) return `<img class="${cls}" src="/${esc(src)}" alt="${esc(stay.imageAlts?.[i] || `${stay.name}, photo ${i + 1}`)}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`;
  return `<div class="ph ${cls}" role="img" aria-label="Photo of ${esc(stay.name)} coming soon"><span>${esc(stay.name.charAt(0))}</span></div>`;
};

const faqs = [
  ['How do I book?', 'Send us a booking request from the stay\'s page, or email us with your dates and number of guests. We reply with the total price and availability, and confirm once payment is done.'],
  ['When do I pay?', 'After we confirm your dates. We share the total for your stay and the payment details by email.'],
  ['How does check-in work?', 'Before you arrive we send the exact address, directions and how to get the keys.'],
  ['Can I book more than one home?', 'Yes. Several of our homes are close to each other, which works well for families and groups. Mention all the homes you want in your request.'],
  ['Are long stays possible?', 'Yes. Tell us your dates and we\'ll share a price for weekly or monthly stays.'],
  ['Can I cook?', 'Every home has a kitchen with cookware, so you can cook your own meals.'],
];

const nav = (page) => `
<header class="top">
  <a class="mark" href="/" aria-label="Nestique home">Nestique</a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
  <nav id="site-nav" aria-label="Main">
    <div class="nav-links">
      <a href="/#stays">Stays</a>
      <a href="/#booking">How to book</a>
      <a href="/#faq">FAQ</a>
      <a href="/contact/"${page === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
    </div>
    <a class="btn-sm" href="/contact/">Request to book</a>
  </nav>
</header>`;

const layout = ({ title, description, body, page, canonical = '/', jsonld = null, image = null }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nestique">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
${image ? `<meta property="og:image" content="${SITE}/${esc(image)}">` : ''}
<meta name="theme-color" content="#173a35">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=${V.css}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
<script src="/assets/site.js?v=${V.js}" defer></script>
</head>
<body class="p-${page}">
<a class="skip" href="#main">Skip to content</a>
${nav(page)}
<main id="main">
${body}
</main>
<footer class="foot">
  <p class="foot-big">Questions about a stay? <a href="mailto:${esc(data.email)}">${esc(data.email)}</a></p>
  <div class="foot-row">
    <nav aria-label="Stays">
      ${data.stays.map((s) => `<a href="/stays/${s.slug}/">${esc(s.name)}</a>`).join('')}
    </nav>
    <p class="foot-small">© ${new Date().getFullYear()} Nestique. Homes in ${cityList}.</p>
  </div>
</footer>
</body>
</html>
`;

const row = (s, metaA, metaB) => `
      <li>
        <a class="row" href="/stays/${s.slug}/">
          <span class="row-name">${esc(s.name)}</span>
          <span class="row-meta"><span>${esc(metaA)}</span><span>${esc(metaB)}</span></span>
          <span class="row-thumb" aria-hidden="true">${photo(s, 0)}</span>
        </a>
      </li>`;

const honeypot = `<p class="hp" aria-hidden="true"><label>Leave this empty <input name="_honey" tabindex="-1" autocomplete="off"></label></p>
        <input type="hidden" name="_captcha" value="false">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="_next" value="${SITE}/thank-you/">`;

// ---------- Home ----------
const icon = {
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/></svg>',
  bed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3H10v1"/><circle cx="6.5" cy="10.5" r="1.5"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a6.5 6.5 0 0 1 3.5 6.5"/></svg>',
  pot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h2M20 10h2M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
};

const card = (s) => `
    <li class="card" data-city="${s.city}" data-guests="${s.guests || ""}" data-search="${esc([s.name, s.area, cityName(s.city), s.type].join(' ').toLowerCase())}">
      <a href="/stays/${s.slug}/">
        <div class="card-img">
          ${photo(s, 0)}
          <span class="card-tag">${esc(cityName(s.city))}</span>
          ${s.rating ? `<span class="card-rate" aria-label="Rated ${s.rating.score} out of 5 from ${s.rating.count} reviews">★ ${s.rating.score.toFixed(2)}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-top">
            <h3>${esc(s.name)}</h3>
            <p class="card-price">${s.price ? `₹${Number(s.price).toLocaleString('en-IN')}<span>/night</span>` : '<span>Price on request</span>'}</p>
          </div>
          <p class="card-loc">${icon.pin}${esc(s.area)}${s.area === cityName(s.city) ? '' : `, ${esc(cityName(s.city))}`}</p>
          <ul class="card-facts">
            <li>${icon.home}${esc(s.type)}</li>
            ${s.baths ? `<li>${icon.bed}${s.baths} ${s.baths === 1 ? 'bathroom' : 'bathrooms'}</li>` : ''}
            ${s.guests ? `<li>${icon.users}Up to ${s.guests} guests</li>` : ''}
            ${s.amenities.some((a) => /kitchen/i.test(a)) ? `<li>${icon.pot}Full kitchen</li>` : ''}
          </ul>
        </div>
      </a>
    </li>`;

const faqHtml = `
<section id="faq" class="faq" aria-labelledby="faq-title">
  <h2 id="faq-title">Questions guests ask</h2>
  <div class="faq-list">
    ${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
  </div>
</section>`;

write('index.html', layout({
  title: `Nestique | Homes to stay in ${cityList}`,
  description: `${data.stays.length} homes to stay in ${cityList}. Book directly with Nestique.`,
  page: 'home',
  image: data.stays.find((s) => s.images[0])?.images[0],
  jsonld: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Nestique', url: SITE, email: data.email },
  body: `
<section class="hero hero-center">
  <h1>Stay like you live here.<br><span>Homes by the Ganga and the hills.</span></h1>
  <p class="hero-sub">Calm, fully equipped homes in ${cityList}. Pick a stay, send your dates and book directly with us.</p>

</section>

<section id="stays" class="stays" aria-label="Stays">
  <div class="results-head">
    <div class="city-tabs" role="tablist" aria-label="Stays by city">
      <button type="button" role="tab" data-tab="all" aria-selected="true">All<span>${data.stays.length}</span></button>
      ${data.cities.map((c) => `<button type="button" role="tab" data-tab="${c.id}" aria-selected="false">${esc(c.name)}<span>${data.stays.filter((s) => s.city === c.id).length}</span></button>`).join('')}
    </div>
  </div>
  <ul class="cards">${[...data.stays].sort((a, z) => (z.images.length > 0) - (a.images.length > 0)).map(card).join('')}
  </ul>
  
</section>

<section class="usp" aria-labelledby="usp-title">
  <h2 id="usp-title">Why stay with Nestique</h2>
  <ul class="usp-list">
    <li>
      <span class="usp-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg></span>
      <h3>Couple friendly</h3>
      <p>Couples are welcome at every Nestique home. Book together, with privacy and no awkward questions.</p>
    </li>
    <li>
      <span class="usp-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 14.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/></svg></span>
      <h3>Clean and hygienic</h3>
      <p>Every home is cleaned and maintained before each stay, with fresh linen and towels waiting for you.</p>
    </li>
    <li>
      <span class="usp-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/></svg></span>
      <h3>Wi-Fi in our city homes</h3>
      <p>Wi-Fi at our Rishikesh, Dehradun and Gurgaon homes, so you can stream, video-call or get a day's work done.</p>
    </li>
  </ul>
</section>

<section id="booking" class="booking" aria-labelledby="booking-title">
  <h2 id="booking-title">How to book</h2>
  <ol class="steps">
    <li><h3>Send us your dates</h3><p>Use the booking form on any stay's page, or email us. Tell us the home, your dates and how many guests.</p></li>
    <li><h3>We confirm price and availability</h3><p>You'll hear back from us with the total for your dates and how to pay.</p></li>
    <li><h3>Get your check-in details</h3><p>Before you arrive we send the address, directions and self check-in instructions.</p></li>
  </ol>
  <p class="book-cta"><a class="btn btn-big" href="/contact/">Send a booking request</a></p>
</section>
${faqHtml}`,
}));

// ---------- Stay pages ----------
data.stays.forEach((s) => {
  const others = data.stays.filter((o) => o.slug !== s.slug && o.city === s.city)
    .concat(data.stays.filter((o) => o.city !== s.city)).slice(0, 3);
  const facts = [['Layout', s.type.replace(' apartment', '')], ...(s.type.startsWith('Studio') ? [] : [['Bedrooms', val(s.bedrooms)]]), ...(s.livingRooms ? [['Living room', s.livingRooms]] : []), ['Bathrooms', val(s.baths)], ['Guests', val(s.guests)]].slice(0, 4);
  const map = s.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.mapQuery)}`;
  const slots = Math.max(5, s.images.length);
  const galleryItems = (s.images.length > 0 && s.images.length < 5 ? [0] : [0, 1, 2, 3, 4]).map((i) => `
    <button type="button" class="g-item ${i === 0 ? 'g-main' : 'g-small'}${i === 4 && s.images.length > 5 ? ' g-tour' : ''}" data-index="${i}" ${i === 4 && s.images.length > 5 ? `data-open-tour aria-label="Show all ${s.images.length} photos of ${esc(s.name)}"` : `aria-label="Open photo ${i + 1} of ${esc(s.name)}"`}${s.images[i] ? '' : ' disabled'}>
      ${photo(s, i, '', i === 0 ? 'full' : 'sm')}
      ${i === 4 && s.images.length > 5 ? `<span class="g-more-overlay"><strong>+${s.images.length - 4}</strong>more photos</span>` : ''}
    </button>`).join('');
  const maxGuests = s.guests || 12;

  write(`stays/${s.slug}/index.html`, layout({
    title: `${s.name} | Nestique, ${cityName(s.city)}`,
    description: s.summary,
    page: 'stay',
    canonical: `/stays/${s.slug}/`,
    image: s.images[0],
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Accommodation', name: s.name, description: s.description,
      url: `${SITE}/stays/${s.slug}/`,
      address: { '@type': 'PostalAddress', addressLocality: cityName(s.city), streetAddress: s.area, addressCountry: 'IN' },
      ...(s.bedrooms ? { numberOfRooms: s.bedrooms } : {}),
      ...(s.images.length ? { image: s.images.map((i) => `${SITE}/${i}`) } : {}),
      amenityFeature: s.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
    },
    body: `
<article class="stay-page" data-stay="${s.slug}">
  <header class="stay-head">
    <a class="back" href="/#stays">All stays</a>
    <h1>${esc(s.name)}</h1>
    ${s.tagline ? `<p class="tagline">${esc(s.tagline)}</p>` : ''}
    <div class="stay-sub">
      <p class="stay-where">${esc(s.type)} in ${s.area === cityName(s.city) ? '' : `${esc(s.area)}, `}${esc(cityName(s.city))}${s.rating ? ` <a class="rate-link" href="#reviews"><span class="star" aria-hidden="true">★</span> ${s.rating.score.toFixed(2)}</a>` : ''}</p>
      <button type="button" class="share" data-share>Share this stay</button>
    </div>
  </header>

  <div class="gallery${s.images.length > 0 && s.images.length < 5 ? ' single' : ''}" data-images='${esc(JSON.stringify(s.images.map((i) => BASE + i)))}' data-alts='${esc(JSON.stringify(s.imageAlts || []))}' data-cats='${esc(JSON.stringify(s.imageCats || []))}' data-name="${esc(s.name)}">
    ${galleryItems}
    ${s.images.length > 5 ? `<button type="button" class="g-all" data-open-tour>Show all ${s.images.length} photos</button>` : ''}
  </div>

  <div class="stay-body">
    <div class="stay-main">
      <p class="lede">${esc(s.summary)}</p>
      <dl class="facts">
        ${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      ${s.host ? `<p class="host"><span class="host-av" aria-hidden="true">${esc(s.host.name.charAt(0))}</span><span><strong>Hosted by ${esc(s.host.name)}</strong><br>${s.host.years} years hosting</span></p>` : ''}
      ${s.highlights ? `<ul class="highlights">${s.highlights.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}</ul>` : ''}
      <h2>About this home</h2>
      <p>${esc(s.description)}</p>
      ${s.descriptionList ? `<h3 class="desc-h">${esc(s.descriptionTitle || 'Highlights')}</h3><ul class="desc-list">${s.descriptionList.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${s.perfectFor ? `<h3 class="desc-h">Good for</h3><ul class="chips">${s.perfectFor.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${s.sleep ? `<h2>Where you'll sleep</h2><ul class="sleep">${s.sleep.map(([r, bd]) => `<li><strong>${esc(r)}</strong><span>${esc(bd)}</span></li>`).join('')}</ul>` : ''}
      <h2>What's included</h2>
      ${s.amenityGroups ? `
      <ul class="amen">${s.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <button type="button" class="all-amen-btn" data-open-amen>Show all ${s.amenityGroups.reduce((n, [, l]) => n + l.length, 0)} amenities</button>
      <dialog class="amen-dialog" aria-labelledby="amen-title">
        <div class="amen-head"><h2 id="amen-title">What this place offers</h2><button type="button" class="amen-close" aria-label="Close amenities">Close</button></div>
        <div class="amen-body">
        ${s.amenityGroups.map(([g, l]) => `<h3>${esc(g)}</h3><ul class="amen-list">${l.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`).join('')}
        ${s.notIncluded ? `<h3>Not included</h3><ul class="amen-list not">${s.notIncluded.map((a) => `<li><s>${esc(a)}</s></li>`).join('')}</ul>` : ''}
        </div>
      </dialog>` : `<ul class="amen">${s.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`}
      <h2>Where it is</h2>
      ${s.nearby ? `<ul class="nearby">${s.nearby.map(([n, d]) => `<li><strong>${esc(n)}</strong>${d ? `<span>${esc(d)}</span>` : ''}</li>`).join('')}</ul>` : ''}
      <p>${s.area === cityName(s.city) ? '' : `${esc(s.area)}, `}${esc(cityName(s.city))}. We send the exact address and directions once your booking is confirmed.</p>
      <p><a class="link" href="${map}" target="_blank" rel="noopener">${s.mapUrl ? 'Open the location in Google Maps' : 'Open the area in Google Maps'}</a></p>
      <h2>Things to know</h2>
      <div class="know">
        <div><h3>Check-in and check-out</h3>${s.checkin ? `<p>Check-in ${esc(s.checkin.toLowerCase())}<br>Check-out ${esc(s.checkout.toLowerCase())}</p>` : '<p>Check-in and check-out times are shared with your booking confirmation.</p>'}${s.availability ? `<p>${s.availability.map(esc).join('<br>')}</p>` : ''}</div>
        <div><h3>House rules</h3>${s.rules ? `<ul>${s.rules.map(([r, n]) => `<li>${esc(r)}${n ? `<span>${esc(n)}</span>` : ''}</li>`).join('')}</ul>` : '<p>We share the house rules before you book. Ask us anything in your request.</p>'}</div>
        <div><h3>Safety</h3>${s.amenityGroups?.find(([g]) => g === 'Home safety') ? `<ul>${s.amenityGroups.find(([g]) => g === 'Home safety')[1].map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p>Ask us about safety features in your request.</p>'}</div>
      </div>
      ${(s.extraRules || []).map(([t, d]) => `<div class="notice"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}
    </div>

    <aside class="book-box" id="book" aria-labelledby="book-title">
      <p class="price"><span id="book-title">${s.price ? `₹${Number(s.price).toLocaleString('en-IN')} a night` : 'Request to book'}</span>${s.price ? '' : 'Prices depend on dates. Send your dates and we\'ll reply with the total.'}</p>
      <form class="book-form" name="booking" method="POST" action="${FORM_ACTION}" novalidate>
        <input type="hidden" name="stay" value="${esc(s.name)} (${esc(cityName(s.city))})">
        <input type="hidden" name="_subject" value="Booking request: ${esc(s.name)}">
        ${honeypot}
        <div class="dates">
          <label>Check-in<input type="date" name="checkin" required></label>
          <label>Check-out<input type="date" name="checkout" required></label>
        </div>
        <label>Guests<input type="number" name="guests" min="1" max="${maxGuests}" value="${Math.min(2, maxGuests)}" required inputmode="numeric"></label>
        <p class="nights" aria-live="polite"></p>
        <button class="btn btn-full step-next" type="button">Request to book</button>
        <div class="step2">
        <p class="step-summary"></p>
        <label>Your name<input type="text" name="name" autocomplete="name" required></label>
        <div class="pair">
        <label>Email<input type="email" name="email" autocomplete="email" required></label>
        <label>Phone <span class="opt">(optional)</span><input type="tel" name="phone" autocomplete="tel" inputmode="tel"></label>
        </div>
        <label>Anything we should know? <span class="opt">(optional)</span><textarea name="message" rows="2"></textarea></label>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-full" type="submit">Send booking request</button>
        <button class="link-btn step-back" type="button">Change dates or guests</button>
        </div>
        <p class="small">You won't be charged yet. We reply with the total and availability, usually within a day.</p>
      </form>
      <p class="small alt">Prefer email? <a href="${mailto(s)}">Write to us directly</a></p>
    </aside>
  </div>

  ${s.rating ? `
  <section id="reviews" class="reviews" aria-labelledby="reviews-title">
    <div class="rev-score">
      <p class="rev-big" id="reviews-title">${s.rating.score.toFixed(2)}</p>
      <p>Average guest rating from ${s.rating.count} reviews</p>
    </div>
    <ul class="rev-cats">
      ${s.rating.categories.map(([k, v]) => `<li><span>${esc(k)}</span><strong>${v.toFixed(1)}</strong><i style="--w:${(v / 5) * 100}%"></i></li>`).join('')}
    </ul>
  </section>` : ''}

  <section class="more" aria-labelledby="more-title">
    <h2 id="more-title">Other stays</h2>
    <ul class="cards">${others.map(card).join('')}
    </ul>
  </section>
</article>

${s.images.length > 5 ? (() => {
  const cats = s.photoCategories || [...new Set(s.imageCats || ['Photos'])];
  const idx = s.images.map((_, i) => i);
  const catOf = (i) => (s.imageCats ? s.imageCats[i] : 'Photos');
  const slug = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `<dialog class="tour" aria-labelledby="tour-title">
  <div class="tour-bar">
    <button type="button" class="tour-close" aria-label="Close photo gallery">Close</button>
    <h2 id="tour-title">${esc(s.name)}: all ${s.images.length} photos</h2>
  </div>
  <nav class="tour-cats" aria-label="Photo categories">
    ${cats.map((c) => { const first = idx.find((i) => catOf(i) === c); return first === undefined ? '' : `<a href="#tour-${slug(c)}" class="tour-cat"><img src="/${esc(small(s.images[first]))}" alt="" loading="lazy"><span>${esc(c)}</span></a>`; }).join('')}
  </nav>
  ${cats.map((c) => { const list = idx.filter((i) => catOf(i) === c); return list.length ? `<section class="tour-sec" id="tour-${slug(c)}"><h3>${esc(c)}<span>${list.length} ${list.length === 1 ? 'photo' : 'photos'}</span></h3><div class="tour-grid">${list.map((i) => `<button type="button" class="tour-item" data-index="${i}" aria-label="Open: ${esc(s.imageAlts?.[i] || `photo ${i + 1}`)}"><img src="/${esc(small(s.images[i]))}" alt="${esc(s.imageAlts?.[i] || '')}" loading="lazy"></button>`).join('')}</div></section>` : ''; }).join('')}
</dialog>`;
})() : ''}

<dialog class="lightbox" aria-label="Photos of ${esc(s.name)}">
  <button type="button" class="lb-close" aria-label="Close photos">Close</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button type="button" class="lb-prev" aria-label="Previous photo">Previous</button>
  <button type="button" class="lb-next" aria-label="Next photo">Next</button>
</dialog>

<a class="mobile-book" href="#book">Request to book</a>`,
  }));
});

// Old addresses keep working
data.stays.forEach((s) => (s.oldSlugs || []).forEach((old) => {
  const to = `${BASE}stays/${s.slug}/`;
  write(`stays/${old}/index.html`, `<!doctype html><meta charset="utf-8"><title>${esc(s.name)} | Nestique</title><link rel="canonical" href="${SITE}/stays/${s.slug}/"><meta http-equiv="refresh" content="0; url=${to}"><a href="/stays/${s.slug}/">${esc(s.name)}</a>`);
}));

// ---------- Contact ----------
write('contact/index.html', layout({
  title: 'Contact Nestique | Booking requests and questions',
  description: 'Send Nestique a booking request or a question about any of our stays.',
  page: 'contact',
  canonical: '/contact/',
  body: `
<section class="contact">
  <div class="contact-intro">
    <h1>Send us a booking request.</h1>
    <p>Choose a home, add your dates and we'll reply with the total and availability. For anything else, write to <a href="mailto:${esc(data.email)}">${esc(data.email)}</a>.</p>
  </div>
  <form class="book-form contact-form" name="contact" method="POST" action="${FORM_ACTION}" novalidate>
    <input type="hidden" name="_subject" value="New enquiry from the Nestique website">
    ${honeypot}
    <label>Your name<input type="text" name="name" autocomplete="name" required></label>
    <label>Email<input type="email" name="email" autocomplete="email" required></label>
    <label>Phone <span class="opt">(optional)</span><input type="tel" name="phone" autocomplete="tel" inputmode="tel"></label>
    <label>Which home?
      <select name="stay">
        <option value="Not sure yet">Not sure yet, help me choose</option>
        ${data.cities.map((c) => `<optgroup label="${esc(c.name)}">${data.stays.filter((s) => s.city === c.id).map((s) => `<option>${esc(s.name)} (${esc(c.name)})</option>`).join('')}</optgroup>`).join('')}
      </select>
    </label>
    <div class="dates">
      <label>Check-in <span class="opt">(optional)</span><input type="date" name="checkin"></label>
      <label>Check-out <span class="opt">(optional)</span><input type="date" name="checkout"></label>
    </div>
    <p class="nights" aria-live="polite"></p>
    <label>Guests <span class="opt">(optional)</span><input type="number" name="guests" min="1" max="30" inputmode="numeric"></label>
    <label>Your message<textarea name="message" rows="5" required></textarea></label>
    <p class="form-error" role="alert"></p>
    <button class="btn btn-full" type="submit">Send message</button>
  </form>
</section>`,
}));

// ---------- Thank you ----------
write('thank-you/index.html', layout({
  title: 'Request sent | Nestique',
  description: 'Your request has been sent to Nestique.',
  page: 'thanks',
  canonical: '/thank-you/',
  body: `
<section class="hero thanks">
  <h1>Request sent. We'll reply by email soon.</h1>
  <div class="hero-foot">
    <p>We usually reply within a day with the total for your dates and availability. If you don't see our reply, check your spam folder or write to <a href="mailto:${esc(data.email)}">${esc(data.email)}</a>.</p>
    <a class="btn" href="/#stays">Back to the stays</a>
  </div>
</section>`,
}));

// ---------- 404 ----------
write('404.html', layout({
  title: 'Page not found | Nestique',
  description: 'This page does not exist.',
  page: 'notfound',
  body: `<section class="hero"><h1>This page doesn't exist.</h1><div class="hero-foot"><p>The link may be old or mistyped.</p><a class="btn" href="/#stays">See all stays</a></div></section>`,
}));

// ---------- SEO files ----------
const urls = ['/', '/contact/', ...data.stays.map((s) => `/stays/${s.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

console.log(`Built home, contact, thank-you, 404 and ${data.stays.length} stay pages into dist/`);
