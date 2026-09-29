/* =========================================================
   «Золотой Вектор» — страница-визитка (svyaz.html)
   Форма записи + мягкое появление. Без внешних зависимостей.
   ========================================================= */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealEls = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    revealEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity .5s ease, transform .5s cubic-bezier(.2,.7,.2,1)';
      el.style.transitionDelay = Math.min(i * 0.05, 0.4) + 's';
    });
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'none';
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* Форма обрабатывается общим модулем assets/js/lead-form.js. */
})();
