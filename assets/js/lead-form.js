/* Единый обработчик форм заявок «Золотой Вектор». */
(function () {
  'use strict';

  const STORAGE_KEY = 'zv_tracking';
  const TRACKING_KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'yclid', 'gclid', 'gbraid', 'wbraid', 'openstat', 'from'
  ];

  const readTracking = () => {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {}

    const params = new URLSearchParams(window.location.search);
    const current = {};
    TRACKING_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) current[key] = value.trim().slice(0, 255);
    });

    const tracking = {
      first: Object.keys(stored.first || {}).length ? stored.first : current,
      last: { ...(stored.last || {}), ...current },
      landing_page: stored.landing_page || window.location.href.split('#')[0],
      referrer: stored.referrer || document.referrer.slice(0, 1000)
    };

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tracking)); } catch (_) {}
    return tracking;
  };

  const flatTracking = (tracking) => ({
    ...Object.fromEntries(Object.entries(tracking.first || {}).map(([key, value]) => [`first_${key}`, value])),
    ...Object.fromEntries(Object.entries(tracking.last || {}).map(([key, value]) => [`last_${key}`, value])),
    landing_page: tracking.landing_page,
    referrer: tracking.referrer
  });

  const showError = (form, field, show) => {
    const message = form.querySelector(`.error-msg[data-for="${field.id}"]`);
    if (message) message.classList.toggle('hidden', !show);
    field.setAttribute('aria-invalid', String(show));
    field.classList.toggle('border-berry', show);
  };

  const validEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    return (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) || digits.length === 10;
  };
  const normalizePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return '+7 ' + (digits[0] === '7' || digits[0] === '8' ? digits.slice(1) : digits);
  };

  document.querySelectorAll('form[data-lead-form], #bookingForm').forEach((form) => {
    const success = document.getElementById('formSuccess');
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;
    form.dataset.startedAt = String(Math.floor(Date.now() / 1000));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = form.elements.name;
      const phone = form.elements.phone;
      const email = form.elements.email;
      let valid = true;

      if (!name.value.trim() || name.value.trim().length > 150) { showError(form, name, true); valid = false; } else showError(form, name, false);
      if (!validPhone(phone.value)) { showError(form, phone, true); valid = false; } else showError(form, phone, false);
      if (!validEmail(email.value.trim())) { showError(form, email, true); valid = false; } else showError(form, email, false);
      if (!valid) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }

      const tracking = readTracking();
      const idempotencyKey = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');

      try {
        const response = await fetch('api/lead.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: name.value.trim(),
            phone: normalizePhone(phone.value),
            email: email.value.trim(),
            comment: form.elements.comment?.value.trim() || '',
            website: form.elements.website?.value || '',
            form_id: form.dataset.leadForm || form.id || 'lead',
            page_url: window.location.href.split('#')[0],
            ...flatTracking(tracking),
            form_started_at: Number(form.dataset.startedAt || Math.floor(Date.now() / 1000)),
            idempotency_key: idempotencyKey
          })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось отправить заявку');
        if (success) { success.classList.remove('hidden'); success.classList.add('flex'); }
        form.reset();
      } catch (_) {
        const errorBox = form.querySelector('[data-form-error]');
        if (errorBox) errorBox.classList.remove('hidden');
        else {
          const fallback = document.createElement('p');
          fallback.className = 'mt-3 text-sm text-berry';
          fallback.textContent = 'Не удалось отправить заявку. Позвоните нам или напишите в мессенджер.';
          form.appendChild(fallback);
        }
        submitButton.disabled = false;
      } finally {
        submitButton.removeAttribute('aria-busy');
      }
    });

    ['name', 'phone', 'email'].forEach((fieldName) => {
      const field = form.elements[fieldName];
      if (!field) return;
      field.addEventListener('input', () => {
        if (fieldName === 'phone') field.value = normalizePhone(field.value);
        if (field.getAttribute('aria-invalid') === 'true') showError(form, field, false);
      });
    });
  });
})();
