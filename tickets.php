<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tickets — EasyTrip</title>
  <meta name="description" content="Choose how you want to travel: explore EasyTrip's flight planning page for longer journeys, or bus and train travel for regional routes." />
  <link rel="preload" as="image" href="assets/images/tickets/planning.webp" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/tickets.css" />
</head>
<body class="tickets-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- 1. Compact hero -->
    <section class="tkt-hero" aria-labelledby="tkt-hero-title">
      <div class="et-container tkt-hero__inner">
        <div class="tkt-hero__copy">
          <p class="tkt-eyebrow">Tickets</p>
          <h1 class="tkt-hero__title" id="tkt-hero-title">Choose how you want to travel</h1>
          <p class="tkt-hero__text">
            Explore flight options for longer journeys, or browse bus and train travel for regional routes.
          </p>
          <div class="tkt-hero__actions">
            <a class="et-btn et-btn--primary et-btn--lg" href="#tkt-options">
              Compare travel options
              <svg class="et-btn__icon tkt-icon-down" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>
            </a>
            <a class="tkt-text-link" href="contact.php">Need travel help? Contact us</a>
          </div>
        </div>
        <div class="tkt-hero__media">
          <picture>
            <source type="image/webp" srcset="assets/images/tickets/planning.webp" />
            <img class="tkt-hero__img" src="assets/images/tickets-page.png" width="735" height="489"
                 alt="Boarding passes and a passport on a map beside a model plane"
                 fetchpriority="high" decoding="async" />
          </picture>
        </div>
      </div>
    </section>

    <!-- 2. The two transport paths -->
    <section class="tkt-options" id="tkt-options" aria-labelledby="tkt-options-title">
      <div class="et-container">
        <header class="tkt-section-head">
          <h2 class="tkt-section-head__title" id="tkt-options-title">Find the right route for your trip</h2>
          <p class="tkt-section-head__text">Start with the type of journey you are planning.</p>
        </header>

        <div class="tkt-modes">
          <article class="tkt-mode tkt-mode--air" aria-labelledby="tkt-air-title">
            <div class="tkt-mode__media">
              <picture>
                <source type="image/webp"
                        srcset="assets/images/tickets/flight-wing-800.webp 800w, assets/images/tickets/flight-wing-1080.webp 1080w"
                        sizes="(min-width: 64em) 580px, 100vw" />
                <img class="tkt-mode__img" src="assets/images/flight-tickets.png" width="800" height="500"
                     alt="Aircraft wing above the clouds at sunset" loading="lazy" decoding="async" />
              </picture>
            </div>
            <div class="tkt-mode__body">
              <p class="tkt-mode__eyebrow">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15.5v-1.8l-8-5V3.5a1.5 1.5 0 0 0-3 0v5.2l-8 5v1.8l8-2.5v5.5l-2 1.5v1.5l3.5-1 3.5 1V20l-2-1.5V13z"/></svg>
                By air
              </p>
              <h3 class="tkt-mode__title" id="tkt-air-title">Travel farther by air</h3>
              <p class="tkt-mode__text">
                Explore the flight-planning interface for international and long-distance journeys.
              </p>
              <p class="tkt-mode__label" id="tkt-air-uses">Often a good fit for</p>
              <ul class="tkt-mode__uses" aria-labelledby="tkt-air-uses">
                <li>International travel</li>
                <li>Long-distance routes</li>
                <li>Faster travel between major cities</li>
              </ul>
              <a class="et-btn et-btn--primary tkt-mode__action" href="flight.php">
                Explore flights
                <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
              </a>
            </div>
          </article>

          <article class="tkt-mode tkt-mode--ground" aria-labelledby="tkt-ground-title">
            <div class="tkt-mode__media">
              <picture>
                <source type="image/webp" srcset="assets/images/tickets/train-valley.webp" />
                <img class="tkt-mode__img" src="assets/images/travel/traintravel.png" width="608" height="380"
                     alt="Red regional train winding through a green mountain valley" loading="lazy" decoding="async" />
              </picture>
            </div>
            <div class="tkt-mode__body">
              <p class="tkt-mode__eyebrow">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l-2 0 1.5-4M15 21h2l-1.5-4"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/></svg>
                By bus or train
              </p>
              <h3 class="tkt-mode__title" id="tkt-ground-title">Explore regional travel</h3>
              <p class="tkt-mode__text">
                View the bus and train planning interface for regional journeys and travel between nearby cities.
              </p>
              <p class="tkt-mode__label" id="tkt-ground-uses">Often a good fit for</p>
              <ul class="tkt-mode__uses" aria-labelledby="tkt-ground-uses">
                <li>Regional routes</li>
                <li>Travel between nearby cities</li>
                <li>Scenic, ground-based journeys</li>
              </ul>
              <a class="et-btn et-btn--primary tkt-mode__action" href="bus-train.php">
                Explore bus &amp; train
                <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 3. Quick comparison (two stacked columns, no wide table) -->
    <section class="tkt-compare" aria-labelledby="tkt-compare-title">
      <div class="et-container">
        <header class="tkt-section-head">
          <h2 class="tkt-section-head__title" id="tkt-compare-title">Which option suits your journey?</h2>
          <p class="tkt-section-head__text">General guidance to help you choose. Every trip is different.</p>
        </header>

        <div class="tkt-compare__grid">
          <section class="tkt-compare__col tkt-compare__col--air" aria-labelledby="tkt-compare-air">
            <h3 class="tkt-compare__title" id="tkt-compare-air">Flights</h3>
            <dl class="tkt-compare__list">
              <div class="tkt-compare__row">
                <dt>Journey type</dt>
                <dd>Better suited to international or long-distance travel.</dd>
              </div>
              <div class="tkt-compare__row">
                <dt>Often chosen when</dt>
                <dd>Travel time matters most.</dd>
              </div>
              <div class="tkt-compare__row">
                <dt>Next step</dt>
                <dd>Continue to the <a href="flight.php">flight-planning page</a>.</dd>
              </div>
            </dl>
          </section>

          <section class="tkt-compare__col tkt-compare__col--ground" aria-labelledby="tkt-compare-ground">
            <h3 class="tkt-compare__title" id="tkt-compare-ground">Bus &amp; train</h3>
            <dl class="tkt-compare__list">
              <div class="tkt-compare__row">
                <dt>Journey type</dt>
                <dd>Better suited to regional travel or trips between connected cities.</dd>
              </div>
              <div class="tkt-compare__row">
                <dt>Often chosen when</dt>
                <dd>You prefer to travel over land and see the landscape along the way.</dd>
              </div>
              <div class="tkt-compare__row">
                <dt>Next step</dt>
                <dd>Continue to the <a href="bus-train.php">bus and train planning page</a>.</dd>
              </div>
            </dl>
          </section>
        </div>

        <!-- 4. Honest note about the prototype -->
        <div class="tkt-notice">
          <svg class="tkt-notice__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>
          <p class="tkt-notice__text">
            <strong>A planning preview.</strong>
            EasyTrip currently demonstrates the trip-planning experience for a university project, so the search forms
            and example routes are for demonstration. Live transport schedules, availability, payments, and ticket
            confirmation will be connected during backend development.
          </p>
        </div>
      </div>
    </section>

    <!-- 5. Final step -->
    <section class="tkt-cta" aria-labelledby="tkt-cta-title">
      <div class="et-container">
        <div class="tkt-cta__panel">
          <h2 class="tkt-cta__title" id="tkt-cta-title">Ready to plan your route?</h2>
          <p class="tkt-cta__text">Pick the kind of journey you have in mind and continue from there.</p>
          <div class="tkt-cta__actions">
            <a class="et-btn et-btn--on-dark et-btn--lg" href="flight.php">Explore flights</a>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="bus-train.php">Explore bus &amp; train</a>
          </div>
          <p class="tkt-cta__help">Not sure which to choose? <a href="contact.php">Ask for help</a></p>
        </div>
      </div>
    </section>
  </main>

  <?php include __DIR__ . '/partials/footer.php'; ?>

  <script src="js/includes.js"></script>
</body>
</html>
