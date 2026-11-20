// Admin page, overview: the two bar charts, the notes under the totals, and the "newest
// accounts" and "latest messages" lists. The figures come from GET /api/admin/overview.
// Names and emails come from visitors, so they are always shown with textContent.
(function () {
  'use strict';

  const section = document.querySelector('[data-admin-section="overview"]');
  if (!section) return;

  const problem = section.querySelector('[data-overview-problem]');
  const TOPICS = {
    general: 'General question', destinations: 'Destinations', stays: 'Hotels & chalets',
    flights: 'Flight planning', 'bus-train': 'Bus & train planning', website: 'Website issue', other: 'Other'
  };
  const STATUSES = { new: 'New', read: 'Read', answered: 'Answered', closed: 'Closed' };

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function plural(count, one, many) {
    return count + ' ' + (count === 1 ? one : many);
  }

  // A horizontal bar chart: one row per item, with its name, a bar and the number. The longest
  // bar fills the row, and the others are drawn in proportion. Every bar has the same colour,
  // because the colour says nothing here: the length and the number do.
  function drawBars(name, items, unit) {
    const list = section.querySelector('[data-bars="' + name + '"]');
    const highest = Math.max.apply(null, items.map(function (item) { return item.total; }).concat(1));

    list.replaceChildren.apply(list, items.map(function (item) {
      const row = element('li', 'admin-bars__row');
      const track = element('span', 'admin-bars__track');
      const bar = element('span', 'admin-bars__bar');
      bar.style.width = (item.total / highest * 100) + '%';
      track.setAttribute('aria-hidden', 'true');
      track.append(bar);
      row.title = item.label + ': ' + plural(item.total, unit[0], unit[1]);
      row.append(
        element('span', 'admin-bars__label', item.label),
        track,
        element('span', 'admin-bars__value', item.total)
      );
      return row;
    }));
  }

  // Turns [{ status: "new", total: 2 }, ...] into { new: 2, ... }.
  function totalsBy(rows, key) {
    const totals = {};
    rows.forEach(function (row) { totals[row[key]] = row.total; });
    return totals;
  }

  function setNote(name, text) {
    section.querySelector('[data-overview-note="' + name + '"]').textContent = text;
  }

  function drawFeed(name, items) {
    const list = section.querySelector('[data-latest="' + name + '"]');
    const empty = section.querySelector('[data-latest-empty="' + name + '"]');
    list.replaceChildren.apply(list, items);
    if (empty) empty.hidden = items.length > 0;
  }

  function feedItem(titleText, subText, sideText, badgeClass) {
    const item = element('li', 'admin-feed__item');
    const text = element('div', 'admin-feed__text');
    text.append(element('span', 'admin-feed__title', titleText), element('span', 'admin-feed__sub', subText));
    item.append(text, element('span', badgeClass || 'admin-feed__side', sideText));
    return item;
  }

  function draw(overview) {
    const types = totalsBy(overview.staysByType, 'type');
    setNote('stays', plural(types.hotel || 0, 'hotel', 'hotels') + ' · ' + plural(types.chalet || 0, 'chalet', 'chalets'));

    const bookings = totalsBy(overview.bookingsByStatus, 'status');
    setNote('bookings', (bookings.pending || 0) + ' pending · ' + (bookings.confirmed || 0) + ' confirmed');

    drawBars('staysByCountry', overview.staysByCountry.map(function (row) {
      return { label: row.country, total: row.total };
    }), ['stay', 'stays']);

    // Every status is shown, in the order a message goes through them, even with 0 messages.
    const statuses = totalsBy(overview.inquiriesByStatus, 'status');
    drawBars('inquiriesByStatus', Object.keys(STATUSES).map(function (status) {
      return { label: STATUSES[status], total: statuses[status] || 0 };
    }), ['message', 'messages']);

    drawFeed('users', overview.latestUsers.map(function (user) {
      return feedItem(user.name, user.email, user.role === 'admin' ? 'Admin · ' + formatDate(user.createdAt) : formatDate(user.createdAt));
    }));

    drawFeed('inquiries', overview.latestInquiries.map(function (inquiry) {
      return feedItem(
        inquiry.name,
        (TOPICS[inquiry.topic] || inquiry.topic) + ' · ' + formatDate(inquiry.createdAt),
        STATUSES[inquiry.status],
        'messages-badge messages-badge--' + inquiry.status
      );
    }));
  }

  async function load() {
    try {
      const response = await fetch('/api/admin/overview');
      if (!response.ok) throw new Error('The server answered ' + response.status);
      draw(await response.json());
      problem.hidden = true;
    } catch (err) {
      problem.textContent = "The charts couldn't be loaded. Reload the page to try again.";
      problem.hidden = false;
    }
  }

  // Start once account.js has checked that an admin is logged in, and draw again when a stay
  // or a message changes in another section.
  ['easytrip:admin-ready', 'easytrip:stays-changed', 'easytrip:inquiries-changed', 'easytrip:bookings-changed'].forEach(function (name) {
    document.addEventListener(name, load);
  });
})();
