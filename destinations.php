<?php
// Season collection. Descriptions, labels and featured countries are taken
// from the content of each season page (winter.php, spring.php, …).
$dst_seasons = [
  [
    'name' => 'Winter',
    'href' => 'winter.php',
    'img' => 'winter', 'fallback' => 'winter.jpg', 'w' => 600, 'h' => 420,
    'alt' => 'Snow-covered mountain village surrounded by pine trees',
    'text' => 'Illuminated streets, snowy landscapes and warm lodges after a day in the mountains.',
    'labels' => ['Snowy city breaks', 'Mountain escapes', 'Ice skating'],
    'countries' => 'Switzerland, Austria, Finland, Canada',
  ],
  [
    'name' => 'Spring',
    'href' => 'spring.php',
    'img' => 'spring', 'fallback' => 'spring.jpg', 'w' => 600, 'h' => 400,
    'alt' => 'Cherry blossom trees above a canal with wooden boats',
    'text' => 'Blossom festivals, flower fields and old towns that are made for walking.',
    'labels' => ['Blossom festivals', 'Gardens', 'City walks'],
    'countries' => 'Japan, France, Netherlands, Italy',
  ],
  [
    'name' => 'Summer',
    'href' => 'summer.php',
    'img' => 'summer', 'fallback' => 'summer.jpg', 'w' => 600, 'h' => 400,
    'alt' => 'White beach and overwater bungalows in front of a green mountain',
    'text' => 'Beach days, island hopping and lively open-air evenings in the city.',
    'labels' => ['Beaches', 'Island hopping', 'Hiking trails'],
    'countries' => 'Greece, Italy, Spain, Costa Rica',
  ],
  [
    'name' => 'Autumn',
    'href' => 'autumn.php',
    'img' => 'autumn', 'fallback' => 'autumn.png', 'w' => 600, 'h' => 400,
    'alt' => 'Golden trees and fallen leaves beside a wooden fence at sunset',
    'text' => 'Golden forests, lakeside cabins and scenic road trips through the countryside.',
    'labels' => ['Golden forests', 'Scenic getaways', 'Photography'],
    'countries' => 'Canada, Germany, Croatia, Turkey',
  ],
];

// "Choose by the experience": which seasons suit each kind of trip.
$dst_guide = [
  [
    'title' => 'Snow and mountain views',
    'text' => 'Cable cars, viewpoints and cosy lodges in winter; cooler high-altitude hikes in summer.',
    'seasons' => ['Winter' => 'winter.php', 'Summer' => 'summer.php'],
  ],
  [
    'title' => 'Gardens and outdoor scenery',
    'text' => 'Flower fields and botanical gardens in spring; national parks and colourful valleys in autumn.',
    'seasons' => ['Spring' => 'spring.php', 'Autumn' => 'autumn.php'],
  ],
  [
    'title' => 'Beaches and islands',
    'text' => 'Resorts, secluded coves and boat tours in the Mediterranean and beyond.',
    'seasons' => ['Summer' => 'summer.php'],
  ],
  [
    'title' => 'City breaks',
    'text' => 'Winter lights and markets, spring old towns, summer nightlife and autumn culture tours.',
    'seasons' => ['Winter' => 'winter.php', 'Spring' => 'spring.php', 'Summer' => 'summer.php', 'Autumn' => 'autumn.php'],
  ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Destinations by Season — EasyTrip</title>
  <meta name="description" content="Compare winter, spring, summer and autumn trips and choose the season that suits your next adventure." />
  <!-- Preload the same hero file the <picture> below will choose at each width. -->
  <link rel="preload" as="image" href="assets/images/destinations/hero-mobile-800.webp"
        media="(max-width: 40em)" fetchpriority="high" />
  <link rel="preload" as="image" href="assets/images/destinations/hero-1200.webp"
        imagesrcset="assets/images/destinations/hero-1200.webp 1200w, assets/images/destinations/hero-2000.webp 2000w"
        imagesizes="100vw" media="(min-width: 40.0625em)" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/destinations.css" />
</head>
<body class="dst-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- Hero -->
    <section class="dst-hero" aria-labelledby="dst-hero-title">
      <picture>
        <source type="image/webp" media="(max-width: 40em)" srcset="assets/images/destinations/hero-mobile-800.webp" />
        <source type="image/webp" srcset="assets/images/destinations/hero-1200.webp 1200w, assets/images/destinations/hero-2000.webp 2000w" sizes="100vw" />
        <img class="dst-hero__img" src="assets/images/destinations/hero.jpg" width="2400" height="1250"
             alt="" fetchpriority="high" decoding="async" />
      </picture>
      <div class="et-container dst-hero__inner">
        <p class="dst-hero__eyebrow">Destinations by season</p>
        <h1 class="dst-hero__title" id="dst-hero-title">Find your next escape</h1>
        <p class="dst-hero__text">
          From snowy mountain breaks to sun-filled coastlines, explore a season that suits your next adventure.
        </p>
        <a class="et-btn et-btn--primary et-btn--lg" href="#seasons">
          Explore the seasons
          <svg class="et-btn__icon dst-hero__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>
        </a>
      </div>
    </section>

    <!-- Seasonal collection -->
    <section class="dst-section dst-section--tint" id="seasons" aria-labelledby="dst-seasons-title">
      <div class="et-container">
        <header class="dst-head">
          <h2 class="dst-title" id="dst-seasons-title">Every season, somewhere new</h2>
          <p class="dst-lead">
            Each season has its own page with trip ideas, featured countries and a quick way to ask our team for help.
          </p>
        </header>

        <ul class="dst-seasons" role="list">
          <?php foreach ($dst_seasons as $s): $key = strtolower($s['name']); ?>
            <li class="dst-card reveal">
              <div class="dst-card__media">
                <picture>
                  <source type="image/webp" srcset="assets/images/destinations/<?= $s['img'] ?>.webp" />
                  <img class="dst-card__img dst-card__img--<?= $key ?>" src="assets/images/<?= $s['fallback'] ?>"
                       width="<?= $s['w'] ?>" height="<?= $s['h'] ?>" alt="<?= htmlspecialchars($s['alt']) ?>"
                       loading="lazy" decoding="async" />
                </picture>
              </div>
              <div class="dst-card__body">
                <h3 class="dst-card__name"><?= $s['name'] ?></h3>
                <p class="dst-card__text"><?= htmlspecialchars($s['text']) ?></p>
                <ul class="dst-card__labels" role="list" aria-label="<?= $s['name'] ?> experiences">
                  <?php foreach ($s['labels'] as $label): ?>
                    <li><?= htmlspecialchars($label) ?></li>
                  <?php endforeach; ?>
                </ul>
                <p class="dst-card__countries">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                  <span><span class="et-visually-hidden">Featured countries: </span><?= $s['countries'] ?></span>
                </p>
                <a class="dst-card__link" href="<?= $s['href'] ?>">
                  Explore <?= $key ?>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
                </a>
              </div>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>
    </section>

    <!-- Choose by the experience -->
    <section class="dst-section" aria-labelledby="dst-guide-title">
      <div class="et-container dst-guide">
        <header class="dst-guide__head">
          <h2 class="dst-title" id="dst-guide-title">Choose by the experience</h2>
          <p class="dst-lead">Not sure when to go? Start with what you want to do, then pick a season that fits.</p>
        </header>

        <ul class="dst-guide__list" role="list">
          <?php foreach ($dst_guide as $g): ?>
            <li class="dst-guide__item">
              <h3 class="dst-guide__title"><?= htmlspecialchars($g['title']) ?></h3>
              <p class="dst-guide__text"><?= htmlspecialchars($g['text']) ?></p>
              <p class="dst-guide__seasons">
                <span class="dst-guide__seasons-label"><?= count($g['seasons']) === 1 ? 'Best season:' : 'Best seasons:' ?></span>
                <?php foreach ($g['seasons'] as $name => $href): ?>
                  <a class="dst-chip" href="<?= $href ?>"><?= $name ?><span class="et-visually-hidden"> destinations</span></a>
                <?php endforeach; ?>
              </p>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>
    </section>

    <!-- Final action -->
    <section class="dst-section dst-section--flush" aria-labelledby="dst-stay-title">
      <div class="et-container">
        <div class="dst-stay">
          <div class="dst-stay__copy">
            <h2 class="dst-stay__title" id="dst-stay-title">Found your season? Find your stay.</h2>
            <p class="dst-stay__text">Compare hotels and chalets for your trip, from city stays to cosy mountain lodges.</p>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="hotels-chalets.php">
              Browse hotels &amp; chalets
              <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
          </div>
          <div class="dst-stay__media">
            <picture>
              <source type="image/webp" srcset="assets/images/destinations/stays-chalets.webp" />
              <img class="dst-stay__img" src="assets/images/stays-chalets-hero.jpg" width="600" height="400"
                   alt="" loading="lazy" decoding="async" />
            </picture>
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
