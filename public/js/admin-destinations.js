// Admin page: the destinations. GET /api/admin/destinations gives every destination with its
// number of stays (there are about 60, so the list is filtered here, not page by page). POST,
// PUT and DELETE /api/admin/destinations add, edit and delete one.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-destinations]');
  const dialog = document.querySelector('[data-dest-dialog]');
  if (!panel || !dialog) return;

  const SEASONS = { winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn' };

  const q = function (sel, root) { return (root || panel).querySelector(sel); };
  const rows = q('[data-dest-rows]');
  const tableWrap = q('.admin-table-wrap');
  const empty = q('[data-dest-empty]');
  const status = q('[data-dest-status]');
  const count = q('[data-dest-count]');
  const filters = q('[data-dest-filters]');

  const form = q('[data-dest-form]', dialog);
  const formTitle = q('[data-dest-form-title]', dialog);
  const formError = q('[data-dest-form-error]', dialog);
  const saveButton = q('[data-dest-save]', dialog);

  let all = []; // Every destination, from the server.
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
    if (answer.response.status === 403) return 'Only admins can manage destinations.';
    return answer.result.error || fallback;
  }

  // "Göreme" matches "goreme": no accents, no capitals.
  function plain(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // The stay form (js/admin-stays.js) and the overview read the list again.
  function changed() {
    document.dispatchEvent(new CustomEvent('easytrip:destinations-changed'));
  }

  // ---------- The table ----------

  function rowButton(label, destination, extraClass) {
    const button = element('button', 'et-btn et-btn--outline admin-btn' + (extraClass ? ' ' + extraClass : ''));
    button.type = 'button';
    button.dataset.destId = destination.id;
    button.append(label, element('span', 'et-visually-hidden', ': ' + destination.location + ', ' + destination.season));
    return button;
  }

  function buildRow(destination) {
    const tr = document.createElement('tr');
    const actions = element('td', 'admin-table__actions');
    const edit = rowButton('Edit', destination);
    edit.addEventListener('click', function () { openForm(destination, edit); });
    actions.append(edit);
    // A destination with stays can't be deleted, so it has no Delete button.
    if (destination.stays === 0) {
      const remove = rowButton('Delete', destination, 'admin-btn--danger');
      remove.addEventListener('click', function () { removeOne(destination); });
      actions.append(remove);
    }
    tr.append(
      element('td', 'admin-table__name', destination.name),
      element('td', '', destination.country),
      element('td', '', SEASONS[destination.season]),
      element('td', 'credit-amount', destination.stays),
      actions
    );
    return tr;
  }

  function draw() {
    const search = plain(filters.elements.q.value.trim());
    const season = filters.elements.season.value;
    const shown = all.filter(function (destination) {
      return (!season || destination.season === season) &&
        (!search || plain(destination.name).indexOf(search) !== -1 || plain(destination.country).indexOf(search) !== -1);
    });
    rows.replaceChildren(...shown.map(buildRow));
    tableWrap.hidden = shown.length === 0;
    empty.hidden = shown.length !== 0;
    count.textContent = shown.length === all.length
      ? all.length + ' destinations'
      : 'Showing ' + shown.length + ' of ' + all.length + ' destinations';
  }

  async function load() {
    const answer = await call('/api/admin/destinations');
    if (!answer || !answer.response.ok) {
      show(problem(answer, 'The destinations could not be loaded.'), 'error');
      return;
    }
    all = answer.result.destinations;
    draw();
  }

  filters.addEventListener('submit', function (event) { event.preventDefault(); });
  filters.addEventListener('input', draw);
  filters.addEventListener('change', draw);

  async function removeOne(destination) {
    if (!window.confirm('Delete ' + destination.location + ' (' + destination.season + ')?')) return;
    const answer = await call('/api/admin/destinations/' + destination.id, { method: 'DELETE' });
    await load();
    if (answer && answer.response.ok) {
      show(answer.result.message, 'success');
      changed();
    } else {
      show(problem(answer, 'The destination could not be deleted.'), 'error');
    }
    status.focus();
  }

  // ---------- The form ----------

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach(function (p) { p.hidden = true; });
    form.querySelectorAll('[aria-invalid]').forEach(function (field) { field.removeAttribute('aria-invalid'); });
    formError.hidden = true;
  }

  function openForm(destination, button) {
    editing = destination;
    opener = button;
    form.reset();
    clearErrors();
    formTitle.textContent = destination ? 'Edit a destination' : 'Add a destination';
    if (destination) {
      form.elements.name.value = destination.name;
      form.elements.country.value = destination.country;
      form.elements.season.value = destination.season;
    }
    dialog.showModal();
    form.elements.name.focus();
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
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    const answer = await call(editing ? '/api/admin/destinations/' + editing.id : '/api/admin/destinations', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.elements.name.value, country: form.elements.country.value, season: form.elements.season.value })
    });
    saveButton.disabled = false;
    saveButton.textContent = 'Save';

    if (answer && answer.response.ok) {
      dialog.close();
      await load();
      show(answer.result.message, 'success');
      status.focus();
      changed();
      return;
    }
    if (answer && answer.result.fields) {
      let first = null;
      Object.keys(answer.result.fields).forEach(function (name) {
        const text = form.querySelector('[data-error-for="' + name + '"]');
        if (!text || !form.elements[name]) return;
        text.textContent = answer.result.fields[name];
        text.hidden = false;
        form.elements[name].setAttribute('aria-invalid', 'true');
        if (!first) first = form.elements[name];
      });
      if (first) {
        first.focus();
        return;
      }
    }
    formError.textContent = problem(answer, 'The destination could not be saved.');
    formError.hidden = false;
    formError.focus();
  });

  q('[data-dest-cancel]', dialog).addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', function () {
    if (opener && document.body.contains(opener)) opener.focus();
    opener = null;
  });
  q('[data-dest-add]').addEventListener('click', function (event) { openForm(null, event.currentTarget); });

  // A stay was added, moved or deleted: the numbers of stays change.
  document.addEventListener('easytrip:admin-ready', load);
  document.addEventListener('easytrip:stays-changed', load);
})();
