/* ==========================================================================
   Adavan Photographie — interactions
   Aucune dépendance. Toutes les animations respectent prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const narrow = window.matchMedia('(max-width: 860px)');
  const portrait = window.matchMedia('(orientation: portrait)');

  let vw = window.innerWidth;
  let vh = window.innerHeight;

  /* ------------------------------------------------------------------
     Boucle de rendu unique : tous les effets liés au scroll passent ici
     ------------------------------------------------------------------ */
  const scrollHandlers = [];
  let ticking = false;
  const requestTick = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        scrollHandlers.forEach(fn => fn(y));
      });
    }
  };
  window.addEventListener('scroll', requestTick, { passive: true });

  const resizeHandlers = [];
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Sur mobile, la barre d'adresse change innerHeight au scroll : on ignore ces micro-variations
      const widthChanged = window.innerWidth !== vw;
      if (!widthChanged && Math.abs(window.innerHeight - vh) < 120) return;
      vw = window.innerWidth; vh = window.innerHeight;
      resizeHandlers.forEach(fn => fn());
      requestTick();
    }, 120);
  });

  /* ------------------------------------------------------------------
     Navigation : fond au scroll, masquée en descendant, menu mobile
     ------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  const toggle = $('.nav-toggle');
  let lastY = window.scrollY;

  scrollHandlers.push(y => {
    nav.classList.toggle('is-solid', y > 24);
    if (!nav.classList.contains('is-open')) {
      const goingDown = y > lastY && y > vh * 0.6;
      nav.classList.toggle('is-hidden', goingDown);
    }
    lastY = y;
  });

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  };
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  });
  $$('.nav-menu a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(); });

  // Lien actif selon la section visible
  const navLinks = $$('.nav-menu a:not(.nav-cta)');
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['prestations', 'mariages', 'portfolio', 'approche', 'contact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObs.observe(el);
  });

  /* ------------------------------------------------------------------
     HERO : le cadre s'agrandit jusqu'au plein écran
     ------------------------------------------------------------------ */
  const hero = $('[data-hero]');
  const heroSticky = $('.hero-sticky');
  const heroIntro = $('.hero-intro');
  let heroStart = { t: 0, s: 0, b: 0 };

  const measureHero = () => {
    const gutter = parseFloat(getComputedStyle(heroIntro).left) || 24;
    const introBottom = heroIntro.offsetTop + heroIntro.offsetHeight;
    const gap = narrow.matches ? 28 : Math.max(36, vh * 0.06);
    heroStart = {
      t: Math.min(introBottom + gap, vh * 0.72),
      s: gutter,
      b: narrow.matches ? gutter : Math.max(gutter * 0.6, 20)
    };
  };

  const renderHero = y => {
    const raw = reduceMotion.matches ? 0 : clamp(y / (vh * 1.05));
    // easing : la fin de l'ouverture est plus douce
    const p = 1 - Math.pow(1 - raw, 2.2);
    heroSticky.style.setProperty('--p', p.toFixed(4));
    heroSticky.style.setProperty('--ct', lerp(heroStart.t, 0, p).toFixed(1) + 'px');
    heroSticky.style.setProperty('--cr', lerp(heroStart.s, 0, p).toFixed(1) + 'px');
    heroSticky.style.setProperty('--cl', lerp(heroStart.s, 0, p).toFixed(1) + 'px');
    heroSticky.style.setProperty('--cb', lerp(heroStart.b, 0, p).toFixed(1) + 'px');
    frameHeroImage(p);
  };

  /* Cadrage par point focal : les visages (data-focus="x y", en fractions de l'image)
     restent dans le haut du bandeau visible, quelle que soit la taille de l'écran. */
  const heroImg = $('.hero-img');
  const frameHeroImage = p => {
    if (!heroImg) return;
    const iw = heroImg.naturalWidth || +heroImg.getAttribute('width');
    const ih = heroImg.naturalHeight || +heroImg.getAttribute('height');
    if (!iw || !ih) return;
    const sw = heroSticky.clientWidth, sh = heroSticky.clientHeight;
    const focusAttr = ih > iw ? (heroImg.dataset.focusPortrait || heroImg.dataset.focus) : heroImg.dataset.focus;
    const [fx, fy] = (focusAttr || '0.5 0.4').split(' ').map(Number);
    const k = 1.14 - 0.14 * p;                       // léger zoom qui se relâche au scroll
    const cover = Math.max(sw / iw, sh / ih) * k;
    const w = iw * cover, h = ih * cover;
    // zone visible du cadre à cet instant
    const top = lerp(heroStart.t, 0, p), bottom = sh - lerp(heroStart.b, 0, p);
    const left = lerp(heroStart.s, 0, p), right = sw - lerp(heroStart.s, 0, p);
    // le point focal se place à 38 % de la hauteur visible, centré horizontalement
    let y = top + (bottom - top) * 0.38 - fy * h;
    let x = (left + right) / 2 - fx * w;
    y = Math.min(top, Math.max(bottom - h, y));       // jamais de vide dans le cadre
    x = Math.min(left, Math.max(right - w, x));
    heroImg.style.width = w.toFixed(1) + 'px';
    heroImg.style.height = h.toFixed(1) + 'px';
    heroImg.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    heroImg.classList.add('is-framed');
  };

  if (hero) {
    measureHero();
    renderHero(window.scrollY);
    resizeHandlers.push(measureHero);
    scrollHandlers.push(y => { if (y < vh * 2.5) renderHero(y); });
    // les polices modifient la hauteur du titre : on remesure une fois chargées
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureHero(); renderHero(window.scrollY); });
    if (heroImg) heroImg.addEventListener('load', () => renderHero(window.scrollY));
    portrait.addEventListener('change', () => { measureHero(); renderHero(window.scrollY); });
  }

  /* ------------------------------------------------------------------
     Parallaxe générique : [data-parallax="vitesse"]
     ------------------------------------------------------------------ */
  const parallaxEls = $$('[data-parallax]');
  const activeParallax = new Set();
  const pObs = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? activeParallax.add(e.target) : activeParallax.delete(e.target));
    requestTick();
  }, { rootMargin: '20% 0px' });
  parallaxEls.forEach(el => pObs.observe(el));

  scrollHandlers.push(() => {
    if (reduceMotion.matches) return;
    activeParallax.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const host = el.parentElement;
      const r = host.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  });

  /* ------------------------------------------------------------------
     Histoires : défilement vertical => translation horizontale
     ------------------------------------------------------------------ */
  const stories = $('[data-stories]');
  const track = $('[data-stories-track]');
  const bar = $('[data-stories-bar]');
  let storiesDist = 0;

  const setupStories = () => {
    if (!stories) return;
    const isStatic = narrow.matches || reduceMotion.matches;
    stories.classList.toggle('is-static', isStatic);
    if (isStatic) {
      stories.style.height = '';
      track.style.transform = '';
      return;
    }
    storiesDist = Math.max(0, track.offsetWidth - vw);
    stories.style.height = (storiesDist + vh) + 'px';
  };

  const renderStories = () => {
    if (!stories || stories.classList.contains('is-static')) return;
    const top = stories.getBoundingClientRect().top;
    const p = clamp(-top / (storiesDist || 1));
    track.style.transform = `translate3d(${(-p * storiesDist).toFixed(1)}px, 0, 0)`;
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  };

  if (stories) {
    setupStories();
    resizeHandlers.push(setupStories);
    scrollHandlers.push(renderStories);
    window.addEventListener('load', () => { setupStories(); renderStories(); });
    narrow.addEventListener('change', () => { setupStories(); requestTick(); });
  }

  /* ------------------------------------------------------------------
     Prestations : aperçu photo qui suit la souris
     ------------------------------------------------------------------ */
  const preview = $('.service-preview');
  const previewImg = preview && $('img', preview);
  const serviceList = $('[data-service-list]');
  if (preview && serviceList) {
    let px = 0, py = 0, tx = 0, ty = 0, running = false;
    const loop = () => {
      px = lerp(px, tx, 0.14); py = lerp(py, ty, 0.14);
      preview.style.left = px + 'px';
      preview.style.top = py + 'px';
      if (preview.classList.contains('is-on') || Math.abs(px - tx) > 0.5) requestAnimationFrame(loop);
      else running = false;
    };
    $$('.service', serviceList).forEach(li => {
      li.addEventListener('mouseenter', e => {
        if (!finePointer.matches || window.innerWidth <= 960) return;
        previewImg.src = li.dataset.preview;
        if (!preview.classList.contains('is-on')) { px = tx = e.clientX; py = ty = e.clientY; }
        preview.classList.add('is-on');
        if (!running) { running = true; requestAnimationFrame(loop); }
      });
      li.addEventListener('mousemove', e => { tx = e.clientX + 170; ty = e.clientY; });
    });
    serviceList.addEventListener('mouseleave', () => preview.classList.remove('is-on'));
    window.addEventListener('scroll', () => preview.classList.remove('is-on'), { passive: true });
  }

  /* ------------------------------------------------------------------
     Portfolio : filtres + « Afficher plus »
     ------------------------------------------------------------------ */
  const grid = $('[data-grid]');
  const tiles = $$('.tile', grid);
  const filters = $$('.filter');
  const PAGE = 16;
  let currentFilter = 'all';
  let limit = PAGE;

  const moreWrap = document.createElement('div');
  moreWrap.className = 'grid-more';
  const moreBtn = document.createElement('button');
  moreBtn.className = 'btn btn-dark';
  moreWrap.appendChild(moreBtn);
  grid.after(moreWrap);

  const applyFilter = (animate) => {
    let shown = 0, total = 0;
    tiles.forEach(t => {
      const match = currentFilter === 'all' || t.dataset.cat === currentFilter;
      t.hidden = !match;
      if (match) {
        total++;
        const capped = total > limit;
        const wasHidden = t.classList.contains('is-capped') || t.dataset.wasHidden === '1';
        t.classList.toggle('is-capped', capped);
        if (!capped) {
          shown++;
          if (animate && wasHidden && !reduceMotion.matches) {
            t.classList.remove('is-entering'); void t.offsetWidth; t.classList.add('is-entering');
          }
        }
      }
      t.dataset.wasHidden = (!match || t.classList.contains('is-capped')) ? '1' : '0';
    });
    const rest = total - shown;
    moreWrap.hidden = rest <= 0;
    moreBtn.textContent = `Afficher ${rest > 1 ? 'les ' + rest + ' photos suivantes' : 'la dernière photo'}`;
    requestTick();
  };

  const setFilter = (value) => {
    currentFilter = value;
    limit = PAGE;
    filters.forEach(f => {
      const on = f.dataset.filter === value;
      f.classList.toggle('is-active', on);
      f.setAttribute('aria-pressed', String(on));
    });
    applyFilter(true);
  };

  // compteurs des filtres calculés à partir des photos présentes
  filters.forEach(f => {
    const sup = $('sup', f);
    if (sup) sup.textContent = f.dataset.filter === 'all' ? tiles.length : tiles.filter(t => t.dataset.cat === f.dataset.filter).length;
  });
  filters.forEach(f => f.addEventListener('click', () => setFilter(f.dataset.filter)));
  moreBtn.addEventListener('click', () => { limit += PAGE; applyFilter(true); });
  $$('[data-filter-link]').forEach(a => a.addEventListener('click', () => setFilter(a.dataset.filterLink)));
  tiles.forEach(t => t.dataset.wasHidden = '0');
  applyFilter(false);

  /* ------------------------------------------------------------------
     Visionneuse
     ------------------------------------------------------------------ */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]');
  const lbFrame = $('.lb-frame', lb);
  const lbCaption = $('[data-lb-caption]');
  const lbCount = $('[data-lb-count]');
  let items = [], index = 0, lastFocus = null;

  const toItem = btn => ({
    src: btn.dataset.full,
    caption: btn.dataset.caption || '',
    alt: (btn.getAttribute('aria-label') || '').replace(/^Agrandir : /, '')
  });

  const fitFrame = () => {
    if (!lbImg.naturalWidth) return;
    const r = lbImg.getBoundingClientRect();
    const s = lbImg.parentElement.getBoundingClientRect();
    Object.assign(lbFrame.style, {
      left: (r.left - s.left) + 'px', top: (r.top - s.top) + 'px',
      width: r.width + 'px', height: r.height + 'px'
    });
  };

  const show = i => {
    index = (i + items.length) % items.length;
    const it = items[index];
    lbImg.classList.add('is-loading');
    const img = new Image();
    img.onload = () => {
      lbImg.src = it.src;
      lbImg.alt = it.alt;
      requestAnimationFrame(() => { lbImg.classList.remove('is-loading'); fitFrame(); });
    };
    img.src = it.src;
    lbCaption.textContent = it.caption;
    lbCount.textContent = `${index + 1} / ${items.length}`;
    // précharge les voisines
    [index + 1, index - 1].forEach(n => { const nb = items[(n + items.length) % items.length]; if (nb) new Image().src = nb.src; });
  };

  const openLightbox = (list, start) => {
    items = list; lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => lb.classList.add('is-open'));
    show(start);
    $('[data-lb-close]').focus();
  };
  const closeLightbox = () => {
    lb.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, 300);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  // Ouverture depuis le portfolio : seulement les photos du filtre courant
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.tile-btn');
    if (!btn) return;
    const visible = tiles.filter(t => !t.hidden).map(t => $('.tile-btn', t));
    openLightbox(visible.map(toItem), visible.indexOf(btn));
  });

  // Ouverture depuis une histoire : toutes les photos du couple
  $$('[data-story]').forEach(story => {
    const shots = $$('.story-shot', story);
    const list = shots.map(toItem);
    shots.forEach((s, i) => s.addEventListener('click', () => openLightbox(list, i)));
    $('[data-story-open]', story).addEventListener('click', () => openLightbox(list, 0));
  });

  $('[data-lb-close]').addEventListener('click', closeLightbox);
  $('[data-lb-prev]').addEventListener('click', () => show(index - 1));
  $('[data-lb-next]').addEventListener('click', () => show(index + 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'Tab') {
      // garde le focus dans la visionneuse
      const f = $$('button', lb);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', () => { if (!lb.hidden) fitFrame(); });

  // Swipe tactile
  let sx = 0, sy = 0;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeLightbox();
  });

  /* ------------------------------------------------------------------
     Curseur viseur (souris uniquement)
     ------------------------------------------------------------------ */
  const cursor = $('.cursor');
  if (cursor && finePointer.matches && !reduceMotion.matches) {
    document.documentElement.classList.add('has-cursor');
    let cx = vw / 2, cy = vh / 2, mx = cx, my = cy;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const loop = () => {
      cx = lerp(cx, mx, 0.22); cy = lerp(cy, my, 0.22);
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', e => {
      cursor.classList.toggle('is-on', !!e.target.closest('[data-cursor]'));
    });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  }

  /* ------------------------------------------------------------------
     Formulaire de contact (Formspree, envoi sans rechargement)
     ------------------------------------------------------------------ */
  const form = $('[data-form]');
  if (form) {
    const status = $('[data-status]', form);
    const submit = $('[data-submit]', form);

    const setError = (field, msg) => {
      const wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.toggle('has-error', !!msg);
      let err = $('.field-error', wrap);
      if (msg) {
        if (!err) { err = document.createElement('p'); err.className = 'field-error'; wrap.appendChild(err); }
        err.textContent = msg;
        field.setAttribute('aria-invalid', 'true');
      } else {
        if (err) err.remove();
        field.removeAttribute('aria-invalid');
      }
    };

    const validate = () => {
      let firstBad = null;
      const check = (el, msg) => { const bad = !el.checkValidity(); setError(el, bad ? msg : ''); if (bad && !firstBad) firstBad = el; };
      const radio = $('input[name="prestation"]', form);
      check(radio, 'Choisissez le type de projet.');
      check($('#f-name'), 'Indiquez votre nom.');
      const email = $('#f-email');
      check(email, email.value ? 'Cette adresse e-mail semble incomplète.' : 'Indiquez votre e-mail pour que je puisse vous répondre.');
      check($('#f-msg'), 'Écrivez quelques mots sur votre projet.');
      return firstBad;
    };

    form.addEventListener('input', e => { if (e.target.closest('.has-error')) setError(e.target, ''); });
    form.addEventListener('change', e => { if (e.target.name === 'prestation') setError($('input[name="prestation"]', form), ''); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';
      const bad = validate();
      if (bad) { bad.focus(); return; }

      submit.disabled = true;
      submit.textContent = 'Envoi en cours…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        submit.textContent = 'Demande envoyée';
        status.classList.add('is-ok');
        status.textContent = 'Merci, votre demande est bien partie. Je vous réponds personnellement très vite.';
        setTimeout(() => { submit.disabled = false; submit.textContent = 'Envoyer ma demande'; }, 6000);
      } catch (err) {
        submit.disabled = false;
        submit.textContent = 'Envoyer ma demande';
        status.classList.add('is-err');
        status.innerHTML = 'L\'envoi n\'a pas abouti. Réessayez dans un instant ou écrivez-moi à <a href="mailto:contact@adavan.fr">contact@adavan.fr</a>.';
      }
    });
  }

  /* ------------------------------------------------------------------
     Bouton « revenir en haut »
     ------------------------------------------------------------------ */
  const toTop = $('[data-to-top]');
  if (toTop) {
    const ring = $('[data-to-top-ring]', toTop);
    toTop.hidden = false;
    scrollHandlers.push(y => {
      const max = document.documentElement.scrollHeight - vh;
      toTop.classList.toggle('is-on', y > vh * 1.6);
      ring.style.strokeDashoffset = (100 - clamp(y / (max || 1)) * 100).toFixed(2);
    });
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      // rend le focus au haut de page pour la navigation clavier
      setTimeout(() => $('.nav-logo').focus({ preventScroll: true }), 50);
    });
  }

  /* ------------------------------------------------------------------ */
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  reduceMotion.addEventListener('change', () => { setupStories(); requestTick(); });
  requestTick();
})();
