<?php
// Sample hotel collection for the university project. The names, descriptions and
// prices are illustrative only; none of these are real businesses or live rates.
// Each entry: [name, location, sample price per night (USD), description, image number, image alt text]
$hotels = [
  ['The Royal Grand Resort', 'Maldives', 350, 'Overwater bungalows and villas set above a clear lagoon, designed with privacy in mind.', 1, 'Overwater villas with a pool beside palm trees and turquoise water'],
  ['City Tower Boutique', 'New York, USA', 280, "A design-led boutique base within easy reach of Manhattan's landmarks and entertainment.", 2, 'Hotel room with floor-to-ceiling windows overlooking a city skyline'],
  ['Desert Sunset Lodge', 'Dubai, UAE', 190, "Beach views and on-site dining, with the city's shopping districts close by.", 3, 'Camel caravan crossing golden desert dunes'],
  ['The Parisian Palace', 'Paris, France', 450, 'A palace-style hotel with classic interiors, a short walk from landmarks such as the Louvre.', 4, 'Classic Paris hotel buildings on a street corner with the Eiffel Tower behind'],
  ['Alpine Heights Boutique', 'Switzerland', 580, 'A mountain hotel with direct access to ski and hiking trails, surrounded by peaks and lakes.', 5, 'Wooden chalets on a green hillside surrounded by pine forest'],
  ['Kyoto Garden Retreat', 'Kyoto, Japan', 315, "A ryokan-inspired stay with calm Japanese design and garden views, close to the city's cultural sites.", 6, 'Japanese castle framed by cherry blossom trees'],
  ['Santorini Sun Suites', 'Santorini, Greece', 510, 'Whitewashed cave-style suites set into the caldera cliffs, with plunge pools and sunset views.', 7, 'Whitewashed buildings on a cliff above a deep blue sea'],
  ['Serengeti Safari Lodge', 'Serengeti, Tanzania', 480, 'A tented safari lodge with views across the Serengeti plains and wildlife close by.', 8, 'Sunlit garden path lined with palm trees'],
  ['The Venice Lagoon Suites', 'Venice, Italy', 390, 'Suites in a historic palazzo with canal views and classic Italian interiors.', 9, 'Gondola on a narrow canal between old buildings'],
  ['Patagonia Wilderness Lodge', 'Patagonia, Argentina', 250, 'A remote lodge that makes a warm base after days exploring glaciers and mountain peaks.', 10, 'House with a red roof on a forested hillside'],
  ['Berlin Art Hotel', 'Berlin, Germany', 180, "A modern, art-focused hotel with sleek design and easy access to the city's historic sites.", 11, 'Historic palace above terraced gardens'],
  ['Rio Beachfront Paradise', 'Rio de Janeiro, Brazil', 295, 'A beachfront hotel near Copacabana and Ipanema, with a rooftop pool and ocean views.', 12, 'Infinity pool and palm trees at sunset'],
  ['Seoul Tech Towers', 'Seoul, South Korea', 210, 'A high-rise hotel with contemporary, tech-forward design in the heart of the city.', 13, 'Neon-lit city street at night'],
  ['Casablanca Royal Palace', 'Casablanca, Morocco', 320, 'Moroccan tradition meets Art Deco style, with grand halls, a spa and ocean views.', 14, 'Ornate palace courtyard lit up at night'],
  ['Irish Country Manor', 'Dublin, Ireland', 175, 'A manor house hotel pairing old-world character with modern comfort, in green countryside near the city.', 15, 'Colourful buildings along a waterfront'],
  ['Sydney Harbour Views', 'Sydney, Australia', 410, 'A waterfront hotel with views of the Opera House and Harbour Bridge, plus a rooftop bar.', 16, 'Sydney Opera House beside the harbour'],
  ['Tulum Eco Resort', 'Tulum, Mexico', 230, 'An eco-minded beach resort with yoga sessions, cabanas and Mayan-inspired architecture.', 17, 'Terrace lounge with sofas under a glass roof'],
  ['Vienna Opera House Hotel', 'Vienna, Austria', 305, "A classic hotel in the historic centre, close to the opera and the city's cultural landmarks.", 18, 'White hotel facade with balconies framed by trees'],
  ['Cape Town Table Mountain Suites', 'Cape Town, South Africa', 245, 'Modern suites facing Table Mountain and the Atlantic, with easy access to beaches and wine routes.', 19, 'Restaurant terrace overlooking a hillside town and the sea'],
  ['Helsinki Northern Lights Retreat', 'Helsinki, Finland', 385, 'A minimalist Nordic city hotel, with glass retreats nearby for a chance to see the Northern Lights.', 20, 'Boats moored in a harbour lined with colourful houses'],
  ['Bali Oceanfront Villa', 'Bali, Indonesia', 270, 'Private villas in tropical gardens or facing the ocean, with infinity pools and Balinese hospitality.', 21, 'Aerial view of a villa among palm trees beside a white beach'],
  ['Beirut Waterfront Suites', 'Beirut, Lebanon', 220, 'Sea-view suites close to the city centre and its art, dining and nightlife.', 22, 'Aerial view of a turquoise coastline beside a resort pool'],
  ['AlUla Heritage Resort', 'AlUla, Saudi Arabia', 450, 'A desert resort among dramatic rock formations, with a focus on local heritage and wellness.', 23, 'Off-road vehicle crossing red desert rocks'],
  ['Cairo Nile View Palace', 'Cairo, Egypt', 210, "Classical architecture with views of the Nile, close to the city's historic sites.", 24, 'Riverside hotels with boats moored along the Nile'],
  ['Dead Sea Spa Hotel', 'Sweimeh, Jordan', 275, 'A wellness resort by the Dead Sea, known for mineral-rich mud treatments and views across the water.', 25, 'Hotel room with a jacuzzi bath and a view of the sea'],
  ['Manama Pearl Residence', 'Manama, Bahrain', 310, 'A business-friendly hotel in the financial district, with views over the city and the Gulf.', 26, 'Modern high-rise hotel towers against a blue sky'],
  ['Muscat Grand Ocean Resort', 'Muscat, Oman', 380, 'A coastal resort between mountains and the Arabian Sea, close to beaches and diving spots.', 27, 'Curved beachfront hotel beside a sandy beach'],
];
$hotel_prices = array_column($hotels, 2);
$price_max = (int) (ceil(max($hotel_prices) / 50) * 50);
$price_min = (int) (floor(min($hotel_prices) / 50) * 50);
$eager_images = 3; // first row; everything else lazy-loads
$e = fn($s) => htmlspecialchars($s, ENT_QUOTES);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotels — EasyTrip</title>
  <meta name="description" content="Browse EasyTrip's sample hotel collection: city hotels, coastal resorts and mountain retreats. Filter by destination and sample price." />
  <link rel="preload" as="image" href="assets/images/stays/hotel-lobby.webp" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/listings.css" />
</head>
<body class="hotels-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- 1. Compact introduction -->
    <section class="lst-intro" aria-labelledby="lst-intro-title">
      <div class="et-container lst-intro__inner">
        <div class="lst-intro__copy">
          <nav class="lst-breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li><a href="hotels-chalets.php">Hotels &amp; Chalets</a></li>
              <li><span aria-current="page">Hotels</span></li>
            </ol>
          </nav>
          <h1 class="lst-intro__title" id="lst-intro-title">Hotels for every kind of journey</h1>
          <p class="lst-intro__text">
            Explore a curated set of sample stays, from city hotels to coastal and mountain retreats.
          </p>
        </div>
        <div class="lst-intro__media">
          <picture>
            <source type="image/webp" srcset="assets/images/stays/hotel-lobby.webp" />
            <img class="lst-intro__img" src="assets/images/stays-hotels-hero.jpg" width="600" height="338"
                 alt="" fetchpriority="high" decoding="async" />
          </picture>
        </div>
      </div>
    </section>

    <!-- 2. Browse: toolbar, results, grid -->
    <section class="lst-browse" aria-labelledby="lst-results-title" data-listing data-listing-noun="hotel">
      <div class="et-container">
        <!-- Shown by js/listings.js; without JavaScript every hotel is listed and the
             filters (which need JavaScript) stay hidden rather than doing nothing. -->
        <form class="lst-toolbar" data-listing-filters hidden aria-label="Filter and sort hotels">
          <div class="lst-field lst-field--search">
            <label class="lst-field__label" for="hotel-search">Destination or hotel</label>
            <input class="lst-field__input" type="search" id="hotel-search" name="q"
                   data-filter="search" placeholder="e.g. Paris, Bali or Tower" autocomplete="off" />
          </div>
          <div class="lst-field lst-field--price">
            <label class="lst-field__label" for="hotel-price">
              Max sample price
              <output class="lst-field__value" for="hotel-price" data-price-output>$<?= $price_max ?></output>
              <span class="lst-field__unit">/ night</span>
            </label>
            <input class="lst-field__range" type="range" id="hotel-price" name="max"
                   data-filter="price" min="<?= $price_min ?>" max="<?= $price_max ?>" step="10" value="<?= $price_max ?>" />
          </div>
          <div class="lst-field lst-field--sort">
            <label class="lst-field__label" for="hotel-sort">Sort by</label>
            <select class="lst-field__input" id="hotel-sort" name="sort" data-filter="sort">
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
          <button class="et-btn et-btn--outline lst-toolbar__clear" type="button" data-clear-filters>Clear filters</button>
        </form>

        <header class="lst-results-head">
          <div>
            <h2 class="lst-results-head__title" id="lst-results-title">Explore hotel stays</h2>
            <p class="lst-results-head__note">
              These hotels and prices are sample content created for a university project. Online hotel booking isn't connected yet.
            </p>
          </div>
          <p class="lst-results-head__count" data-listing-count><?= count($hotels) ?> hotels</p>
        </header>

        <!-- Screen readers hear result changes here; updated a moment after typing stops. -->
        <p class="et-visually-hidden" role="status" data-listing-status></p>

        <div class="lst-grid" data-listing-grid>
          <?php foreach ($hotels as $i => [$name, $location, $price, $text, $img, $alt]): ?>
            <article class="lst-card" data-listing-item
                     data-name="<?= $e($name) ?>" data-location="<?= $e($location) ?>"
                     data-price="<?= $price ?>" data-order="<?= $i + 1 ?>"
                     aria-labelledby="hotel-<?= $i + 1 ?>-name">
              <picture>
                <source type="image/webp" srcset="assets/images/hotels/hotel-<?= $img ?>.webp" />
                <img class="lst-card__img" src="assets/images/hotel-<?= $img ?>-image.jpg" width="600" height="400"
                     alt="<?= $e($alt) ?>" <?= $i < $eager_images ? '' : 'loading="lazy" ' ?>decoding="async" />
              </picture>
              <div class="lst-card__body">
                <h3 class="lst-card__name" id="hotel-<?= $i + 1 ?>-name"><?= $e($name) ?></h3>
                <p class="lst-card__location">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                  <?= $e($location) ?>
                </p>
                <p class="lst-card__text"><?= $e($text) ?></p>
                <div class="lst-card__footer">
                  <p class="lst-card__price">
                    <span class="lst-card__price-label">Sample price</span>
                    <span class="lst-card__price-value">$<?= $price ?> <span>/ night</span></span>
                  </p>
                  <!-- Without JavaScript this links to the contact page; listings.js swaps it for the details dialog. -->
                  <a class="et-btn et-btn--outline lst-card__action" href="contact.php?topic=stays" data-listing-fallback>
                    Ask about this stay<span class="et-visually-hidden">: <?= $e($name) ?></span>
                  </a>
                  <button class="et-btn et-btn--outline lst-card__action" type="button" data-listing-details hidden>
                    View details<span class="et-visually-hidden">: <?= $e($name) ?></span>
                  </button>
                </div>
              </div>
            </article>
          <?php endforeach; ?>
        </div>

        <div class="lst-empty" data-listing-empty hidden>
          <h3 class="lst-empty__title">No hotels match those filters.</h3>
          <p class="lst-empty__text">Try another destination or increase the maximum sample price.</p>
          <button class="et-btn et-btn--primary" type="button" data-clear-filters>Clear filters</button>
        </div>

        <div class="lst-more" data-listing-more-wrap hidden>
          <button class="et-btn et-btn--outline et-btn--lg" type="button" data-listing-more>Show more hotels</button>
        </div>
      </div>

      <!-- One reusable details dialog, filled in from the chosen card. -->
      <dialog class="lst-dialog" data-listing-dialog aria-labelledby="lst-dialog-title">
        <div class="lst-dialog__inner">
          <button class="lst-dialog__close" type="button" data-dialog-close aria-label="Close details">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
          <img class="lst-dialog__img" src="data:," alt="" width="600" height="400" data-dialog-img />
          <div class="lst-dialog__body">
            <h2 class="lst-dialog__title" id="lst-dialog-title" data-dialog-name></h2>
            <p class="lst-card__location lst-dialog__location" data-dialog-location></p>
            <p class="lst-dialog__text" data-dialog-text></p>
            <p class="lst-dialog__price">
              <span class="lst-card__price-label">Sample price</span>
              <span class="lst-card__price-value" data-dialog-price></span>
            </p>
            <p class="lst-dialog__notice">
              This is a sample listing for a university project. Online hotel reservations aren't connected yet, but you can
              ask our team about this stay.
            </p>
            <div class="lst-dialog__actions">
              <a class="et-btn et-btn--primary" href="contact.php?topic=stays">Ask about this stay</a>
              <button class="et-btn et-btn--outline" type="button" data-dialog-close>Close</button>
            </div>
          </div>
        </div>
      </dialog>
    </section>

    <!-- 3. Alternative path -->
    <section class="lst-alt" aria-labelledby="lst-alt-title">
      <div class="et-container">
        <div class="lst-alt__panel">
          <div class="lst-alt__copy">
            <h2 class="lst-alt__title" id="lst-alt-title">Looking for more privacy?</h2>
            <p class="lst-alt__text">Explore chalet stays designed for families, groups and nature-focused trips.</p>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="chalets.php">
              Explore chalets
              <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
          </div>
          <div class="lst-alt__media">
            <picture>
              <source type="image/webp" srcset="assets/images/stays/chalet-snow-night.webp" />
              <img class="lst-alt__img" src="assets/images/chalet-14-image.jpg" width="600" height="400"
                   alt="" loading="lazy" decoding="async" />
            </picture>
          </div>
        </div>
      </div>
    </section>
  </main>

  <?php include __DIR__ . '/partials/footer.php'; ?>

  <script src="js/includes.js"></script>
  <script src="js/listings.js"></script>
</body>
</html>
