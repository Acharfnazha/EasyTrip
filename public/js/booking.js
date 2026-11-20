// Hotels and chalets pages: the booking form in the stay's details dialog. A logged-in user
// chooses the dates, sees the price and what it leaves of their credit, and books. The credit
// is money an admin added to the account; when it isn't enough, the stay can't be booked.
// The server works out the real price and checks everything again (POST /api/bookings).
(function () {
  'use strict';

  const dialog = document.querySelector('[data-listing-dialog]');
  const box = dialog ? dialog.querySelector('[data-book]') : null;
  if (!box) return;

  const MAX_NIGHTS = 30;
  const DAY = 24 * 60 * 60 * 1000;

  const q = function (sel) { return box.querySelector(sel); };
  const note = q('[data-book-note]');
  const form = q('[data-book-form]');
  const guest = q('[data-book-guest]');
  const done = q('[data-book-done]');
  const doneText = q('[data-book-done-text]');
  const taken = q('[data-book-taken]');
  const sum = q('[data-book-sum]');
  const status = q('[data-book-status]');
  const submit = q('[data-book-submit]');
  const ask = q('[data-book-ask]');
  const start = form.elements.startDate;
  const end = form.elements.endDate;

  let stay = null; // The stay in the dialog.
  let credit = 0; // The user's credit, from the server.
  let booked = []; // The nights already taken: [{ startDate, endDate }].
  let openNumber = 0; // Only the answers for the stay opened last are used.

  // ---------- Dates and money ----------

  function isoDate(date) {
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  // "2027-01-18" plus 1 day is "2027-01-19".
  function addDays(iso, days) {
    const date = new Date(iso + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function nightsBetween(first, last) {
    return Math.round((Date.parse(last + 'T00:00:00Z') - Date.parse(first + 'T00:00:00Z')) / DAY);
  }

  function showDate(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // "$560" for a whole amount, "$1,000.50" with cents.
  function money(amount) {
    const digits = Number.isInteger(amount) ? 0 : 2;
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  // ---------- Showing things ----------

  function setError(name, message) {
    const field = form.elements[name];
    const text = form.querySelector('[data-error-for="' + name + '"]');
    text.textContent = message;
    text.hidden = !message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function showStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }

  function showNote(message) {
    note.textContent = message;
    note.hidden = !message;
  }

  // "Already booked: 20 Dec 2026 to 24 Dec 2026, ..."
  function showTaken() {
    if (booked.length === 0) {
      taken.hidden = true;
      return;
    }
    const shown = booked.slice(0, 4).map(function (range) {
      return showDate(range.startDate) + ' to ' + showDate(range.endDate);
    });
    const more = booked.length - shown.length;
    taken.textContent = 'Already booked: ' + shown.join(', ') + (more > 0 ? ', and ' + more + ' more' : '') + '.';
    taken.hidden = false;
  }

  // Two stays overlap when each one starts before the other ends. A stay can start on the day
  // another one ends.
  function overlapsBooked(first, last) {
    return booked.some(function (range) { return range.startDate < last && range.endDate > first; });
  }

  // Works out the price of the chosen dates and what it leaves of the credit, and says why
  // the booking can't be made when it can't. Returns true when the form can be sent.
  function update(showMissing) {
    setError('startDate', '');
    setError('endDate', '');
    showStatus('');
    sum.hidden = true;
    submit.disabled = false;
    ask.textContent = 'Ask about this stay';

    if (start.value) end.min = addDays(start.value, 1);

    if (!start.value || !end.value) {
      if (showMissing) {
        if (!start.value) setError('startDate', 'Choose your check-in date.');
        if (!end.value) setError('endDate', 'Choose your check-out date.');
      }
      return false;
    }
    if (start.value < start.min) {
      setError('startDate', "The check-in date can't be in the past.");
      return false;
    }
    if (start.value > start.max) {
      setError('startDate', 'The check-in date must be within one year from today.');
      return false;
    }
    const nights = nightsBetween(start.value, end.value);
    if (nights < 1) {
      setError('endDate', 'The check-out date must be after the check-in date.');
      return false;
    }
    if (nights > MAX_NIGHTS) {
      setError('endDate', 'A stay can be ' + MAX_NIGHTS + ' nights at most.');
      return false;
    }

    // Cents are whole numbers, so 3 nights at $99.99 is exactly $299.97.
    // With a discount, the server takes the percent off the whole stay, in cents, half a cent up
    // (server/utils/discounts.js); the same is done here so both show the same total.
    const cents = Math.round(stay.price * 100) * nights;
    const percent = stay.discount ? stay.discount.percent : 0;
    const total = Math.round(cents * (100 - percent) / 100) / 100;
    const left = Math.round((credit - total) * 100) / 100;
    q('[data-sum="nights"]').textContent = nights + (nights === 1 ? ' night' : ' nights') + ' × ' + money(stay.price);
    q('[data-sum="total"]').textContent = money(cents / 100);
    q('[data-sum-discount-row]').hidden = !percent;
    q('[data-sum-final-row]').hidden = !percent;
    if (percent) {
      q('[data-sum="discount-label"]').textContent = percent + '% off · ' + stay.discount.name;
      q('[data-sum="discount"]').textContent = '−' + money(Math.round(cents - total * 100) / 100);
      q('[data-sum="final"]').textContent = money(total);
    }
    q('[data-sum="credit"]').textContent = money(credit);
    q('[data-sum="left"]').textContent = left < 0 ? '−' + money(-left) : money(left);
    sum.hidden = false;

    if (overlapsBooked(start.value, end.value)) {
      setError('startDate', 'Some of these nights are already booked. Choose other dates.');
      return false;
    }
    if (left < 0) {
      showStatus('You need ' + money(-left) + ' more credit for these dates. Ask the EasyTrip team to add credit to your account.');
      submit.disabled = true;
      ask.textContent = 'Ask for credit';
      return false;
    }
    return true;
  }

  // ---------- Opening a stay ----------

  async function readJson(url) {
    try {
      const response = await fetch(url);
      return response.ok ? await response.json() : null;
    } catch (err) {
      return null;
    }
  }

  async function open(openedStay) {
    const thisOpen = ++openNumber;
    stay = openedStay;
    form.hidden = true;
    guest.hidden = true;
    done.hidden = true;
    showNote('Checking your account...');

    // Who is logged in (with their credit), and which nights of this stay are taken.
    const answers = await Promise.all([
      readJson('/api/auth/me'),
      readJson('/api/stays/' + stay.id + '/booked-dates')
    ]);
    if (thisOpen !== openNumber) return;

    if (!answers[0]) {
      showNote('Booking needs the server. You can still ask our team about this stay.');
      guest.hidden = false;
      return;
    }
    const guestLink = guest.querySelector('a');
    if (!answers[0].user) {
      showNote('Log in to book this stay. Bookings are paid with the credit on your account.');
      guestLink.textContent = 'Log in to book';
      guestLink.href = 'login.html';
      guest.hidden = false;
      return;
    }
    // Booking needs a verified identity (the server checks it again).
    const me = answers[0].user;
    if (me.verificationRequired && !me.idVerified) {
      showNote(me.idStatus === 'pending'
        ? 'Our team is checking your identity. You can book as soon as it is verified: we will email you.'
        : 'Verify your identity before you book: save your identity document and send a selfie on your account page.');
      guestLink.textContent = 'Verify my identity';
      guestLink.href = 'account.html#verify';
      guest.hidden = me.idStatus === 'pending';
      return;
    }

    credit = answers[0].user.credit;
    booked = answers[1] ? answers[1].booked : [];

    form.reset();
    const today = isoDate(new Date());
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    start.min = today;
    start.max = isoDate(nextYear);
    end.min = addDays(today, 1);
    // The dates and guests already chosen in the Stays search card, so they aren't typed twice.
    const searched = function (name) {
      const field = document.querySelector('[data-listing-filters] [data-filter="' + name + '"]');
      return field ? field.value : '';
    };
    if (searched('start') && searched('end') && searched('end') > searched('start')) {
      start.value = searched('start');
      end.value = searched('end');
    }
    if (searched('guests')) form.elements.travelers.value = searched('guests');
    ['startDate', 'endDate', 'travelers'].forEach(function (name) { setError(name, ''); });
    showTaken();
    update(false);

    showNote(credit > 0
      ? 'You have ' + money(credit) + ' of credit. Choose your dates to see the price.'
      : 'You have no credit yet. Ask the EasyTrip team to add credit to your account, then you can book this stay.');
    form.hidden = false;
  }

  dialog.addEventListener('easytrip:stay-opened', function (event) { open(event.detail); });

  form.addEventListener('input', function () { update(false); });
  form.addEventListener('change', function () { update(false); });

  // ---------- Booking ----------

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!update(true)) {
      const wrong = form.querySelector('[aria-invalid="true"]');
      if (wrong) wrong.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Booking...';
    let response;
    let result;
    try {
      response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accId: stay.id,
          startDate: start.value,
          endDate: end.value,
          travelers: form.elements.travelers.value
        })
      });
      result = await response.json();
    } catch (err) {
      showStatus("We can't reach the server right now. Please try again.");
      status.focus();
      return;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Book with my credit';
    }

    if (response.ok) {
      form.hidden = true;
      showNote('');
      doneText.textContent = result.message;
      done.hidden = false;
      doneText.focus();
      return;
    }

    if (response.status === 401) {
      showStatus('Your session has ended. Log in again to book this stay.');
      status.focus();
      return;
    }
    // The server knows more than the page: the credit may have changed, or someone else may
    // have booked these nights a moment ago.
    if (result.code === 'no-credit') {
      credit = result.credit;
      update(false);
    }
    if (result.code === 'dates-taken') {
      booked.push({ startDate: start.value, endDate: end.value });
    }
    if (result.fields) {
      let first = null;
      Object.keys(result.fields).forEach(function (name) {
        if (!form.elements[name]) return;
        setError(name, result.fields[name]);
        if (!first) first = form.elements[name];
      });
      if (first) {
        first.focus();
        return;
      }
    }
    showStatus(result.error || 'The booking could not be saved. Please try again.');
    status.focus();
  });
})();
