<?php
// Today's date (server time) is the earliest departure when JavaScript is off;
// js/bus-train.js replaces it with the visitor's own local date.
$today = date('Y-m-d');

// Text that changes with the transport mode. js/bus-train.js reads the same
// values from data attributes on each radio button.
$modes = [
  'bus' => [
    'label' => 'Bus',
    'title' => 'Plan a bus journey',
    'text' => 'Prepare an intercity bus journey.',
    'place' => 'City or bus station',
  ],
  'train' => [
    'label' => 'Train',
    'title' => 'Plan a train journey',
    'text' => 'Prepare a regional or intercity rail journey.',
    'place' => 'City or train station',
  ],
];
$e = fn($s) => htmlspecialchars($s, ENT_QUOTES);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bus &amp; Train — EasyTrip</title>
  <meta name="description" content="Plan a regional journey by bus or train with EasyTrip: choose your route, dates and travel preferences, then review your trip details." />
  <link rel="preload" as="image" href="assets/images/travel/train-valley-hero.webp" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/bus-train.css" />
</head>
<body class="ground-travel-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- 1. Compact hero -->
    <section class="ground-hero" aria-labelledby="ground-hero-title">
      <div class="et-container ground-hero__inner">
        <div class="ground-hero__copy">
          <nav class="ground-breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li><a href="tickets.php">Tickets</a></li>
              <li><span aria-current="page">Bus &amp; train</span></li>
            </ol>
          </nav>
          <h1 class="ground-hero__title" id="ground-hero-title">Plan your journey by bus or train</h1>
          <p class="ground-hero__text">
            Prepare a regional route, choose your travel dates, and review your trip details before live transport data is connected.
          </p>
          <div class="ground-hero__actions">
            <a class="et-btn et-btn--primary et-btn--lg" href="#route-planner">
              Start planning
              <svg class="et-btn__icon ground-icon-down" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>
            </a>
            <a class="et-btn et-btn--outline et-btn--lg" href="tickets.php">Other ticket options</a>
          </div>
        </div>
        <div class="ground-hero__media">
          <picture>
            <source type="image/webp" srcset="assets/images/travel/train-valley-hero.webp" />
            <img class="ground-hero__img" src="assets/images/travel/traintravel.png" width="608" height="520"
                 alt="Red regional train on a mountain railway above a turquoise lake"
                 fetchpriority="high" decoding="async" />
          </picture>
        </div>
      </div>
    </section>

    <!-- 2. Route planner: one form for both bus and train -->
    <section class="route-planner-section" id="route-planner" aria-labelledby="route-planner-title">
      <div class="et-container">
        <header class="ground-section-head">
          <h2 class="ground-section-head__title" id="route-planner-title" data-mode-title><?= $e($modes['bus']['title']) ?></h2>
          <p class="ground-section-head__text">
            <span data-mode-text><?= $e($modes['bus']['text']) ?></span>
            This prototype prepares your route details. Live routes and schedules will be connected during backend development.
          </p>
        </header>

        <form class="route-planner" action="bus-train.php#route-planner" method="get" data-route-planner data-mode="bus">
          <p class="route-planner__required-note">All fields are required unless marked optional.</p>

          <div class="route-planner__choices">
            <fieldset class="route-planner__group" aria-describedby="route-mode-error">
              <legend class="route-planner__legend">Transport type</legend>
              <div class="route-planner__segments">
                <?php foreach ($modes as $key => $m): ?>
                  <label class="route-planner__segment route-planner__mode">
                    <input type="radio" name="mode" value="<?= $key ?>" <?= $key === 'bus' ? 'checked' : '' ?> data-field-mode
                           data-title="<?= $e($m['title']) ?>" data-text="<?= $e($m['text']) ?>" data-place="<?= $e($m['place']) ?>" />
                    <span>
                      <?php if ($key === 'bus'): ?>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/></svg>
                      <?php else: ?>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 21l1.5-4M15 21l-1.5-4M12 3v7"/><circle cx="9" cy="13.5" r=".6"/><circle cx="15" cy="13.5" r=".6"/></svg>
                      <?php endif; ?>
                      <?= $m['label'] ?>
                    </span>
                  </label>
                <?php endforeach; ?>
              </div>
              <p class="route-planner__error" id="route-mode-error" hidden></p>
            </fieldset>

            <fieldset class="route-planner__group" aria-describedby="route-trip-error">
              <legend class="route-planner__legend">Trip type</legend>
              <div class="route-planner__segments">
                <label class="route-planner__segment">
                  <input type="radio" name="trip" value="round" checked data-field-trip />
                  <span>Round trip</span>
                </label>
                <label class="route-planner__segment">
                  <input type="radio" name="trip" value="oneway" data-field-trip />
                  <span>One way</span>
                </label>
              </div>
              <p class="route-planner__error" id="route-trip-error" hidden></p>
            </fieldset>
          </div>

          <div class="route-planner__route">
            <div class="route-planner__field">
              <label class="route-planner__label" for="route-from">From</label>
              <input class="route-planner__input" type="text" id="route-from" name="from" required maxlength="80"
                     autocomplete="off" placeholder="<?= $e($modes['bus']['place']) ?>" aria-describedby="route-from-error"
                     data-field="from" data-mode-placeholder />
              <p class="route-planner__error" id="route-from-error" hidden></p>
            </div>
            <!-- Shown by js/bus-train.js -->
            <button class="route-planner__swap" type="button" aria-label="Swap origin and destination"
                    title="Swap origin and destination" hidden data-swap>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>
              <span class="route-planner__swap-text" aria-hidden="true">Swap</span>
            </button>
            <div class="route-planner__field">
              <label class="route-planner__label" for="route-to">To</label>
              <input class="route-planner__input" type="text" id="route-to" name="to" required maxlength="80"
                     autocomplete="off" placeholder="<?= $e($modes['bus']['place']) ?>" aria-describedby="route-to-error"
                     data-field="to" data-mode-placeholder />
              <p class="route-planner__error" id="route-to-error" hidden></p>
            </div>
          </div>

          <div class="route-planner__row">
            <div class="route-planner__field">
              <label class="route-planner__label" for="route-depart">Departure date</label>
              <input class="route-planner__input" type="date" id="route-depart" name="depart" required
                     min="<?= $today ?>" aria-describedby="route-depart-error" data-field="depart" />
              <p class="route-planner__error" id="route-depart-error" hidden></p>
            </div>
            <div class="route-planner__field" data-return-field>
              <label class="route-planner__label" for="route-return">
                Return date <span class="route-planner__optional">(round trip only)</span>
              </label>
              <input class="route-planner__input" type="date" id="route-return" name="return"
                     min="<?= $today ?>" aria-describedby="route-return-error" data-field="return" />
              <p class="route-planner__error" id="route-return-error" hidden></p>
            </div>
          </div>

          <div class="route-planner__row">
            <div class="route-planner__field">
              <label class="route-planner__label" for="route-travelers">Travelers</label>
              <select class="route-planner__input" id="route-travelers" name="travelers" required
                      aria-describedby="route-travelers-error" data-field="travelers">
                <?php for ($n = 1; $n <= 9; $n++): ?>
                  <option value="<?= $n ?>"><?= $n ?> traveler<?= $n === 1 ? '' : 's' ?></option>
                <?php endfor; ?>
              </select>
              <p class="route-planner__error" id="route-travelers-error" hidden></p>
            </div>

            <!-- Mode-specific preference: only the current mode's field is shown and sent. -->
            <div class="route-planner__field" data-for-mode="bus">
              <label class="route-planner__label" for="route-bus-seat">Bus seating preference</label>
              <select class="route-planner__input" id="route-bus-seat" name="bus_seat"
                      aria-describedby="route-bus-seat-error" data-field="bus-seat">
                <option value="">Choose a preference</option>
                <option value="standard">Standard seating</option>
                <option value="premium">Premium seating</option>
              </select>
              <p class="route-planner__error" id="route-bus-seat-error" hidden></p>
            </div>
            <div class="route-planner__field" data-for-mode="train">
              <label class="route-planner__label" for="route-train-class">Train class preference</label>
              <select class="route-planner__input" id="route-train-class" name="train_class"
                      aria-describedby="route-train-class-error" data-field="train-class">
                <option value="">Choose a preference</option>
                <option value="standard">Standard class</option>
                <option value="first">First class</option>
                <option value="sleeper">Sleeper</option>
              </select>
              <p class="route-planner__error" id="route-train-class-error" hidden></p>
            </div>
          </div>

          <fieldset class="route-planner__group route-planner__options">
            <legend class="route-planner__legend">Route preferences <span class="route-planner__optional">(optional)</span></legend>
            <label class="route-planner__check">
              <input type="checkbox" name="direct" value="yes" data-pref="Prefer direct routes" />
              <span>Prefer direct routes</span>
            </label>
            <label class="route-planner__check" data-for-mode="bus">
              <input type="checkbox" name="overnight" value="yes" data-pref="Open to overnight buses" />
              <span>Open to overnight buses</span>
            </label>
            <label class="route-planner__check" data-for-mode="train">
              <input type="checkbox" name="highspeed" value="yes" data-pref="Prefer high-speed trains" />
              <span>Prefer high-speed trains</span>
            </label>
            <p class="route-planner__hint">
              Preferences are included in your route summary. Not every route or operator offers every option.
            </p>
          </fieldset>

          <div class="route-planner__submit">
            <button class="et-btn et-btn--primary et-btn--lg" type="submit">Review route</button>
            <p class="route-planner__submit-note">Nothing is booked. You'll see a summary of the details you entered.</p>
            <noscript>
              <p class="route-planner__submit-note route-planner__submit-note--noscript">
                Turn on JavaScript to see the route summary on this page.
              </p>
            </noscript>
          </div>
        </form>

        <!-- 3. Route summary: filled in by js/bus-train.js with the visitor's own details -->
        <section class="route-summary" aria-labelledby="route-summary-title" hidden data-route-summary>
          <h3 class="route-summary__title" id="route-summary-title" tabindex="-1">Your route plan is ready</h3>
          <p class="route-summary__route" data-summary-route></p>
          <dl class="route-summary__details">
            <div><dt>Transport</dt><dd data-summary="mode"></dd></div>
            <div><dt>Trip type</dt><dd data-summary="trip"></dd></div>
            <div><dt>From</dt><dd data-summary="from"></dd></div>
            <div><dt>To</dt><dd data-summary="to"></dd></div>
            <div><dt>Departure</dt><dd data-summary="depart"></dd></div>
            <div data-summary-return-row><dt>Return</dt><dd data-summary="return"></dd></div>
            <div><dt>Travelers</dt><dd data-summary="travelers"></dd></div>
            <div><dt data-summary-class-label>Seating preference</dt><dd data-summary="class"></dd></div>
            <div class="route-summary__wide"><dt>Route preferences</dt><dd data-summary="prefs"></dd></div>
          </dl>
          <p class="route-summary__stale" hidden data-summary-stale>
            You've changed the route since this summary was made. Select “Review route” to update it.
          </p>
          <p class="route-summary__notice">
            Live schedules, operators, fares, and seat availability are not connected yet. This summary demonstrates the
            information that will be sent to the future transport backend.
          </p>
          <div class="route-summary__actions">
            <button class="et-btn et-btn--primary" type="button" data-edit-route>Edit route</button>
            <a class="et-btn et-btn--outline" href="contact.php?topic=bus-train">Ask about this journey</a>
            <a class="ground-text-link" href="tickets.php">View other ticket options</a>
            <a class="ground-text-link" href="flight.php">Plan a flight instead</a>
          </div>
        </section>
      </div>
    </section>

    <!-- 4. How the planner works + backend note -->
    <section class="ground-how" aria-labelledby="ground-how-title">
      <div class="et-container">
        <header class="ground-section-head">
          <h2 class="ground-section-head__title" id="ground-how-title">How this planner works</h2>
        </header>
        <ol class="ground-steps">
          <li class="ground-steps__item">
            <h3 class="ground-steps__title">Choose bus or train</h3>
            <p class="ground-steps__text">Pick the kind of ground travel you have in mind.</p>
          </li>
          <li class="ground-steps__item">
            <h3 class="ground-steps__title">Enter your route and travel details</h3>
            <p class="ground-steps__text">Add where you are going, when, how many people are traveling and any preferences.</p>
          </li>
          <li class="ground-steps__item">
            <h3 class="ground-steps__title">Review your plan</h3>
            <p class="ground-steps__text">Check the information prepared for a future backend search.</p>
          </li>
        </ol>
        <p class="ground-handoff">
          <strong>How it will connect:</strong> this page currently demonstrates the route-planning frontend. A future
          backend can send the selected mode, route, dates, and preferences to transport providers and return real
          schedules and fares.
        </p>
      </div>
    </section>

    <!-- 5. Editorial: ground travel in general (no routes, schedules or fares) -->
    <section class="ground-editorial" aria-labelledby="ground-editorial-title">
      <div class="et-container ground-editorial__inner">
        <div class="ground-editorial__media">
          <picture>
            <source type="image/webp" srcset="assets/images/travel/camper-van.webp" />
            <img class="ground-editorial__img" src="assets/images/travel/bustravel.png" width="720" height="480"
                 alt="Yellow EasyTrip camper van parked among wildflowers below green mountains"
                 loading="lazy" decoding="async" />
          </picture>
        </div>
        <div class="ground-editorial__copy">
          <h2 class="ground-section-head__title" id="ground-editorial-title">Travel at ground level</h2>
          <p class="ground-section-head__text">
            Bus and train travel can be useful for regional journeys, connected cities, and travelers who prefer to see
            more along the way.
          </p>
          <a class="et-btn et-btn--outline et-btn--lg" href="destinations.php">
            Explore destinations
            <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
          </a>
        </div>
      </div>
    </section>

    <!-- 6. Final step -->
    <section class="ground-cta" aria-labelledby="ground-cta-title">
      <div class="et-container">
        <div class="ground-cta__panel">
          <h2 class="ground-cta__title" id="ground-cta-title">Need help with your route?</h2>
          <p class="ground-cta__text">Contact EasyTrip or explore another ticket type.</p>
          <div class="ground-cta__actions">
            <a class="et-btn et-btn--on-dark et-btn--lg" href="contact.php">Contact EasyTrip</a>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="tickets.php">See all ticket options</a>
          </div>
          <p class="ground-cta__more"><a href="flight.php">Plan a flight</a></p>
        </div>
      </div>
    </section>
  </main>

  <?php include __DIR__ . '/partials/footer.php'; ?>

  <script src="js/includes.js"></script>
  <script src="js/bus-train.js"></script>
</body>
</html>
