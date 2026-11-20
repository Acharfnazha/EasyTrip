// Reveal on scroll. Content stays visible without JavaScript and when reduced motion is requested.
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
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('is-visible')
    } else {
      io.observe(el)
    }
  })
  document.documentElement.classList.add('reveal-ready')
})()
