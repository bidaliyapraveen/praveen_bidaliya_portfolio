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

  // City filter on home
  const filterBtns = $$('.filter [data-filter]');
  const applyFilter = (id) => {
    filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === id)));
    $$('.city[data-city]').forEach((sec) => { sec.hidden = id !== 'all' && sec.dataset.city !== id; });
  };
  filterBtns.forEach((b) => b.addEventListener('click', () => {
    applyFilter(b.dataset.filter);
    history.replaceState(null, '', b.dataset.filter === 'all' ? '#stays' : `#stays-${b.dataset.filter}`);
  }));
  const m = location.hash.match(/^#stays-(\w+)/);
  if (m && filterBtns.some((b) => b.dataset.filter === m[1])) applyFilter(m[1]);

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

  // Photo viewer
  const gallery = $('.gallery[data-images]');
  const lb = $('dialog.lightbox');
  if (gallery && lb) {
    const images = JSON.parse(gallery.dataset.images || '[]');
    const name = gallery.dataset.name;
    const img = $('img', lb);
    const cap = $('figcaption', lb);
    let i = 0;
    const show = (n) => {
      i = (n + images.length) % images.length;
      img.src = images[i];
      img.alt = `${name}, photo ${i + 1}`;
      cap.textContent = `${i + 1} of ${images.length}`;
    };
    $$('.g-item', gallery).forEach((b) => b.addEventListener('click', () => {
      if (!images.length) return;
      show(Number(b.dataset.index));
      lb.showModal();
    }));
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    $('.lb-prev', lb).addEventListener('click', () => show(i - 1));
    $('.lb-next', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  }
})();
