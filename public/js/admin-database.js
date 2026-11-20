// Admin page, database: a read-only view of every table. GET /api/admin/database lists the
// tables, and GET /api/admin/database/:table gives one table's columns and one page of rows.
// The server only accepts these from an admin, and hides the passwords, the session IDs and the
// document numbers before it answers. Every value is shown with textContent, never as HTML.
(function () {
  'use strict';

  const section = document.querySelector('[data-admin-database]');
  if (!section) return;

  const PAGE_SIZE = 25;
  const NUMBER_TYPE = /^(tinyint|smallint|mediumint|int|bigint|decimal|float|double)/;

  const q = function (sel) { return section.querySelector(sel); };
  const status = q('[data-db-status]');
  const databaseName = q('[data-db-name]');
  const tableList = q('[data-db-tables]');
  const title = q('[data-db-title]');
  const summary = q('[data-db-summary]');
  const order = q('[data-db-order]');
  const wrap = q('[data-db-wrap]');
  const caption = q('[data-db-caption]');
  const head = q('[data-db-head]');
  const body = q('[data-db-rows]');
  const empty = q('[data-db-empty]');
  const pageText = q('[data-db-page]');
  const prevButton = q('[data-db-prev]');
  const nextButton = q('[data-db-next]');

  let tables = null; // [{ name, rows, columns }], once loaded.
  let current = null; // The name of the table on screen.
  let page = 1;
  let requestNumber = 0; // Only the answer to the newest request is shown.

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  function plural(count, one, many) {
    return count + ' ' + (count === 1 ? one : many);
  }

  function showProblem(message) {
    status.textContent = message;
    status.className = 'auth-status auth-status--error';
    status.hidden = false;
  }

  // Asks the server. Returns the answer's data, or null after showing what went wrong.
  async function ask(url) {
    let response;
    let result;
    try {
      response = await fetch(url);
      result = await response.json();
    } catch (err) {
      showProblem("We can't reach the server right now. Please try again.");
      return null;
    }
    if (response.ok) return result;
    if (response.status === 401) showProblem('Your session has ended. Please log in again.');
    else if (response.status === 403) showProblem('Only admins can see the database.');
    else showProblem(result.error || 'The database could not be read.');
    return null;
  }

  // The table named in the address, like "users" in admin.html#database/users.
  function tableInAddress() {
    const parts = window.location.hash.slice(1).split('/');
    return parts[0] === 'database' && parts[1] ? decodeURIComponent(parts[1]) : '';
  }

  // ---------- The list of tables ----------

  function drawTableList() {
    tableList.replaceChildren.apply(tableList, tables.map(function (table) {
      const item = document.createElement('li');
      const link = element('a', 'db-tables__link');
      link.href = '#database/' + encodeURIComponent(table.name);
      if (table.name === current) link.setAttribute('aria-current', 'true');
      link.append(
        element('span', 'db-tables__name', table.name),
        element('span', 'db-tables__count', table.rows),
        element('span', 'et-visually-hidden', table.rows === 1 ? ' row' : ' rows')
      );
      item.append(link);
      return item;
    }));
    // On a small screen the list is one row that scrolls sideways: bring the open table into view.
    const open = tableList.querySelector('[aria-current]');
    if (open) tableList.scrollLeft = open.offsetLeft - 16;
  }

  async function loadTables() {
    const result = await ask('/api/admin/database');
    if (!result) return false;
    tables = result.tables;
    databaseName.textContent = result.database;
    drawTableList();
    return true;
  }

  // ---------- One table ----------

  // The heading of a column: its name, its type, and what kind of key it is.
  function headerCell(column) {
    const th = element('th', NUMBER_TYPE.test(column.type) ? 'db-grid__number' : '');
    th.scope = 'col';
    th.append(element('span', 'db-grid__column', column.name));

    const details = element('span', 'db-grid__type', column.type + (column.nullable ? ' · null' : ''));
    th.append(details);

    if (column.primaryKey) th.append(element('span', 'db-key db-key--primary', 'Primary key'));
    if (column.unique) th.append(element('span', 'db-key', 'Unique'));
    if (column.protected) th.append(element('span', 'db-key', 'Hidden'));
    if (column.references) {
      // A foreign key: the link opens the table it points to.
      const link = element('a', 'db-key db-key--link', '→ ' + column.references.table + '.' + column.references.column);
      link.href = '#database/' + encodeURIComponent(column.references.table);
      th.append(link);
    }
    return th;
  }

  function valueCell(value, column) {
    const td = document.createElement('td');
    if (value === null) {
      td.append(element('span', 'db-null', 'NULL'));
      return td;
    }
    const text = String(value);
    td.textContent = text;
    if (NUMBER_TYPE.test(column.type)) td.className = 'db-grid__number';
    if (column.protected) td.className = 'db-grid__protected';
    // A long text is cut on screen. Hovering shows all of it.
    if (text.length > 40) td.title = text;
    return td;
  }

  async function loadTable(moveFocus) {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ page: page, limit: PAGE_SIZE, order: order.value });
    const result = await ask('/api/admin/database/' + encodeURIComponent(current) + '?' + params.toString());
    if (thisRequest !== requestNumber || !result) return;

    // The rows were deleted since the last page was shown: go back to the last page.
    const total = result.pagination.total;
    if (result.rows.length === 0 && total > 0) {
      page = result.pagination.totalPages;
      return loadTable(moveFocus);
    }

    status.hidden = true;
    title.textContent = result.table;
    summary.textContent = plural(total, 'row', 'rows') + ' · ' + plural(result.columns.length, 'column', 'columns');
    caption.textContent = 'The rows of the ' + result.table + ' table';

    head.replaceChildren.apply(head, result.columns.map(headerCell));
    body.replaceChildren.apply(body, result.rows.map(function (row) {
      const tr = document.createElement('tr');
      row.forEach(function (value, index) { tr.append(valueCell(value, result.columns[index])); });
      return tr;
    }));

    wrap.hidden = false;
    wrap.scrollLeft = 0;
    empty.hidden = total !== 0;
    const totalPages = Math.max(result.pagination.totalPages, 1);
    const first = (page - 1) * PAGE_SIZE + 1;
    pageText.textContent = total === 0 ? ''
      : 'Rows ' + first + ' to ' + (first + result.rows.length - 1) + ' of ' + total;
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;

    // The list's count may be older than this answer: keep them the same.
    tables.forEach(function (table) { if (table.name === current) table.rows = total; });
    drawTableList();
    if (moveFocus) title.focus();
  }

  // Shows the table named in the address, or the first table when the address names none.
  async function showFromAddress(moveFocus) {
    if (window.location.hash.slice(1).split('/')[0] !== 'database') return;
    if (!tables && !(await loadTables())) return;
    if (tables.length === 0) return;

    const wanted = tableInAddress();
    const known = tables.some(function (table) { return table.name === wanted; });
    const name = known ? wanted : (current || tables[0].name);
    if (name === current) return;
    current = name;
    page = 1;
    order.value = 'oldest';
    await loadTable(moveFocus && known);
  }

  window.addEventListener('hashchange', function () { showFromAddress(true); });

  order.addEventListener('change', function () {
    page = 1;
    if (current) loadTable(false);
  });
  prevButton.addEventListener('click', function () {
    page -= 1;
    loadTable(false);
  });
  nextButton.addEventListener('click', function () {
    page += 1;
    loadTable(false);
  });

  // "Refresh" reads the tables and the rows again, to see what changed since the page opened.
  q('[data-db-refresh]').addEventListener('click', async function () {
    if (!(await loadTables())) return;
    if (current) await loadTable(false);
  });

  // Start once account.js has checked that an admin is logged in.
  document.addEventListener('easytrip:admin-ready', function () { showFromAddress(false); });
})();
