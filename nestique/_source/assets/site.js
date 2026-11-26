// Nestique — small progressive enhancements. Everything works without JS.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Mobile menu
  const menuBtn = $('.menu-btn');
  const nav = $('#site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', () => {
      menuBtn.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    }));
  }

  // Home: city tabs
  const tabs = $$('.city-tabs [data-tab]');
  if (tabs.length) {
    const cards = $$('.stays .card');
    const select = (id, push) => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
      cards.forEach((c) => { c.hidden = id !== 'all' && c.dataset.city !== id; });
      if (push) history.replaceState(null, '', id === 'all' ? location.pathname : `#${id}`);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t.dataset.tab, true));
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n.dataset.tab, true);
      });
    });
    const fromHash = () => {
      const h = location.hash.replace('#', '').replace('stays-', '');
      if (tabs.some((t) => t.dataset.tab === h)) select(h, false);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
  }

  // Stay page / contact: pre-fill dates and guests from the search
  const params = new URLSearchParams(location.search);
  $$('form.book-form').forEach((form) => {
    ['checkin', 'checkout', 'guests'].forEach((k) => {
      const v = params.get(k);
      if (v && form.elements[k]) form.elements[k].value = v;
    });
    const stayParam = params.get('stay');
    if (stayParam && form.elements.stay?.tagName === 'SELECT') {
      const opt = [...form.elements.stay.options].find((o) => o.text.startsWith(stayParam));
      if (opt) form.elements.stay.value = opt.value;
    }
  });

  // Date fields: no past dates, check-out after check-in, nights count
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $$('form.book-form').forEach((form) => {
    const ci = form.elements.checkin;
    const co = form.elements.checkout;
    const nights = $('.nights', form);
    const err = $('.form-error', form);
    if (ci && co) {
      const today = iso(new Date());
      ci.min = today; co.min = today;
      const update = () => {
        if (ci.value) {
          const next = new Date(ci.value); next.setDate(next.getDate() + 1);
          co.min = iso(next);
          if (co.value && co.value <= ci.value) co.value = '';
        }
        if (ci.value && co.value) {
          const n = Math.round((new Date(co.value) - new Date(ci.value)) / 86400000);
          nights.textContent = n > 0 ? `${n} ${n === 1 ? 'night' : 'nights'}` : '';
        } else nights.textContent = '';
      };
      ci.addEventListener('change', update);
      co.addEventListener('change', update);
      if (ci.value || co.value) update();
    }

    // Validation with clear messages
    form.addEventListener('submit', (e) => {
      err.textContent = '';
      $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
      const problems = [];
      $$('input, textarea, select', form).forEach((el) => {
        if (el.type === 'hidden' || el.name === '_honey') return;
        if (!el.checkValidity()) {
          el.setAttribute('aria-invalid', 'true');
          const label = el.closest('label')?.querySelector('.lt')?.firstChild?.textContent?.trim() || el.name;
          if (el.validity.valueMissing) problems.push(`Add ${label.toLowerCase()}.`);
          else if (el.type === 'email') problems.push('Enter an email address like name@example.com.');
          else if (el.type === 'tel') problems.push('Enter a phone number with at least 10 digits.');
          else if (el.type === 'number') problems.push(`Guests must be between ${el.min} and ${el.max}.`);
          else problems.push(`Check ${label.toLowerCase()}.`);
        }
      });
      if (ci && co && ci.value && co.value && co.value <= ci.value) {
        co.setAttribute('aria-invalid', 'true');
        problems.push('Check-out must be after check-in.');
      }
      if (problems.length) {
        e.preventDefault();
        err.textContent = problems.join(' ');
        $('[aria-invalid]', form)?.focus();
        return;
      }
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      btn.textContent = 'Sending…';
    });
  });

  // Share
  $$('[data-share]').forEach((btn) => btn.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href.split('#')[0] };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); btn.textContent = 'Link copied'; setTimeout(() => { btn.textContent = 'Share this stay'; }, 2000); }
    } catch (_) { /* cancelled */ }
  }));

  // Photo viewer + photo tour
  const gallery = $('.gallery[data-images]');
  const lb = $('dialog.lightbox');
  const tour = $('dialog.tour');
  if (gallery && lb) {
    const images = JSON.parse(gallery.dataset.images || '[]');
    const alts = JSON.parse(gallery.dataset.alts || '[]');
    const cats = JSON.parse(gallery.dataset.cats || '[]');
    const name = gallery.dataset.name;
    const img = $('img', lb);
    const cap = $('figcaption', lb);
    let i = 0;
    const show = (n) => {
      i = (n + images.length) % images.length;
      img.src = images[i];
      img.alt = alts[i] || `${name}, photo ${i + 1}`;
      cap.textContent = `${cats[i] ? cats[i] + ', ' : ''}${i + 1} of ${images.length}`;
    };
    const openPhoto = (n) => { if (!images.length) return; show(n); if (!lb.open) lb.showModal(); };
    $$('.g-item:not([data-open-tour])', gallery).forEach((b) => b.addEventListener('click', () => openPhoto(Number(b.dataset.index))));
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    $('.lb-prev', lb).addEventListener('click', () => show(i - 1));
    $('.lb-next', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    let sx = null;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); sx = null; });

    if (tour) {
      $$('[data-open-tour]').forEach((b) => b.addEventListener('click', () => { tour.showModal(); tour.scrollTop = 0; }));
      $('.tour-close', tour).addEventListener('click', () => tour.close());
      $$('.tour-item', tour).forEach((b) => b.addEventListener('click', () => openPhoto(Number(b.dataset.index))));
      $$('.tour-cat', tour).forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        $(a.getAttribute('href'), tour)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }));
      document.body.addEventListener('keydown', () => {});
      tour.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
      tour.addEventListener('toggle', () => { document.documentElement.style.overflow = tour.open ? 'hidden' : ''; });
    }
  }
})();
// Header "Request to book" jumps to the form on stay pages
(() => { const box = document.getElementById('book'); const cta = document.querySelector('.top .btn-sm'); if (box && cta) cta.setAttribute('href', '#book'); })();

// Amenities pop-up
(() => {
  const d = document.querySelector('dialog.amen-dialog');
  if (!d) return;
  document.querySelectorAll('[data-open-amen]').forEach((b) => b.addEventListener('click', () => d.showModal()));
  d.querySelector('.amen-close').addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
})();

// Booking box: step 1 dates and guests, step 2 contact details
(() => {
  const form = document.querySelector('.book-box .book-form');
  if (!form) return;
  form.classList.add('stepped');
  const next = form.querySelector('.step-next');
  const back = form.querySelector('.step-back');
  const err = form.querySelector('.form-error');
  const sum = form.querySelector('.step-summary');
  const { checkin: ci, checkout: co, guests: g } = form.elements;
  const fmt = (v) => new Date(v + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  next.addEventListener('click', () => {
    err.textContent = '';
    [ci, co, g].forEach((el) => el.removeAttribute('aria-invalid'));
    const p = [];
    if (!ci.value) { ci.setAttribute('aria-invalid', 'true'); p.push('Add a check-in date.'); }
    if (!co.value) { co.setAttribute('aria-invalid', 'true'); p.push('Add a check-out date.'); }
    if (ci.value && co.value && co.value <= ci.value) { co.setAttribute('aria-invalid', 'true'); p.push('Check-out must be after check-in.'); }
    if (window.nqClash && window.nqClash()) { co.setAttribute('aria-invalid', 'true'); p.push('Some of these nights are already booked. Pick other dates from the availability calendar.'); }
    if (!g.checkValidity()) { g.setAttribute('aria-invalid', 'true'); p.push(`Guests must be between ${g.min} and ${g.max}.`); }
    if (p.length) { err.textContent = p.join(' '); form.querySelector('[aria-invalid]')?.focus(); return; }
    const n = Math.round((new Date(co.value) - new Date(ci.value)) / 86400000);
    sum.textContent = `${fmt(ci.value)} to ${fmt(co.value)}, ${n} ${n === 1 ? 'night' : 'nights'}, ${g.value} ${g.value === '1' ? 'guest' : 'guests'}`;
    form.classList.add('on-step2');
    form.elements.name.focus();
  });
  back.addEventListener('click', () => { form.classList.remove('on-step2'); ci.focus(); });
})();

// Stay page: live availability calendar from calendar.json (kept in sync automatically)
(() => {
  const page = document.querySelector('[data-stay]');
  const box = document.querySelector('[data-avail]');
  const form = document.querySelector('#book .book-form');
  if (!page || !box || !form) return;
  const slug = page.dataset.stay;
  const base = (document.querySelector('link[rel=stylesheet][href*="site.css"]')?.getAttribute('href') || '/nestique/assets/site.css').split('assets/')[0];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const blocked = new Set();
  const { checkin: ci, checkout: co } = form.elements;
  const err = form.querySelector('.form-error');
  // a night is blocked if any booking covers it (check-out day itself stays free)
  const clash = (a, b) => { for (let d = new Date(a + 'T00:00'); iso(d) < b; d.setDate(d.getDate() + 1)) if (blocked.has(iso(d))) return true; return false; };
  window.nqClash = () => ci.value && co.value && co.value > ci.value && clash(ci.value, co.value);
  fetch(`${base}calendar.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((data) => {
    const ranges = data?.stays?.[slug];
    if (!ranges) return;
    ranges.forEach(([a, b]) => { for (let d = new Date(a + 'T00:00'); iso(d) < b; d.setDate(d.getDate() + 1)) blocked.add(iso(d)); });
    box.hidden = false;
    box.querySelector('.avail-upd').textContent = 'This calendar updates automatically when a booking is made or cancelled.';
    const today = iso(new Date());
    let start = new Date(); start.setDate(1);
    const months = box.querySelector('.avail-months');
    const render = () => {
      months.innerHTML = '';
      for (let m = 0; m < 2; m++) {
        const first = new Date(start.getFullYear(), start.getMonth() + m, 1);
        const wrap = document.createElement('div'); wrap.className = 'avail-month';
        wrap.innerHTML = `<h3>${first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><div class="avail-grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span class="dow">${x}</span>`).join('')}</div>`;
        const grid = wrap.querySelector('.avail-grid');
        for (let i = 0; i < (first.getDay() + 6) % 7; i++) grid.append(document.createElement('span'));
        for (let d = new Date(first); d.getMonth() === first.getMonth(); d.setDate(d.getDate() + 1)) {
          const k = iso(d); const b = document.createElement('button');
          b.type = 'button'; b.textContent = d.getDate(); b.dataset.d = k;
          const past = k < today, taken = blocked.has(k);
          if (past || taken) { b.disabled = !(taken && ci.value && !co.value && k > ci.value && !clash(ci.value, k)); }
          if (taken) { b.classList.add('taken'); b.setAttribute('aria-label', `${k}, booked`); }
          if (ci.value && k === ci.value) b.classList.add('sel');
          if (co.value && k === co.value) b.classList.add('sel');
          if (ci.value && co.value && k > ci.value && k < co.value) b.classList.add('in');
          grid.append(b);
        }
        months.append(wrap);
      }
      box.querySelector('.avail-prev').disabled = start <= new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    };
    months.addEventListener('click', (e) => {
      const k = e.target.dataset?.d; if (!k) return;
      if (!ci.value || co.value || k <= ci.value) { ci.value = k; co.value = ''; }
      else if (clash(ci.value, k)) { ci.value = k; co.value = ''; }
      else co.value = k;
      [ci, co].forEach((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
      if (err) err.textContent = '';
      render();
    });
    box.querySelector('.avail-prev').addEventListener('click', () => { start.setMonth(start.getMonth() - 1); render(); });
    box.querySelector('.avail-next').addEventListener('click', () => { start.setMonth(start.getMonth() + 1); render(); });
    [ci, co].forEach((el) => el.addEventListener('change', render));
    render();
  }).catch(() => {});
})();
