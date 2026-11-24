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

const photo = (stay, i, cls = '') => {
  const src = stay.images[i];
  if (src) return `<img class="${cls}" src="/${esc(src)}" alt="${esc(stay.name)}, photo ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`;
  return `<div class="ph ${cls}" role="img" aria-label="Photo of ${esc(stay.name)} coming soon"><span>${esc(stay.name.charAt(0))}</span></div>`;
};

const faqs = [
  ['How do I book?', 'Send us a booking request from the stay\'s page, or email us with your dates and number of guests. We reply with the total price and availability, and confirm once payment is done.'],
  ['When do I pay?', 'After we confirm your dates. We share the total for your stay and the payment details by email.'],
  ['How does check-in work?', 'Before you arrive we send the exact address, directions and how to get the keys.'],
  ['Can I book more than one home?', 'Yes. Cozy Tapovan and Tranquil are in the same building, and so are the two Doon Square flats, which works well for families and groups. Mention it in your request.'],
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
<link rel="stylesheet" href="/assets/site.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
<script src="/assets/site.js" defer></script>
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
    <li class="card" data-city="${s.city}" data-search="${esc([s.name, s.area, cityName(s.city), s.type].join(' ').toLowerCase())}">
      <a href="/stays/${s.slug}/">
        <div class="card-img">
          ${photo(s, 0)}
          <span class="card-tag">${esc(cityName(s.city))}</span>
        </div>
        <div class="card-body">
          <div class="card-top">
            <h3>${esc(s.name)}</h3>
            <p class="card-price">${s.price ? `₹${Number(s.price).toLocaleString('en-IN')}<span>/night</span>` : '<span>Price on request</span>'}</p>
          </div>
          <p class="card-loc">${icon.pin}${esc(s.area)}${s.area === cityName(s.city) ? '' : `, ${esc(cityName(s.city))}`}</p>
          <ul class="card-facts">
            <li>${icon.home}${esc(s.type)}</li>
            ${s.bedrooms && !/bedroom/i.test(s.type) ? `<li>${icon.bed}${s.bedrooms} ${s.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</li>` : ''}
            ${s.guests ? `<li>${icon.users}Up to ${s.guests} guests</li>` : ''}
            ${s.amenities.includes('Full kitchen') ? `<li>${icon.pot}Full kitchen</li>` : ''}
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
  <p class="pill">${data.stays.length} homes in ${cityList}</p>
  <h1>Stay like you live here.<br><span>Homes by the Ganga and the hills.</span></h1>
  <p class="hero-sub">Calm, fully equipped homes in Rishikesh, Dehradun and Gurgaon. Pick a stay, send your dates and book directly with us.</p>
  <form class="search" role="search" onsubmit="return false">
    <label class="sr" for="q">Search stays</label>
    <input id="q" type="search" placeholder="Search by stay, area or city" autocomplete="off">
    <span class="search-icon">${icon.search}</span>
  </form>
  <div class="filter" role="group" aria-label="Show stays in">
    <button type="button" data-filter="all" aria-pressed="true">All</button>
    ${data.cities.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${esc(c.name)}</button>`).join('')}
  </div>
</section>

<section id="stays" class="stays" aria-label="Stays">
  <ul class="cards">${data.stays.map(card).join('')}
  </ul>
  <p class="empty" hidden>No stays match that search. <button type="button" class="link-btn" data-clear>Show all stays</button></p>
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
  const facts = [['Guests', val(s.guests)], ['Bedrooms', val(s.bedrooms)], ['Beds', val(s.beds)], ['Bathrooms', val(s.baths)]];
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.mapQuery)}`;
  const slots = Math.max(5, s.images.length);
  const galleryItems = [0, 1, 2, 3, 4].map((i) => `
    <button type="button" class="g-item ${i === 0 ? 'g-main' : 'g-small'}" data-index="${i}" aria-label="Open photo ${i + 1} of ${esc(s.name)}"${s.images[i] ? '' : ' disabled'}>
      ${photo(s, i)}
      ${i === 4 && s.images.length > 5 ? `<span class="g-more">+${s.images.length - 5} ${s.images.length - 5 === 1 ? 'photo' : 'photos'}</span>` : ''}
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
    <div class="stay-sub">
      <p class="stay-where">${esc(s.type)} in ${esc(s.area)}, ${esc(cityName(s.city))}</p>
      <button type="button" class="share" data-share>Share this stay</button>
    </div>
  </header>

  <div class="gallery" data-images='${esc(JSON.stringify(s.images.map((i) => BASE + i)))}' data-name="${esc(s.name)}">
    ${galleryItems}
  </div>

  <div class="stay-body">
    <div class="stay-main">
      <p class="lede">${esc(s.summary)}</p>
      <dl class="facts">
        ${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      <h2>About this home</h2>
      <p>${esc(s.description)}</p>
      <h2>What's included</h2>
      <ul class="amen">${s.amenities.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <h2>Where it is</h2>
      <p>${esc(s.area)}, ${esc(cityName(s.city))}. We send the exact address and directions once your booking is confirmed.</p>
      <p><a class="link" href="${map}" target="_blank" rel="noopener">Open the area in Google Maps</a></p>
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
        <p class="nights" aria-live="polite"></p>
        <label>Guests<input type="number" name="guests" min="1" max="${maxGuests}" value="2" required inputmode="numeric"></label>
        <label>Your name<input type="text" name="name" autocomplete="name" required></label>
        <label>Email<input type="email" name="email" autocomplete="email" required></label>
        <label>Phone <span class="opt">(optional)</span><input type="tel" name="phone" autocomplete="tel" inputmode="tel"></label>
        <label>Anything we should know? <span class="opt">(optional)</span><textarea name="message" rows="3"></textarea></label>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-full" type="submit">Send booking request</button>
        <p class="small">You won't be charged yet. We reply with the total and availability, usually within a day.</p>
      </form>
      <p class="small alt">Prefer email? <a href="${mailto(s)}">Write to us directly</a></p>
    </aside>
  </div>

  <section class="more" aria-labelledby="more-title">
    <h2 id="more-title">Other stays</h2>
    <ul class="cards">${others.map(card).join('')}
    </ul>
  </section>
</article>

<dialog class="lightbox" aria-label="Photos of ${esc(s.name)}">
  <button type="button" class="lb-close" aria-label="Close photos">Close</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button type="button" class="lb-prev" aria-label="Previous photo">Previous</button>
  <button type="button" class="lb-next" aria-label="Next photo">Next</button>
</dialog>

<a class="mobile-book" href="#book">Request to book</a>`,
  }));
});

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
