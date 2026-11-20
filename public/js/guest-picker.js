// Guests and travelers fields in the search forms: clicking the field opens a short list (1 to 5),
// and any other number up to the field's max (9) can be typed. Without this script the field is a
// plain number field, so the forms still work.
//   <input type="number" min="1" max="9" value="2" data-guest-picker="guest">
(function () {
  'use strict';

  var CHOICES = 5;
  var count = 0;

  function enhance(input) {
    var min = Number(input.min) || 1;
    var max = Number(input.max) || 9;
    var noun = input.getAttribute('data-guest-picker') || 'guest';
    var listId = (input.id || 'guests-' + (++count)) + '-list';
    var active = -1;

    var wrap = document.createElement('div');
    wrap.className = 'guest-picker';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var caret = document.createElement('span');
    caret.className = 'guest-picker__caret';
    caret.setAttribute('aria-hidden', 'true');
    wrap.appendChild(caret);

    var list = document.createElement('ul');
    list.className = 'guest-picker__list';
    list.id = listId;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Number of ' + noun + 's');
    list.hidden = true;
    var options = [];
    for (var n = min; n <= Math.min(CHOICES, max); n++) {
      var item = document.createElement('li');
      item.className = 'guest-picker__option';
      item.id = listId + '-' + n;
      item.setAttribute('role', 'option');
      item.dataset.value = String(n);
      item.textContent = n + ' ' + noun + (n === 1 ? '' : 's');
      list.appendChild(item);
      options.push(item);
    }
    var hint = document.createElement('li');
    hint.className = 'guest-picker__hint';
    hint.setAttribute('role', 'presentation');
    hint.textContent = 'More than ' + Math.min(CHOICES, max);
    list.appendChild(hint);
    wrap.appendChild(list);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-controls', listId);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'none');
    input.setAttribute('autocomplete', 'off');
    if (!input.hasAttribute('inputmode')) input.setAttribute('inputmode', 'numeric');

    function mark(index) {
      active = index;
      options.forEach(function (option, i) {
        option.classList.toggle('is-active', i === index);
        option.setAttribute('aria-selected', String(option.dataset.value === input.value));
      });
      if (index >= 0) input.setAttribute('aria-activedescendant', options[index].id);
      else input.removeAttribute('aria-activedescendant');
    }

    function open() {
      if (!list.hidden) return;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      var current = options.findIndex(function (o) { return o.dataset.value === input.value; });
      mark(current);
    }

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      mark(-1);
    }

    function fire() {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function choose(value) {
      input.value = value;
      close();
      fire();
    }

    // A typed number is kept between min and max; letters or an empty field go back to the last good value.
    var lastGood = input.value || String(input.defaultValue || '');
    input.addEventListener('change', function () {
      if (input.value === '') return;
      var value = Math.round(Number(input.value));
      if (!isFinite(value)) value = Number(lastGood) || min;
      value = Math.min(max, Math.max(min, value));
      if (String(value) !== input.value) input.value = String(value);
      lastGood = input.value;
    });

    input.addEventListener('focus', open);
    input.addEventListener('click', open);
    input.addEventListener('blur', close);
    input.addEventListener('input', function () {
      if (list.hidden) return;
      mark(options.findIndex(function (o) { return o.dataset.value === input.value; }));
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // The arrows move in the list (instead of the number field's own +1 / -1).
        e.preventDefault();
        if (list.hidden) { open(); return; }
        var next = e.key === 'ArrowDown' ? active + 1 : active - 1;
        if (next < 0) next = options.length - 1;
        if (next >= options.length) next = 0;
        mark(next);
      } else if (e.key === 'Enter' && !list.hidden && active >= 0) {
        e.preventDefault();
        choose(options[active].dataset.value);
      } else if (e.key === 'Escape' && !list.hidden) {
        e.stopPropagation();
        close();
      } else if (e.key === 'Tab') {
        close();
      }
    });

    // pointerdown (not click): the field keeps the focus, so blur doesn't close the list first.
    list.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var option = e.target.closest('.guest-picker__option');
      if (option) choose(option.dataset.value);
      // "More than 5": the number in the field is selected, ready to be typed over.
      else if (e.target === hint) { close(); input.select(); }
    });

    // The mouse wheel shouldn't change the number while scrolling the page.
    input.addEventListener('wheel', function () { if (document.activeElement === input) input.blur(); }, { passive: true });
  }

  document.querySelectorAll('input[data-guest-picker]').forEach(enhance);
})();
