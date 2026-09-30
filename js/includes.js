// Shared header/footer loader and the single navigation controller for every page.
// Pages that render the partials with PHP (index.php) skip the fetch; the others
// get them injected here, and the nav is initialised once after that.
(function () {
  'use strict';

  document.documentElement.classList.add('et-js');

  // Keep in sync with the mobile breakpoint in css/styles.css.
  var MOBILE_QUERY = '(max-width: 67.49em)';
  var HOVER_CLOSE_DELAY = 160;

  async function inject(id, url) {
    var mount = document.getElementById(id);
    if (!mount) return;
    try {
      var res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      var tpl = document.createElement('template');
      tpl.innerHTML = await res.text();
      // Replace the mount so the header is a direct child of <body>; a sticky
      // element inside a wrapper of its own height never sticks.
      mount.replaceWith(tpl.content);
    } catch (err) {
      console.error('Include failed →', url, err);
    }
  }

  function currentPage() {
    var file = window.location.pathname.split('/').pop();
    return file || 'index.php';
  }

  function ensureMainTarget() {
    var main = document.getElementById('main') || document.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'main';
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  }

  function markActive(header) {
    var page = currentPage();
    header.querySelectorAll('.et-nav a[href]').forEach(function (link) {
      var isCurrent = link.getAttribute('href').split('#')[0] === page;
      if (isCurrent) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    header.querySelectorAll('.et-nav__trigger').forEach(function (trigger) {
      var menu = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.classList.toggle('is-current', !!(menu && menu.querySelector('[aria-current="page"]')));
    });
  }

  function syncHeaderHeight(header) {
    var bar = header.querySelector('.et-header__bar');
    var h = (bar || header).getBoundingClientRect().height;
    document.documentElement.style.setProperty('--et-header-h', Math.round(h) + 'px');
  }

  function initNav() {
    var header = document.querySelector('[data-et-header]');
    if (!header || header.dataset.etNavReady) return;
    header.dataset.etNavReady = 'true';

    var toggle = header.querySelector('[data-et-nav-toggle]');
    var panel = document.getElementById(toggle ? toggle.getAttribute('aria-controls') : '');
    var triggers = Array.prototype.slice.call(header.querySelectorAll('.et-nav__trigger'));
    var mq = window.matchMedia(MOBILE_QUERY);
    var hoverTimer = null;

    function isMobile() { return mq.matches; }
    function menuOf(trigger) { return document.getElementById(trigger.getAttribute('aria-controls')); }

    function setMenu(trigger, open, byHover) {
      trigger.setAttribute('aria-expanded', String(open));
      // Remember hover-opened menus so the click that often follows a hover
      // doesn't immediately close the menu again.
      if (open && byHover) trigger.dataset.hoverOpen = 'true';
      else delete trigger.dataset.hoverOpen;
    }

    function closeMenus(except) {
      triggers.forEach(function (t) { if (t !== except) setMenu(t, false); });
    }

    function setPanel(open, returnFocus) {
      if (!toggle || !panel) return;
      toggle.setAttribute('aria-expanded', String(open));
      header.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('et-nav-locked', open);
      if (!open) {
        closeMenus();
        if (returnFocus) toggle.focus();
      }
    }

    function panelOpen() {
      return toggle && toggle.getAttribute('aria-expanded') === 'true';
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        setPanel(!panelOpen());
      });
    }

    triggers.forEach(function (trigger) {
      var item = trigger.closest('.et-nav__item');
      var menu = menuOf(trigger);

      trigger.addEventListener('click', function () {
        var open = trigger.dataset.hoverOpen === 'true' || trigger.getAttribute('aria-expanded') !== 'true';
        closeMenus(trigger);
        setMenu(trigger, open);
      });

      trigger.addEventListener('keydown', function (e) {
        if (isMobile() || !menu) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          closeMenus(trigger);
          setMenu(trigger, true);
          var first = menu.querySelector('a');
          if (first) first.focus();
        }
      });

      if (menu) {
        menu.addEventListener('keydown', function (e) {
          if (isMobile()) return;
          var links = Array.prototype.slice.call(menu.querySelectorAll('a'));
          var i = links.indexOf(document.activeElement);
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var next = e.key === 'ArrowDown' ? i + 1 : i - 1;
            if (next < 0) { trigger.focus(); return; }
            links[Math.min(next, links.length - 1)].focus();
          }
        });
      }

      // Pointer hover on desktop only; touch and pen rely on click.
      item.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || isMobile()) return;
        clearTimeout(hoverTimer);
        closeMenus(trigger);
        if (trigger.getAttribute('aria-expanded') !== 'true') setMenu(trigger, true, true);
      });
      item.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse' || isMobile()) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () {
          if (!item.contains(document.activeElement)) setMenu(trigger, false);
        }, HOVER_CLOSE_DELAY);
      });

      // Close a desktop dropdown once keyboard focus leaves it.
      item.addEventListener('focusout', function (e) {
        if (isMobile()) return;
        if (!item.contains(e.relatedTarget)) setMenu(trigger, false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (isMobile() && panelOpen()) {
        setPanel(false, true);
        return;
      }
      var openTrigger = triggers.filter(function (t) { return t.getAttribute('aria-expanded') === 'true'; })[0];
      if (!openTrigger) return;
      var hadFocus = openTrigger.closest('.et-nav__item').contains(document.activeElement);
      setMenu(openTrigger, false);
      if (hadFocus) openTrigger.focus();
    });

    document.addEventListener('click', function (e) {
      if (header.contains(e.target)) {
        // Following a link inside the open mobile panel (e.g. a same-page anchor) closes it.
        if (panelOpen() && e.target.closest('.et-nav a')) setPanel(false);
        return;
      }
      closeMenus();
      if (panelOpen()) setPanel(false);
    });

    function onModeChange() {
      clearTimeout(hoverTimer);
      setPanel(false);
      syncHeaderHeight(header);
    }
    if (mq.addEventListener) mq.addEventListener('change', onModeChange);
    else mq.addListener(onModeChange);

    window.addEventListener('resize', function () { syncHeaderHeight(header); });

    markActive(header);
    syncHeaderHeight(header);
  }

  function initSite() {
    ensureMainTarget();
    initNav();
    if (typeof window.initSite === 'function') window.initSite();
  }

  (async function () {
    await inject('include-header', 'partials/header.php');
    await inject('include-footer', 'partials/footer.php');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSite);
    } else {
      initSite();
    }
  })();
})();
