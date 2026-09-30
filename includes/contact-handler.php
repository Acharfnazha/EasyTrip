<?php
// Contact form handler, included at the top of contact.php.
//
// It sets these variables for the page:
//   $success          confirmation text after the message was saved, else ""
//   $error            a general, visitor-safe error message, else ""
//   $errors           field name => message, for fields that need correcting
//   $values           the visitor's submitted values, kept after an error so they
//                     don't lose their work (always escape them before output)
//   $contact_topics   the allowed topics: form value => label saved to the database
//   $contact_limits   the maximum length of each field, matching database/easytrip_db.sql
//
// Technical details (database errors, missing PHP extensions) go to the server's
// error log only, never to the page.

$contact_topics = [
  'general'      => 'General question',
  'destinations' => 'Destinations',
  'stays'        => 'Hotels & chalets',
  'flights'      => 'Flight planning',
  'bus-train'    => 'Bus & train planning',
  'website'      => 'Website issue',
  'other'        => 'Other',
];

$contact_limits = [
  'name'    => 120,    // VARCHAR(120)
  'email'   => 190,    // VARCHAR(190)
  'phone'   => 40,     // VARCHAR(40)
  'message' => 2000,   // TEXT holds far more; 2,000 characters keeps messages focused
];

// Length in characters (not bytes), so "Zoë" is 3. Uses mbstring when it is
// enabled; otherwise counts UTF-8 characters with a regular expression.
function contact_length($text) {
  if (function_exists('mb_strlen')) return mb_strlen($text, 'UTF-8');
  $count = preg_match_all('/./su', $text);
  return $count === false ? PHP_INT_MAX : $count;   // invalid UTF-8 never passes
}

$success = "";
$error   = "";
$errors  = [];
$values  = ['name' => '', 'email' => '', 'phone' => '', 'topic' => '', 'message' => ''];

// Links from other pages can choose a topic, e.g. contact.php?topic=flights
if (isset($_GET['topic']) && is_string($_GET['topic']) && isset($contact_topics[$_GET['topic']])) {
  $values['topic'] = $_GET['topic'];
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
  // Read each field as trimmed text (anything that isn't a string counts as empty).
  foreach ($values as $field => $unused) {
    $raw = $_POST[$field] ?? '';
    $values[$field] = is_string($raw) ? trim($raw) : '';
  }
  // Browsers send new lines as \r\n; store and count them as one character each.
  $values['message'] = str_replace("\r\n", "\n", $values['message']);

  $name    = $values['name'];
  $email   = $values['email'];
  $phone   = $values['phone'];
  $topic   = $values['topic'];
  $message = $values['message'];

  // Validation: one clear message per field, in the order the fields appear.
  if ($name === "") {
    $errors['name'] = "Enter your full name.";
  } elseif (contact_length($name) > $contact_limits['name']) {
    $errors['name'] = "Your name must be {$contact_limits['name']} characters or fewer.";
  }

  if ($email === "") {
    $errors['email'] = "Enter your email address.";
  } elseif (contact_length($email) > $contact_limits['email'] || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = "Enter an email address in the format name@example.com.";
  }

  if ($phone !== "") {
    $digits = preg_replace('/\D/', '', $phone);
    if (contact_length($phone) > $contact_limits['phone']
        || !preg_match('/^[0-9+().\-\s]+$/', $phone)
        || strlen($digits) < 6 || strlen($digits) > 17) {
      $errors['phone'] = "Enter a phone number using digits, spaces and + ( ) - only, or leave it blank.";
    }
  }

  if (!isset($contact_topics[$topic])) {
    $errors['topic'] = "Choose a topic.";
    $values['topic'] = "";
  }

  if ($message === "") {
    $errors['message'] = "Enter your message.";
  } elseif (contact_length($message) > $contact_limits['message']) {
    $errors['message'] = "Your message must be " . number_format($contact_limits['message']) . " characters or fewer.";
  }

  if ($errors) {
    $error = "Please correct the highlighted fields.";
  } else {
    // Local XAMPP/WAMP defaults. To use other credentials, set the EASYTRIP_DB_*
    // environment variables instead of writing a real password into this file.
    $db_host = getenv('EASYTRIP_DB_HOST') ?: "localhost";
    $db_user = getenv('EASYTRIP_DB_USER') ?: "root";
    $db_pass = getenv('EASYTRIP_DB_PASS') !== false ? getenv('EASYTRIP_DB_PASS') : "";
    $db_name = getenv('EASYTRIP_DB_NAME') ?: "easytrip_db";

    $failed = "The message could not be sent right now. Please try again later.";

    if (!function_exists('mysqli_connect')) {
      error_log("EasyTrip contact form: the PHP mysqli extension is not enabled.");
      $error = $failed;
    } else {
      // PHP 8.1+ throws on a failed connection by default; return false instead so
      // the form shows the error message below rather than a fatal error page.
      mysqli_report(MYSQLI_REPORT_OFF);
      $conn = @mysqli_connect($db_host, $db_user, $db_pass, $db_name);

      if (!$conn) {
        error_log("EasyTrip contact form: database connection failed: " . mysqli_connect_error());
        $error = $failed;
      } else {
        mysqli_set_charset($conn, "utf8mb4");   // keep accents and non-Latin names intact

        $name_db  = mysqli_real_escape_string($conn, $name);
        $email_db = mysqli_real_escape_string($conn, $email);
        $phone_db = mysqli_real_escape_string($conn, $phone);
        $topic_db = mysqli_real_escape_string($conn, $contact_topics[$topic]);
        $msg_db   = mysqli_real_escape_string($conn, $message);

        $sql = "
          INSERT INTO contact_messages (name, email, phone, topic, message_text, created_at)
          VALUES ('$name_db', '$email_db', '$phone_db', '$topic_db', '$msg_db', NOW())
        ";

        if (mysqli_query($conn, $sql)) {
          $success = "Thank you for contacting EasyTrip. Your message has been saved.";
          // Saved: clear the form.
          $values = ['name' => '', 'email' => '', 'phone' => '', 'topic' => '', 'message' => ''];
          $name = $email = $phone = $topic = $message = "";
        } else {
          error_log("EasyTrip contact form: could not save the message: " . mysqli_error($conn));
          $error = $failed;
        }

        mysqli_close($conn);
      }
    }
  }
}
