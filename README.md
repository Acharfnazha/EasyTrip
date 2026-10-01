# EasyTrip — Travel Made Simple

EasyTrip is a travel website built with **HTML, CSS and vanilla JavaScript**.
Visitors can explore destinations by season, browse hotels and chalets, look at flight,
bus and train tickets, and fill in a contact form.

> **University project.** EasyTrip demonstrates frontend web development.
> Hotels, chalets, prices and ticket planners are sample content: nothing can be booked or paid for,
> and the contact form doesn't send messages anywhere.

**Tech stack:** HTML, CSS and vanilla JavaScript. No server, database, frameworks, build step or
package manager.

![EasyTrip homepage on desktop](docs/screenshots/home-desktop.jpg)

<img src="docs/screenshots/home-mobile.jpg" alt="EasyTrip homepage on mobile" width="260">

---

## Contents

- [Pages](#pages)
- [Running the project](#running-the-project)
- [Project structure](#project-structure)
- [Header and footer](#header-and-footer)
- [Common changes](#common-changes)
- [Accessibility and performance](#accessibility-and-performance)
- [Known limitations](#known-limitations)
- [Credits](#credits)

---

## Pages

| Page | File | What it shows |
| --- | --- | --- |
| Home | `index.html` | Hero, top destinations, about, seasonal trip ideas, services, explore band |
| Destinations | `destinations.html` | Seasonal travel guide: compare winter, spring, summer and autumn, choose by experience |
| Winter / Spring / Summer / Autumn | `winter.html`, `spring.html`, `summer.html`, `autumn.html` | Trip ideas and featured countries for each season |
| Hotels & chalets | `hotels-chalets.html` | Accommodation guide: hotels vs chalets, quick comparison, what to consider |
| Hotels | `hotels.html` | Sample hotel collection: search, max sample price, sorting, "Show more", details dialog |
| Chalets | `chalets.html` | Sample chalets & private retreats: search, setting, max sample price, sorting, "Stays in Lebanon" shortcut, details dialog |
| All tickets | `tickets.html` | Transport choice: flights or bus & train, a quick comparison, a note that booking isn't connected yet |
| Flights | `flight.html` | Flight-planning prototype: round trip / one way, validated form, search summary (no live results) |
| Bus & train | `bus-train.html` | Ground-travel planning prototype: one form for bus or train, validation, route summary (no live results) |
| Who we are | `about.html` | What EasyTrip is, why it was built, what you can explore, its design principles and possible next steps |
| Why choose EasyTrip | `why-easytrip.html` | Why the connected frontend is useful: real page screenshots, four reasons the experience works, a four-step journey through the site, and what works today vs. what backend work could add |
| Contact | `contact.html` | Contact form with guidance, field-level validation and a confirmation (demo only: nothing is sent) |

---

## Running the project

Open `index.html` in a modern browser (double-click it). Every page works straight from the
folder: no server or installation is needed.

Any static web host (GitHub Pages, Netlify, a university web space) can also serve the folder as it is.

---

## Project structure

```text
Easy_Trip/
├── index.html                Homepage
├── about.html                Who we are
├── why-easytrip.html         Why choose EasyTrip
├── contact.html              Contact form
├── destinations.html         All destinations (by season)
├── winter.html  spring.html  summer.html  autumn.html
├── hotels-chalets.html       Hotels & chalets overview
├── hotels.html  chalets.html Listings with filters
├── tickets.html              Tickets overview
├── flight.html  bus-train.html
│
├── css/
│   ├── styles.css            Shared styles: header, footer, homepage, buttons
│   ├── reset.css             Older shared base styles (loaded by several pages)
│   ├── styles2.css           Older base styles (no longer loaded by any page)
│   ├── listings.css          Listing components (toolbar, cards, dialog) for hotels.html and chalets.html
│   └── <page>.css            One stylesheet per page (about, why-easytrip, flight, winter, …),
│                             each scoped under its page's <main> class (e.g. .about-page)
│
├── js/
│   ├── nav.js                Navigation menu (dropdowns, mobile menu, current page)
│   ├── script.js             Scroll reveal (plus an old "stays" tab switcher no page uses any more)
│   ├── listings.js           Listing controller for hotels and chalets: filter, sort, show more, dialog
│   ├── flight.js             Flight planner: trip type, swap, date limits, validation, search summary
│   ├── bus-train.js          Route planner: bus/train mode, trip type, swap, validation, route summary
│   └── contact.js            Contact form: checks, error summary, confirmation, character count
│
├── assets/
│   ├── images/
│   │   ├── about/            About page images (WebP crops + a homepage screenshot)
│   │   ├── why/              Why choose EasyTrip images (road band + three page screenshots)
│   │   ├── brand/            Logo (logo.svg is used on the site)
│   │   ├── home/             Homepage images (optimized .webp + fallbacks)
│   │   ├── destinations/     Destinations page images (optimized .webp + hero fallback)
│   │   ├── stays/            Hotels & chalets page images (optimized .webp)
│   │   ├── hotels/           Hotel card images (600×400 .webp crops)
│   │   ├── chalets/          Chalet card images (600×400 .webp crops)
│   │   ├── contact/          Contact page hero (.webp of support.png)
│   │   ├── tickets/          Tickets page images (optimized .webp)
│   │   ├── travel/           Transport images used by bus-train.html
│   │   └── *.png / *.jpg     Destination, hotel, chalet and page images
│   ├── models/travel-icons/  Low-poly 3D icons (plane, train, bus, chalet) as .glb, plus the script that makes them
│   └── videos/               About page video
│
└── docs/
    ├── screenshots/          Images used in this README
    └── template-reference/   Original design template (kept locally only; not in the Git repository)
```

### Naming rules

- File and folder names are **lowercase with hyphens**: no spaces, capitals or accents
  (for example `jeita-grotto.png`, not `Jeita Grotto.png`). Many web hosts run Linux,
  where `Lebanon.png` and `lebanon.png` are different files.
- Page names describe the page: `about.html`, `contact.html`, `why-easytrip.html`.

---

## Header and footer

Every page contains its own copy of the same header (logo, main menu, Book Now button) and
footer (links, copyright), so each page works on its own, even with JavaScript
turned off. **When you change the header or footer, make the same change in all 15 pages**
(your editor's "Replace in files" does this in one step).

`js/nav.js` runs the **navigation menu** on every page:

- Desktop dropdowns open on hover, click or keyboard (Enter, Space, Arrow keys) and close with
  Escape, a click outside, or moving focus away.
- Below 1080px the menu collapses behind a menu button. Submenus expand in place, and
  **Book Now** stays visible.
- The current page is highlighted in the menu (`aria-current="page"` on its link).

---

## Common changes

### Add or change a menu link

Edit the `<nav class="et-nav">` list in the header of every page. A dropdown is an
`et-nav__item--has-menu` item; each link in it looks like this:

```html
<li><a class="et-nav__menu-link" href="flight.html">Flight tickets</a></li>
```

### Add or edit a hotel

Each hotel is an `<article class="lst-card">` inside the `lst-grid` in `hotels.html`. To add one,
copy an existing card and change:

- `data-name`, `data-location` and `data-price` (used by the search, the price filter and sorting)
- `data-order` and the `hotel-<number>-name` id (with the matching `aria-labelledby`) to the next number
- the image (`assets/images/hotels/hotel-<number>.webp`, a 600×400 WebP, plus the `.jpg` fallback) and its `alt` text
- the visible name, location, description and price

Then update the hotel count in `data-listing-count` ("27 hotels"). If the new price is outside the
price slider's range, update the slider's `min`/`max`/`value` and the `$600` shown next to it.

### Add or edit a chalet

Chalets work the same way in `chalets.html`. Each card also has a `data-setting`, which must be one
of the values in the "Setting" filter (`mountain`, `coastal`, `countryside`, `forest`, `desert`,
`tropical`), and a label such as "Cabin · Mountain". The "Stays in Lebanon" button fills the search
box with "Lebanon", so it finds every chalet whose location contains that word.

### Link to the contact form with a topic

`contact.html?topic=flights` opens the contact form with that topic chosen. The topics are
`general`, `destinations`, `stays`, `flights`, `bus-train`, `website` and `other`.

### Brand colours

The main colours are CSS variables at the top of `css/styles.css`:

| Variable | Colour | Used for |
| --- | --- | --- |
| `--et-navy` | `#001B48` | Headings, footer, dark sections |
| `--et-royal` | `#02457A` | Button hover, gradients |
| `--et-primary` | `#0077A8` | Buttons and links (meets WCAG AA contrast with white) |
| `--et-sky` | `#018ABE` | Active-page underline, accents |

---

## Accessibility and performance

- A "Skip to main content" link, proper landmarks (`header`, `nav`, `main`, `footer`) and a
  logical heading order on the homepage.
- A visible focus outline on every link and button. Touch targets are about 44px.
- Colour contrast meets WCAG AA for text and buttons.
- Animations switch off for visitors who choose *reduce motion* in their system settings.
- Homepage images are resized WebP files (under 1 MB for the whole page), with sizes
  reserved to avoid layout jumps. The hero image loads first, and images further down load
  as you scroll.

---

## Known limitations

- **No accounts, booking or payment.** The flight and bus & train planners check what
  the visitor enters and show a summary, but there are no live routes, schedules or fares, and
  there is no login or registration.
- **The contact form doesn't send anything.** It checks each field in the browser and then shows a
  confirmation that says the message wasn't sent. Without JavaScript, sending only reloads the page.
- **No social media links.** EasyTrip has no verified social accounts, so the footer doesn't link to any.
- The header's **Book Now** button leads to the tickets overview; nothing can actually be booked.
- The copyright year in the footer is written into each page.
- Some pages still use older stylesheets (`reset.css`, `styles2.css`) that duplicate parts of
  `styles.css`. The shared header and footer use their own `et-` class names, so those files
  can't affect them.
- The destination photos from the old Flight page's "stays by destination" tabs are no longer used
  directly: `jeita-grotto.png`, `raouche-rock.png`, `jbayl.png`, `faraya.png`, `konyaalti-beach.png`,
  `kaleici-old-town.png`, `lara-beach.png`, `antalya-cirali.png`, `island-*.png`, `egypt-*.png` and
  `turkey-*.png` in `assets/images/`. (The About page uses resized WebP crops of `jbayl.png` and
  `island-bali.png`, saved in `assets/images/about/`. The Why choose EasyTrip page uses a rotated
  crop of `assets/images/tickets/busandtrain.jpg`, saved in `assets/images/why/`.)
- These files are not used by any page yet: `css/styles2.css`, `assets/images/chalets-hero-detail.jpg`,
  `assets/images/brand/logo.png`, `assets/images/contact.png`, `assets/images/train.png`,
  `assets/images/team-1.jpg`, `assets/images/team-2.jpg`, `assets/images/about-hero.jpg` and
  `assets/images/about-poster-video.jpg` (stock photos, removed from the About and Why pages),
  `assets/images/travel/cartravel.png`, `assets/videos/hotels-chalets-hero.mp4` (about 24 MB) and
  `assets/videos/about-video.mp4` (about 43 MB of stock office footage, removed from the Why page).
- The Why choose EasyTrip page used to claim a secure reservation system, instant confirmations,
  payment security, flexible pricing, curated deals and 24/7 support. EasyTrip has none of these,
  so those claims were removed.

---

## Credits

- Homepage layout adapted from the *Responsive Travel Website* template by
  [Bedimcode](https://www.youtube.com/@Bedimcode) (the original template is kept locally in
  `docs/template-reference/` and is not published in this repository),
  including the about, explore and join photos.
- Fonts: [Inter](https://rsms.me/inter/) and [Montserrat](https://fonts.google.com/specimen/Montserrat),
  via Google Fonts.
