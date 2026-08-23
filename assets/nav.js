(function () {
  var header = document.querySelector('header');
  var nav = header && header.querySelector('nav');
  if (!nav) return;

  // ---- mobile menu, built from the desktop links so the two never drift ----
  var links = nav.querySelector('.navlinks');
  if (links) {
    var btn = document.createElement('button');
    btn.className = 'navtoggle';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';

    var panel = document.createElement('div');
    panel.className = 'mobilenav';
    panel.innerHTML = links.innerHTML;

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
      }
    });
  }

  // ---- mark the current page in the nav ----
  var here = window.location.pathname.replace(/index\.html$/, '');
  header.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && href.charAt(0) === '/' && href.indexOf('#') === -1 && href === here && here !== '/') {
      a.setAttribute('aria-current', 'page');
    }
  });

  // ---- hairline border once scrolled (home page adds its own on-dark logic) ----
  if (!document.querySelector('.hero-full-bg')) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
