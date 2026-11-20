// "My account" page: the messages the user sent from contact.html while logged in, and the
// EasyTrip team's replies. They come from GET /api/inquiries/mine.
// Everything is shown with textContent, so a message can never run as HTML.
(function () {
  'use strict';

  const panel = document.querySelector('[data-my-messages]');
  if (!panel) return;

  const list = panel.querySelector('[data-my-messages-list]');
  const status = panel.querySelector('[data-my-messages-status]');

  const TOPICS = {
    general: 'General question', destinations: 'Destinations', stays: 'Hotels & chalets',
    flights: 'Flight planning', 'bus-train': 'Bus & train planning', website: 'Website issue', other: 'Other',
  };
  // The customer's words for the admin's statuses.
  const STATUSES = {
    new: 'Sent', read: 'Seen by our team', answered: 'Answered', closed: 'Closed',
  };

  function formatDate(iso) {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function messageItem(inquiry) {
    const item = element('li', 'messages-item');
    const head = element('div', 'messages-item__head');
    head.append(
      element('span', 'messages-item__topic', TOPICS[inquiry.topic] || inquiry.topic),
      element('span', 'messages-item__date', formatDate(inquiry.createdAt)),
      element('span', 'messages-badge messages-badge--' + inquiry.status, STATUSES[inquiry.status])
    );
    item.append(head, element('p', 'messages-item__text', inquiry.message));

    inquiry.replies.forEach(function (reply) {
      const box = element('div', 'messages-reply');
      box.append(
        element('p', 'messages-reply__by', 'EasyTrip team · ' + formatDate(reply.createdAt)),
        element('p', 'messages-item__text', reply.message)
      );
      item.append(box);
    });
    return item;
  }

  function showStatus(text, kind) {
    status.textContent = text;
    status.className = 'auth-status' + (kind ? ' auth-status--' + kind : '');
    status.hidden = false;
  }

  async function load() {
    let response;
    let result;
    try {
      response = await fetch('/api/inquiries/mine');
      result = await response.json();
    } catch (err) {
      showStatus("We can't reach the server right now, so your messages can't be shown.", 'error');
      return;
    }
    if (!response.ok) {
      showStatus(result.error || "Your messages couldn't be loaded.", 'error');
      return;
    }
    if (result.inquiries.length === 0) {
      showStatus('You haven\'t sent us a message yet. Messages you send while logged in appear here, with our replies.');
      list.replaceChildren();
      return;
    }
    status.hidden = true;
    list.replaceChildren(...result.inquiries.map(messageItem));
  }

  // Start once account.js has checked with the server who is logged in.
  document.addEventListener('easytrip:account-ready', load);
})();
