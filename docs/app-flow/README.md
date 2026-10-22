# EasyTrip — App Flow Diagram

| File | What it is |
| --- | --- |
| `easytrip-app-flow.drawio` | Editable diagram (open it at [app.diagrams.net](https://app.diagrams.net) or in draw.io desktop). It has two pages. |
| `easytrip-app-flow-1-overview.png` / `.svg` | Page 1: the whole app, from **Start** to **Stop** |
| `easytrip-app-flow-2-key-flows.png` / `.svg` | Page 2: the validation, authentication and reservation flows in more detail |

**How to read it:** blue boxes with a solid border already work in the browser (HTML, CSS and
JavaScript). Purple boxes with a dashed border need the backend that is in progress
(Node.js + Express REST API with a MySQL database). Diamonds are if / else decisions. Green arrows
mean *yes / valid* and red arrows mean *no / invalid, go back and fix it*. The **R** circles link the
"Book" and "Reserve" steps to the reservation row.

## Key flows

- **Overview (page 1).** Every visit starts on the home page. The flow then splits by role:
  a *visitor or customer* can browse the whole site without logging in, and an *admin* must log in
  first. Both paths end at **Logout / leave site → Stop**.
- **Browse and explore.** Visitors explore destinations by season (`destinations.html` and the four
  season pages), or browse hotels and chalets (`hotels.html`, `chalets.html`): they search, filter by
  price or setting, sort, and open a details dialog. This is the discovery part of the app and needs
  no account.
- **1 · Validation flow.** Used by every form: the flight and bus & train planners, the contact
  form and, later, login and register. When the visitor submits, JavaScript checks each field in
  order. *If all fields are valid*, the values are tidied and a summary or confirmation is shown.
  *Otherwise* each wrong field gets its own message, focus moves to the first one, and the visitor
  fixes it and submits again. Examples of the rules: From and To must be different, the departure
  date can't be in the past, the return date can't be before the departure, there must be 1–9
  travelers, and the email must look like `name@example.com`. With the backend, the server
  checks the data again before saving it.
- **2 · Authentication flow.** A new user registers (name, email, password). If the input is valid
  and the email isn't already used, the account is saved in the `USERS` table with a hashed password;
  otherwise an error is shown. To log in, the server finds the user by email and compares the
  password hash. *If it matches*, a session token holding the user id and role is created;
  *otherwise* "Wrong email or password" is shown and the user tries again. The role then decides
  where the user goes: customers continue (for example to a reservation), admins go to the
  dashboard. Logging out deletes the token.
- **3 · Reservation flow.** The customer chooses a stay (from its details) or plans a trip (from the
  validated summary) and presses *Reserve*. *If they are not logged in*, they go through the
  authentication flow first. They confirm the dates, travelers and price; the server checks
  availability and, if the stay or trip is available, saves it in `BOOKINGS` (stays) or `TICKETS`
  (transport) with the status *pending*. The customer sees a confirmation and the trip appears in
  "My trips". An admin later confirms or cancels it, which updates the status.
- **Contact / inquiry flow.** The contact form goes through the same validation flow. Today it then
  shows a confirmation; with the backend, the inquiry is also saved so an admin can review it.
- **Admin flow.** After logging in with the admin role, the admin manages destinations, hotels and
  chalets, bookings and tickets, inquiries and user accounts. These actions feed the reports and
  analytics.

## How it fits together

Discovery (destinations, stays) leads visitors to the planners. The **validation flow** makes sure
every form sends clean data. The **authentication flow** controls who can reserve and who can manage
content. The **reservation flow** turns a validated plan or a chosen stay into a saved booking that both
the customer and the admin can see. Today the frontend covers browsing, validation and summaries.
Login, saving reservations and the admin area arrive with the Node.js / MySQL backend described in the
project proposal.
