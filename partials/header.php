<?php
// Current page for the active nav state. When this partial is fetched by
// js/includes.js the script name is header.php, so the nav script sets it instead.
$et_page = basename($_SERVER['SCRIPT_NAME'] ?? '');
if ($et_page === 'header.php' || $et_page === '') {
  $et_page = null;
}
$et_nav = [
  ['label' => 'Home', 'href' => 'index.php'],
  ['label' => 'Destinations', 'id' => 'et-menu-destinations', 'items' => [
    ['label' => 'All destinations', 'href' => 'destinations.php'],
    ['label' => 'Winter destinations', 'href' => 'winter.php'],
    ['label' => 'Spring destinations', 'href' => 'spring.php'],
    ['label' => 'Summer destinations', 'href' => 'summer.php'],
    ['label' => 'Autumn destinations', 'href' => 'autumn.php'],
  ]],
  ['label' => 'Hotels & Chalets', 'id' => 'et-menu-stays', 'items' => [
    ['label' => 'Hotels & chalets overview', 'href' => 'hotels-chalets.php'],
    ['label' => 'Hotels', 'href' => 'hotels.php'],
    ['label' => 'Chalets', 'href' => 'chalets.php'],
  ]],
  ['label' => 'Tickets', 'id' => 'et-menu-tickets', 'items' => [
    ['label' => 'All tickets', 'href' => 'tickets.php'],
    ['label' => 'Flight tickets', 'href' => 'flight.php'],
    ['label' => 'Bus & train tickets', 'href' => 'bus-train.php'],
  ]],
  ['label' => 'Contact', 'href' => 'contact.php'],
  ['label' => 'About', 'id' => 'et-menu-about', 'items' => [
    ['label' => 'Who we are', 'href' => 'about.php'],
    ['label' => 'Why choose EasyTrip', 'href' => 'why-easytrip.php'],
  ]],
];
$et_current = function ($href) use ($et_page) {
  return $et_page !== null && $href === $et_page ? ' aria-current="page"' : '';
};
?>
<a class="et-skip-link" href="#main">Skip to main content</a>
<header class="et-header" data-et-header>
  <div class="et-container et-header__bar">
    <a class="et-header__brand" href="index.php" aria-label="EasyTrip home">
      <img class="et-header__logo" src="assets/images/brand/logo.svg" alt="" width="43" height="40">
      <span class="et-header__wordmark" aria-hidden="true">Easy<span>Trip</span></span>
    </a>

    <button class="et-nav-toggle" type="button" aria-expanded="false" aria-controls="et-nav-panel" data-et-nav-toggle>
      <span class="et-nav-toggle__bars" aria-hidden="true"></span>
      <span class="et-visually-hidden">Menu</span>
    </button>

    <nav class="et-nav" id="et-nav-panel" aria-label="Main">
      <ul class="et-nav__list">
        <?php foreach ($et_nav as $item): ?>
          <?php if (empty($item['items'])): ?>
            <li class="et-nav__item">
              <a class="et-nav__link" href="<?= $item['href'] ?>"<?= $et_current($item['href']) ?>><?= htmlspecialchars($item['label']) ?></a>
            </li>
          <?php else:
            $et_group_current = $et_page !== null && in_array($et_page, array_column($item['items'], 'href'), true);
          ?>
            <li class="et-nav__item et-nav__item--has-menu">
              <button class="et-nav__link et-nav__trigger<?= $et_group_current ? ' is-current' : '' ?>" type="button" aria-expanded="false" aria-controls="<?= $item['id'] ?>">
                <?= htmlspecialchars($item['label']) ?>
                <span class="et-nav__caret" aria-hidden="true"></span>
              </button>
              <ul class="et-nav__menu" id="<?= $item['id'] ?>">
                <?php foreach ($item['items'] as $sub): ?>
                  <li><a class="et-nav__menu-link" href="<?= $sub['href'] ?>"<?= $et_current($sub['href']) ?>><?= htmlspecialchars($sub['label']) ?></a></li>
                <?php endforeach; ?>
              </ul>
            </li>
          <?php endif; ?>
        <?php endforeach; ?>
      </ul>
    </nav>

    <a class="et-btn et-btn--primary et-header__cta" href="tickets.php">Book Now</a>
  </div>
</header>
