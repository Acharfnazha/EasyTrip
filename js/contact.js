// Contact form: checks each field, then shows a confirmation. Nothing is sent (there is no server).
(function () {
  'use strict';

  // Keep these in step with the maxlength attributes in contact.html.
  var LIMITS = { name: 120, email: 190, phone: 40, message: 2000 };
  var ORDER = ['name', 'email', 'phone', 'topic', 'message'];
  var COUNT_WARNING = 200;

  var formatNumber = function (n) { return n.toLocaleString('en-GB'); };

  var rules = {
    name: function (v) {
      if (!v) return 'Enter your full name.';
      if (v.length > LIMITS.name) return 'Your name must be ' + LIMITS.name + ' characters or fewer.';
      return '';
    },
    email: function (v, input) {
      if (!v) return 'Enter your email address.';
      if (v.length > LIMITS.email || input.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return 'Enter an email address in the format name@example.com.';
      }
      return '';
    },
    phone: function (v) {
      if (!v) return '';
      var digits = v.replace(/\D/g, '').length;
      if (v.length > LIMITS.phone || !/^[0-9+().\-\s]+$/.test(v) || digits < 6 || digits > 17) {
        return 'Enter a phone number using digits, spaces and + ( ) - only, or leave it blank.';
      }
      return '';
    },
    topic: function (v) {
      return v ? '' : 'Choose a topic.';
    },
    message: function (v) {
      if (!v) return 'Enter your message.';
      if (v.length > LIMITS.message) return 'Your message must be ' + formatNumber(LIMITS.message) + ' characters or fewer.';
      return '';
    }
  };

  function initForm(form) {
    if (form.dataset.ready) return;
    form.dataset.ready = 'true';
    form.noValidate = true;

    var fields = {};
    ORDER.forEach(function (name) { fields[name] = form.querySelector('[data-field="' + name + '"]'); });
    if (ORDER.some(function (name) { return !fields[name]; })) return;

    var card = form.closest('.contact-form-card') || document;
    var summary = card.querySelector('[data-error-summary]');
    var summaryList = summary && summary.querySelector('[data-error-list]');
    var success = card.querySelector('[data-form-success]');

    // Links from other pages can choose a topic, e.g. contact.html?topic=stays
    var topic = new URLSearchParams(window.location.search).get('topic');
    if (topic && fields.topic.querySelector('option[value="' + CSS.escape(topic) + '"]:not([disabled])')) {
      fields.topic.value = topic;
    }

    var valueOf = function (name) { return fields[name].value.trim(); };
    var isInvalid = function (name) { return fields[name].getAttribute('aria-invalid') === 'true'; };

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
      var message = rules[name](valueOf(name), fields[name]);
      setError(name, message);
      return message;
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

    ORDER.forEach(function (name) {
      var input = fields[name];
      input.addEventListener('input', function () { input.dataset.edited = 'true'; });
      input.addEventListener('change', function () { input.dataset.edited = 'true'; });
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

    function showSummary(problems) {
      if (!summary || !summaryList) return;
      summaryList.textContent = '';
      problems.forEach(function (problem) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.href = '#' + fields[problem.name].id;
        link.textContent = problem.message;
        item.appendChild(link);
        summaryList.appendChild(item);
      });
      summary.hidden = false;
      summary.focus();
    }

    if (summary) {
      summary.addEventListener('click', function (event) {
        var link = event.target.closest('a[href^="#"]');
        if (!link) return;
        var input = document.getElementById(link.getAttribute('href').slice(1));
        if (!input) return;
        event.preventDefault();
        var label = form.querySelector('label[for="' + input.id + '"]');
        (label || input).scrollIntoView({ block: 'start' });
        input.focus({ preventScroll: true });
      });
    }

    var updateCount = initCounter(fields.message);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (success) success.hidden = true;

      var problems = [];
      ORDER.forEach(function (name) {
        var message = validate(name);
        if (message) problems.push({ name: name, message: message });
      });

      if (problems.length) {
        showSummary(problems);
        return;
      }

      if (summary) summary.hidden = true;
      form.reset();
      ORDER.forEach(function (name) { delete fields[name].dataset.edited; });
      if (updateCount) updateCount(false);
      if (success) {
        success.hidden = false;
        success.focus();
      }
    });
  }

  // Screen readers hear the character count only near the limit, not on every key press.
  function initCounter(textarea) {
    var count = document.querySelector('[data-message-count]');
    var announcer = document.querySelector('[data-count-announcer]');
    if (!count) return;
    var max = Number(textarea.getAttribute('maxlength')) || LIMITS.message;
    var announceTimer;

    var bandFor = function (left) {
      if (left === 0) return 0;
      if (left <= 50) return 50;
      if (left <= 100) return 100;
      return left <= COUNT_WARNING ? COUNT_WARNING : null;
    };

    function update(announce) {
      var left = Math.max(0, max - textarea.value.length);
      var text = formatNumber(left) + (left === 1 ? ' character' : ' characters') + ' left';
      count.textContent = text;
      count.classList.toggle('is-near-limit', left <= COUNT_WARNING);

      var band = bandFor(left);
      if (band === lastBand) return;
      lastBand = band;
      clearTimeout(announceTimer);
      if (announce && announcer && band !== null) {
        announceTimer = setTimeout(function () { announcer.textContent = text; }, 600);
      }
    }

    var lastBand = null;
    update(false);
    textarea.addEventListener('input', function () { update(true); });
    return update;
  }

  function init() {
    document.querySelectorAll('[data-contact-form]').forEach(initForm);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
