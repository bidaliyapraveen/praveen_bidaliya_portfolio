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

  // Home: search by city, dates and guests
  const iso0 = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fmt = (v) => new Date(v + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const finder = $('#finder');
  if (finder) {
    const f = finder.elements;
    const cards = $$('.stays .card');
    const empty = $('.stays .empty');
    const title = $('#results-title');
    const meta = $('.results-meta');
    const ferr = $('.finder-error');
    const cityLabel = (id) => [...f.city.options].find((o) => o.value === id)?.text || 'All cities';
    const today = iso0(new Date());
    f.checkin.min = today; f.checkout.min = today;
    f.checkin.addEventListener('change', () => {
      if (!f.checkin.value) return;
      const n = new Date(f.checkin.value); n.setDate(n.getDate() + 1);
      f.checkout.min = iso0(n);
      if (!f.checkout.value || f.checkout.value <= f.checkin.value) f.checkout.value = iso0(n);
    });

    const apply = (scroll) => {
      const city = f.city.value;
      const guests = Number(f.guests.value) || 0;
      const ci = f.checkin.value; const co = f.checkout.value;
      let shown = 0;
      cards.forEach((c) => {
        const cap = Number(c.dataset.guests) || 0; // 0 = not known yet, keep it
        const ok = (city === 'all' || c.dataset.city === city) && (!cap || !guests || cap >= guests);
        c.hidden = !ok; if (ok) shown++;
        // carry dates and guests to the stay page so the booking form is pre-filled
        const a = $('a', c);
        const url = new URL(a.getAttribute('href'), location.href);
        url.search = '';
        if (ci) url.searchParams.set('checkin', ci);
        if (co) url.searchParams.set('checkout', co);
        if (guests) url.searchParams.set('guests', guests);
        a.setAttribute('href', url.pathname + url.search);
      });
      title.textContent = city === 'all' ? 'All stays' : `Stays in ${cityLabel(city)}`;
      const bits = [`${shown} ${shown === 1 ? 'home' : 'homes'}`];
      if (ci && co) bits.push(`${fmt(ci)} to ${fmt(co)}`);
      if (guests) bits.push(`${guests} ${guests === 1 ? 'guest' : 'guests'}`);
      meta.textContent = bits.join(', ');
      empty.hidden = shown > 0;
      try { sessionStorage.setItem('nestique-search', JSON.stringify({ city, ci, co, guests })); } catch (_) {}
      if (scroll) $('#stays').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };

    finder.addEventListener('submit', (e) => {
      e.preventDefault();
      ferr.textContent = '';
      if ((f.checkin.value && !f.checkout.value) || (!f.checkin.value && f.checkout.value)) { ferr.textContent = 'Add both check-in and check-out dates, or leave both empty.'; return; }
      if (f.checkin.value && f.checkout.value <= f.checkin.value) { ferr.textContent = 'Check-out must be after check-in.'; return; }
      apply(true);
    });
    f.city.addEventListener('change', () => apply(false));
    $('[data-clear]')?.addEventListener('click', () => { finder.reset(); f.guests.value = 2; apply(false); });

    // restore the last search in this tab, or a city from the link
    try {
      const saved = JSON.parse(sessionStorage.getItem('nestique-search') || 'null');
      if (saved) {
        f.city.value = saved.city || 'all';
        if (saved.ci >= today) { f.checkin.value = saved.ci; f.checkout.value = saved.co; }
        if (saved.guests) f.guests.value = saved.guests;
      }
    } catch (_) {}
    const m = location.hash.match(/^#stays-(\w+)/);
    if (m && [...f.city.options].some((o) => o.value === m[1])) f.city.value = m[1];
    apply(false);
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
    if (!g.checkValidity()) { g.setAttribute('aria-invalid', 'true'); p.push(`Guests must be between ${g.min} and ${g.max}.`); }
    if (p.length) { err.textContent = p.join(' '); form.querySelector('[aria-invalid]')?.focus(); return; }
    const n = Math.round((new Date(co.value) - new Date(ci.value)) / 86400000);
    sum.textContent = `${fmt(ci.value)} to ${fmt(co.value)}, ${n} ${n === 1 ? 'night' : 'nights'}, ${g.value} ${g.value === '1' ? 'guest' : 'guests'}`;
    form.classList.add('on-step2');
    form.elements.name.focus();
  });
  back.addEventListener('click', () => { form.classList.remove('on-step2'); ci.focus(); });
})();
