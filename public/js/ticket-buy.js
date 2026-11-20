// Flight and bus & train pages: buying the ticket of the summary with credit. The planner
// (js/flight.js or js/bus-train.js) checks the form and shows the summary; then it sends the
// event "easytrip:plan-ready" with the ticket. This script shows the sample fare, what it
// leaves of the user's credit, and the "Buy with my credit" button.
// The server works out the real price and checks everything again (POST /api/tickets).
(function () {
  'use strict';

  const box = document.querySelector('[data-ticket-buy]');
  if (!box) return;

  const q = function (sel) { return box.querySelector(sel); };
  const status = q('[data-buy-status]');
  const buyButton = q('[data-buy-submit]');
  const loginLink = q('[data-buy-login]');
  const askLink = q('[data-buy-ask]');
  const accountLink = q('[data-buy-account]');
  const creditRow = q('[data-buy-credit-row]');
  const leftRow = q('[data-buy-left-row]');

  let ticket = null; // The ticket of the summary, as the server expects it.
  let fares = null; // The sample fares, from the server.
  let discount = null; // This customer's discount on tickets today ({ name, percent }), or null.
  let user = null; // The logged-in user (with their credit), or null for a visitor.
  let stale = false; // true when the form changed after the summary was made.
  let planNumber = 0; // Only the answers for the newest summary are used.

  // "$560" for a whole amount, "$1,000.50" with cents.
  function money(amount) {
    const digits = Number.isInteger(amount) ? 0 : 2;
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function put(name, text) {
    q('[data-buy="' + name + '"]').textContent = text;
  }

  function showStatus(message, kind) {
    status.textContent = message;
    status.className = 'ticket-buy__status' + (kind ? ' ticket-buy__status--' + kind : '');
    status.hidden = !message;
  }

  async function readJson(url) {
    try {
      const response = await fetch(url);
      return response.ok ? await response.json() : null;
    } catch (err) {
      return null;
    }
  }

  // The price of the whole ticket: the fare for one traveler going one way, times the
  // travelers, times 2 for a round trip. The server uses the same rule (utils/fares.js).
  function fullPriceOf(plan) {
    const fare = fares[plan.type] ? fares[plan.type][plan.seatClass] : 0;
    return fare * plan.travelers * (plan.tripType === 'round' ? 2 : 1);
  }

  // What is paid: the full price, less the discount (in cents, half a cent up, like the server).
  function totalOf(plan) {
    const full = fullPriceOf(plan);
    return discount ? Math.round(full * (100 - discount.percent)) / 100 : full;
  }

  // Shows the price, the credit and the right button for who is looking at the page.
  function draw() {
    const fare = fares[ticket.type][ticket.seatClass];
    const total = totalOf(ticket);
    put('fare', 'Sample fare: ' + ticket.travelers + (ticket.travelers === 1 ? ' traveler' : ' travelers') +
      ' × ' + money(fare) + (ticket.tripType === 'round' ? ' × 2 ways' : ', one way'));
    put('total', money(fullPriceOf(ticket)));
    q('[data-buy-discount-row]').hidden = !discount;
    q('[data-buy-final-row]').hidden = !discount;
    if (discount) {
      put('discount-label', discount.percent + '% off · ' + discount.name);
      put('discount', '−' + money(Math.round((fullPriceOf(ticket) - total) * 100) / 100));
      put('final', money(total));
    }

    buyButton.hidden = true;
    buyButton.disabled = false;
    loginLink.hidden = true;
    askLink.hidden = true;
    accountLink.hidden = true;
    creditRow.hidden = !user;
    leftRow.hidden = !user;
    showStatus('');

    if (!user) {
      loginLink.textContent = 'Log in to buy';
      loginLink.href = 'login.html';
      loginLink.hidden = false;
      showStatus('Log in to buy this ticket. Tickets are paid with the credit on your account.');
      return;
    }
    // Buying needs a verified identity (the server checks it again).
    if (user.verificationRequired && !user.idVerified) {
      creditRow.hidden = true;
      leftRow.hidden = true;
      loginLink.textContent = 'Verify my identity';
      loginLink.href = 'account.html#verify';
      loginLink.hidden = user.idStatus === 'pending';
      showStatus(user.idStatus === 'pending'
        ? 'Our team is checking your identity. You can buy tickets as soon as it is verified: we will email you.'
        : 'Verify your identity before you buy a ticket: save your identity document and send a selfie on your account page.');
      return;
    }

    const left = user.credit - total;
    put('credit', money(user.credit));
    put('left', left < 0 ? '−' + money(-left) : money(left));
    buyButton.hidden = false;

    if (left < 0) {
      buyButton.disabled = true;
      askLink.hidden = false;
      showStatus('You need ' + money(-left) + ' more credit for this ticket. Ask the EasyTrip team to add credit to your account.', 'error');
    } else if (stale) {
      buyButton.disabled = true;
      showStatus('You changed the form after this summary was made. Review it again before you buy.');
    }
  }

  // The planner made a new summary.
  document.addEventListener('easytrip:plan-ready', async function (event) {
    const thisPlan = ++planNumber;
    ticket = event.detail;
    stale = false;
    box.hidden = true;

    // The fares are read once. Who is logged in is asked each time: the credit may have changed.
    if (!fares) {
      const answer = await readJson('/api/tickets/fares');
      fares = answer ? answer.fares : null;
      discount = answer ? answer.discount || null : null;
    }
    const me = await readJson('/api/auth/me');
    if (thisPlan !== planNumber) return;
    // No server (the page was opened as a file): the summary stays as it was, without prices.
    if (!fares || !me || !fares[ticket.type] || !fares[ticket.type][ticket.seatClass]) return;

    user = me.user;
    draw();
    box.hidden = false;
  });

  // The form was changed after the summary (or changed back to it).
  document.addEventListener('easytrip:plan-stale', function (event) {
    if (!ticket || box.hidden || !accountLink.hidden) return; // nothing shown, or already bought
    stale = event.detail.stale;
    draw();
  });

  buyButton.addEventListener('click', async function () {
    buyButton.disabled = true;
    buyButton.textContent = 'Buying...';
    let response;
    let result;
    try {
      response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      result = await response.json();
    } catch (err) {
      buyButton.disabled = false;
      buyButton.textContent = 'Buy with my credit';
      showStatus("We can't reach the server right now. Please try again.", 'error');
      status.focus();
      return;
    }
    buyButton.textContent = 'Buy with my credit';

    if (response.ok) {
      // Bought: the button gives way to a link to the account page.
      user.credit = result.credit;
      put('credit', money(result.credit + totalOf(ticket)));
      buyButton.hidden = true;
      askLink.hidden = true;
      accountLink.hidden = false;
      showStatus(result.message, 'success');
      status.focus();
      return;
    }

    if (response.status === 401) {
      user = null;
      draw();
      showStatus('Your session has ended. Log in again to buy this ticket.', 'error');
      status.focus();
      return;
    }
    // The server knows more than the page: the credit may have changed since the summary.
    if (result.code === 'no-credit') {
      user.credit = result.credit;
      draw();
      status.focus();
      return;
    }
    buyButton.disabled = false;
    // 400: one message per wrong field. The planner's own checks catch these first, so this
    // is rare (for example a date that became "yesterday" while the page stayed open).
    const fieldErrors = result.fields ? Object.keys(result.fields).map(function (name) { return result.fields[name]; }) : [];
    showStatus(fieldErrors.length > 0 ? fieldErrors.join(' ') : (result.error || 'The ticket could not be saved. Please try again.'), 'error');
    status.focus();
  });
})();
