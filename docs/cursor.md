# Shared cursor enhancement

`js/nav.js` schedules `js/cursor.js` after the window load event, during idle time.
All 15 pages already include that shared script. The module then loads
`css/cursor.css`; there are no new libraries, images, or render-blocking styles.

The enhancement is enabled only for a fine pointer with hover support, without
reduced motion or forced colors. The system cursor stays visible until the
stylesheet is ready and a real mouse movement positions the replacement.
Changes to those preferences tear down or reinitialize the module. Touch input,
keyboard use, text selection, form controls, and open dialogs use native behavior.

## Tuning and extending

- Cursor appearance and hover scales are in `css/cursor.css`.
- The follower's time constant is 38ms. The central dot follows the actual pointer.
- Buttons and the follower's magnetic attraction are capped at 2px per axis.
- Three reused trail points last 160ms and appear only during fast movement.
- A single reused click ring animates for 380ms.
- The `cards`, `buttons`, and `interactive` selectors in `js/cursor.js` cover the
  existing components. Add `data-cursor-card` to opt another card into spotlight
  behavior. Add `data-cursor="native"` to opt an entire region out, or
  `data-cursor-text` to preserve text-selection behavior on a custom text element.
- Image hover treatment applies only to images inside interactive elements;
  decorative images do not imply a gallery or action.

Pointer events only record the latest coordinates. Animation frames handle visual
updates, reuse cached hover geometry, and stop once movement and fading settle.
Scroll and resize discard that geometry and restore the native cursor until the
next mouse movement. The spotlight is a clipped, fixed overlay, so card markup
and layout do not change. No event cancels clicks, scrolling, or text selection.

## Verification

Browser checks covered all pages, post-load requests, clickable controls, hover
states, magnet limits/reset, spotlight clipping, trail/pulse lifetime, zero idle
frame updates, no geometry reads while moving within one target, window exit and
return, live reduced-motion changes, touch phone/tablet behavior, forced colors,
disabled JavaScript, failed script/style requests, form editing, and listing dialogs.
External font requests were blocked for deterministic local checks.
