<?php
// The handler validates and saves a submitted message, and sets $success, $error,
// $errors (per field), $values (the visitor's input), $contact_topics and $contact_limits.
include __DIR__ . '/includes/contact-handler.php';

// Every value typed by the visitor is escaped before it goes back into the page.
$e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

// Field name => input id, in form order (used by the error summary links).
$contact_ids = [
  'name'    => 'contact-name',
  'email'   => 'contact-email',
  'phone'   => 'contact-phone',
  'topic'   => 'contact-topic',
  'message' => 'contact-message',
];
$invalid = fn($field) => isset($errors[$field]) ? ' aria-invalid="true"' : '';
$error_text = fn($field) => $e($errors[$field] ?? '');
$error_hidden = fn($field) => isset($errors[$field]) ? '' : ' hidden';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="assets/images/brand/logo.svg" type="image/svg+xml" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contact — EasyTrip</title>
  <meta name="description" content="Send EasyTrip a question about destinations, hotels and chalets, flight or bus and train planning, or the website." />
  <link rel="preload" as="image" href="assets/images/contact/support-desk.webp" fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/contact.css" />
</head>
<body class="contact-page">
  <?php include __DIR__ . '/partials/header.php'; ?>

  <main id="main" tabindex="-1">
    <!-- 1. Compact hero -->
    <section class="contact-hero" aria-labelledby="contact-hero-title">
      <picture class="contact-hero__media">
        <source type="image/webp" srcset="assets/images/contact/support-desk.webp" />
        <img class="contact-hero__img" src="assets/images/support.png" width="626" height="313" alt=""
             fetchpriority="high" decoding="async" />
      </picture>
      <div class="et-container contact-hero__inner">
        <nav class="contact-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="index.php">Home</a></li>
            <li><span aria-current="page">Contact</span></li>
          </ol>
        </nav>
        <h1 class="contact-hero__title" id="contact-hero-title">Tell us how we can help</h1>
        <p class="contact-hero__text">
          Send EasyTrip a question about destinations, stays, transport planning, or the website.
        </p>
      </div>
    </section>

    <!-- 2. Form and guidance -->
    <div class="contact-main">
      <div class="et-container contact-layout">
        <section class="contact-form-card" id="contact-form" aria-labelledby="contact-form-title">
          <h2 class="contact-form-card__title" id="contact-form-title">Send a message</h2>
          <p class="contact-form__required-note">All fields are required unless marked optional.</p>

          <?php if ($success !== ""): ?>
            <div class="form-status form-status--success" role="status" tabindex="-1" data-form-status>
              <svg class="form-status__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>
              <div>
                <h3 class="form-status__title">Message received</h3>
                <p class="form-status__text"><?= $e($success) ?></p>
              </div>
            </div>
          <?php elseif ($error !== "" && !$errors): ?>
            <!-- The message was valid but could not be saved (no technical details are shown) -->
            <div class="form-status form-status--error" role="alert" tabindex="-1" data-form-status>
              <svg class="form-status__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v6m0 3.5v.5"/></svg>
              <div>
                <h3 class="form-status__title">Your message wasn't sent</h3>
                <p class="form-status__text"><?= $e($error) ?> Your details are still in the form.</p>
              </div>
            </div>
          <?php endif; ?>

          <!-- Error summary: filled by the server after a submission, or by js/contact.js before one -->
          <div class="form-status form-status--error" role="alert" tabindex="-1" data-error-summary<?= $errors ? ' data-form-status' : ' hidden' ?>>
            <svg class="form-status__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v6m0 3.5v.5"/></svg>
            <div>
              <h3 class="form-status__title">Please check your message</h3>
              <p class="form-status__text">It hasn't been sent yet. Fix the following and send it again:</p>
              <ul class="form-status__list" data-error-list>
                <?php foreach ($contact_ids as $field => $id): ?>
                  <?php if (isset($errors[$field])): ?>
                    <li><a href="#<?= $id ?>"><?= $e($errors[$field]) ?></a></li>
                  <?php endif; ?>
                <?php endforeach; ?>
              </ul>
            </div>
          </div>

          <form class="contact-form" action="contact.php#contact-form" method="post" data-contact-form>
            <div class="contact-form__field">
              <label class="contact-form__label" for="contact-name">Full name</label>
              <input class="contact-form__input" type="text" id="contact-name" name="name" required
                     maxlength="<?= $contact_limits['name'] ?>" autocomplete="name"
                     value="<?= $e($values['name']) ?>" aria-describedby="contact-name-error"<?= $invalid('name') ?>
                     data-field="name" />
              <p class="contact-form__error" id="contact-name-error"<?= $error_hidden('name') ?>><?= $error_text('name') ?></p>
            </div>

            <div class="contact-form__field">
              <label class="contact-form__label" for="contact-email">Email address</label>
              <input class="contact-form__input" type="email" id="contact-email" name="email" required
                     maxlength="<?= $contact_limits['email'] ?>" autocomplete="email" spellcheck="false"
                     value="<?= $e($values['email']) ?>" aria-describedby="contact-email-error"<?= $invalid('email') ?>
                     data-field="email" />
              <p class="contact-form__error" id="contact-email-error"<?= $error_hidden('email') ?>><?= $error_text('email') ?></p>
            </div>

            <div class="contact-form__field">
              <label class="contact-form__label" for="contact-phone">
                Phone number <span class="contact-form__optional">(optional)</span>
              </label>
              <p class="contact-form__hint" id="contact-phone-hint">Any format, including a country code.</p>
              <input class="contact-form__input" type="tel" id="contact-phone" name="phone"
                     maxlength="<?= $contact_limits['phone'] ?>" autocomplete="tel"
                     value="<?= $e($values['phone']) ?>" aria-describedby="contact-phone-hint contact-phone-error"<?= $invalid('phone') ?>
                     data-field="phone" />
              <p class="contact-form__error" id="contact-phone-error"<?= $error_hidden('phone') ?>><?= $error_text('phone') ?></p>
            </div>

            <div class="contact-form__field">
              <label class="contact-form__label" for="contact-topic">Topic</label>
              <p class="contact-form__hint" id="contact-topic-hint">What is your question mainly about?</p>
              <select class="contact-form__input contact-form__select" id="contact-topic" name="topic" required
                      aria-describedby="contact-topic-hint contact-topic-error"<?= $invalid('topic') ?> data-field="topic">
                <option value="" disabled<?= $values['topic'] === '' ? ' selected' : '' ?>>Choose a topic</option>
                <?php foreach ($contact_topics as $value => $label): ?>
                  <option value="<?= $e($value) ?>"<?= $values['topic'] === $value ? ' selected' : '' ?>><?= $e($label) ?></option>
                <?php endforeach; ?>
              </select>
              <p class="contact-form__error" id="contact-topic-error"<?= $error_hidden('topic') ?>><?= $error_text('topic') ?></p>
            </div>

            <div class="contact-form__field contact-form__field--wide">
              <label class="contact-form__label" for="contact-message">Message</label>
              <p class="contact-form__hint" id="contact-message-hint">
                Tell us what you need help with. Include the page or destination involved and any error message you saw.
              </p>
              <textarea class="contact-form__input contact-form__textarea" id="contact-message" name="message" rows="7" required
                        maxlength="<?= $contact_limits['message'] ?>"
                        aria-describedby="contact-message-hint contact-message-error contact-message-safety contact-message-count"<?= $invalid('message') ?>
                        data-field="message"><?= $e($values['message']) ?></textarea>
              <p class="contact-form__error" id="contact-message-error"<?= $error_hidden('message') ?>><?= $error_text('message') ?></p>
              <div class="contact-form__meta">
                <p class="contact-form__safety" id="contact-message-safety">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
                  Please do not include passwords, passport details, or payment-card information.
                </p>
                <p class="contact-form__count" id="contact-message-count" data-message-count>
                  Up to <?= number_format($contact_limits['message']) ?> characters.
                </p>
              </div>
              <!-- Announces only when the message gets close to the limit (see js/contact.js) -->
              <p class="et-visually-hidden" aria-live="polite" data-count-announcer></p>
            </div>

            <div class="contact-form__submit">
              <button class="et-btn et-btn--primary et-btn--lg" type="submit" data-contact-submit>Send message</button>
              <p class="contact-form__submit-note">Sending stores your message in the EasyTrip project database.</p>
            </div>
          </form>
        </section>

        <aside class="contact-guidance" aria-labelledby="contact-guidance-title">
          <h2 class="contact-guidance__title" id="contact-guidance-title">Before you send</h2>
          <ul class="contact-guidance__list">
            <li>Include the destination or page related to your question.</li>
            <li>Describe what you were trying to do.</li>
            <li>Mention any error message you saw.</li>
          </ul>

          <div class="contact-guidance__private">
            <h3 class="contact-guidance__heading">Keep private details out</h3>
            <p>Do not include passwords, passport numbers, or payment-card information.</p>
          </div>

          <h3 class="contact-guidance__heading">What you can ask about</h3>
          <ul class="contact-guidance__topics">
            <li>Destination questions</li>
            <li>Hotels and chalets you've browsed</li>
            <li>The flight-planning page</li>
            <li>Bus and train planning</li>
            <li>Problems with the website</li>
          </ul>

          <h3 class="contact-guidance__heading">What happens next</h3>
          <p class="contact-guidance__text">
            Messages are kept in the project database. There is no live support desk, so we can't promise a
            reply time.
          </p>
        </aside>
      </div>
    </div>

    <!-- 3. Other places to go -->
    <section class="contact-more" aria-labelledby="contact-more-title">
      <div class="et-container">
        <h2 class="contact-more__title" id="contact-more-title">Looking for something else?</h2>
        <ul class="contact-more__list">
          <li>
            <a class="contact-more__link" href="destinations.php">Explore destinations <span aria-hidden="true">&rarr;</span></a>
            <p class="contact-more__text">Seasonal ideas and places to visit.</p>
          </li>
          <li>
            <a class="contact-more__link" href="hotels-chalets.php">Browse hotels &amp; chalets <span aria-hidden="true">&rarr;</span></a>
            <p class="contact-more__text">Sample city stays and nature escapes.</p>
          </li>
          <li>
            <a class="contact-more__link" href="tickets.php">Plan transport <span aria-hidden="true">&rarr;</span></a>
            <p class="contact-more__text">Prepare a flight, bus or train journey.</p>
          </li>
          <li>
            <a class="contact-more__link" href="about.php">Learn about EasyTrip <span aria-hidden="true">&rarr;</span></a>
            <p class="contact-more__text">Who we are and what the site does.</p>
          </li>
        </ul>
        <p class="contact-project-note">
          EasyTrip is a university project demonstrating frontend and database-backed web development.
        </p>
      </div>
    </section>
  </main>

  <?php include __DIR__ . '/partials/footer.php'; ?>

  <script src="js/includes.js"></script>
  <script src="js/contact.js"></script>
</body>
</html>
