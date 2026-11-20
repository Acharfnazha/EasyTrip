// Admin page: the hotels and chalets table, and the form to add, edit and delete a stay.
// It uses the Stays API: GET /api/stays (the table), GET /api/destinations (the form's list),
// POST /api/stays (add), PUT /api/stays/:id (edit) and DELETE /api/stays/:id (delete).
// The server checks everything again, and only accepts these changes from an admin.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-stays]');
  const dialog = document.querySelector('[data-stay-dialog]');
  if (!panel || !dialog) return;

  const PAGE_SIZE = 10;
  const TYPING_DELAY = 300;

  const q = function (sel, root) { return (root || document).querySelector(sel); };
  const rows = q('[data-stay-rows]', panel);
  const tableWrap = q('.admin-table-wrap', panel);
  const empty = q('[data-stay-empty]', panel);
  const message = q('[data-stay-message]', panel);
  const pageText = q('[data-stay-page]', panel);
  const prevButton = q('[data-stay-prev]', panel);
  const nextButton = q('[data-stay-next]', panel);
  const filters = q('[data-stay-filters]', panel);
  const search = filters.elements.q;
  const typeFilter = filters.elements.type;

  const form = q('[data-stay-form]', dialog);
  const formTitle = q('[data-stay-form-title]', dialog);
  const formError = q('[data-stay-form-error]', dialog);
  const destinationSelect = q('[data-stay-destinations]', dialog);
  const chaletFields = q('[data-chalet-only]', dialog);
  const current = q('[data-stay-current]', dialog);
  const currentImg = q('[data-stay-current-img]', dialog);
  const saveButton = q('[data-stay-save]', dialog);

  let page = 1;
  let requestNumber = 0; // Only the answer to the newest table request is shown.
  let typingTimer = null;
  let editing = null; // The stay being edited, or null when adding a new one.
  let opener = null; // The button that opened the form, to give the focus back.
  let destinationsLoaded = false;

  function capitalise(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }

  function formatPrice(price) {
    return '$' + (Number.isInteger(price) ? price : price.toFixed(2));
  }

  function staysChanged() {
    document.dispatchEvent(new CustomEvent('easytrip:stays-changed'));
  }

  function showMessage(text, kind) {
    message.textContent = text;
    message.className = 'auth-status auth-status--' + kind;
    message.hidden = false;
  }

  function connectionProblem() {
    return "We can't reach the server right now. Please try again.";
  }

  // The server answers 401 when the session has ended, and 403 when the user isn't an admin.
  function sessionProblem(response) {
    if (response.status === 401) return 'Your session has ended. Please log in again.';
    if (response.status === 403) return 'Only admins can manage stays.';
    return null;
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch (err) {
      return {};
    }
  }

  // ---------- The table ----------

  function cell(text, className) {
    const td = document.createElement('td');
    if (className) td.className = className;
    td.textContent = text;
    return td;
  }

  // A small button whose hidden text says which stay it is for ("Edit: Mountain Top Cabin").
  function rowButton(label, stayName, extraClass) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'et-btn et-btn--outline admin-btn' + (extraClass ? ' ' + extraClass : '');
    button.append(label);
    const forWhich = document.createElement('span');
    forWhich.className = 'et-visually-hidden';
    forWhich.textContent = ': ' + stayName;
    button.append(forWhich);
    return button;
  }

  function buildRow(stay) {
    const tr = document.createElement('tr');

    const imageCell = document.createElement('td');
    const img = document.createElement('img');
    img.className = 'admin-table__img';
    img.src = stay.image;
    img.alt = '';
    img.width = 72;
    img.height = 48;
    img.loading = 'lazy';
    imageCell.append(img);

    const nameCell = document.createElement('td');
    const name = document.createElement('span');
    name.className = 'admin-table__name';
    name.textContent = stay.name;
    const kind = document.createElement('span');
    kind.className = 'admin-table__sub';
    kind.textContent = stay.type === 'hotel' ? 'Hotel' : stay.category + ' · ' + capitalise(stay.setting);
    nameCell.append(name, kind);

    const actions = document.createElement('td');
    actions.className = 'admin-table__actions';
    const editButton = rowButton('Edit', stay.name);
    editButton.addEventListener('click', function () { openForm(stay, editButton); });
    const deleteButton = rowButton('Delete', stay.name, 'admin-btn--danger');
    deleteButton.addEventListener('click', function () { deleteStay(stay); });
    actions.append(editButton, deleteButton);

    tr.append(imageCell, nameCell, cell(stay.location), cell(formatPrice(stay.price), 'admin-table__price'), actions);
    return tr;
  }

  async function loadStays() {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    if (search.value.trim()) params.set('q', search.value.trim());
    if (typeFilter.value) params.set('type', typeFilter.value);

    let response;
    let result;
    try {
      response = await fetch('/api/stays?' + params.toString());
      result = await readJson(response);
    } catch (err) {
      if (thisRequest === requestNumber) showMessage(connectionProblem(), 'error');
      return;
    }
    if (thisRequest !== requestNumber) return;
    if (!response.ok) {
      showMessage(result.error || 'The stays could not be loaded.', 'error');
      return;
    }

    // After a delete, the last page can be empty: show the page before it.
    const total = result.pagination.total;
    if (result.stays.length === 0 && total > 0) {
      page = result.pagination.totalPages;
      return loadStays();
    }

    const totalPages = Math.max(result.pagination.totalPages, 1);
    rows.replaceChildren(...result.stays.map(buildRow));
    tableWrap.hidden = total === 0;
    empty.hidden = total !== 0;
    pageText.textContent = total === 0 ? ''
      : 'Page ' + page + ' of ' + totalPages + ' · ' + total + (total === 1 ? ' stay' : ' stays');
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  }

  filters.addEventListener('submit', function (event) {
    event.preventDefault();
  });
  search.addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      page = 1;
      loadStays();
    }, TYPING_DELAY);
  });
  typeFilter.addEventListener('change', function () {
    page = 1;
    loadStays();
  });
  prevButton.addEventListener('click', function () {
    page -= 1;
    loadStays();
  });
  nextButton.addEventListener('click', function () {
    page += 1;
    loadStays();
  });

  // ---------- Delete ----------

  async function deleteStay(stay) {
    if (!window.confirm('Delete "' + stay.name + '"? This can\'t be undone.')) return;

    let response;
    let result;
    try {
      response = await fetch('/api/stays/' + stay.id, { method: 'DELETE' });
      result = await readJson(response);
    } catch (err) {
      showMessage(connectionProblem(), 'error');
      message.focus();
      return;
    }

    if (response.ok) {
      staysChanged();
      await loadStays();
      showMessage(result.message, 'success');
    } else {
      // For example 409: the stay has bookings, so the database refuses to delete it.
      showMessage(sessionProblem(response) || result.error || 'The stay could not be deleted.', 'error');
    }
    message.focus(); // The row's buttons may be gone, so the focus goes to the message.
  }

  // ---------- The add and edit form ----------

  // The destinations list, grouped by country: "Faraya, Lebanon (winter)".
  async function loadDestinations() {
    if (destinationsLoaded) return;
    const response = await fetch('/api/destinations');
    if (!response.ok) throw new Error('The server answered ' + response.status);
    const result = await response.json();
    const groups = {};
    result.destinations.forEach(function (destination) {
      if (!groups[destination.country]) {
        groups[destination.country] = document.createElement('optgroup');
        groups[destination.country].label = destination.country;
        destinationSelect.append(groups[destination.country]);
      }
      groups[destination.country].append(
        new Option(destination.location + ' (' + destination.season + ')', destination.id)
      );
    });
    destinationsLoaded = true;
  }

  function toggleChaletFields() {
    chaletFields.hidden = form.elements.type.value !== 'chalet';
  }

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach(function (p) {
      p.textContent = '';
      p.hidden = true;
    });
    form.querySelectorAll('[aria-invalid]').forEach(function (field) {
      field.removeAttribute('aria-invalid');
    });
    formError.hidden = true;
  }

  // Shows the server's message under each wrong field. Returns the first wrong field.
  function showFieldErrors(fields) {
    let first = null;
    Object.keys(fields).forEach(function (name) {
      const errorText = form.querySelector('[data-error-for="' + name + '"]');
      const field = form.elements[name];
      if (errorText) {
        errorText.textContent = fields[name];
        errorText.hidden = false;
      }
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        if (!first) first = field;
      }
    });
    return first;
  }

  function showFormError(text) {
    formError.textContent = text;
    formError.hidden = false;
  }

  async function openForm(stay, button) {
    try {
      await loadDestinations();
    } catch (err) {
      showMessage("The destinations couldn't be loaded, so the form can't open. Please try again.", 'error');
      message.focus();
      return;
    }

    editing = stay;
    opener = button;
    form.reset();
    clearErrors();
    formTitle.textContent = stay ? 'Edit a stay' : 'Add a stay';

    if (stay) {
      form.elements.name.value = stay.name;
      form.elements.type.value = stay.type;
      form.elements.destId.value = stay.destination.id;
      form.elements.category.value = stay.category || '';
      form.elements.setting.value = stay.setting || '';
      form.elements.price.value = stay.price;
      form.elements.description.value = stay.description;
      form.elements.imageAlt.value = stay.imageAlt;
      currentImg.src = stay.image;
      currentImg.alt = 'Current image: ' + stay.imageAlt;
      current.hidden = false;
    } else {
      currentImg.src = 'data:,';
      current.hidden = true;
    }

    toggleChaletFields();
    dialog.showModal();
    form.elements.name.focus();
  }

  form.elements.type.addEventListener('change', toggleChaletFields);

  // When the admin changes a wrong field, its message goes away.
  function clearFieldError(event) {
    const field = event.target;
    if (!field.name || field.getAttribute('aria-invalid') !== 'true') return;
    field.removeAttribute('aria-invalid');
    const errorText = form.querySelector('[data-error-for="' + field.name + '"]');
    if (errorText) errorText.hidden = true;
  }
  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', clearFieldError);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearErrors();

    // FormData sends the form as multipart/form-data, with the image file.
    const data = new FormData(form);
    // An empty file field would still send an empty file: leave it out, so that when editing,
    // "no new file" keeps the current image.
    if (form.elements.image.files.length === 0) data.delete('image');
    // Hotels have no kind or setting.
    if (form.elements.type.value !== 'chalet') {
      data.delete('category');
      data.delete('setting');
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    let response;
    let result;
    try {
      response = await fetch(editing ? '/api/stays/' + editing.id : '/api/stays', {
        method: editing ? 'PUT' : 'POST',
        body: data, // No Content-Type header: the browser writes it, with the multipart boundary.
      });
      result = await readJson(response);
    } catch (err) {
      showFormError(connectionProblem());
      return;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save';
    }

    if (response.ok) {
      const wasAdding = !editing;
      dialog.close();
      if (wasAdding) {
        // Show the new stay in the table by searching for its name.
        search.value = result.stay.name;
        typeFilter.value = '';
        page = 1;
        staysChanged();
      } else {
        // Keep the edited stay in view: its new name or type may not match the old filters.
        if (search.value.trim()) {
          search.value = result.stay.name;
          page = 1;
        }
        if (typeFilter.value && typeFilter.value !== result.stay.type) {
          typeFilter.value = '';
          page = 1;
        }
      }
      await loadStays();
      showMessage(result.message, 'success');
      message.focus();
      return;
    }

    if (response.status === 404) {
      dialog.close();
      showMessage(result.error, 'error');
      loadStays();
      return;
    }

    const problem = sessionProblem(response);
    if (problem) {
      showFormError(problem);
      formError.focus();
      return;
    }

    // 400: the server says which fields are wrong. The focus goes to the first one.
    showFormError(result.error || 'The stay could not be saved.');
    const firstWrong = result.fields ? showFieldErrors(result.fields) : null;
    (firstWrong || formError).focus();
  });

  q('[data-stay-cancel]', dialog).addEventListener('click', function () {
    dialog.close();
  });
  dialog.addEventListener('close', function () {
    if (opener && document.body.contains(opener)) opener.focus();
    opener = null;
  });

  q('[data-stay-add]', panel).addEventListener('click', function (event) {
    openForm(null, event.currentTarget);
  });

  // Start once account.js has checked with the server that this is an admin.
  document.addEventListener('easytrip:admin-ready', loadStays);
  // A destination was added, edited or deleted: the form's list is read again when it opens,
  // and the table shows the new names.
  document.addEventListener('easytrip:destinations-changed', function () {
    destinationsLoaded = false;
    destinationSelect.querySelectorAll('optgroup').forEach(function (group) { group.remove(); });
    loadStays();
  });
})();
