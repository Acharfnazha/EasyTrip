// Bus & train route planner: validation and a summary of the route (there is no real transport data).
(function () {
  'use strict';

  var MODES = { bus: 'Bus', train: 'Train' };
  var MAX_TRAVELERS = 9;
  var CLASS_FIELDS = {
    bus: { field: 'bus-seat', label: 'Seating preference', missing: 'Choose a seating preference.',
      options: { standard: 'Standard seating', premium: 'Premium seating' } },
    train: { field: 'train-class', label: 'Class preference', missing: 'Choose a class preference.',
      options: { standard: 'Standard class', first: 'First class', sleeper: 'Sleeper' } }
  };

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
    var fields = {};
    ['from', 'to', 'depart', 'return', 'travelers', 'bus-seat', 'train-class'].forEach(function (name) {
      fields[name] = q('[data-field="' + name + '"]');
    });
    if (Object.keys(fields).some(function (k) { return !fields[k]; })) return;

    var modeInputs = form.querySelectorAll('[data-field-mode]');
    var tripInputs = form.querySelectorAll('[data-field-trip]');
    var returnField = q('[data-return-field]');
    var swap = q('[data-swap]');
    var title = document.querySelector('[data-mode-title]');
    var modeText = document.querySelector('[data-mode-text]');
    var summary = document.querySelector('[data-route-summary]');
    var lastSummary = null;

    var checkedValue = function (inputs) {
      var c = Array.prototype.find.call(inputs, function (i) { return i.checked; });
      return c ? c.value : '';
    };
    var currentMode = function () { return MODES[checkedValue(modeInputs)] ? checkedValue(modeInputs) : 'bus'; };
    var isRoundTrip = function () { return checkedValue(tripInputs) !== 'oneway'; };
    var classFieldName = function () { return CLASS_FIELDS[currentMode()].field; };

    var rules = {
      mode: function () { return MODES[checkedValue(modeInputs)] ? '' : 'Choose bus or train.'; },
      trip: function () { return ['round', 'oneway'].indexOf(checkedValue(tripInputs)) !== -1 ? '' : 'Choose round trip or one way.'; },
      from: function () {
        return fields.from.value.trim() ? '' : 'Enter the city or station you are leaving from.';
      },
      to: function () {
        var to = fields.to.value.trim();
        if (!to) return 'Enter the city or station you are going to.';
        if (fields.from.value.trim() && samePlace(to, fields.from.value)) return 'Choose a destination that is different from where you are leaving from.';
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
      'bus-seat': function () { return classRule('bus'); },
      'train-class': function () { return classRule('train'); }
    };
    function classRule(mode) {
      var cfg = CLASS_FIELDS[mode];
      if (currentMode() !== mode) return '';
      return cfg.options[fields[cfg.field].value] ? '' : cfg.missing;
    }

    function targetsFor(name) {
      if (name === 'mode') return { inputs: modeInputs, error: document.getElementById('route-mode-error') };
      if (name === 'trip') return { inputs: tripInputs, error: document.getElementById('route-trip-error') };
      return { inputs: [fields[name]], error: document.getElementById(fields[name].id + '-error') };
    }

    function setError(name, message) {
      var t = targetsFor(name);
      if (t.error) {
        t.error.textContent = message;
        t.error.hidden = !message;
      }
      Array.prototype.forEach.call(t.inputs, function (input) {
        if (message) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
    }

    function validate(name) {
      var message = rules[name]();
      setError(name, message);
      return !message;
    }

    var isInvalid = function (name) { return targetsFor(name).inputs[0].getAttribute('aria-invalid') === 'true'; };

    function applyMode() {
      var mode = currentMode();
      var radio = Array.prototype.find.call(modeInputs, function (i) { return i.value === mode; });
      form.dataset.mode = mode;
      if (radio) {
        if (title && radio.dataset.title) title.textContent = radio.dataset.title;
        if (modeText && radio.dataset.text) modeText.textContent = radio.dataset.text;
        form.querySelectorAll('[data-mode-placeholder]').forEach(function (input) {
          if (radio.dataset.place) input.placeholder = radio.dataset.place;
        });
      }
      form.querySelectorAll('[data-for-mode]').forEach(function (el) {
        var active = el.dataset.forMode === mode;
        el.hidden = !active;
        el.querySelectorAll('input, select').forEach(function (control) { control.disabled = !active; });
      });
      Object.keys(CLASS_FIELDS).forEach(function (m) {
        if (m !== mode) setError(CLASS_FIELDS[m].field, '');
      });
      if (isInvalid('mode')) validate('mode');
    }

    function applyTripType() {
      var round = isRoundTrip();
      if (returnField) returnField.hidden = !round;
      fields.return.disabled = !round;
      if (!round) setError('return', '');
      if (isInvalid('trip')) validate('trip');
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

    Object.keys(fields).forEach(function (name) {
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

    modeInputs.forEach(function (radio) { radio.addEventListener('change', applyMode); });
    tripInputs.forEach(function (radio) { radio.addEventListener('change', applyTripType); });

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
      var order = ['mode', 'trip', 'from', 'to', 'depart', 'return', 'travelers', classFieldName()];
      var firstInvalid = null;
      order.forEach(function (name) {
        if (!validate(name) && !firstInvalid) {
          var inputs = targetsFor(name).inputs;
          firstInvalid = inputs[0];
        }
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      showSummary(readPlan());
    });

    function readPlan() {
      var mode = currentMode();
      var cfg = CLASS_FIELDS[mode];
      var prefs = Array.prototype.filter.call(form.querySelectorAll('[data-pref]'), function (box) { return box.checked && !box.disabled; })
        .map(function (box) { return box.dataset.pref; });
      var travelers = Number(fields.travelers.value);
      return {
        mode: mode,
        round: isRoundTrip(),
        from: fields.from.value.trim().replace(/\s+/g, ' '),
        to: fields.to.value.trim().replace(/\s+/g, ' '),
        depart: fields.depart.value,
        ret: isRoundTrip() ? fields.return.value : '',
        travelers: travelers + ' traveler' + (travelers === 1 ? '' : 's'),
        classLabel: cfg.label,
        classValue: cfg.options[fields[cfg.field].value] || '',
        prefs: prefs.length ? prefs.join(', ') : 'None selected'
      };
    }

    function showSummary(plan) {
      if (!summary) return;
      var s = function (sel) { return summary.querySelector(sel); };
      var put = function (key, text) { var el = s('[data-summary="' + key + '"]'); if (el) el.textContent = text; };

      summary.dataset.mode = plan.mode;
      put('mode', MODES[plan.mode]);
      put('trip', plan.round ? 'Round trip' : 'One way');
      put('from', plan.from);
      put('to', plan.to);
      put('depart', formatDate(plan.depart));
      put('return', plan.ret ? formatDate(plan.ret) : '');
      put('travelers', plan.travelers);
      put('class', plan.classValue);
      put('prefs', plan.prefs);
      var classLabel = s('[data-summary-class-label]');
      if (classLabel) classLabel.textContent = plan.classLabel;
      var returnRow = s('[data-summary-return-row]');
      if (returnRow) returnRow.hidden = !plan.round;

      // Text nodes, not innerHTML: this is the visitor's own input.
      var route = s('[data-summary-route]');
      if (route) {
        route.textContent = '';
        var arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = plan.round ? ' ⇄ ' : ' → ';
        var spoken = document.createElement('span');
        spoken.className = 'et-visually-hidden';
        spoken.textContent = ' to ';
        route.append(plan.from, arrow, spoken, plan.to, ' · ' + MODES[plan.mode]);
      }

      lastSummary = JSON.stringify(plan);
      var stale = s('[data-summary-stale]');
      if (stale) stale.hidden = true;

      summary.hidden = false;
      var heading = s('#route-summary-title');
      var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      summary.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      if (heading) heading.focus({ preventScroll: true });
    }

    function markStale() {
      if (!summary || summary.hidden || !lastSummary) return;
      var stale = summary.querySelector('[data-summary-stale]');
      if (stale) stale.hidden = JSON.stringify(readPlan()) === lastSummary;
    }
    form.addEventListener('input', markStale);
    form.addEventListener('change', markStale);

    var edit = summary && summary.querySelector('[data-edit-route]');
    if (edit) {
      edit.addEventListener('click', function () {
        fields.from.focus();
      });
    }

    applyMode();
    applyTripType();
    updateDateLimits();
  }

  function init() {
    document.querySelectorAll('[data-route-planner]').forEach(initPlanner);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
