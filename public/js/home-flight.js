// Decorative entrance only: let the page load and paint before starting it.
(function () {
  const flight = document.querySelector('.home-flight');
  if (!flight) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) {
    flight.remove();
    return;
  }

  function start() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      // Skip restored/scrolled pages and background tabs; never start on scroll.
      if (motion.matches || document.hidden || window.scrollY > 0) {
        flight.remove();
        return;
      }

      function finish() {
        flight.remove();
        motion.removeEventListener('change', finish);
      }

      motion.addEventListener('change', finish, { once: true });
      flight.addEventListener('animationend', event => {
        if (event.target === flight.lastElementChild.previousElementSibling) finish();
      });
      flight.hidden = false;
      // Also clean up if animation events are unavailable or interrupted.
      window.setTimeout(finish, 4700);
    }));
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
