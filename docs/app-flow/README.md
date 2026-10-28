# EasyTrip App Flow

Files in this folder:

- `easytrip-app-flow.pdf`: the diagram and the explanation (this is what we submit)
- `easytrip-app-flow.drawio`: the diagram source, open it with draw.io (app.diagrams.net)
- `easytrip-app-flow-1-overview.png` / `.svg`: page 1, the overview of the whole app
- `easytrip-app-flow-2-key-flows.png` / `.svg`: page 2, the three main flows in detail

## Explanation

Our diagram has two pages. Page 1 shows the whole app from start to stop, and page 2 shows the
three main flows in more detail. The solid blue boxes are the parts that already work on our website
(HTML, CSS and JavaScript). The dashed purple boxes need the backend we are still building
(Node.js, Express and MySQL).

- **Overall flow:** The user opens the home page and the flow splits by role. Visitors and
  customers can browse the whole site without logging in. Admins have to log in first. All the
  paths end with logout.
- **Browsing:** Users explore destinations by season, or browse hotels and chalets where they can
  search, filter, sort and open the details of a stay. This is how they find what they want before
  planning a trip.
- **Validation flow:** All our forms (flight, bus & train, contact, and later login and register)
  work the same way. When the user submits, every field is checked. If everything is valid, the
  app shows the summary or a confirmation. If not, an error appears under each wrong field and the
  user has to fix it and submit again. For example, "From" and "To" can't be the same city, the
  dates can't be in the past, and the email has to be in a correct format.
- **Authentication flow:** A new user registers, and if the data is valid and the email is not
  already used, the account is saved with a hashed password. To log in, the input is validated
  first, then the server checks the email and password. If they match, a session token with the
  user's role is created. If not, the user sees "Wrong email or password" and tries again. The
  token is checked on every request and deleted on logout. The role decides if the user goes to the
  customer pages or to the admin dashboard.
- **Reservation flow:** After choosing a stay or planning a trip, the user presses Reserve. If
  they are not logged in, they go through the login flow first. Then they confirm the dates,
  travelers and price. If it is still available, it is saved in the BOOKINGS or TICKETS table with
  the status "pending". The user gets a confirmation and sees it in "My trips", and later the admin
  confirms or cancels it.
- **Admin flow:** The admin manages destinations, hotels and chalets, bookings, inquiries and user
  accounts, and can see reports.

**How it all fits together:** browsing brings the user to a form, validation makes sure the data
is correct, authentication decides who can book or manage the site, and the reservation flow saves
the booking so both the customer and the admin can see it.
