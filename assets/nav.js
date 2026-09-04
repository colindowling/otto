(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.querySelector('header');
  var nav = header && header.querySelector('nav');

  /* ================= NAV ================= */
  if (nav) {
    var links = nav.querySelector('.navlinks');

    /* ---- desktop dropdowns (hover, focus, click, Escape) ---- */
    Array.prototype.forEach.call(nav.querySelectorAll('.navdrop'), function (drop) {
      var trigger = drop.querySelector('.navdrop-trigger');
      var closeTimer;
      function open(state) {
        clearTimeout(closeTimer);
        drop.setAttribute('data-open', state ? 'true' : 'false');
        if (trigger) trigger.setAttribute('aria-expanded', state ? 'true' : 'false');
      }
      drop.addEventListener('mouseenter', function () { open(true); });
      drop.addEventListener('mouseleave', function () {
        closeTimer = setTimeout(function () { open(false); }, 120);
      });
      drop.addEventListener('focusin', function () { open(true); });
      drop.addEventListener('focusout', function (e) {
        if (!drop.contains(e.relatedTarget)) open(false);
      });
      if (trigger) {
        trigger.addEventListener('click', function (e) {
          // let the trigger's own href work on a second click; first click just opens
          if (drop.getAttribute('data-open') !== 'true') { e.preventDefault(); open(true); }
        });
      }
      drop.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { open(false); if (trigger) trigger.focus(); }
      });
    });

    /* ---- mobile menu, built from the desktop links so the two never drift ---- */
    if (links) {
      var btn = document.createElement('button');
      btn.className = 'navtoggle';
      btn.setAttribute('aria-label', 'Open menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span></span><span></span><span></span>';

      var panel = document.createElement('div');
      panel.className = 'mobilenav';

      Array.prototype.forEach.call(links.children, function (node) {
        if (node.classList.contains('navdrop')) {
          var group = document.createElement('div');
          group.className = 'mobilenav-group';
          var trigger = node.querySelector('.navdrop-trigger');
          var label = document.createElement('div');
          label.className = 'mg-label';
          label.textContent = trigger ? trigger.textContent.trim() : 'More';
          group.appendChild(label);
          Array.prototype.forEach.call(node.querySelectorAll('.navdrop-menu a'), function (a) {
            var copy = document.createElement('a');
            copy.href = a.getAttribute('href');
            copy.textContent = (a.childNodes[0] && a.childNodes[0].textContent || a.textContent).trim();
            group.appendChild(copy);
          });
          panel.appendChild(group);
        } else {
          panel.appendChild(node.cloneNode(true));
        }
      });

      nav.appendChild(btn);
      header.appendChild(panel);

      btn.addEventListener('click', function () {
        var open = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      panel.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          panel.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          btn.setAttribute('aria-label', 'Open menu');
        }
      });
    }

    /* ---- mark the current page (and current section) in the nav ---- */
    var here = window.location.pathname.replace(/index\.html$/, '');
    header.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '/' || href.indexOf('#') !== -1 || here === '/') return;
      if (href === here) {
        a.setAttribute('aria-current', 'page');
      } else if (a.classList.contains('navdrop-trigger') && href.length > 1 && here.indexOf(href) === 0) {
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---- hairline border once scrolled (home page adds its own on-dark logic) ---- */
  if (header && !document.querySelector('.hero-full-bg')) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ================= REVEAL ON SCROLL ================= */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('visible'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ================= STAT COUNT-UP ================= */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var format = function (el, value) {
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      return (el.getAttribute('data-prefix') || '') + value.toFixed(dec) + (el.getAttribute('data-suffix') || '');
    };
    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) return;
      if (reduce) { el.textContent = format(el, target); return; }
      var duration = 750, start = null;
      var tick = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        // easeOutCubic — decelerates into place, no overshoot
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(el, target * eased);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = format(el, target);
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) {
      counters.forEach(function (el) { el.textContent = format(el, parseFloat(el.getAttribute('data-count'))); });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { run(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) {
        el.textContent = format(el, 0);
        cio.observe(el);
      });
    }
  }

  /* ================= HERO PARALLAX (under 10% of scroll distance) ================= */
  var parallax = document.querySelectorAll('[data-parallax]');
  if (parallax.length && !reduce) {
    var factor = 0.08, ticking = false;
    var apply = function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      parallax.forEach(function (el) {
        var host = el.parentElement;
        var limit = host ? host.offsetHeight : 600;
        var offset = Math.min(y, limit) * factor;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }
})();
