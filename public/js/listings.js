// Hotels and chalets listings. The stays come from the server: GET /api/stays does the search,
// the filters, the sorting and the pages (server/controllers/stays.js). This script only sends
// the form values, shows the cards it gets back, adds the next page for "Show more", and opens
// the details dialog.
(function () {
  'use strict';

  const ANNOUNCE_DELAY = 400;
  const TYPING_DELAY = 300; // Wait until the visitor stops typing or sliding before asking the server.
  const WIDE_QUERY = '(min-width: 64em)';

  function capitalise(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }

  function initListing(root) {
    if (root.dataset.listingReady) return;
    root.dataset.listingReady = 'true';

    const q = function (sel) { return root.querySelector(sel); };
    const form = q('[data-listing-filters]');
    const search = q('[data-filter="search"]');
    const price = q('[data-filter="price"]');
    const priceOutput = q('[data-price-output]');
    const setting = q('[data-filter="setting"]');
    const sort = q('[data-filter="sort"]');
    const grid = q('[data-listing-grid]');
    const template = q('[data-listing-template]');
    const count = q('[data-listing-count]');
    const status = q('[data-listing-status]');
    const empty = q('[data-listing-empty]');
    const errorBox = q('[data-listing-error]');
    const errorText = q('[data-listing-error-text]');
    const moreWrap = q('[data-listing-more-wrap]');
    const moreButton = q('[data-listing-more]');
    const dialog = q('[data-listing-dialog]');
    const quickButtons = root.querySelectorAll('[data-quick-filter]');
    if (!grid || !template) return;

    const type = root.dataset.listingType;
    const noun = root.dataset.listingNoun || 'result';
    const plural = function (n) { return n + ' ' + noun + (n === 1 ? '' : 's'); };

    let page = 0; // The last page shown.
    let limit = 0; // Cards per page: 9 on wide screens, 6 on small ones, fixed for one search.
    let total = 0;
    let totalPages = 0;
    let requestNumber = 0; // Only the answer to the newest request is shown.
    let typingTimer = null;
    let announceTimer = null;

    // The address of one page of results, for example
    // /api/stays?type=chalet&q=Lebanon&setting=mountain&maxPrice=300&sort=price-asc&page=1&limit=9
    function apiAddress(pageNumber) {
      const params = new URLSearchParams();
      params.set('type', type);
      if (search && search.value.trim()) params.set('q', search.value.trim());
      if (setting && setting.value) params.set('setting', setting.value);
      // The slider at its highest value means "any price", so stays added later at a higher price
      // still appear.
      if (price && price.value !== price.max) params.set('maxPrice', price.value);
      if (sort) params.set('sort', sort.value);
      params.set('page', pageNumber);
      params.set('limit', limit);
      return '/api/stays?' + params.toString();
    }

    // One card from the template. Every value is set with textContent or a property, so a name
    // that contains HTML is shown as text and never runs.
    function buildCard(stay) {
      const card = template.content.firstElementChild.cloneNode(true);
      const nameId = type + '-' + stay.id + '-name';
      card.setAttribute('aria-labelledby', nameId);

      const img = card.querySelector('[data-card-img]');
      img.src = stay.image;
      img.alt = stay.imageAlt;

      const name = card.querySelector('[data-card-name]');
      name.id = nameId;
      name.textContent = stay.name;

      card.querySelector('[data-card-location]').textContent = stay.location;
      card.querySelector('[data-card-text]').textContent = stay.description;
      card.querySelector('[data-card-price]').prepend('$' + stay.price + ' ');
      card.querySelector('[data-card-details-name]').textContent = ': ' + stay.name;

      const meta = card.querySelector('[data-listing-meta]');
      if (meta) fillMeta(meta, stay);

      card.querySelector('[data-listing-details]').addEventListener('click', function (event) {
        openDetails(stay, event.currentTarget);
      });
      return card;
    }

    // "Cabin · Mountain" for chalets. Screen readers hear "Cabin, Mountain".
    function fillMeta(element, stay) {
      element.textContent = '';
      if (!stay.category && !stay.setting) {
        element.hidden = true;
        return;
      }
      element.hidden = false;
      element.append(stay.category || '');
      if (stay.category && stay.setting) {
        const dot = document.createElement('span');
        dot.setAttribute('aria-hidden', 'true');
        dot.textContent = ' · ';
        const comma = document.createElement('span');
        comma.className = 'et-visually-hidden';
        comma.textContent = ', ';
        element.append(dot, comma);
      }
      element.append(capitalise(stay.setting));
    }

    function showCount() {
      const shown = grid.children.length;
      if (count) {
        count.textContent = total === 0 ? 'No ' + noun + 's found'
          : shown < total ? 'Showing ' + shown + ' of ' + plural(total)
          : plural(total);
      }
      if (empty) empty.hidden = total !== 0;
      grid.hidden = total === 0;
      if (moreWrap) moreWrap.hidden = page >= totalPages;
      if (moreButton) {
        moreButton.textContent = 'Show more ' + noun + 's';
        moreButton.setAttribute('aria-label', 'Show more ' + noun + 's, ' + (total - shown) + ' more');
      }
    }

    function announce(text) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(function () {
        if (status) status.textContent = text;
      }, ANNOUNCE_DELAY);
    }

    function showLoadError() {
      grid.hidden = true;
      if (empty) empty.hidden = true;
      if (moreWrap) moreWrap.hidden = true;
      if (count) count.textContent = '';
      if (errorText) {
        errorText.textContent = window.location.protocol === 'file:'
          ? 'The ' + noun + 's are saved in the database. Start the server (npm start) and open http://localhost:3000.'
          : 'Please check your connection and try again.';
      }
      if (errorBox) errorBox.hidden = false;
    }

    // Asks the server for a page of stays.
    // more = false: a new search (new filters), so the list starts again at page 1.
    // more = true: "Show more", so the next page is added under the cards already shown.
    async function load(more, options) {
      const thisRequest = ++requestNumber;
      if (!more) limit = window.matchMedia(WIDE_QUERY).matches ? 9 : 6;
      const pageToLoad = more ? page + 1 : 1;

      grid.setAttribute('aria-busy', 'true');
      if (moreButton) moreButton.disabled = true;

      let result;
      try {
        const response = await fetch(apiAddress(pageToLoad));
        if (!response.ok) throw new Error('The server answered ' + response.status);
        result = await response.json();
      } catch (err) {
        if (thisRequest === requestNumber) {
          grid.setAttribute('aria-busy', 'false');
          showLoadError();
        }
        return null;
      }

      // An older request can answer after a newer one. Its cards would be out of date.
      if (thisRequest !== requestNumber) return null;

      if (errorBox) errorBox.hidden = true;
      if (!more) grid.textContent = '';

      page = result.pagination.page;
      total = result.pagination.total;
      totalPages = result.pagination.totalPages;

      const newCards = result.stays.map(buildCard);
      grid.append(...newCards);
      grid.setAttribute('aria-busy', 'false');
      if (moreButton) moreButton.disabled = false;
      showCount();

      if (!options || options.announce !== false) {
        announce(total === 0
          ? 'No ' + noun + 's match those filters.'
          : plural(total) + ' match. Showing ' + grid.children.length + '.');
      }
      return newCards;
    }

    function syncQuickButtons() {
      quickButtons.forEach(function (button) {
        const field = q('[data-filter="' + button.dataset.quickFilter + '"]');
        const on = !!field && field.value.trim().toLowerCase() === button.dataset.quickValue.toLowerCase();
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function showPrice() {
      if (priceOutput && price) priceOutput.textContent = '$' + price.value;
    }

    // Typing and sliding wait a little; the other fields search at once.
    function filtersChanged(waitForTyping) {
      clearTimeout(typingTimer);
      showPrice();
      syncQuickButtons();
      if (waitForTyping) {
        typingTimer = setTimeout(function () { load(false); }, TYPING_DELAY);
      } else {
        load(false);
      }
    }

    root.querySelectorAll('[data-listing-enhance]').forEach(function (el) { el.hidden = false; });

    if (form) {
      form.hidden = false;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        filtersChanged(false);
      });
      form.addEventListener('input', function (e) {
        if (e.target.tagName !== 'SELECT') filtersChanged(true);
      });
      form.addEventListener('change', function (e) {
        if (e.target.tagName === 'SELECT') filtersChanged(false);
      });
    }

    quickButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        const field = q('[data-filter="' + button.dataset.quickFilter + '"]');
        if (!field) return;
        field.value = button.getAttribute('aria-pressed') === 'true' ? '' : button.dataset.quickValue;
        filtersChanged(false);
      });
    });

    root.querySelectorAll('[data-clear-filters]').forEach(function (button) {
      button.addEventListener('click', function () {
        const fromEmptyState = empty && empty.contains(button);
        if (form) form.reset();
        filtersChanged(false);
        if (fromEmptyState && search) search.focus();
      });
    });

    root.querySelectorAll('[data-listing-retry]').forEach(function (button) {
      button.addEventListener('click', function () { load(false); });
    });

    if (moreButton) {
      moreButton.addEventListener('click', async function () {
        const newCards = await load(true);
        // Move the focus to the first new card, so keyboard users continue from there.
        if (newCards && newCards.length > 0) {
          newCards[0].querySelector('[data-listing-details]').focus();
        }
      });
    }

    // The details dialog is filled from the stay that the list already received.
    let opener = null;
    function openDetails(stay, button) {
      if (!dialog || typeof dialog.showModal !== 'function') return;
      const d = function (sel) { return dialog.querySelector(sel); };
      const dialogImg = d('[data-dialog-img]');
      if (dialogImg) {
        dialogImg.src = stay.image;
        dialogImg.alt = stay.imageAlt;
      }
      d('[data-dialog-name]').textContent = stay.name;
      const metaEl = d('[data-dialog-meta]');
      if (metaEl) fillMeta(metaEl, stay);
      d('[data-dialog-location]').textContent = stay.location;
      d('[data-dialog-text]').textContent = stay.description;
      const priceEl = d('[data-dialog-price]');
      if (priceEl) priceEl.textContent = '$' + stay.price + ' / night';
      opener = button;
      dialog.showModal();
    }

    if (dialog && typeof dialog.showModal === 'function') {
      dialog.querySelectorAll('[data-dialog-close]').forEach(function (b) {
        b.addEventListener('click', function () { dialog.close(); });
      });
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', function () {
        if (opener) opener.focus();
        opener = null;
      });
    }

    // Links from other pages can fill the search box, e.g. chalets.html?q=Lebanon
    const linkedSearch = new URLSearchParams(window.location.search).get('q');
    if (search && linkedSearch) search.value = linkedSearch;

    showPrice();
    syncQuickButtons();
    load(false, { announce: false });
  }

  function init() {
    document.querySelectorAll('[data-listing]').forEach(initListing);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
