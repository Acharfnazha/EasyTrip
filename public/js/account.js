// Account and admin pages: only shown after the server confirms who is logged in.
(function () {
  'use strict';

  const page = document.querySelector('[data-account-page]');
  if (!page) return;

  const pageRole = page.dataset.accountPage;
  const loading = document.querySelector('[data-account-loading]');
  const problem = document.querySelector('[data-account-problem]');

  function showProblem(message) {
    loading.hidden = true;
    problem.textContent = message;
    problem.hidden = false;
  }

  function connectionProblem() {
    if (window.location.protocol === 'file:') {
      return 'This page needs the server. Run npm start, then open http://localhost:3000.';
    }
    return "We can't reach the server right now. Please try again.";
  }

  // textContent is used so a name is always shown as plain text, never as HTML.
  function fill(name, value) {
    document.querySelectorAll('[data-user="' + name + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function loadStats() {
    const response = await fetch('/api/admin/stats');
    if (!response.ok) throw new Error('Could not load the statistics');
    const stats = await response.json();
    Object.keys(stats).forEach(function (name) {
      const el = document.querySelector('[data-stat="' + name + '"]');
      if (el) el.textContent = stats[name];
    });
  }

  async function init() {
    let user;
    try {
      const response = await fetch('/api/auth/me');
      user = (await response.json()).user;
    } catch (err) {
      showProblem(connectionProblem());
      return;
    }

    if (!user) {
      window.location.replace('login.html');
      return;
    }
    // Each role has its own page. The server also protects the admin data (403 for customers).
    if (user.role !== pageRole) {
      window.location.replace(user.role === 'admin' ? 'admin.html' : 'account.html');
      return;
    }

    fill('firstName', user.firstName);
    fill('fullName', user.firstName + ' ' + user.lastName);
    fill('email', user.email);
    fill('memberSince', formatDate(user.createdAt));

    if (pageRole === 'admin') {
      try {
        await loadStats();
      } catch (err) {
        showProblem("We couldn't load the statistics. Please try again.");
        return;
      }
    }

    loading.hidden = true;
    page.hidden = false;
  }

  document.querySelector('[data-logout]').addEventListener('click', async function () {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = 'index.html';
    } catch (err) {
      showProblem(connectionProblem());
    }
  });

  // The Back button can show a saved copy of this page after logging out, so check again.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) window.location.reload();
  });

  init();
})();
