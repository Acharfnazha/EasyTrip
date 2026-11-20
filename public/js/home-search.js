// Home page: the search card. Its three tabs (Stays, Flights, Bus & train) each show one form;
// a form opens its page with the search filled in (stays.html, flight.html or bus-train.html).
// The forms work without this script too: it only switches the tabs and checks the dates.
(function () {
  'use strict';

  const tabs = Array.prototype.slice.call(document.querySelectorAll('[data-search-tabs] [data-tab]'));
  const forms = document.querySelectorAll('[data-search-form]');
  if (tabs.length === 0) return;

  function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ---------- The tabs (the usual keyboard: arrows move between them) ----------

  function select(tab, focus) {
    tabs.forEach(function (other) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on));
      other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { select(tab, false); });
    tab.addEventListener('keydown', function (event) {
      let next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        event.preventDefault();
        select(next, true);
      }
    });
  });

  // ---------- The dates ----------

  forms.forEach(function (form) {
    const first = form.querySelector('[data-date="start"]');
    const second = form.querySelector('[data-date="end"]');
    const error = form.querySelector('[data-search-error]');
    const optional = second && second.hasAttribute('data-date-optional');

    first.min = todayIso();
    second.min = todayIso();
    first.addEventListener('change', function () {
      second.min = first.value || todayIso();
      if (second.value && first.value && second.value < first.value) second.value = '';
    });

    form.addEventListener('submit', function (event) {
      let problem = '';
      if (first.value && first.value < todayIso()) problem = 'The first date can\'t be in the past.';
      else if (first.value && second.value && second.value < first.value) problem = 'The second date must be after the first one.';
      else if (!optional && (first.value || second.value) && !(first.value && second.value)) {
        problem = 'Choose both dates, or leave both empty to see every stay.';
      } else if (!optional && first.value === second.value && first.value) {
        problem = 'The check-out date must be after the check-in date.';
      }
      error.textContent = problem;
      error.hidden = !problem;
      if (problem) {
        event.preventDefault();
        return;
      }
      // Empty fields are not sent, so the address stays short and the page uses its defaults.
      form.querySelectorAll('input, select').forEach(function (field) {
        field.disabled = field.value === '';
      });
      // Re-enabled after the form is sent, so Back shows the same fields.
      setTimeout(function () {
        form.querySelectorAll('input, select').forEach(function (field) { field.disabled = false; });
      }, 0);
    });
  });
})();
