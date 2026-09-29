/* =========================================================
   «Золотой Вектор» — ПРЕМИУМ · интерактив (vanilla ES6 + GSAP)
   GSAP: reveal, stagger, parallax, counters, magnetic, cursor.
   Всё деградирует корректно без GSAP и при reduced-motion.
   ========================================================= */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* ---------- Header + прогресс чтения ---------- */
  const header = document.getElementById('siteHeader');
  const progress = document.getElementById('scrollProgress');
  const onScroll = () => {
    if (window.scrollY > 20) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (progress) progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const closeMenu = () => {
    mobileMenu.classList.add('hidden-menu');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Открыть меню');
    menuToggle.querySelector('use').setAttribute('href', '#i-list');
  };
  const openMenu = () => {
    mobileMenu.classList.remove('hidden-menu');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Закрыть меню');
    menuToggle.querySelector('use').setAttribute('href', '#i-x');
  };
  menuToggle.addEventListener('click', () =>
    menuToggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu()
  );
  mobileMenu.querySelectorAll('.mobile-link').forEach((l) => l.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') { closeMenu(); menuToggle.focus(); }
  });

  /* ---------- Плавающие кнопки (FAB): меню «Связаться» ---------- */
  const fab = document.getElementById('fab');
  if (fab) {
    const fabContact = document.getElementById('fabContact');
    const closeFab = () => { fab.classList.remove('is-open'); fabContact.setAttribute('aria-expanded', 'false'); };
    const openFab = () => { fab.classList.add('is-open'); fabContact.setAttribute('aria-expanded', 'true'); };

    fabContact.addEventListener('click', (e) => {
      e.stopPropagation();
      fab.classList.contains('is-open') ? closeFab() : openFab();
    });
    // Клик по пункту меню — закрываем
    fab.querySelectorAll('.fab__item').forEach((item) => item.addEventListener('click', closeFab));
    // Клик вне FAB — закрываем
    document.addEventListener('click', (e) => {
      if (fab.classList.contains('is-open') && !fab.contains(e.target)) closeFab();
    });
    // Esc — закрываем и возвращаем фокус
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && fab.classList.contains('is-open')) { closeFab(); fabContact.focus(); }
    });
  }

  /* ---------- FAQ-аккордеон (высота через JS для плавности) ---------- */
  const faqButtons = document.querySelectorAll('.faq-item');
  const setPanel = (panel, open) => {
    if (reduce) { panel.style.height = open ? 'auto' : '0'; return; }
    if (open) {
      panel.style.height = panel.scrollHeight + 'px';
      panel.addEventListener('transitionend', function te() {
        panel.style.height = 'auto'; panel.removeEventListener('transitionend', te);
      });
    } else {
      panel.style.height = panel.scrollHeight + 'px';
      requestAnimationFrame(() => { panel.style.height = '0'; });
    }
  };
  // плавность высоты
  faqButtons.forEach((btn) => {
    const panel = btn.nextElementSibling;
    panel.style.transition = reduce ? 'none' : 'height .35s cubic-bezier(.2,.7,.2,1)';
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      faqButtons.forEach((o) => {
        if (o !== btn && o.getAttribute('aria-expanded') === 'true') {
          o.setAttribute('aria-expanded', 'false'); setPanel(o.nextElementSibling, false);
        }
      });
      btn.setAttribute('aria-expanded', String(!isOpen));
      setPanel(panel, !isOpen);
    });
  });

  /* ---------- Био специалистов (раскрытие) ---------- */
  document.querySelectorAll('.bio-toggle').forEach((btn) => {
    const panel = btn.parentElement.querySelector('.bio-panel');
    const label = btn.querySelector('.bio-label');
    if (!panel) return;
    panel.style.transition = reduce ? 'none' : 'height .4s cubic-bezier(.2,.7,.2,1), opacity .3s ease';
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (label) label.textContent = open ? 'Подробнее' : 'Свернуть';
      if (reduce) { panel.style.height = open ? '0' : 'auto'; panel.style.opacity = open ? '0' : '1'; return; }
      if (open) {
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(() => { panel.style.height = '0'; panel.style.opacity = '0'; });
      } else {
        panel.style.opacity = '1';
        panel.style.height = panel.scrollHeight + 'px';
        panel.addEventListener('transitionend', function te() { panel.style.height = 'auto'; panel.removeEventListener('transitionend', te); });
      }
    });
  });

  /* ---------- Галерея отзывов: показать все ---------- */
  const reviewsGrid = document.getElementById('reviewsGrid');
  const reviewsToggle = document.getElementById('reviewsToggle');
  if (reviewsGrid && reviewsToggle) {
    const label = reviewsToggle.querySelector('.reviews-toggle-label');
    const caret = reviewsToggle.querySelector('.reviews-toggle-caret');
    reviewsToggle.addEventListener('click', () => {
      const expanded = reviewsGrid.classList.toggle('expanded');
      reviewsToggle.setAttribute('aria-expanded', String(expanded));
      if (label) label.textContent = expanded ? 'Свернуть отзывы' : (label.dataset.more || 'Показать ещё отзывы');
      if (caret) caret.style.transform = expanded ? 'rotate(180deg)' : 'none';
      if (hasGSAP && !reduce && window.ScrollTrigger) ScrollTrigger.refresh();
      if (!expanded) document.getElementById('reviews').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* ---------- Лайтбокс (отзывы + зоны) ---------- */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImage = document.getElementById('lbImage');
    const lbClose = document.getElementById('lbClose');
    const lbPrev = document.getElementById('lbPrev');
    const lbNext = document.getElementById('lbNext');
    const lbCounter = document.getElementById('lbCounter');
    let gallery = [];
    let current = 0;
    let lastFocused = null;

    // gallery — массив URL изображений
    function show(i) {
      current = (i + gallery.length) % gallery.length;
      lbImage.src = gallery[current];
      lbImage.alt = (galleryAlt || 'Фото') + ' — ' + (current + 1);
      const multi = gallery.length > 1;
      lbPrev.hidden = !multi; lbNext.hidden = !multi;
      lbCounter.textContent = multi ? `${current + 1} / ${gallery.length}` : '';
    }
    let galleryAlt = '';
    function open(trigger) {
      // Если у триггера задан свой набор фото (data-gallery) — используем его (галерея одной зоны)
      const list = trigger.dataset.gallery;
      if (list) {
        gallery = list.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        gallery = [trigger.dataset.full || (trigger.querySelector('img') && trigger.querySelector('img').src)];
      }
      const img = trigger.querySelector('img');
      galleryAlt = img ? img.alt : '';
      current = 0;
      lastFocused = trigger;
      lightbox.hidden = false;
      requestAnimationFrame(() => lightbox.classList.add('is-open'));
      show(current);
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    }
    function close() {
      lightbox.classList.remove('is-open');
      const done = () => { lightbox.hidden = true; lbImage.src = ''; lightbox.removeEventListener('transitionend', done); };
      if (reduce) done(); else lightbox.addEventListener('transitionend', done);
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    document.querySelectorAll('.lightbox-trigger').forEach((t) => {
      t.addEventListener('click', () => open(t));
    });
    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', () => show(current - 1));
    lbNext.addEventListener('click', () => show(current + 1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'Tab') { e.preventDefault(); lbClose.focus(); } // простая ловушка фокуса
    });
  }

  /* ---------- Модалки специалистов (карточки команды) ---------- */
  const personModals = document.querySelectorAll('.pm-overlay');
  if (personModals.length) {
    let pmLastFocused = null;

    function openModalById(mid, trigger) {
      const modal = document.getElementById(mid);
      if (!modal || !modal.hidden) return;
      pmLastFocused = trigger;
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      const panel = modal.querySelector('.pm-panel');
      if (panel) { panel.scrollTop = 0; panel.focus(); }
    }
    function closePersonModal(modal) {
      if (modal.hidden) return;
      modal.classList.remove('is-open');
      const done = () => { modal.hidden = true; modal.removeEventListener('transitionend', done); };
      if (reduce) done(); else modal.addEventListener('transitionend', done);
      document.body.style.overflow = '';
      if (pmLastFocused) pmLastFocused.focus();
    }

    document.querySelectorAll('.person-more').forEach((btn) => {
      btn.addEventListener('click', () => openModalById('person-' + btn.dataset.person, btn));
    });

    /* ---------- Модалки услуг (блок «Наши услуги») ---------- */
    document.querySelectorAll('.service-more').forEach((btn) => {
      btn.addEventListener('click', () => openModalById('service-' + btn.dataset.service, btn));
    });

    // «Записаться к этому специалисту» — предзаполняет форму брони и закрывает модалку
    personModals.forEach((modal) => {
      const bookBtn = modal.querySelector('.pm-book');
      if (!bookBtn) return;
      bookBtn.addEventListener('click', () => {
        const comment = document.getElementById('comment');
        if (comment) {
          const full = bookBtn.dataset.personFull || '';
          const role = bookBtn.dataset.personRole || '';
          const svc = bookBtn.dataset.serviceBook || '';
          const line = svc
            ? `Хочу записаться на услугу: ${svc}.`
            : `Хочу записаться к специалисту: ${full}${role ? ' (' + role + ')' : ''}.`;
          const existing = comment.value.trim();
          if (!existing.includes(line)) {
            comment.value = existing ? existing + '\n' + line : line;
          }
        }
        closePersonModal(modal);
        const booking = document.getElementById('booking');
        if (booking) booking.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        // фокус на имя после прокрутки (кратковременно ждём завершения smooth-scroll)
        setTimeout(() => {
          const name = document.getElementById('name');
          if (name) name.focus({ preventScroll: true });
        }, reduce ? 0 : 600);
      });
    });
    personModals.forEach((modal) => {
      const closeBtn = modal.querySelector('.pm-close');
      if (closeBtn) closeBtn.addEventListener('click', () => closePersonModal(modal));
      modal.addEventListener('click', (e) => { if (e.target === modal) closePersonModal(modal); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = [...personModals].find((m) => !m.hidden);
      if (open) closePersonModal(open);
    });
  }

  /* ---------- Табы категорий в блоке цен ---------- */
  const priceTabs = document.querySelectorAll('[data-price-tab]');
  if (priceTabs.length) {
    const pricePanels = document.querySelectorAll('[data-price-panel]');
    function activatePriceTab(cat, focusTab) {
      priceTabs.forEach((t) => {
        const active = t.dataset.priceTab === cat;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        t.tabIndex = active ? 0 : -1;
        if (active && focusTab) t.focus();
      });
      pricePanels.forEach((p) => {
        const active = p.dataset.pricePanel === cat;
        p.hidden = !active;
        p.classList.toggle('is-active', active);
        // мягкое появление панели при переключении
        if (active && !reduce && window.gsap) gsap.fromTo(p, { opacity: 0.35 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      });
      if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
    }
    priceTabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activatePriceTab(tab.dataset.priceTab));
      tab.addEventListener('keydown', (e) => {
        let idx = null;
        if (e.key === 'ArrowRight') idx = (i + 1) % priceTabs.length;
        else if (e.key === 'ArrowLeft') idx = (i - 1 + priceTabs.length) % priceTabs.length;
        else if (e.key === 'Home') idx = 0;
        else if (e.key === 'End') idx = priceTabs.length - 1;
        if (idx !== null) { e.preventDefault(); activatePriceTab(priceTabs[idx].dataset.priceTab, true); }
      });
    });
  }

  /* ---------- Форма: единый обработчик в lead-form.js ---------- */
  /* Форма обрабатывается общим модулем assets/js/lead-form.js. */

  /* ========================================================
     GSAP-АНИМАЦИИ (только если библиотека загрузилась)
     ======================================================== */
  function initGSAP() {
    document.documentElement.classList.add('gsap-ready');
    if (!hasGSAP) return; // reveal показан через CSS-класс gsap-ready

    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    // ---- Reduced-motion: без анимации, но счётчики сразу показывают финал ----
    mm.add('(prefers-reduced-motion: reduce)', () => {
      document.querySelectorAll('.count').forEach((el) => {
        const end = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        if (!isNaN(end)) el.textContent = (end >= 1000 ? end.toLocaleString('ru-RU') : end) + suffix;
      });
    });

    // ---- Анимации только для тех, кто НЕ просил reduced-motion ----
    mm.add('(prefers-reduced-motion: no-preference)', () => {

      // Hero: последовательное появление
      const heroTl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 0.9 } });
      heroTl
        .from('.hero-badge', { y: 20, opacity: 0, duration: 0.6 })
        .from('.hero-title', { y: 40, opacity: 0 }, '-=0.3')
        .from('.hero-sub',   { y: 26, opacity: 0 }, '-=0.55')
        .from('.hero-cta',   { y: 22, opacity: 0 }, '-=0.55')
        .from('.hero-stats', { y: 22, opacity: 0 }, '-=0.55')
        .from('.hero-photo', { y: 40, opacity: 0, scale: 0.96, duration: 1.1 }, '-=0.9')
        .from('.hero-float-card', { opacity: 0, scale: 0.8, stagger: 0.15, duration: 0.6 }, '-=0.5');

      // Reveal блоков (once:true + clearProps — чтобы refresh не сбрасывал в начальное состояние)
      gsap.utils.toArray('.reveal').forEach((el) => {
        if (el.hasAttribute('hidden')) return; // скрытые табами панели цен анимируем при показе
        gsap.from(el, {
          opacity: 0, y: 40, duration: 0.8, ease: 'power3.out', clearProps: 'transform',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });

      // Stagger-сетки (карточки услуг/этапов/команды)
      gsap.utils.toArray('.stagger').forEach((grid) => {
        gsap.from(grid.children, {
          opacity: 0, y: 44, duration: 0.7, ease: 'power3.out', stagger: 0.09, clearProps: 'transform',
          scrollTrigger: { trigger: grid, start: 'top 82%', once: true },
        });
      });

      // Параллакс декоративных слоёв и фото
      gsap.utils.toArray('[data-parallax]').forEach((layer) => {
        const speed = parseFloat(layer.dataset.parallax);
        gsap.to(layer, {
          yPercent: speed * 100, ease: 'none',
          scrollTrigger: { trigger: layer, start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      });

      // Счётчики
      gsap.utils.toArray('.count').forEach((el) => {
        const end = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: () => gsap.to(obj, {
            v: end, duration: 1.6, ease: 'power2.out',
            onUpdate: () => {
              const val = Math.round(obj.v);
              el.textContent = (val >= 1000 ? val.toLocaleString('ru-RU') : val) + suffix;
            },
          }),
        });
      });

      // Магнитные кнопки
      if (canHover) {
        document.querySelectorAll('.magnetic').forEach((el) => {
          const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
          const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
          const move = (e) => {
            const r = el.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width / 2) * 0.3);
            yTo((e.clientY - r.top - r.height / 2) * 0.3);
          };
          const reset = () => { xTo(0); yTo(0); };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerleave', reset);
        });
        // Мягкий подъём для карточек/второстепенных кнопок
        document.querySelectorAll('.magnetic-soft').forEach((el) => {
          el.addEventListener('mouseenter', () => gsap.to(el, { y: -4, duration: 0.25, ease: 'power2.out' }));
          el.addEventListener('mouseleave', () => gsap.to(el, { y: 0, duration: 0.25, ease: 'power2.out' }));
        });
      }

      // Кастомный курсор
      if (canHover) {
        const dot = document.querySelector('.cursor-dot');
        const ring = document.querySelector('.cursor-ring');
        if (dot && ring) {
          const dx = gsap.quickTo(dot, 'x', { duration: 0.1 });
          const dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
          const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
          const ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
          window.addEventListener('pointermove', (e) => {
            dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
          });
          document.querySelectorAll('a, button, .tilt, input, textarea').forEach((el) => {
            el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
            el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
          });
        }
      }

      return () => {}; // cleanup для matchMedia
    });

    // Пересчёт после загрузки шрифтов/картинок
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => window.ScrollTrigger && ScrollTrigger.refresh());
    }
    window.addEventListener('load', () => window.ScrollTrigger && ScrollTrigger.refresh());
  }

  // GSAP-скрипты грузятся с defer — дождёмся полной загрузки окна.
  if (document.readyState === 'complete') initGSAP();
  else window.addEventListener('load', initGSAP);
})();
