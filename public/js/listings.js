// Hotels and chalets listings. The stays come from the server: GET /api/stays does the search,
// the filters, the sorting and the pages (server/controllers/stays.js). This script only sends
// the form values, shows the cards it gets back, adds the next page for "Show more", and opens
// the details dialog. The booking form inside the dialog is js/booking.js.
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
    // The Stays page's search card also has a type, a season, dates and guests.
    const typeField = q('[data-filter="type"]');
    const season = q('[data-filter="season"]');
    const start = q('[data-filter="start"]');
    const end = q('[data-filter="end"]');
    const guests = q('[data-filter="guests"]');
    const datesError = q('[data-dates-error]');
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

    // A page for one type (data-listing-type), or the type chosen in the search card.
    const fixedType = root.dataset.listingType || '';
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
      const type = typeField ? typeField.value : fixedType;
      if (type) params.set('type', type);
      if (search && search.value.trim()) params.set('q', search.value.trim());
      if (season && season.value) params.set('season', season.value);
      const dates = chosenDates();
      if (dates) {
        params.set('start', dates.start);
        params.set('end', dates.end);
      }
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
    // ---------- Dates ----------

    function todayIso() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // The dates to search with, or null when there are none (or they are wrong: the message
    // under the search card says why).
    function chosenDates() {
      if (!start || !end) return null;
      let problem = '';
      if (start.value && end.value) {
        if (start.value < todayIso()) problem = 'The check-in date can\'t be in the past.';
        else if (end.value <= start.value) problem = 'The check-out date must be after the check-in date.';
      } else if (start.value || end.value) {
        problem = start.value ? 'Choose your check-out date too.' : 'Choose your check-in date too.';
      }
      if (datesError) {
        datesError.textContent = problem;
        datesError.hidden = !problem;
      }
      return start.value && end.value && !problem ? { start: start.value, end: end.value } : null;
    }

    // The search in the page's address (chalets.html?q=Lebanon&start=...), so it can be shared,
    // and the Back button comes back to the same results. Only on the pages with dates.
    function saveSearch() {
      if (!start) return;
      const params = new URLSearchParams();
      [['q', search], ['type', typeField], ['season', season], ['start', start], ['end', end], ['setting', setting]].forEach(function (pair) {
        if (pair[1] && pair[1].value.trim()) params.set(pair[0], pair[1].value.trim());
      });
      if (guests && guests.value !== '2') params.set('guests', guests.value);
      const query = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    }

    function buildCard(stay) {
      const card = template.content.firstElementChild.cloneNode(true);
      const nameId = 'stay-' + stay.id + '-name';
      card.setAttribute('aria-labelledby', nameId);

      const img = card.querySelector('[data-card-img]');
      img.src = stay.image;
      img.alt = stay.imageAlt;

      const name = card.querySelector('[data-card-name]');
      name.id = nameId;
      name.textContent = stay.name;

      card.querySelector('[data-card-location]').textContent = stay.location;
      card.querySelector('[data-card-text]').textContent = stay.description;
      writePrice(card.querySelector('[data-card-price]'), stay);
      if (stay.discount) {
        // "20% off · Winter sale" above the name.
        const deal = document.createElement('p');
        deal.className = 'lst-card__deal';
        deal.textContent = stay.discount.percent + '% off · ' + stay.discount.name;
        name.before(deal);
      }
      card.querySelector('[data-card-details-name]').textContent = ': ' + stay.name;

      const meta = card.querySelector('[data-listing-meta]');
      if (meta) fillMeta(meta, stay);

      card.querySelector('[data-listing-details]').addEventListener('click', function (event) {
        openDetails(stay, event.currentTarget);
      });
      return card;
    }

    // The price per night, put before "/ night". With a discount: the old price crossed out,
    // then the new one ("Was $280, now $224" for screen readers).
    function writePrice(target, stay) {
      if (!stay.discount) {
        target.prepend('$' + stay.price + ' ');
        return;
      }
      const old = document.createElement('s');
      old.className = 'lst-card__old-price';
      old.textContent = '$' + stay.price;
      const was = document.createElement('span');
      was.className = 'et-visually-hidden';
      was.textContent = 'Was ';
      const now = document.createElement('span');
      now.className = 'et-visually-hidden';
      now.textContent = ', now ';
      target.prepend(was, old, now, ' $' + stay.discount.price + ' ');
    }

    // "Cabin · Mountain" for chalets. Screen readers hear "Cabin, Mountain".
    function fillMeta(element, stay) {
      element.textContent = '';
      if (stay.type === 'hotel' && typeField) {
        element.hidden = false;
        element.append('Hotel');
        return;
      }
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
      if (start && end) end.min = start.value || todayIso();
      saveSearch();
      if (waitForTyping) {
        typingTimer = setTimeout(function () { load(false); }, TYPING_DELAY);
      } else {
        load(false);
      }
    }

    root.querySelectorAll('[data-listing-enhance]').forEach(function (el) { el.hidden = false; });

    // The Stays page's finer filters: open on a computer, folded behind "Filters" on a phone.
    const moreFilters = q('[data-more-filters]');
    if (moreFilters && window.matchMedia(WIDE_QUERY).matches) moreFilters.open = true;

    if (form) {
      form.hidden = false;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        filtersChanged(false);
      });
      form.addEventListener('input', function (e) {
        // The guests don't change the results (they go to the booking form), so only the address is updated.
        if (e.target === guests) { saveSearch(); return; }
        if (e.target.tagName !== 'SELECT' && e.target.type !== 'date') filtersChanged(true);
      });
      form.addEventListener('change', function (e) {
        if (e.target.type === 'date') filtersChanged(false);
        if (e.target === guests) saveSearch(); // after a typed number was kept between 1 and 9
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
      if (priceEl) {
        priceEl.replaceChildren(' / night');
        writePrice(priceEl, stay);
      }
      opener = button;
      dialog.showModal();
      // js/booking.js listens for this, and prepares the booking form for this stay.
      dialog.dispatchEvent(new CustomEvent('easytrip:stay-opened', { detail: stay }));
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

    // Links from other pages, and the home page's search, fill the search card, for example
    // stays.html?q=Lebanon&start=2027-01-18&end=2027-01-20&guests=2 or stays.html?season=summer
    const linked = new URLSearchParams(window.location.search);
    [['q', search], ['type', typeField], ['season', season], ['start', start], ['end', end], ['guests', guests], ['setting', setting]].forEach(function (pair) {
      const value = linked.get(pair[0]);
      if (!pair[1] || value === null) return;
      if (pair[1].tagName === 'SELECT' && !Array.prototype.some.call(pair[1].options, function (o) { return o.value === value; })) return;
      if (pair[1] === guests && !/^[1-9]$/.test(value)) return;
      pair[1].value = value;
    });
    if (start && end) {
      start.min = todayIso();
      end.min = start.value || todayIso();
    }

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
