<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EasyTrip — Travel Made Simple</title>
  <meta name="description" content="EasyTrip helps you explore seasonal destinations, find hotels and chalets, and browse flight, bus and train tickets." />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <link rel="preload" as="image" href="assets/images/home/hero-1200.webp" imagesrcset="assets/images/home/hero-800.webp 800w, assets/images/home/hero-1200.webp 1199w" imagesizes="100vw" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body class="home-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- Hero with destination strip -->
    <section class="home-hero" aria-labelledby="home-hero-title">
      <picture>
        <source type="image/webp" srcset="assets/images/home/hero-800.webp 800w, assets/images/home/hero-1200.webp 1199w" sizes="100vw" />
        <img class="home-hero__image" src="assets/images/home/hero.png" width="1199" height="672"
             alt="" fetchpriority="high" decoding="async" />
      </picture>

      <div class="et-container home-hero__inner">
        <div class="home-hero__content">
          <p class="home-hero__eyebrow">Welcome to EasyTrip</p>
          <h1 class="home-hero__title" id="home-hero-title">Explore <br>the world</h1>
          <p class="home-hero__text">
            Discover destinations that inspire, stories that move you, and adventures that stay with you forever.
          </p>
          <div class="home-hero__actions">
            <a class="et-btn et-btn--primary et-btn--lg" href="destinations.php">
              Start your journey
              <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="tickets.php">Book tickets</a>
          </div>
        </div>

        <div class="hero-dest" id="destinations">
          <h2 class="hero-dest__title">Top destinations</h2>
          <ul class="hero-dest__list" role="list">
            <li>
              <a class="hero-card" href="chalets.php">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/lebanon-card.webp" />
                  <img class="hero-card__img" src="assets/images/lebanon.png" width="480" height="320" alt="" decoding="async" />
                </picture>
                <span class="hero-card__name">Lebanon</span>
                <span class="hero-card__meta">Chalets in Faraya, Jbeil and Batroun</span>
              </a>
            </li>
            <li>
              <a class="hero-card" href="chalets.php">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/iceland-card.webp" />
                  <img class="hero-card__img" src="assets/images/iceland.png" width="480" height="320" alt="" decoding="async" />
                </picture>
                <span class="hero-card__name">Iceland</span>
                <span class="hero-card__meta">Geothermal cabin stays near Reykjavik</span>
              </a>
            </li>
            <li>
              <a class="hero-card" href="spring.php">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/italy-card.webp" />
                  <img class="hero-card__img" src="assets/images/italy.png" width="480" height="320" alt="" decoding="async" />
                </picture>
                <span class="hero-card__name">Italy</span>
                <span class="hero-card__meta">Featured in our spring trip ideas</span>
              </a>
            </li>
            <li>
              <a class="hero-card" href="hotels.php">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/dubai-card.webp" />
                  <img class="hero-card__img" src="assets/images/dubai.png" width="480" height="320" alt="" decoding="async" />
                </picture>
                <span class="hero-card__name">Dubai</span>
                <span class="hero-card__meta">Beachfront hotels and city stays</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- About -->
    <section class="home-section" aria-labelledby="about-title">
      <div class="et-container split">
        <div class="split__copy reveal">
          <p class="home-kicker">About us</p>
          <h2 class="home-title" id="about-title">Learn more <br>about EasyTrip</h2>
          <p class="home-lead">
            Our goal is simple: to make travel easier for everyone. Whether it's your first trip or your next
            adventure, we share destination highlights, travel tips and curated recommendations, backed by
            real people you can contact.
          </p>
          <a class="et-btn et-btn--primary et-btn--lg" href="about.php">
            Who we are
            <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
          </a>
        </div>
        <div class="split__media reveal">
          <picture>
            <source type="image/webp" srcset="assets/images/home/about-800.webp" />
            <img class="split__img" src="assets/images/home/about-beach.jpg" width="800" height="800"
                 alt="Aerial view of a sandy spit curving into turquoise water" loading="lazy" decoding="async" />
          </picture>
        </div>
      </div>
    </section>

    <!-- Seasons -->
    <section class="home-section home-section--tint" aria-labelledby="seasons-title">
      <div class="et-container">
        <header class="home-section__head">
          <p class="home-kicker">Trip ideas</p>
          <h2 class="home-title" id="seasons-title">Enjoy the beauty <br>of every season</h2>
        </header>

        <ul class="season-list" role="list">
          <li class="reveal">
            <a class="season-card" href="winter.php">
              <span class="season-card__media">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/winter-600.webp" />
                  <img class="season-card__img" src="assets/images/winter.jpg" width="600" height="420" alt="" loading="lazy" decoding="async" />
                </picture>
              </span>
              <span class="season-card__title">Winter destinations</span>
              <span class="season-card__place">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                Switzerland, Austria, Finland, Canada
              </span>
            </a>
          </li>
          <li class="reveal">
            <a class="season-card" href="spring.php">
              <span class="season-card__media">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/spring-600.webp" />
                  <img class="season-card__img" src="assets/images/spring.jpg" width="600" height="400" alt="" loading="lazy" decoding="async" />
                </picture>
              </span>
              <span class="season-card__title">Spring destinations</span>
              <span class="season-card__place">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                Japan, France, Netherlands, Italy
              </span>
            </a>
          </li>
          <li class="reveal">
            <a class="season-card" href="summer.php">
              <span class="season-card__media">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/summer-600.webp" />
                  <img class="season-card__img" src="assets/images/summer.png" width="600" height="900" alt="" loading="lazy" decoding="async" />
                </picture>
              </span>
              <span class="season-card__title">Summer destinations</span>
              <span class="season-card__place">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                Greece, Italy, Spain, Costa Rica
              </span>
            </a>
          </li>
          <li class="reveal">
            <a class="season-card" href="autumn.php">
              <span class="season-card__media">
                <picture>
                  <source type="image/webp" srcset="assets/images/home/autumn-600.webp" />
                  <img class="season-card__img" src="assets/images/autumn.png" width="600" height="800" alt="" loading="lazy" decoding="async" />
                </picture>
              </span>
              <span class="season-card__title">Autumn destinations</span>
              <span class="season-card__place">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                Canada, Germany, Croatia, Turkey
              </span>
            </a>
          </li>
        </ul>
      </div>
    </section>

    <!-- Services -->
    <section class="home-section" id="services" aria-labelledby="services-title">
      <div class="et-container">
        <header class="home-section__head">
          <p class="home-kicker">What we offer</p>
          <h2 class="home-title" id="services-title">Our services</h2>
        </header>

        <ul class="service-list" role="list">
          <li class="service-item reveal">
            <span class="service-item__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 9a2 2 0 0 0 0 4v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M14 5v2m0 3v2m0 3v2"/></svg>
            </span>
            <h3 class="service-item__title">Ticket booking</h3>
            <p class="service-item__text">Browse flight, bus and train tickets and plan how you get there.</p>
            <a class="service-item__link" href="tickets.php">Browse tickets <span aria-hidden="true">&rarr;</span></a>
          </li>
          <li class="service-item reveal">
            <span class="service-item__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 20V8l9-5 9 5v12"/><path d="M3 20h18M9 20v-6h6v6"/></svg>
            </span>
            <h3 class="service-item__title">Hotels &amp; chalets</h3>
            <p class="service-item__text">Find the right stay, from city hotels to cozy mountain chalets.</p>
            <a class="service-item__link" href="hotels-chalets.php">Find a place to stay <span aria-hidden="true">&rarr;</span></a>
          </li>
          <li class="service-item reveal">
            <span class="service-item__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>
            </span>
            <h3 class="service-item__title">Seasonal destinations</h3>
            <p class="service-item__text">Discover the best places by season: winter, spring, summer or autumn.</p>
            <a class="service-item__link" href="destinations.php">Explore by season <span aria-hidden="true">&rarr;</span></a>
          </li>
          <li class="service-item reveal">
            <span class="service-item__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>
            </span>
            <h3 class="service-item__title">Travel support</h3>
            <p class="service-item__text">Have a question about a trip or booking? Send our team a message.</p>
            <a class="service-item__link" href="contact.php">Contact support <span aria-hidden="true">&rarr;</span></a>
          </li>
        </ul>
      </div>
    </section>

    <!-- Explore band -->
    <section class="explore" aria-labelledby="explore-title">
      <picture>
        <source type="image/webp" media="(max-width: 40em)" srcset="assets/images/home/explore-800.webp" />
        <source type="image/webp" srcset="assets/images/home/explore-1920.webp" />
        <img class="explore__img" src="assets/images/home/explore-beach.jpg" width="1920" height="800"
             alt="" loading="lazy" decoding="async" />
      </picture>
      <div class="et-container explore__content">
        <div class="explore__copy reveal">
          <h2 class="home-title home-title--light" id="explore-title">Explore the <br>best paradises</h2>
          <p class="explore__text">
            From the Maldives and Bali to Santorini, browse sample hotel stays and find your next
            island escape.
          </p>
        </div>
        <a class="et-btn et-btn--on-dark et-btn--lg explore__cta" href="hotels.php">
          Browse hotel stays
          <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </a>
      </div>
    </section>

    <!-- Journey CTA -->
    <section class="home-section" aria-labelledby="journey-title">
      <div class="et-container split split--reverse">
        <div class="split__media reveal">
          <picture>
            <source type="image/webp" srcset="assets/images/home/join-800.webp" />
            <img class="split__img" src="assets/images/home/join-island.jpg" width="800" height="800"
                 alt="Limestone cliffs above a turquoise bay with a sandy beach" loading="lazy" decoding="async" />
          </picture>
        </div>
        <div class="split__copy reveal">
          <p class="home-kicker">Plan your trip</p>
          <h2 class="home-title" id="journey-title">Your journey <br>starts here</h2>
          <p class="home-lead">
            Pick your tickets now, or tell us where you want to go and our team will help you plan it.
          </p>
          <div class="split__actions">
            <a class="et-btn et-btn--primary et-btn--lg" href="tickets.php">Book tickets</a>
            <a class="et-btn et-btn--outline et-btn--lg" href="contact.php">Contact us</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <?php include __DIR__ . '/partials/footer.php'; ?>

  <script src="js/includes.js"></script>
  <script src="js/script.js"></script>
</body>
</html>
