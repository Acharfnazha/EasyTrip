// Admin page: the side menu. The page has four sections (overview, stays, messages, database)
// and shows one at a time. The section's name is in the address after the #, like
// admin.html#messages, so the browser's Back button and a reload keep the right section.
// "#database/users" also names a table: js/admin-database.js reads that part.
(function () {
  'use strict';

  const sections = Array.prototype.slice.call(document.querySelectorAll('[data-admin-section]'));
  const links = Array.prototype.slice.call(document.querySelectorAll('[data-admin-link]'));
  const main = document.getElementById('main');
  if (sections.length === 0) return;

  const names = sections.map(function (section) { return section.dataset.adminSection; });
  let shown = null;

  function show(moveFocus) {
    let name = window.location.hash.slice(1).split('/')[0];
    if (names.indexOf(name) === -1) {
      // Not a section (for example #main from the "Skip to main content" link): keep the
      // current section, or start with the first one.
      if (shown) return;
      name = names[0];
    }
    if (name === shown) return;
    shown = name;

    sections.forEach(function (section) {
      const isCurrent = section.dataset.adminSection === name;
      section.hidden = !isCurrent;
      if (isCurrent) document.title = section.dataset.adminTitle + ' — EasyTrip admin';
    });
    links.forEach(function (link) {
      if (link.dataset.adminLink === name) {
        link.setAttribute('aria-current', 'page');
        // On a phone the menu is one row that scrolls sideways: bring this link into view.
        link.parentElement.scrollLeft = link.offsetLeft - 16;
      } else {
        link.removeAttribute('aria-current');
      }
    });

    // Like opening a new page: start at the top, with the focus on the content.
    if (moveFocus) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
  }

  window.addEventListener('hashchange', function () { show(true); });
  // The page was hidden while the server checked the login, so the menu could not be measured
  // yet: bring the current link into view now.
  document.addEventListener('easytrip:admin-ready', function () {
    const link = document.querySelector('[data-admin-link][aria-current]');
    if (link) link.parentElement.scrollLeft = link.offsetLeft - 16;
  });
  show(false);
})();

// On a phone, the admin tables show each row as a card (css/admin.css). Each cell then needs the
// name of its column, which it takes from the table's heading: data-label="Credit". The rows
// are drawn by the other admin scripts, so new rows are labelled as they appear.
(function () {
  'use strict';

  function labelRows(table) {
    const names = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) {
      // A heading that is only for screen readers (the image or the buttons) gives no label.
      const hidden = th.querySelector('.et-visually-hidden');
      return hidden && hidden.textContent.trim() === th.textContent.trim() ? '' : th.textContent.trim();
    });
    table.querySelectorAll('tbody tr').forEach(function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, index) {
        if (names[index]) td.dataset.label = names[index];
      });
    });
  }

  document.querySelectorAll('.admin-app .admin-table').forEach(function (table) {
    const body = table.querySelector('tbody');
    if (!body) return;
    new MutationObserver(function () { labelRows(table); }).observe(body, { childList: true });
    labelRows(table);
  });
})();
