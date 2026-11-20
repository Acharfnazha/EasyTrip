// Admin page: the discounts. GET /api/admin/discounts gives every discount, with the stays (to
// leave some out) and the customers (suggested in the "For" field). POST, PUT and DELETE
// /api/admin/discounts add, edit and delete one. The server applies them to the prices.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-discounts]');
  const dialog = document.querySelector('[data-discount-dialog]');
  if (!panel || !dialog) return;

  const ON = {
    everything: 'Everything',
    stays: 'All stays',
    hotels: 'Hotels',
    chalets: 'Chalets',
    tickets: 'Tickets',
  };
  const STATES = {
    on: ['On', 'confirmed'],
    scheduled: ['Starts later', 'pending'],
    ended: ['Ended', 'cancelled'],
    off: ['Paused', 'cancelled'],
  };

  const q = function (sel, root) { return (root || panel).querySelector(sel); };
  const rows = q('[data-discount-rows]');
  const table = q('[data-discount-table]');
  const empty = q('[data-discount-empty]');
  const status = q('[data-discount-status]');

  const form = q('[data-discount-form]', dialog);
  const formTitle = q('[data-discount-form-title]', dialog);
  const formError = q('[data-discount-form-error]', dialog);
  const saveButton = q('[data-discount-save]', dialog);
  const customerList = q('[data-discount-customers]', dialog);
  const excludeBox = q('[data-discount-exclude]', dialog);
  const excludeList = q('[data-discount-exclude-list]', dialog);
  const excludeSearch = q('[data-discount-exclude-search]', dialog);
  const excludeCount = q('[data-discount-exclude-count]', dialog);

  let discounts = [];
  let stays = []; // Every stay: { id, name, type, location }.
  let excluded = new Set(); // The ids ticked in the open form.
  let editing = null;
  let opener = null;

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  function show(message, kind) {
    status.textContent = message;
    status.className = 'auth-status auth-status--' + kind;
    status.hidden = false;
  }

  async function call(url, options) {
    try {
      const response = await fetch(url, options);
      return { response: response, result: await response.json() };
    } catch (err) {
      return null;
    }
  }

  function problem(answer, fallback) {
    if (!answer) return "We can't reach the server right now. Please try again.";
    if (answer.response.status === 401) return 'Your session has ended. Please log in again.';
    if (answer.response.status === 403) return 'Only admins can manage discounts.';
    return answer.result.error || fallback;
  }

  // "Göreme" matches "goreme": no accents, no capitals.
  function plain(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // "12 Jan 2027"
  function day(iso) {
    const parts = iso.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function datesText(discount) {
    if (discount.startDate && discount.endDate) return day(discount.startDate) + ' – ' + day(discount.endDate);
    if (discount.startDate) return 'From ' + day(discount.startDate);
    if (discount.endDate) return 'Until ' + day(discount.endDate);
    return 'No end date';
  }

  // The stays a discount can leave out: the ones of its kind (none for tickets).
  function staysFor(appliesTo) {
    if (appliesTo === 'tickets') return [];
    if (appliesTo === 'hotels') return stays.filter(function (s) { return s.type === 'hotel'; });
    if (appliesTo === 'chalets') return stays.filter(function (s) { return s.type === 'chalet'; });
    return stays;
  }

  // ---------- The table ----------

  function rowButton(label, discount, extraClass) {
    const button = element('button', 'et-btn et-btn--outline admin-btn' + (extraClass ? ' ' + extraClass : ''));
    button.type = 'button';
    button.append(label, element('span', 'et-visually-hidden', ': ' + discount.name));
    return button;
  }

  function buildRow(discount) {
    const tr = document.createElement('tr');

    const name = element('td', '');
    name.append(element('span', 'admin-table__name', discount.name));
    const on = element('td', '', ON[discount.appliesTo]);
    if (discount.excluded.length > 0) {
      on.append(element('span', 'discount-row__note', 'Except ' + discount.excluded.length +
        (discount.excluded.length === 1 ? ' stay' : ' stays')));
    }
    const who = element('td', '');
    if (discount.customer) {
      who.append(element('span', 'discount-row__who', discount.customer.name), element('span', 'discount-row__note', discount.customer.email));
    } else {
      who.textContent = 'Every customer';
    }
    const state = STATES[discount.state];
    const stateCell = element('td', '');
    stateCell.append(element('span', 'messages-badge messages-badge--' + state[1], state[0]));

    const actions = element('td', 'admin-table__actions');
    const edit = rowButton('Edit', discount);
    edit.addEventListener('click', function () { openForm(discount, edit); });
    const remove = rowButton('Delete', discount, 'admin-btn--danger');
    remove.addEventListener('click', function () { removeOne(discount); });
    actions.append(edit, remove);

    tr.append(name, element('td', 'credit-amount', discount.percent + '%'), on, who,
      element('td', '', datesText(discount)), stateCell, actions);
    return tr;
  }

  function draw() {
    rows.replaceChildren(...discounts.map(buildRow));
    table.hidden = discounts.length === 0;
    empty.hidden = discounts.length !== 0;
  }

  async function load() {
    const answer = await call('/api/admin/discounts');
    if (!answer || !answer.response.ok) {
      show(problem(answer, 'The discounts could not be loaded.'), 'error');
      return;
    }
    discounts = answer.result.discounts;
    stays = answer.result.stays;
    customerList.replaceChildren(...answer.result.customers.map(function (customer) {
      const option = document.createElement('option');
      option.value = customer.email;
      option.label = customer.name;
      return option;
    }));
    draw();
  }

  async function removeOne(discount) {
    if (!window.confirm('Delete the discount "' + discount.name + '"? Bookings and tickets already paid keep their price.')) return;
    const answer = await call('/api/admin/discounts/' + discount.id, { method: 'DELETE' });
    await load();
    if (answer && answer.response.ok) show(answer.result.message, 'success');
    else show(problem(answer, 'The discount could not be deleted.'), 'error');
    status.focus();
  }

  // ---------- The stays to leave out ----------

  function drawExcludeList() {
    const kind = form.elements.appliesTo.value;
    const choices = staysFor(kind);
    excludeBox.hidden = choices.length === 0;
    // A stay of another kind can't be left out (a hotel, for a chalets discount): it is unticked.
    const allowed = new Set(choices.map(function (s) { return s.id; }));
    excluded.forEach(function (id) { if (!allowed.has(id)) excluded.delete(id); });

    const search = plain(excludeSearch.value.trim());
    const shown = choices.filter(function (s) {
      return !search || plain(s.name).indexOf(search) !== -1 || plain(s.location).indexOf(search) !== -1;
    });
    excludeList.replaceChildren(...shown.map(function (stay) {
      const label = element('label', 'discount-exclude__item');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = stay.id;
      box.checked = excluded.has(stay.id);
      box.addEventListener('change', function () {
        if (box.checked) excluded.add(stay.id);
        else excluded.delete(stay.id);
        countExcluded();
      });
      const text = element('span', 'discount-exclude__text');
      text.append(element('span', 'discount-exclude__name', stay.name),
        element('span', 'discount-row__note', (stay.type === 'hotel' ? 'Hotel' : 'Chalet') + ' · ' + stay.location));
      label.append(box, text);
      return label;
    }));
    if (shown.length === 0) excludeList.append(element('p', 'auth-form__hint', 'No stay matches this search.'));
    countExcluded();
  }

  function countExcluded() {
    excludeCount.textContent = excluded.size === 0
      ? 'The discount is on every stay above.'
      : excluded.size + (excluded.size === 1 ? ' stay keeps' : ' stays keep') + ' the full price.';
  }

  excludeSearch.addEventListener('input', drawExcludeList);
  form.elements.appliesTo.addEventListener('change', drawExcludeList);
  // Enter in the search box doesn't send the form.
  excludeSearch.addEventListener('keydown', function (event) { if (event.key === 'Enter') event.preventDefault(); });

  // ---------- The form ----------

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach(function (p) { p.hidden = true; });
    form.querySelectorAll('[aria-invalid]').forEach(function (field) { field.removeAttribute('aria-invalid'); });
    formError.hidden = true;
  }

  function openForm(discount, button) {
    editing = discount;
    opener = button;
    form.reset();
    clearErrors();
    excludeSearch.value = '';
    formTitle.textContent = discount ? 'Edit a discount' : 'Add a discount';
    const f = form.elements;
    if (discount) {
      f.name.value = discount.name;
      f.percent.value = discount.percent;
      f.appliesTo.value = discount.appliesTo;
      f.customerEmail.value = discount.customer ? discount.customer.email : '';
      f.startDate.value = discount.startDate || '';
      f.endDate.value = discount.endDate || '';
      f.active.checked = discount.active;
      excluded = new Set(discount.excluded);
    } else {
      excluded = new Set();
    }
    drawExcludeList();
    dialog.showModal();
    f.name.focus();
  }

  form.addEventListener('input', function (event) {
    const field = event.target;
    if (field.getAttribute('aria-invalid') !== 'true') return;
    field.removeAttribute('aria-invalid');
    const text = form.querySelector('[data-error-for="' + field.name + '"]');
    if (text) text.hidden = true;
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearErrors();
    const f = form.elements;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    const answer = await call(editing ? '/api/admin/discounts/' + editing.id : '/api/admin/discounts', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.name.value,
        percent: f.percent.value,
        appliesTo: f.appliesTo.value,
        customerEmail: f.customerEmail.value,
        startDate: f.startDate.value,
        endDate: f.endDate.value,
        active: f.active.checked,
        excluded: Array.from(excluded),
      })
    });
    saveButton.disabled = false;
    saveButton.textContent = 'Save';

    if (answer && answer.response.ok) {
      dialog.close();
      await load();
      show(answer.result.message, 'success');
      status.focus();
      return;
    }
    if (answer && answer.result.fields) {
      let first = null;
      Object.keys(answer.result.fields).forEach(function (name) {
        const text = form.querySelector('[data-error-for="' + name + '"]');
        if (!text) return;
        text.textContent = answer.result.fields[name];
        text.hidden = false;
        const field = name === 'excluded' ? excludeSearch : f[name];
        if (field && name !== 'excluded') field.setAttribute('aria-invalid', 'true');
        if (!first && field) first = field;
      });
      if (first) {
        first.focus();
        return;
      }
    }
    formError.textContent = problem(answer, 'The discount could not be saved.');
    formError.hidden = false;
    formError.focus();
  });

  q('[data-discount-cancel]', dialog).addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', function () {
    if (opener && document.body.contains(opener)) opener.focus();
    opener = null;
  });
  q('[data-discount-add]').addEventListener('click', function (event) { openForm(null, event.currentTarget); });

  document.addEventListener('easytrip:admin-ready', load);
  // A stay was added or deleted: the list of stays to leave out changes.
  document.addEventListener('easytrip:stays-changed', load);
})();
