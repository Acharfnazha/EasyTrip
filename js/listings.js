// Hotels and chalets listings: search, filters, sorting, "Show more" and the details dialog.
// Each card is read from its data-* attributes (data-name, data-location, data-price, data-order).
(function () {
  'use strict';

  var ANNOUNCE_DELAY = 400;
  var WIDE_QUERY = '(min-width: 64em)';

  function normalise(value) {
    return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function initListing(root) {
    if (root.dataset.listingReady) return;
    root.dataset.listingReady = 'true';

    var q = function (sel) { return root.querySelector(sel); };
    var form = q('[data-listing-filters]');
    var search = q('[data-filter="search"]');
    var price = q('[data-filter="price"]');
    var priceOutput = q('[data-price-output]');
    var sort = q('[data-filter="sort"]');
    var grid = q('[data-listing-grid]');
    var count = q('[data-listing-count]');
    var status = q('[data-listing-status]');
    var empty = q('[data-listing-empty]');
    var moreWrap = q('[data-listing-more-wrap]');
    var moreButton = q('[data-listing-more]');
    var dialog = q('[data-listing-dialog]');
    if (!grid) return;

    var BUILT_IN = ['search', 'price', 'sort'];
    var attrFilters = Array.prototype.filter.call(root.querySelectorAll('[data-filter]'), function (field) {
      return BUILT_IN.indexOf(field.dataset.filter) === -1;
    });
    var quickButtons = root.querySelectorAll('[data-quick-filter]');

    var noun = root.dataset.listingNoun || 'result';
    var plural = function (n) { return n + ' ' + noun + (n === 1 ? '' : 's'); };

    var items = Array.prototype.map.call(grid.querySelectorAll('[data-listing-item]'), function (el, i) {
      var p = parseFloat(el.dataset.price);
      return {
        el: el,
        name: el.dataset.name || '',
        haystack: normalise((el.dataset.name || '') + ' ' + (el.dataset.location || '')),
        price: isFinite(p) ? p : null,
        order: parseInt(el.dataset.order, 10) || i + 1
      };
    });
    var total = items.length;
    var pageSize = function () { return window.matchMedia(WIDE_QUERY).matches ? 9 : 6; };
    var visibleLimit = pageSize();
    var announceTimer = null;

    var sorters = {
      'recommended': function (a, b) { return a.order - b.order; },
      'price-asc': function (a, b) { return byPrice(a, b, 1); },
      'price-desc': function (a, b) { return byPrice(a, b, -1); },
      'name-asc': function (a, b) { return a.name.localeCompare(b.name) || a.order - b.order; }
    };
    function byPrice(a, b, dir) {
      if (a.price === null || b.price === null) return (a.price === null) - (b.price === null);
      return (a.price - b.price) * dir || a.order - b.order;
    }

    function matches(item, term, maxPrice, attrs) {
      if (term && item.haystack.indexOf(term) === -1) return false;
      if (maxPrice !== null && item.price !== null && item.price > maxPrice) return false;
      for (var i = 0; i < attrs.length; i++) {
        if (normalise(item.el.getAttribute('data-' + attrs[i].name)) !== attrs[i].value) return false;
      }
      return true;
    }

    function syncQuickButtons() {
      quickButtons.forEach(function (button) {
        var field = q('[data-filter="' + button.dataset.quickFilter + '"]');
        var on = !!field && normalise(field.value) === normalise(button.dataset.quickValue);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function update(options) {
      var term = search ? normalise(search.value) : '';
      var maxPrice = price ? parseFloat(price.value) : null;
      var sorter = sorters[sort && sort.value] || sorters.recommended;
      var attrs = attrFilters
        .map(function (field) { return { name: field.dataset.filter, value: normalise(field.value) }; })
        .filter(function (a) { return a.value !== ''; });

      if (priceOutput && price) priceOutput.textContent = '$' + price.value;
      syncQuickButtons();

      var matched = items.filter(function (item) { return matches(item, term, maxPrice, attrs); }).sort(sorter);
      var matchedSet = new Set(matched);

      // Re-order the DOM so visual order, reading order and tab order all agree.
      var fragment = document.createDocumentFragment();
      matched.concat(items.filter(function (item) { return !matchedSet.has(item); }))
        .forEach(function (item) { fragment.appendChild(item.el); });
      grid.appendChild(fragment);

      items.forEach(function (item) { item.el.hidden = true; });
      matched.slice(0, visibleLimit).forEach(function (item) { item.el.hidden = false; });

      var shown = Math.min(visibleLimit, matched.length);
      var remaining = matched.length - shown;

      if (count) {
        count.textContent = matched.length === 0 ? 'No ' + noun + 's found'
          : shown < matched.length ? 'Showing ' + shown + ' of ' + plural(matched.length)
          : matched.length === total ? plural(total)
          : plural(matched.length) + ' of ' + total;
      }
      if (empty) empty.hidden = matched.length !== 0;
      grid.hidden = matched.length === 0;
      if (moreWrap) moreWrap.hidden = remaining <= 0;
      if (moreButton) {
        moreButton.textContent = 'Show more ' + noun + 's';
        moreButton.setAttribute('aria-label', 'Show more ' + noun + 's, ' + remaining + ' more');
      }

      if (options && options.announce === false) return;
      clearTimeout(announceTimer);
      announceTimer = setTimeout(function () {
        if (!status) return;
        status.textContent = matched.length === 0
          ? 'No ' + noun + 's match those filters.'
          : plural(matched.length) + ' match. Showing ' + shown + '.';
      }, ANNOUNCE_DELAY);
    }

    function resetLimit() { visibleLimit = pageSize(); }

    function clearFilters() {
      if (form) form.reset();
      resetLimit();
      update();
    }

    root.querySelectorAll('[data-listing-enhance]').forEach(function (el) { el.hidden = false; });

    if (form) {
      form.hidden = false;
      form.addEventListener('submit', function (e) { e.preventDefault(); });
      form.addEventListener('input', function () { resetLimit(); update(); });
      form.addEventListener('change', function (e) {
        if (e.target.tagName === 'SELECT') { resetLimit(); update(); }
      });
    }

    quickButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var field = q('[data-filter="' + button.dataset.quickFilter + '"]');
        if (!field) return;
        field.value = button.getAttribute('aria-pressed') === 'true' ? '' : button.dataset.quickValue;
        resetLimit();
        update();
      });
    });

    root.querySelectorAll('[data-clear-filters]').forEach(function (button) {
      button.addEventListener('click', function () {
        var fromEmptyState = empty && empty.contains(button);
        clearFilters();
        if (fromEmptyState && search) search.focus();
      });
    });

    if (moreButton) {
      moreButton.addEventListener('click', function () {
        var firstNew = visibleLimit;
        visibleLimit += pageSize();
        update();
        if (moreWrap && moreWrap.hidden) {
          var cards = Array.prototype.filter.call(grid.children, function (el) { return !el.hidden; });
          var target = cards[firstNew] && cards[firstNew].querySelector('a:not([hidden]), button:not([hidden])');
          if (target) target.focus();
        }
      });
    }

    if (dialog && typeof dialog.showModal === 'function') {
      var opener = null;
      var d = function (sel) { return dialog.querySelector(sel); };

      items.forEach(function (item) {
        var fallback = item.el.querySelector('[data-listing-fallback]');
        var button = item.el.querySelector('[data-listing-details]');
        if (!button) return;
        if (fallback) fallback.hidden = true;
        button.hidden = false;
        button.addEventListener('click', function () { openDetails(item, button); });
      });

      function openDetails(item, button) {
        var img = item.el.querySelector('img');
        var text = item.el.querySelector('.lst-card__text');
        var dialogImg = d('[data-dialog-img]');
        if (dialogImg && img) {
          dialogImg.src = img.currentSrc || img.src;
          dialogImg.alt = img.alt;
        }
        d('[data-dialog-name]').textContent = item.name;
        var metaEl = d('[data-dialog-meta]');
        var cardMeta = item.el.querySelector('[data-listing-meta]');
        if (metaEl) {
          metaEl.textContent = '';
          if (cardMeta) {
            Array.prototype.forEach.call(cardMeta.childNodes, function (node) {
              metaEl.appendChild(node.cloneNode(true));
            });
          }
          metaEl.hidden = !cardMeta;
        }
        d('[data-dialog-location]').textContent = item.el.dataset.location || '';
        d('[data-dialog-text]').textContent = text ? text.textContent.trim() : '';
        var priceEl = d('[data-dialog-price]');
        if (priceEl) {
          priceEl.parentElement.hidden = item.price === null;
          priceEl.textContent = item.price === null ? '' : '$' + item.price + ' / night';
        }
        opener = button;
        dialog.showModal();
      }

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

    update({ announce: false });
  }

  function init() {
    document.querySelectorAll('[data-listing]').forEach(initListing);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
