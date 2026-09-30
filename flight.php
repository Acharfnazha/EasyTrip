<?php
// Today's date (server time) is the earliest departure when JavaScript is off;
// js/flight.js replaces it with the visitor's own local date.
$today = date('Y-m-d');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flights — EasyTrip</title>
  <meta name="description" content="Plan your next flight with EasyTrip: enter your route, dates, travelers and cabin preference to preview the flight-search experience." />
  <link rel="preload" as="image" href="assets/images/tickets/flight-sky-1200.webp" media="(min-width: 48em)" fetchpriority="high" />
  <link rel="preload" as="image" href="assets/images/tickets/flight-sky-800.webp" media="(max-width: 47.99em)" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/flight.css" />
</head>
<body class="flight-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- 1. Compact hero: the photo's own night sky provides the dark background -->
    <section class="flight-hero" aria-labelledby="flight-hero-title">
      <picture class="flight-hero__media">
        <source type="image/webp" media="(max-width: 47.99em)" srcset="assets/images/tickets/flight-sky-800.webp" />
        <source type="image/webp" srcset="assets/images/tickets/flight-sky-1200.webp" />
        <img class="flight-hero__img" src="assets/images/tickets/flight.jpg" width="1199" height="669"
             alt="" fetchpriority="high" decoding="async" />
      </picture>
      <div class="et-container flight-hero__inner">
        <nav class="flight-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="tickets.php">Tickets</a></li>
            <li><span aria-current="page">Flights</span></li>
          </ol>
        </nav>
        <h1 class="flight-hero__title" id="flight-hero-title">Plan your next flight</h1>
        <p class="flight-hero__text">
          Enter your route, dates, and travel preferences to preview the EasyTrip flight-search experience.
        </p>
        <div class="flight-hero__actions">
          <a class="et-btn et-btn--primary et-btn--lg" href="#flight-planner">
            Start planning
            <svg class="et-btn__icon flight-icon-down" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>
          </a>
          <a class="et-btn et-btn--on-dark et-btn--lg" href="tickets.php">Other ticket options</a>
        </div>
      </div>
    </section>

    <!-- 2. Flight planner -->
    <section class="flight-planner-section" id="flight-planner" aria-labelledby="flight-planner-title">
      <div class="et-container">
        <header class="flight-section-head">
          <h2 class="flight-section-head__title" id="flight-planner-title">Build your flight search</h2>
          <p class="flight-section-head__text">
            This prototype prepares your search details. Live flight results will be connected during backend development.
          </p>
        </header>

        <form class="flight-planner" action="flight.php#flight-planner" method="get" data-flight-planner>
          <p class="flight-planner__required-note">All fields are required unless marked optional.</p>

          <fieldset class="flight-planner__group flight-planner__trip">
            <legend class="flight-planner__legend">Trip type</legend>
            <div class="flight-planner__segments">
              <label class="flight-planner__segment">
                <input type="radio" name="trip" value="round" checked data-trip />
                <span>Round trip</span>
              </label>
              <label class="flight-planner__segment">
                <input type="radio" name="trip" value="oneway" data-trip />
                <span>One way</span>
              </label>
            </div>
          </fieldset>

          <div class="flight-planner__route">
            <div class="flight-planner__field">
              <label class="flight-planner__label" for="flight-from">From</label>
              <input class="flight-planner__input" type="text" id="flight-from" name="from" required
                     autocomplete="off" maxlength="80" placeholder="e.g. Beirut" aria-describedby="flight-from-error" data-field="from" />
              <p class="flight-planner__error" id="flight-from-error" hidden></p>
            </div>
            <!-- Shown by js/flight.js -->
            <button class="flight-planner__swap" type="button" aria-label="Swap origin and destination" hidden data-swap>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>
            </button>
            <div class="flight-planner__field">
              <label class="flight-planner__label" for="flight-to">To</label>
              <input class="flight-planner__input" type="text" id="flight-to" name="to" required
                     autocomplete="off" maxlength="80" placeholder="e.g. Paris" aria-describedby="flight-to-error" data-field="to" />
              <p class="flight-planner__error" id="flight-to-error" hidden></p>
            </div>
          </div>

          <div class="flight-planner__dates">
            <div class="flight-planner__field">
              <label class="flight-planner__label" for="flight-depart">Departure date</label>
              <input class="flight-planner__input" type="date" id="flight-depart" name="depart" required
                     min="<?= $today ?>" aria-describedby="flight-depart-error" data-field="depart" />
              <p class="flight-planner__error" id="flight-depart-error" hidden></p>
            </div>
            <div class="flight-planner__field" data-return-field>
              <label class="flight-planner__label" for="flight-return">
                Return date <span class="flight-planner__optional">(round trip only)</span>
              </label>
              <input class="flight-planner__input" type="date" id="flight-return" name="return"
                     min="<?= $today ?>" aria-describedby="flight-return-error" data-field="return" />
              <p class="flight-planner__error" id="flight-return-error" hidden></p>
            </div>
          </div>

          <div class="flight-planner__prefs">
            <div class="flight-planner__field">
              <label class="flight-planner__label" for="flight-travelers">Travelers</label>
              <select class="flight-planner__input" id="flight-travelers" name="travelers" required
                      aria-describedby="flight-travelers-error" data-field="travelers">
                <?php for ($n = 1; $n <= 9; $n++): ?>
                  <option value="<?= $n ?>"><?= $n ?> traveler<?= $n === 1 ? '' : 's' ?></option>
                <?php endfor; ?>
              </select>
              <p class="flight-planner__error" id="flight-travelers-error" hidden></p>
            </div>
            <div class="flight-planner__field">
              <label class="flight-planner__label" for="flight-cabin">Cabin preference</label>
              <select class="flight-planner__input" id="flight-cabin" name="cabin" required
                      aria-describedby="flight-cabin-error" data-field="cabin">
                <option value="">Choose a cabin</option>
                <option value="economy">Economy</option>
                <option value="premium">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
              <p class="flight-planner__error" id="flight-cabin-error" hidden></p>
            </div>
          </div>

          <fieldset class="flight-planner__group flight-planner__options">
            <legend class="flight-planner__legend">Preferences <span class="flight-planner__optional">(optional)</span></legend>
            <label class="flight-planner__check">
              <input type="checkbox" name="nonstop" value="yes" data-pref="Non-stop flights preferred" />
              <span>Prefer non-stop flights</span>
            </label>
            <label class="flight-planner__check">
              <input type="checkbox" name="flexible" value="yes" data-pref="Flexible travel dates" />
              <span>My dates are flexible</span>
            </label>
          </fieldset>

          <div class="flight-planner__submit">
            <button class="et-btn et-btn--primary et-btn--lg" type="submit">Review search</button>
            <p class="flight-planner__submit-note">
              Nothing is booked. You'll see a summary of the details you entered.
            </p>
            <noscript>
              <p class="flight-planner__submit-note flight-planner__submit-note--noscript">
                Turn on JavaScript to see the search summary on this page.
              </p>
            </noscript>
          </div>
        </form>

        <!-- 3. Search summary: filled in by js/flight.js with the visitor's own details -->
        <section class="flight-summary" aria-labelledby="flight-summary-title" hidden data-flight-summary>
          <h3 class="flight-summary__title" id="flight-summary-title" tabindex="-1">Your flight search is ready</h3>
          <p class="flight-summary__route" data-summary-route></p>
          <dl class="flight-summary__details">
            <div><dt>Trip type</dt><dd data-summary="trip"></dd></div>
            <div><dt>From</dt><dd data-summary="from"></dd></div>
            <div><dt>To</dt><dd data-summary="to"></dd></div>
            <div><dt>Departure</dt><dd data-summary="depart"></dd></div>
            <div data-summary-return-row><dt>Return</dt><dd data-summary="return"></dd></div>
            <div><dt>Travelers</dt><dd data-summary="travelers"></dd></div>
            <div><dt>Cabin preference</dt><dd data-summary="cabin"></dd></div>
            <div><dt>Preferences</dt><dd data-summary="prefs"></dd></div>
          </dl>
          <p class="flight-summary__stale" hidden data-summary-stale>
            You've changed the search since this summary was made. Select “Review search” to update it.
          </p>
          <p class="flight-summary__notice">
            Live schedules, fares, and availability are not connected yet. This summary demonstrates the information
            that will be sent to the future flight-search backend.
          </p>
          <div class="flight-summary__actions">
            <button class="et-btn et-btn--primary" type="button" data-edit-search>Edit search</button>
            <a class="et-btn et-btn--outline" href="contact.php?topic=flights">Ask about this route</a>
            <a class="flight-text-link" href="tickets.php">View other ticket options</a>
          </div>
        </section>
      </div>
    </section>

    <!-- 4. What the prototype demonstrates + backend handoff -->
    <section class="flight-demo" aria-labelledby="flight-demo-title">
      <div class="et-container">
        <header class="flight-section-head">
          <h2 class="flight-section-head__title" id="flight-demo-title">What this prototype demonstrates</h2>
        </header>
        <ol class="flight-steps">
          <li class="flight-steps__item">
            <h3 class="flight-steps__title">An accessible search form</h3>
            <p class="flight-steps__text">Visible labels, clear choices and keyboard-friendly controls for route, dates, travelers and cabin.</p>
          </li>
          <li class="flight-steps__item">
            <h3 class="flight-steps__title">Helpful validation</h3>
            <p class="flight-steps__text">Checks for a different origin and destination, a departure from today onwards and a return after departure.</p>
          </li>
          <li class="flight-steps__item">
            <h3 class="flight-steps__title">A summary ready for the backend</h3>
            <p class="flight-steps__text">A structured review of the search, prepared for the future flight-search service.</p>
          </li>
        </ol>
        <p class="flight-handoff">
          <strong>How it will connect:</strong> the form currently demonstrates the frontend workflow. A future backend can
          send these search parameters to a flight-data provider and return real schedules and fares.
        </p>
      </div>
    </section>

    <!-- 5. Destination inspiration (links to the real season pages; no prices) -->
    <section class="flight-inspire" aria-labelledby="flight-inspire-title">
      <div class="et-container flight-inspire__inner">
        <div class="flight-inspire__copy">
          <h2 class="flight-section-head__title" id="flight-inspire-title">Still choosing where to go?</h2>
          <p class="flight-section-head__text">Explore seasonal destination ideas before preparing your flight search.</p>
          <a class="et-btn et-btn--outline et-btn--lg" href="destinations.php">
            Explore destinations
            <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
          </a>
        </div>
        <ul class="flight-seasons">
          <?php foreach (['winter' => ['Winter', 420], 'spring' => ['Spring', 400], 'summer' => ['Summer', 400], 'autumn' => ['Autumn', 400]] as $key => [$label, $h]): ?>
            <li>
              <a class="flight-seasons__link" href="<?= $key ?>.php">
                <img class="flight-seasons__img" src="assets/images/destinations/<?= $key ?>.webp" width="600" height="<?= $h ?>"
                     alt="" loading="lazy" decoding="async" />
                <span class="flight-seasons__label"><?= $label ?> ideas</span>
              </a>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>
    </section>

    <!-- 6. Final step -->
    <section class="flight-cta" aria-labelledby="flight-cta-title">
      <div class="et-container">
        <div class="flight-cta__panel">
          <h2 class="flight-cta__title" id="flight-cta-title">Need help planning the journey?</h2>
          <p class="flight-cta__text">Our team can help you think through routes and dates, or you can compare other ways to travel.</p>
          <div class="flight-cta__actions">
            <a class="et-btn et-btn--on-dark et-btn--lg" href="contact.php">Contact EasyTrip</a>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="tickets.php">See all ticket options</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <?php include __DIR__ . '/partials/footer.php'; ?>

  <script src="js/includes.js"></script>
  <script src="js/flight.js"></script>
</body>
</html>
