// Page behaviours shared by several pages. Navigation lives in js/includes.js.

// Reveal-on-scroll: content is visible by default; it is only hidden for the
// animation when the browser can reveal it again and motion is welcome.
(function () {
  const revealEls = document.querySelectorAll('.reveal')
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!revealEls.length || reduceMotion || !('IntersectionObserver' in window)) return

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        io.unobserve(entry.target)
      }
    })
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })

  revealEls.forEach(el => {
    // Anything already on screen stays visible without animating in.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('is-visible')
    } else {
      io.observe(el)
    }
  })
  document.documentElement.classList.add('reveal-ready')
})()

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".stays").forEach(function (section) {
    const tabs = section.querySelectorAll(".staytabs .tab");
    const panels = section.querySelectorAll(".staysrow[data-stay-panel]");
    function showPanel(target) {
      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.stayPanel !== target;
      });
    }
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const target = tab.dataset.stayTarget;
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        showPanel(target);
      });
    });
    const firstActive = section.querySelector(".staytabs .tab.active") || tabs[0];
    if (firstActive) {
      const target = firstActive.dataset.stayTarget;
      firstActive.classList.add("active");
      showPanel(target);
    }
  });
});

