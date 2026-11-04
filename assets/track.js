/* GA4 for withants.com (Ants).
   Change the Measurement ID on the next line. While it is still the placeholder,
   this file does not load gtag.js and does not send events.
   UTM capture and Calendly / form passthrough still run either way. */
const GA4_ID = 'G-XXXXXXXXXX';

(function () {
  var PLACEHOLDER = 'G-XXXXXXXXXX';
  var STORAGE_KEY = 'ants_attribution';
  var OFFER_KEY = 'ants_offer_page';
  var UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function gaEnabled() {
    return typeof GA4_ID === 'string' && GA4_ID !== PLACEHOLDER && /^G-[A-Za-z0-9]+$/.test(GA4_ID);
  }

  function debugOn() {
    try {
      return new URLSearchParams(window.location.search).get('debug_ga') === '1';
    } catch (e) {
      return false;
    }
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function testLabel() {
    var d = new Date();
    return 'TEST-ants-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function pathOnly(pathname) {
    var path = pathname || '/';
    path = path.replace(/index\.html$/, '');
    if (path.length > 1 && path.charAt(path.length - 1) !== '/') path += '/';
    return path || '/';
  }

  function onBookPage() {
    return pathOnly(window.location.pathname) === '/book/';
  }

  function onPricingPage() {
    return pathOnly(window.location.pathname) === '/pricing/';
  }

  function landingPage() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
      params.delete('debug_ga');
    } catch (e) {
      return window.location.pathname;
    }
    var qs = params.toString();
    return window.location.pathname + (qs ? '?' + qs : '');
  }

  function readStored() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !data.landing_page) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function captureAttribution() {
    var existing = readStored();
    if (existing) return existing;
    var utms = {};
    try {
      var params = new URLSearchParams(window.location.search);
      params.forEach(function (value, key) {
        if (key.indexOf('utm_') === 0 && value) utms[key] = value;
      });
    } catch (e) {}
    var data = {
      utms: utms,
      referrer: document.referrer || '',
      landing_page: landingPage()
    };
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    return data;
  }

  function rememberOfferPage() {
    if (onBookPage()) return;
    try { window.sessionStorage.setItem(OFFER_KEY, window.location.pathname); } catch (e) {}
  }

  function offerPage() {
    var stored = '';
    try { stored = window.sessionStorage.getItem(OFFER_KEY) || ''; } catch (e) {}
    if (stored) return stored;
    if (!document.referrer) return '';
    try {
      var ref = new URL(document.referrer);
      if (ref.origin !== window.location.origin) return '';
      if (pathOnly(ref.pathname) === '/book/') return '';
      return ref.pathname;
    } catch (e) {
      return '';
    }
  }

  function attribution() {
    var data = captureAttribution();
    return {
      utms: (data && data.utms) || {},
      referrer: (data && data.referrer) || '',
      landing_page: (data && data.landing_page) || '',
      offer_page: offerPage()
    };
  }

  function setHidden(form, name, value) {
    var input = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value || '';
  }

  function fillBookingForm() {
    var form = document.getElementById('ottoForm');
    if (!form) return null;
    var attr = attribution();
    setHidden(form, 'landing_page', attr.landing_page);
    setHidden(form, 'referrer', attr.referrer);
    setHidden(form, 'offer_page', attr.offer_page);
    UTM_FIELDS.forEach(function (key) {
      setHidden(form, key, attr.utms[key] || '');
    });
    Object.keys(attr.utms).forEach(function (key) {
      if (UTM_FIELDS.indexOf(key) === -1) setHidden(form, key, attr.utms[key]);
    });
    return attr;
  }

  function applyUtms(url) {
    var u = new URL(url, window.location.origin);
    var drop = [];
    u.searchParams.forEach(function (value, key) {
      if (key.indexOf('utm_') === 0) drop.push(key);
    });
    drop.forEach(function (key) { u.searchParams.delete(key); });
    var utms = captureAttribution().utms || {};
    Object.keys(utms).forEach(function (key) {
      if (utms[key]) u.searchParams.set(key, utms[key]);
    });
    return u.toString();
  }

  function patchCalendly() {
    var widgets = document.querySelectorAll('.calendly-inline-widget');
    Array.prototype.forEach.call(widgets, function (el) {
      var raw = el.getAttribute('data-url');
      if (!raw) return;
      var next;
      try { next = applyUtms(raw); } catch (e) { return; }
      if (el.getAttribute('data-url') !== next) el.setAttribute('data-url', next);
      var iframe = el.querySelector('iframe');
      if (!iframe || !iframe.src) return;
      try {
        var utms = captureAttribution().utms || {};
        var keys = Object.keys(utms).filter(function (key) { return utms[key]; });
        if (!keys.length) return;
        var src = new URL(iframe.src);
        var changed = false;
        var existing = [];
        src.searchParams.forEach(function (value, key) {
          if (key.indexOf('utm_') === 0) existing.push(key);
        });
        existing.forEach(function (key) {
          if (utms[key] !== src.searchParams.get(key)) {
            src.searchParams.delete(key);
            changed = true;
          }
        });
        keys.forEach(function (key) {
          if (src.searchParams.get(key) !== utms[key]) {
            src.searchParams.set(key, utms[key]);
            changed = true;
          }
        });
        if (changed) iframe.src = src.toString();
      } catch (e) {}
    });
  }

  var calendlyWatching = false;
  function watchCalendly() {
    if (calendlyWatching || typeof MutationObserver !== 'function') return;
    var el = document.querySelector('.calendly-inline-widget');
    if (!el) return;
    calendlyWatching = true;
    var obs = new MutationObserver(function () { patchCalendly(); });
    obs.observe(el, { childList: true, subtree: true });
  }

  function loadGa() {
    if (!gaEnabled()) return;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('js', new Date());
    if (debugOn()) window.gtag('config', GA4_ID, { debug_mode: true });
    else window.gtag('config', GA4_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
  }

  function track(name, params) {
    if (!gaEnabled() || typeof window.gtag !== 'function') return;
    var payload = { page_path: window.location.pathname };
    if (params) {
      for (var key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key) && key !== 'venture') payload[key] = params[key];
      }
    }
    payload.venture = 'ants';
    if (debugOn()) {
      payload.debug_mode = true;
      payload.test_label = testLabel();
    }
    window.gtag('event', name, payload);
  }

  function utmContent(el) {
    var href = el.getAttribute('href') || '';
    try {
      return new URL(href, window.location.origin).searchParams.get('utm_content') || '';
    } catch (e) {
      return '';
    }
  }

  function ctaLocation(el) {
    if (el.closest('header, .mobilenav') || el.classList.contains('nav-cta')) return 'nav';
    if (el.closest('footer')) return 'footer';
    if (el.closest('.related-solution')) return 'related';
    var content = utmContent(el);
    if (content === 'post_end' || el.closest('section.final')) return 'post_end';
    if (content === 'related') return 'related';
    if (el.closest('section.hero')) return 'hero';
    return 'inbody';
  }

  function linkKind(href) {
    if (!href || href.charAt(0) === '#') return '';
    if (href.indexOf('mailto:') === 0) return 'email';
    if (href.indexOf('tel:') === 0) return 'phone';
    var url;
    try { url = new URL(href, window.location.origin); } catch (e) { return ''; }
    if (url.protocol === 'mailto:') return 'email';
    if (url.protocol === 'tel:') return 'phone';
    var host = url.hostname.replace(/^www\./, '');
    if (host === 'calendly.com') return 'book';
    if (url.origin === window.location.origin && pathOnly(url.pathname) === '/book/') return 'book';
    return '';
  }

  function labelOf(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isFreeAgentCta(el) {
    var text = labelOf(el).toLowerCase();
    return text.length > 0 && text.length <= 80 && text.indexOf('get your first agent free') !== -1;
  }

  function isPricingCta(el) {
    if (!onPricingPage()) return false;
    if (el.closest('header, footer, .mobilenav')) return false;
    return el.matches('a.btn-primary, a.btn-secondary, a.cta, button.btn-primary, button.btn-secondary');
  }

  function onClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!el) return;
    if (isFreeAgentCta(el)) {
      track('free_agent_cta_click', { cta_text: labelOf(el), link_url: el.href || '' });
    }
    if (el.tagName === 'A') {
      var kind = linkKind(el.getAttribute('href') || '');
      if (kind === 'email') track('outbound_email_click', { link_url: el.href });
      else if (kind === 'phone') track('outbound_phone_click', { link_url: el.href });
      else if (kind === 'book') {
        rememberOfferPage();
        track('book_call_click', { cta_location: ctaLocation(el), link_url: el.href });
      }
      if (el.closest('.related-solution')) {
        track('related_solution_click', { link_url: el.href, link_text: labelOf(el) });
      }
    }
    if (isPricingCta(el)) {
      var params = { cta_text: labelOf(el), link_url: el.href || '' };
      var tier = el.closest('.tier');
      if (tier) {
        var heading = tier.querySelector('h3');
        if (heading) params.tier = labelOf(heading);
      }
      track('pricing_cta_click', params);
    }
  }

  function onMessage(e) {
    if (!e || e.origin !== 'https://calendly.com' || !e.data || typeof e.data.event !== 'string') return;
    if (e.data.event === 'calendly.date_and_time_selected') track('calendly_time_selected');
    else if (e.data.event === 'calendly.event_scheduled') track('book_call_scheduled');
  }

  function bootDom() {
    try {
      patchCalendly();
      fillBookingForm();
      watchCalendly();
    } catch (e) {}
  }

  captureAttribution();
  loadGa();
  document.addEventListener('click', function (e) {
    try { onClick(e); } catch (err) {}
  });
  window.addEventListener('message', onMessage);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootDom);
  bootDom();
  window.addEventListener('load', bootDom);

  window.antsTrack = track;
  window.antsAttribution = attribution;
  window.antsFillBookingForm = fillBookingForm;
})();
