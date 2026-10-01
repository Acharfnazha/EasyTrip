// Navigation menu: dropdowns, the mobile menu and the current-page highlight.
(function () {
  'use strict';

  document.documentElement.classList.add('et-js');

  // Keep in sync with the mobile breakpoint in css/styles.css.
  var MOBILE_QUERY = '(max-width: 67.49em)';
  var HOVER_CLOSE_DELAY = 160;

  function currentPage() {
    var file = window.location.pathname.split('/').pop();
    return file || 'index.html';
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
      // Remember hover-opened menus so the click that usually follows a hover doesn't close them.
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSite);
  } else {
    initSite();
  }
})();
