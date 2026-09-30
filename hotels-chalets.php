<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotels &amp; Chalets — EasyTrip</title>
  <meta name="description" content="Compare city hotels and nature chalets, see which suits your trip, and continue to EasyTrip's hotel or chalet listings." />
  <link rel="preload" as="image" href="assets/images/stays/hotel-room-city.webp" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/hotels-chalets.css" />
</head>
<body class="hc-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- 1. Hero: headline beside a hotel + chalet photo pair -->
    <section class="hc-hero" aria-labelledby="hc-hero-title">
      <div class="et-container hc-hero__inner">
        <div class="hc-hero__copy">
          <p class="hc-eyebrow">Hotels &amp; chalets</p>
          <h1 class="hc-hero__title" id="hc-hero-title">Stay somewhere worth remembering</h1>
          <p class="hc-hero__text">
            Choose a city hotel for convenience and connection, or escape to a chalet surrounded by nature.
          </p>
          <a class="et-btn et-btn--primary et-btn--lg" href="#choose">
            Explore your options
            <svg class="et-btn__icon hc-down" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>
          </a>
          <p class="hc-hero__shortcut">
            Already know? Go straight to
            <a href="hotels.php">hotels</a> or <a href="chalets.php">chalets</a>.
          </p>
        </div>

        <div class="hc-hero__media">
          <picture>
            <source type="image/webp" srcset="assets/images/stays/hotel-room-city.webp" />
            <img class="hc-hero__img hc-hero__img--main" src="assets/images/hotel-2-image.jpg" width="450" height="600"
                 alt="Hotel room with floor-to-ceiling windows overlooking a city skyline"
                 fetchpriority="high" decoding="async" />
          </picture>
          <picture>
            <source type="image/webp" srcset="assets/images/stays/chalet-garden.webp" />
            <img class="hc-hero__img hc-hero__img--inset" src="assets/images/chalet-12-image.jpg" width="600" height="400"
                 alt="Wooden chalet with a flower garden below green mountains"
                 decoding="async" />
          </picture>
        </div>
      </div>
    </section>

    <!-- 2. The choice: hotels and chalets, each with its own character -->
    <section class="hc-choose" id="choose" aria-labelledby="hc-choose-title">
      <div class="et-container">
        <header class="hc-head">
          <h2 class="hc-title" id="hc-choose-title">Choose how you want to stay</h2>
          <p class="hc-lead">Two ways to travel, two kinds of place to come back to at the end of the day.</p>
        </header>
      </div>

      <article class="hc-option hc-option--hotels" aria-labelledby="hc-hotels-title">
        <div class="et-container hc-option__inner">
          <div class="hc-option__media">
            <picture>
              <source type="image/webp" srcset="assets/images/stays/hotel-city-street.webp" />
              <img class="hc-option__img" src="assets/images/hotel-4-image.jpg" width="600" height="400"
                   alt="Classic Paris hotel buildings on a street corner with the Eiffel Tower behind"
                   loading="lazy" decoding="async" />
            </picture>
          </div>
          <div class="hc-option__copy">
            <h3 class="hc-option__title" id="hc-hotels-title">Hotels</h3>
            <p class="hc-option__tagline">A comfortable base in the middle of things.</p>
            <p class="hc-option__text">
              Stay close to sights, transport and restaurants, with services on site when you need them.
            </p>
            <h4 class="hc-option__subhead">Good for</h4>
            <ul class="hc-option__list">
              <li>City trips</li>
              <li>Easy access to attractions</li>
              <li>On-site services and amenities</li>
              <li>Short stays and business travel</li>
            </ul>
            <p class="hc-option__where">
              Includes city stays in places like Paris, Vienna and Seoul, as well as beach and desert resorts.
            </p>
            <a class="et-btn et-btn--primary et-btn--lg" href="hotels.php">
              Explore hotels
              <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
          </div>
        </div>
      </article>

      <article class="hc-option hc-option--chalets" aria-labelledby="hc-chalets-title">
        <div class="et-container hc-option__inner">
          <div class="hc-option__media">
            <picture>
              <source type="image/webp" srcset="assets/images/stays/chalet-snow-night.webp" />
              <img class="hc-option__img" src="assets/images/chalet-14-image.jpg" width="600" height="400"
                   alt="Snow-covered wooden chalets in the mountains under a starry sky"
                   loading="lazy" decoding="async" />
            </picture>
          </div>
          <div class="hc-option__copy">
            <h3 class="hc-option__title" id="hc-chalets-title">Chalets</h3>
            <p class="hc-option__tagline">Space, privacy and nature on your doorstep.</p>
            <p class="hc-option__text">
              Settle into a cabin or house in the mountains or countryside, with room to slow down together.
            </p>
            <h4 class="hc-option__subhead">Good for</h4>
            <ul class="hc-option__list">
              <li>Mountain and countryside escapes</li>
              <li>More privacy</li>
              <li>Families and groups</li>
              <li>Nature-focused trips</li>
            </ul>
            <p class="hc-option__where">
              Includes mountain homes in Faraya and Zermatt, countryside stays in Tuscany and Provence, and lakeside cabins.
            </p>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="chalets.php">
              Explore chalets
              <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
          </div>
        </div>
      </article>
    </section>

    <!-- 3. Quick comparison -->
    <section class="hc-section hc-section--tint" aria-labelledby="hc-compare-title">
      <div class="et-container hc-compare">
        <header class="hc-head">
          <h2 class="hc-title" id="hc-compare-title">Which stay fits your trip?</h2>
          <p class="hc-lead">A quick side-by-side look if you're still deciding.</p>
        </header>

        <table class="hc-table">
          <caption class="et-visually-hidden">Hotels and chalets compared</caption>
          <thead>
            <tr>
              <td></td>
              <th scope="col">Hotels</th>
              <th scope="col">Chalets</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Best for</th>
              <td>City access</td>
              <td>Privacy and nature</td>
            </tr>
            <tr>
              <th scope="row">Space</th>
              <td>Private rooms</td>
              <td>More shared living space</td>
            </tr>
            <tr>
              <th scope="row">Who it suits</th>
              <td>Solo travellers, couples and business trips</td>
              <td>Families and groups</td>
            </tr>
            <tr>
              <th scope="row">Trip style</th>
              <td>Shorter trips with services on site</td>
              <td>Slower getaways</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 4. Guidance -->
    <section class="hc-section" aria-labelledby="hc-guide-title">
      <div class="et-container hc-guide">
        <div class="hc-guide__media">
          <picture>
            <source type="image/webp" srcset="assets/images/stays/dining-view.webp" />
            <img class="hc-guide__img" src="assets/images/hotels-and-chalets.jpg" width="600" height="389"
                 alt="" loading="lazy" decoding="async" />
          </picture>
        </div>
        <div class="hc-guide__copy">
          <h2 class="hc-title" id="hc-guide-title">Start with the trip you want</h2>
          <p class="hc-lead">A few questions usually make the choice clear.</p>
          <dl class="hc-guide__list">
            <div>
              <dt>Where are you going?</dt>
              <dd>In a city, a hotel keeps the sights close. In the mountains or countryside, a chalet puts you in the landscape.</dd>
            </div>
            <div>
              <dt>Who is coming?</dt>
              <dd>Families and friends often enjoy the shared space of a chalet. Solo trips are usually simpler from a hotel room.</dd>
            </div>
            <div>
              <dt>How much privacy do you want?</dt>
              <dd>A chalet gives you a place of your own; a hotel gives you a private room with people and services around you.</dd>
            </div>
            <div>
              <dt>How long will you stay?</dt>
              <dd>For a quick break, a hotel is easy. For a longer, slower stay, a chalet can start to feel like home.</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <!-- 5. Final action -->
    <section class="hc-section hc-section--tint" aria-labelledby="hc-cta-title">
      <div class="et-container hc-cta">
        <h2 class="hc-title" id="hc-cta-title">Ready to find your stay?</h2>
        <p class="hc-lead">Both lists let you filter by location and maximum price.</p>
        <div class="hc-cta__actions">
          <a class="et-btn et-btn--primary et-btn--lg" href="hotels.php">Browse hotels</a>
          <a class="et-btn et-btn--primary et-btn--lg" href="chalets.php">Browse chalets</a>
        </div>
      </div>
    </section>
  </main>

  <?php include __DIR__ . '/partials/footer.php'; ?>

  <script src="js/includes.js"></script>
</body>
</html>
