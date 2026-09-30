// Contact form (contact.php): progressive enhancements only.
//
// The form is a normal PHP POST and works without JavaScript: the browser checks
// the required fields, and includes/contact-handler.php validates everything again
// and saves the message. This script adds:
//   - the same checks as the server, shown next to each field before sending
//   - an error summary with links to the fields
//   - focus on the server's success or error message after a submission
//   - a character count for the message
//   - protection against sending the same message twice with a double click
// It never pretends a message was sent: only the server shows "Message received".
(function () {
  'use strict';

  // Keep these in step with includes/contact-handler.php.
  var LIMITS = { name: 120, email: 190, phone: 40, message: 2000 };
  var ORDER = ['name', 'email', 'phone', 'topic', 'message'];
  var COUNT_WARNING = 200;   // show and announce the count from here down

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
      if (!v) return '';   // optional
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
    if (form.dataset.ready) return;   // never bind twice
    form.dataset.ready = 'true';
    form.noValidate = true;           // our messages replace the browser's pop-ups

    var fields = {};
    ORDER.forEach(function (name) { fields[name] = form.querySelector('[data-field="' + name + '"]'); });
    if (ORDER.some(function (name) { return !fields[name]; })) return;

    var card = form.closest('.contact-form-card') || document;
    var summary = card.querySelector('[data-error-summary]');
    var summaryList = summary && summary.querySelector('[data-error-list]');
    var submitButton = form.querySelector('[data-contact-submit]');
    var submitting = false;

    var valueOf = function (name) { return fields[name].value.trim(); };
    var isInvalid = function (name) { return fields[name].getAttribute('aria-invalid') === 'true'; };

    // Show or clear the message under a field. The message is linked to its field
    // through aria-describedby in the HTML; it is empty and hidden when valid.
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

    // Validation timing -----------------------------------------------------------
    // Nothing is checked until the visitor has typed in a field and left it, or
    // presses "Send message". Once a field shows an error, it is re-checked as they fix it.
    //
    // Pressing the button also makes the current field lose focus. If that showed a
    // message, the page could shift and the press could miss the button, so leaving a
    // field that way is skipped: the button checks everything itself.
    var pressingButton = false;
    form.addEventListener('pointerdown', function (event) {
      if (event.target.closest('button')) pressingButton = true;
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      document.addEventListener(type, function () {
        setTimeout(function () { pressingButton = false; }, 0);   // after the click has run
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

    // Error summary: built with text nodes, never innerHTML ----------------------------
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

    // A summary link moves focus into its field, with the field's label in view.
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

    // Submit ------------------------------------------------------------------------
    form.addEventListener('submit', function (event) {
      if (submitting) {             // already on its way: ignore extra clicks
        event.preventDefault();
        return;
      }

      var problems = [];
      ORDER.forEach(function (name) {
        var message = validate(name);
        if (message) problems.push({ name: name, message: message });
      });

      // Messages from the previous submission no longer apply.
      card.querySelectorAll('[data-form-status]:not([data-error-summary])').forEach(function (status) {
        status.hidden = true;
      });

      if (problems.length) {
        event.preventDefault();
        showSummary(problems);
        return;
      }

      // Valid: let the browser post the form to the server as normal.
      if (summary) summary.hidden = true;
      submitting = true;
      if (submitButton) {
        submitButton.setAttribute('aria-disabled', 'true');
        submitButton.textContent = 'Sending…';
      }
    });

    // Coming back with the browser's Back button can restore this page as it was
    // left, mid-send. Make the button usable again.
    window.addEventListener('pageshow', function (event) {
      if (!event.persisted) return;
      submitting = false;
      if (submitButton) {
        submitButton.removeAttribute('aria-disabled');
        submitButton.textContent = 'Send message';
      }
    });

    initCounter(fields.message);

    // After a submission, move focus to the server's message so it is read out.
    // The form posts to contact.php#contact-form, and the browser's jump to that
    // anchor can reset focus once the page has loaded, so focus again then, unless
    // the visitor has already moved somewhere.
    var status = card.querySelector('[data-error-summary][data-form-status]:not([hidden])') ||
                 card.querySelector('[data-form-status]:not([hidden])');
    if (status) {
      status.focus();
      var refocus = function () {
        setTimeout(function () {
          var active = document.activeElement;
          if (!status.hidden && (!active || active === document.body)) status.focus();
        }, 0);
      };
      if (document.readyState === 'complete') refocus();
      else window.addEventListener('load', refocus, { once: true });
    }
  }

  // Character count ---------------------------------------------------------------------
  // The visible count is part of the field's description. Screen readers are only
  // told about it when it gets close to the limit, not on every key press.
  function initCounter(textarea) {
    var count = document.querySelector('[data-message-count]');
    var announcer = document.querySelector('[data-count-announcer]');
    if (!count) return;
    var max = Number(textarea.getAttribute('maxlength')) || LIMITS.message;
    var announceTimer;

    // Which warning band the count is in: 200, 100, 50 or 0 characters left, or none.
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

      // Announce once per band, after typing pauses.
      var band = bandFor(left);
      if (band === lastBand) return;
      lastBand = band;
      clearTimeout(announceTimer);
      if (announce && announcer && band !== null) {
        announceTimer = setTimeout(function () { announcer.textContent = text; }, 600);
      }
    }

    var lastBand = null;
    update(false);   // show the count for a preserved message without announcing it
    textarea.addEventListener('input', function () { update(true); });
  }

  function init() {
    document.querySelectorAll('[data-contact-form]').forEach(initForm);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
