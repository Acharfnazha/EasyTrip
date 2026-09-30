<?php
// Sample collection of chalets and private retreats for the university project.
// Names, descriptions and prices are illustrative only; none of these are real
// businesses or live rates.
//
// Each entry: [name, location, sample price per night (USD), type, setting, description, image number, image alt text]
// - type:    what the property is (cabin, chalet, villa, …), shown on the card.
// - setting: one of the keys in $settings below; used by the "Setting" filter.
//   Mountain = alpine and ski areas; Coastal = on a sea or seashore; Countryside = villages,
//   farmland and open rural landscapes; Forest = set among trees; Desert; Tropical.
$settings = [
  'mountain'    => 'Mountain',
  'coastal'     => 'Coastal',
  'countryside' => 'Countryside',
  'forest'      => 'Forest',
  'desert'      => 'Desert',
  'tropical'    => 'Tropical',
];
$chalets = [
  ['Mountain Top Cabin', 'Faraya, Lebanon', 280, 'Cabin', 'mountain', 'A cabin among snowy pine trees, a cosy base for skiing and winter walks.', 1, 'Wooden chalet surrounded by snow-covered pine trees'],
  ['The Jbeil Beachfront Home', 'Jbeil, Lebanon', 220, 'Beach house', 'coastal', 'A home on the Mediterranean with private sea access, close to the historic old town.', 2, 'Tent interior with a bed opening onto a sea view'],
  ['Log Cabin with Fireplace', 'Chamonix, France', 310, 'Cabin', 'mountain', 'A log cabin with an open fireplace, built for skiing and hiking in the French Alps.', 3, 'Stone fireplace with a fire burning in a rustic living room'],
  ['Modern Glass Retreat', 'Baakline, Lebanon', 180, 'Retreat', 'mountain', 'A contemporary retreat in the Chouf mountains, with wide windows facing green valleys.', 4, 'Modern timber cabins raised on stilts among pine trees'],
  ['Cedars Ski Resort Chalet', 'Bcharre, Lebanon', 350, 'Chalet', 'mountain', 'A chalet close to the ski slopes and the ancient Cedars of God forest.', 5, 'Wooden balcony overlooking snowy ski slopes'],
  ['Stone Guesthouse', 'Deir el Qamar, Lebanon', 190, 'Guesthouse', 'countryside', 'A traditional Lebanese stone house in a historic village, for a slower stay focused on local culture.', 6, 'Ivy-covered stone house on a cobbled lane'],
  ['Coastal Cliff House', 'Anfeh, Lebanon', 260, 'House', 'coastal', 'A clifftop house on a rocky stretch of coast, with direct access to the sea.', 7, 'House on top of a cliff at sunset'],
  ['Snowy Retreat', 'Mzaar, Lebanon', 400, 'Chalet', 'mountain', "A well-equipped chalet in one of Lebanon's main ski areas, made for winter-sports trips.", 8, 'Wooden chalet with a stone base in falling snow'],
  ['Boutique Village House', 'Batroun, Lebanon', 240, 'House', 'coastal', 'A stylish village house near the old Phoenician wall and the beaches of this lively coastal town.', 9, 'House with a red tiled roof on a green lawn'],
  ['Lakeside Cabin', 'Bhamdoun, Lebanon', 160, 'Cabin', 'mountain', 'A rustic cabin with lake and forest views, in a quiet town known for its cooler climate.', 10, 'Wooden cabin on stilts reflected in a still lake'],
  ['Provence Lavender Farm Stay', 'Provence, France', 290, 'Farm stay', 'countryside', 'A secluded farm stay among lavender fields, in the sunny countryside of southern France.', 11, 'Rows of purple lavender under a clear sky'],
  ['Swiss Alpine Home', 'Zermatt, Switzerland', 600, 'Chalet', 'mountain', 'A traditional wooden chalet in the Swiss Alps, with views toward the Matterhorn.', 12, 'Wooden chalet with a flower garden below green mountains'],
  ['Tuscan Vineyard Villa', 'Tuscany, Italy', 330, 'Villa', 'countryside', 'A country villa among olive groves and vineyards, made for outdoor living and regional food.', 13, 'Stone farmhouse with sun loungers beside a pool at dusk'],
  ['Scottish Highlands Lodge', 'Scottish Highlands, UK', 380, 'Lodge', 'mountain', 'A remote lodge with loch-side views, set in the wild Highland landscape.', 14, 'Snow-covered wooden chalets in the mountains under a starry sky'],
  ['Colorado Ski Cabin', 'Aspen, Colorado, USA', 450, 'Cabin', 'mountain', 'A log cabin in the Rocky Mountains, built for comfort after a day on the ski slopes.', 15, 'Large log building with snow on its roofs'],
  ['Bali Rice Paddy Hut', 'Ubud, Indonesia', 150, 'Hut', 'tropical', 'A simple hut overlooking rice terraces, designed for a calm, wellness-focused stay.', 16, 'Small hut on green rice terraces beside a palm tree'],
  ['Finnish Glass Igloo', 'Rovaniemi, Finland', 700, 'Glass igloo', 'forest', 'A glass igloo with a clear view of the night sky, for a chance to see the Northern Lights.', 17, 'Glass igloos in the snow among pine trees'],
  ['Icelandic Geothermal Cabin', 'Reykjavik, Iceland', 395, 'Cabin', 'countryside', 'A minimalist cabin warmed by geothermal energy, with dark skies away from city lights.', 18, 'Geyser erupting under a blue sky'],
  ['Brazilian Rainforest Bungalow', 'Amazonas, Brazil', 275, 'Bungalow', 'forest', 'An eco-minded bungalow set among the rainforest trees, with a focus on sustainability.', 19, 'Wooden A-frame bungalows beside water in a rainforest'],
  ['Thai Beach Bungalow', 'Phuket, Thailand', 185, 'Bungalow', 'tropical', 'A breezy bungalow just off the beach, with ocean views and warm water close by.', 20, 'Overwater bungalows in a turquoise sea at sunset'],
  ['Desert Oasis Tent', 'Wadi Rum, Jordan', 215, 'Tent', 'desert', 'A tented desert stay in the Valley of the Moon, with clear night skies and Bedouin hospitality.', 21, 'Desert camp with a swimming pool at dusk'],
  ['High Atlas Mountain Riad', 'Imlil, Morocco', 200, 'Riad', 'mountain', 'A traditional riad with mountain views and a welcome rooted in local Amazigh culture.', 22, 'Wooden chalets with flower boxes below rocky peaks'],
  ['Desert Plunge Pool Villa', 'Al Khail, UAE', 550, 'Villa', 'desert', 'A private villa with its own plunge pool, surrounded by quiet desert.', 23, 'Terracotta villa with a plunge pool in the desert'],
  ['Musandam Fjords Retreat', 'Khasab, Oman', 410, 'Retreat', 'coastal', "A secluded retreat overlooking the fjord-like inlets known as the 'Norway of Arabia'.", 24, 'Red wooden houses on stilts over deep blue water'],
  ['Coastal Pool Villa', 'Al Wakra, Qatar', 250, 'Villa', 'coastal', 'A modern villa with a private pool, a quiet coastal escape from the city.', 25, 'Modern villa with a swimming pool and sun loungers'],
  ['Cappadocia Cave Lodge', 'Göreme, Turkey', 295, 'Cave lodge', 'countryside', 'A lodge set into the soft volcanic rock, with views of the morning hot-air balloons.', 26, 'Cave rooms carved into rock beside garden umbrellas'],
  ['Dead Sea Panorama Cabin', 'Sweimeh, Jordan', 320, 'Cabin', 'coastal', 'A glass-fronted cabin with wide views across the Dead Sea, the lowest point on land.', 27, 'Glass-walled cabin deck overlooking a lake'],
];
$chalet_prices = array_column($chalets, 2);
$price_max = (int) (ceil(max($chalet_prices) / 50) * 50);
$price_min = (int) (floor(min($chalet_prices) / 50) * 50);
$eager_images = 3; // first row; everything else lazy-loads
$e = fn($s) => htmlspecialchars($s, ENT_QUOTES);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chalets &amp; Private Retreats — EasyTrip</title>
  <meta name="description" content="Browse EasyTrip's sample collection of chalets, cabins, villas and secluded retreats. Filter by destination, setting and sample price." />
  <link rel="preload" as="image" href="assets/images/stays/chalet-village.webp" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/listings.css" />
</head>
<body class="chalets-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- 1. Compact introduction -->
    <section class="lst-intro lst-intro--chalets" aria-labelledby="lst-intro-title">
      <div class="et-container lst-intro__inner">
        <div class="lst-intro__copy">
          <nav class="lst-breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li><a href="hotels-chalets.php">Hotels &amp; Chalets</a></li>
              <li><span aria-current="page">Chalets</span></li>
            </ol>
          </nav>
          <h1 class="lst-intro__title" id="lst-intro-title">Private stays, closer to nature</h1>
          <p class="lst-intro__text">
            Explore sample cabins, chalets, villas, and secluded retreats for slower trips with more space.
          </p>
        </div>
        <div class="lst-intro__media">
          <picture>
            <source type="image/webp" srcset="assets/images/stays/chalet-village.webp" />
            <img class="lst-intro__img" src="assets/images/stays-chalets-hero.jpg" width="600" height="400"
                 alt="Wooden chalets with warm lights along a snowy garden path" fetchpriority="high" decoding="async" />
          </picture>
        </div>
      </div>
    </section>

    <!-- 2. Browse: collection introduction, toolbar, results -->
    <section class="lst-browse" aria-labelledby="lst-results-title" data-listing data-listing-noun="retreat">
      <div class="et-container">
        <header class="lst-results-head lst-results-head--lead">
          <div>
            <h2 class="lst-results-head__title" id="lst-results-title">Find a retreat that fits your trip</h2>
            <p class="lst-results-head__lede">
              The collection includes sample mountain cabins, coastal homes, countryside stays, and remote retreats.
            </p>
            <p class="lst-results-head__note">
              These properties and prices are sample content created for a university project. Online reservations
              aren't connected yet.
            </p>
          </div>
        </header>

        <!-- Shown by js/listings.js; without JavaScript every retreat is listed and the
             filters (which need JavaScript) stay hidden rather than doing nothing. -->
        <form class="lst-toolbar lst-toolbar--setting" data-listing-filters hidden aria-label="Filter and sort retreats">
          <div class="lst-field lst-field--search">
            <label class="lst-field__label" for="chalet-search">Destination or property</label>
            <input class="lst-field__input" type="search" id="chalet-search" name="q"
                   data-filter="search" placeholder="e.g. Faraya, Zermatt or Cabin" autocomplete="off" />
          </div>
          <div class="lst-field lst-field--setting">
            <label class="lst-field__label" for="chalet-setting">Setting</label>
            <select class="lst-field__input" id="chalet-setting" name="setting" data-filter="setting">
              <option value="">All settings</option>
              <?php foreach ($settings as $key => $label): ?>
                <option value="<?= $key ?>"><?= $label ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="lst-field lst-field--price">
            <label class="lst-field__label" for="chalet-price">
              Max sample price
              <output class="lst-field__value" for="chalet-price" data-price-output>$<?= $price_max ?></output>
              <span class="lst-field__unit">/ night</span>
            </label>
            <input class="lst-field__range" type="range" id="chalet-price" name="max"
                   data-filter="price" min="<?= $price_min ?>" max="<?= $price_max ?>" step="10" value="<?= $price_max ?>" />
          </div>
          <div class="lst-field lst-field--sort">
            <label class="lst-field__label" for="chalet-sort">Sort by</label>
            <select class="lst-field__input" id="chalet-sort" name="sort" data-filter="sort">
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
          <button class="et-btn et-btn--outline lst-toolbar__clear" type="button" data-clear-filters>Clear filters</button>
        </form>

        <div class="lst-results-bar">
          <!-- A shortcut that fills the search field with "Lebanon"; shown by js/listings.js. -->
          <div class="lst-shortcuts" data-listing-enhance hidden>
            <span class="lst-shortcuts__label" id="chalet-shortcuts-label">Quick filter</span>
            <button class="lst-chip" type="button" aria-describedby="chalet-shortcuts-label"
                    data-quick-filter="search" data-quick-value="Lebanon" aria-pressed="false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
              Stays in Lebanon
            </button>
          </div>
          <p class="lst-results-head__count" data-listing-count><?= count($chalets) ?> retreats</p>
        </div>

        <!-- Screen readers hear result changes here; updated a moment after typing stops. -->
        <p class="et-visually-hidden" role="status" data-listing-status></p>

        <div class="lst-grid" data-listing-grid>
          <?php foreach ($chalets as $i => [$name, $location, $price, $type, $setting, $text, $img, $alt]): ?>
            <article class="lst-card" data-listing-item
                     data-name="<?= $e($name) ?>" data-location="<?= $e($location) ?>"
                     data-price="<?= $price ?>" data-setting="<?= $setting ?>" data-order="<?= $i + 1 ?>"
                     aria-labelledby="chalet-<?= $i + 1 ?>-name">
              <picture>
                <source type="image/webp" srcset="assets/images/chalets/chalet-<?= $img ?>.webp" />
                <img class="lst-card__img" src="assets/images/chalet-<?= $img ?>-image.jpg" width="600" height="400"
                     alt="<?= $e($alt) ?>" <?= $i < $eager_images ? '' : 'loading="lazy" ' ?>decoding="async" />
              </picture>
              <div class="lst-card__body">
                <h3 class="lst-card__name" id="chalet-<?= $i + 1 ?>-name"><?= $e($name) ?></h3>
                <p class="lst-card__location">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                  <?= $e($location) ?>
                </p>
                <!-- Shown above the name; comes after it in the HTML so headings are read first. -->
                <p class="lst-card__meta" data-listing-meta><?= $e($type) ?><span aria-hidden="true"> · </span><span class="et-visually-hidden">, </span><?= $settings[$setting] ?></p>
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
          <h3 class="lst-empty__title">No retreats match those filters.</h3>
          <p class="lst-empty__text">Try another location, setting, or maximum sample price.</p>
          <button class="et-btn et-btn--primary" type="button" data-clear-filters>Clear filters</button>
        </div>

        <div class="lst-more" data-listing-more-wrap hidden>
          <button class="et-btn et-btn--outline et-btn--lg" type="button" data-listing-more>Show more retreats</button>
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
            <p class="lst-card__meta lst-dialog__meta" data-dialog-meta></p>
            <h2 class="lst-dialog__title" id="lst-dialog-title" data-dialog-name></h2>
            <p class="lst-card__location lst-dialog__location" data-dialog-location></p>
            <p class="lst-dialog__text" data-dialog-text></p>
            <p class="lst-dialog__price">
              <span class="lst-card__price-label">Sample price</span>
              <span class="lst-card__price-value" data-dialog-price></span>
            </p>
            <p class="lst-dialog__notice">
              This is a sample listing for a university project. Online accommodation reservations aren't connected yet,
              but you can ask our team about this stay.
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
            <h2 class="lst-alt__title" id="lst-alt-title">Prefer a city stay?</h2>
            <p class="lst-alt__text">Explore hotel stays with convenient access to attractions and services.</p>
            <a class="et-btn et-btn--on-dark et-btn--lg" href="hotels.php">
              Explore hotels
              <svg class="et-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
          </div>
          <div class="lst-alt__media">
            <picture>
              <source type="image/webp" srcset="assets/images/stays/hotel-city-street.webp" />
              <img class="lst-alt__img" src="assets/images/hotel-4-image.jpg" width="600" height="400"
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
