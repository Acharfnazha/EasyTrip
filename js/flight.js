// Flight planner: validation and a summary of the search (there is no real flight data).
(function () {
  'use strict';

  var CABINS = { economy: 'Economy', premium: 'Premium Economy', business: 'Business', first: 'First' };
  var MAX_TRAVELERS = 9;

  // Today's date in the visitor's own time zone, as YYYY-MM-DD (the date input format).
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDate(iso) {
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function samePlace(a, b) {
    var n = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    return n(a) === n(b);
  }

  function initPlanner(form) {
    if (form.dataset.ready) return;
    form.dataset.ready = 'true';
    form.noValidate = true;

    var q = function (sel) { return form.querySelector(sel); };
    var fields = {
      from: q('[data-field="from"]'),
      to: q('[data-field="to"]'),
      depart: q('[data-field="depart"]'),
      return: q('[data-field="return"]'),
      travelers: q('[data-field="travelers"]'),
      cabin: q('[data-field="cabin"]')
    };
    var order = ['from', 'to', 'depart', 'return', 'travelers', 'cabin'];
    if (order.some(function (k) { return !fields[k]; })) return;

    var tripInputs = form.querySelectorAll('[data-trip]');
    var returnField = q('[data-return-field]');
    var swap = q('[data-swap]');
    var summary = document.querySelector('[data-flight-summary]');
    var lastSummary = null;

    var isRoundTrip = function () {
      var checked = form.querySelector('[data-trip]:checked');
      return !checked || checked.value === 'round';
    };

    var rules = {
      from: function () {
        return fields.from.value.trim() ? '' : 'Enter the city or airport you are flying from.';
      },
      to: function () {
        var to = fields.to.value.trim();
        if (!to) return 'Enter the city or airport you are flying to.';
        if (fields.from.value.trim() && samePlace(to, fields.from.value)) return 'Choose a destination that is different from where you are flying from.';
        return '';
      },
      depart: function () {
        var v = fields.depart.value;
        if (!v) return fields.depart.validity.badInput ? 'Enter a complete departure date.' : 'Choose a departure date.';
        if (v < todayISO()) return 'The departure date cannot be in the past. Choose today or a later date.';
        return '';
      },
      return: function () {
        if (!isRoundTrip()) return '';
        var v = fields.return.value;
        if (!v) return fields.return.validity.badInput ? 'Enter a complete return date.' : 'Choose a return date, or switch to a one-way trip.';
        if (fields.depart.value && v < fields.depart.value) return 'The return date must be on or after the departure date.';
        if (v < todayISO()) return 'The return date cannot be in the past.';
        return '';
      },
      travelers: function () {
        var n = Number(fields.travelers.value);
        return Number.isInteger(n) && n >= 1 && n <= MAX_TRAVELERS ? '' : 'Choose between 1 and ' + MAX_TRAVELERS + ' travelers.';
      },
      cabin: function () {
        return CABINS[fields.cabin.value] ? '' : 'Choose a cabin preference.';
      }
    };

    function setError(name, message) {
      var input = fields[name];
      var error = document.getElementById(input.id + '-error');
      if (!error) return;
      error.textContent = message;
      error.hidden = !message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function validate(name) {
      var message = rules[name]();
      setError(name, message);
      return !message;
    }

    var isInvalid = function (name) { return fields[name].getAttribute('aria-invalid') === 'true'; };

    function applyTripType() {
      var round = isRoundTrip();
      if (returnField) returnField.hidden = !round;
      fields.return.disabled = !round;
      if (!round) setError('return', '');
    }

    function updateDateLimits() {
      var today = todayISO();
      fields.depart.min = today;
      fields.return.min = fields.depart.value && fields.depart.value >= today ? fields.depart.value : today;
    }

    // While a button is being pressed, skip blur validation: a new error message would
    // shift the layout and the click could miss the button.
    var pressingButton = false;
    form.addEventListener('pointerdown', function (event) {
      if (event.target.closest('button')) pressingButton = true;
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      document.addEventListener(type, function () {
        setTimeout(function () { pressingButton = false; }, 0);
      });
    });

    order.forEach(function (name) {
      var input = fields[name];
      input.addEventListener('input', function () { input.dataset.edited = 'true'; });
      input.addEventListener('blur', function () {
        if (pressingButton) return;
        if (input.dataset.edited || isInvalid(name)) validate(name);
      });
      ['input', 'change'].forEach(function (type) {
        input.addEventListener(type, function () {
          if (isInvalid(name)) validate(name);
        });
      });
    });

    fields.from.addEventListener('input', function () {
      if (isInvalid('to')) validate('to');
    });

    fields.depart.addEventListener('change', function () {
      updateDateLimits();
      if (isRoundTrip() && fields.return.value && (isInvalid('return') || fields.return.value < fields.depart.value)) {
        validate('return');
      }
    });

    tripInputs.forEach(function (radio) {
      radio.addEventListener('change', applyTripType);
    });

    if (swap) {
      swap.hidden = false;
      swap.addEventListener('click', function () {
        var from = fields.from.value;
        fields.from.value = fields.to.value;
        fields.to.value = from;
        ['from', 'to'].forEach(function (name) {
          if (isInvalid(name) || fields[name].dataset.edited) validate(name);
        });
        markStale();
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      updateDateLimits();
      var firstInvalid = null;
      order.forEach(function (name) {
        if (!validate(name) && !firstInvalid) firstInvalid = fields[name];
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      showSummary(readSearch());
    });

    function readSearch() {
      var prefs = Array.prototype.filter.call(form.querySelectorAll('[data-pref]'), function (box) { return box.checked; })
        .map(function (box) { return box.dataset.pref; });
      var travelers = Number(fields.travelers.value);
      return {
        round: isRoundTrip(),
        from: fields.from.value.trim().replace(/\s+/g, ' '),
        to: fields.to.value.trim().replace(/\s+/g, ' '),
        depart: fields.depart.value,
        ret: isRoundTrip() ? fields.return.value : '',
        travelers: travelers + ' traveler' + (travelers === 1 ? '' : 's'),
        cabin: CABINS[fields.cabin.value],
        prefs: prefs.length ? prefs.join(', ') : 'None selected'
      };
    }

    function showSummary(search) {
      if (!summary) return;
      var s = function (sel) { return summary.querySelector(sel); };
      var put = function (key, text) { var el = s('[data-summary="' + key + '"]'); if (el) el.textContent = text; };

      put('trip', search.round ? 'Round trip' : 'One way');
      put('from', search.from);
      put('to', search.to);
      put('depart', formatDate(search.depart));
      put('return', search.ret ? formatDate(search.ret) : '');
      put('travelers', search.travelers);
      put('cabin', search.cabin);
      put('prefs', search.prefs);
      var returnRow = s('[data-summary-return-row]');
      if (returnRow) returnRow.hidden = !search.round;

      // Text nodes, not innerHTML: this is the visitor's own input.
      var route = s('[data-summary-route]');
      if (route) {
        route.textContent = '';
        var arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = search.round ? ' ⇄ ' : ' → ';
        var spoken = document.createElement('span');
        spoken.className = 'et-visually-hidden';
        spoken.textContent = ' to ';
        route.append(search.from, arrow, spoken, search.to);
      }

      lastSummary = JSON.stringify(search);
      var stale = s('[data-summary-stale]');
      if (stale) stale.hidden = true;

      summary.hidden = false;
      var title = s('#flight-summary-title');
      var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      summary.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      if (title) title.focus({ preventScroll: true });
    }

    function markStale() {
      if (!summary || summary.hidden || !lastSummary) return;
      var stale = summary.querySelector('[data-summary-stale]');
      if (stale) stale.hidden = JSON.stringify(readSearch()) === lastSummary;
    }
    form.addEventListener('input', markStale);
    form.addEventListener('change', markStale);

    var edit = summary && summary.querySelector('[data-edit-search]');
    if (edit) {
      edit.addEventListener('click', function () {
        fields.from.focus();
      });
    }

    applyTripType();
    updateDateLimits();
  }

  function init() {
    document.querySelectorAll('[data-flight-planner]').forEach(initPlanner);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
