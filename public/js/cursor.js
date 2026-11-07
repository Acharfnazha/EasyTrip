// Shared, optional pointer polish. No dependencies and no permanent frame loop.
(function () {
  'use strict';

  const capable = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)');
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('../css/cursor.css', document.currentScript.src).href;
  stylesheet.fetchPriority = 'low';
  let dispose;

  function syncMode() {
    if (dispose) dispose();
    dispose = capable.matches ? initialize() : null;
  }

  // If this request fails, the native cursor is never hidden.
  stylesheet.addEventListener('load', () => {
    syncMode();
    capable.addEventListener('change', syncMode);
  }, { once: true });
  document.head.appendChild(stylesheet);

  function initialize() {
    const root = document.documentElement;
    const controller = new AbortController();
    const layer = document.createElement('div');
    layer.className = 'et-cursor';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<span class="et-cursor__spotlight"><span class="et-cursor__light"></span></span>' +
      '<span class="et-cursor__trail"></span>'.repeat(3) +
      '<span class="et-cursor__pulse"></span><span class="et-cursor__ring"></span><span class="et-cursor__dot"></span>';
    document.body.appendChild(layer);
    if (getComputedStyle(layer).getPropertyValue('--et-cursor-ready').trim() !== '1') {
      layer.remove();
      return null;
    }

    const dot = layer.querySelector('.et-cursor__dot');
    const ring = layer.querySelector('.et-cursor__ring');
    const pulse = layer.querySelector('.et-cursor__pulse');
    const spotlight = layer.querySelector('.et-cursor__spotlight');
    const light = layer.querySelector('.et-cursor__light');
    const particles = [...layer.querySelectorAll('.et-cursor__trail')].map(el => ({ el, born: 0, x: 0, y: 0 }));
    const interactive = 'a[href], button, [role="button"], summary';
    const buttons = 'button, .et-btn, .button, .herobutton, .seasonbutton, [role="button"]';
    const cards = '.hero-card, .season-card, .lst-card, .dst-card, .cardbox, .about-feature, .hc-option, .tkt-mode, .winter-feature, .winter-dest, .winter-season, [data-cursor-card]';
    const native = 'input, textarea, select, option, label, [contenteditable]:not([contenteditable="false"]), [role="textbox"], iframe, video, audio, dialog[open], [disabled], [aria-disabled="true"], [data-cursor="native"]';
    const text = 'p, h1, h2, h3, h4, h5, h6, span, li, dt, dd, blockquote, pre, code, figcaption, [data-cursor-text]';
    const magnets = new Map();
    const returning = new Map();
    let frame = 0, lastFrame = 0, x = 0, y = 0, ringX = 0, ringY = 0;
    let previousX = 0, previousY = 0, lastParticle = 0, particleIndex = 0;
    let target = null, previousTarget = null, button = null, buttonRect = null;
    let card = null, cardRect = null, visible = false, moved = false, pulseAnimation;

    function listen(node, type, handler, options = {}) {
      node.addEventListener(type, handler, { ...options, signal: controller.signal });
    }

    function translate(el, px, py) {
      el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
    }

    function wake() {
      if (!frame) frame = requestAnimationFrame(render);
    }

    function resetMagnets(smooth) {
      magnets.forEach((state, el) => {
        const from = el.style.translate;
        el.style.translate = state.original;
        if (smooth && capable.matches) {
          const animation = el.animate({ translate: [from, state.original || '0px 0px'] }, { duration: 140, easing: 'ease-out' });
          returning.set(el, animation);
          animation.onfinish = () => returning.delete(el);
        }
      });
      magnets.clear();
    }

    function hide(smooth = false) {
      root.classList.remove('et-cursor-active');
      layer.classList.remove('is-visible');
      spotlight.style.opacity = '0';
      particles.forEach(p => { p.born = 0; p.el.style.opacity = '0'; });
      if (pulseAnimation) pulseAnimation.cancel();
      visible = false;
      previousTarget = target = button = card = null;
      buttonRect = cardRect = null;
      moved = false;
      lastFrame = 0;
      returning.forEach(animation => animation.cancel());
      returning.clear();
      resetMagnets(smooth === true);
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function destroy() {
      hide();
      controller.abort();
      layer.remove();
    }

    function updateTarget() {
      const action = target.closest(interactive);
      // Keep native controls, selectable copy, and browser top-layer dialogs familiar.
      if (target.closest(native) || (!action && target.closest(text)) || document.querySelector('dialog[open]')) {
        hide(true);
        return false;
      }
      const nextButton = action && action.matches(buttons) ? action : null;
      const nextCard = target.closest(cards);
      if (nextButton !== button) {
        button = nextButton;
        buttonRect = button ? button.getBoundingClientRect() : null;
        if (button && !magnets.has(button)) {
          if (returning.has(button)) {
            returning.get(button).cancel();
            returning.delete(button);
          }
          magnets.set(button, { x: 0, y: 0, original: button.style.translate });
        }
      }
      if (nextCard !== card) {
        card = nextCard;
        cardRect = card ? card.getBoundingClientRect() : null;
        if (card) {
          translate(spotlight, cardRect.left, cardRect.top);
          spotlight.style.width = `${cardRect.width}px`;
          spotlight.style.height = `${cardRect.height}px`;
          spotlight.style.borderRadius = getComputedStyle(card).borderRadius;
        }
        spotlight.style.opacity = card ? '1' : '0';
      }
      // Image treatment only for images inside real interactive targets.
      layer.dataset.kind = button ? 'button' : action && target.closest('img, picture') ? 'image' : action ? 'link' : 'default';
      previousTarget = target;
      return true;
    }

    function render(now) {
      frame = 0;
      try {
        if (!target || (target !== previousTarget && !updateTarget())) return;
        const dt = Math.min(now - (lastFrame || now - 16.67), 40);
        lastFrame = now;
        const ease = 1 - Math.exp(-dt / 38);
        if (!visible) {
          ringX = previousX = x;
          ringY = previousY = y;
          visible = true;
        }
        let aimX = x, aimY = y;
        if (buttonRect) {
          // Attraction is capped at 2px; the central dot stays at the real pointer.
          aimX += Math.max(-2, Math.min(2, (buttonRect.left + buttonRect.width / 2 - x) * .025));
          aimY += Math.max(-2, Math.min(2, (buttonRect.top + buttonRect.height / 2 - y) * .025));
        }
        ringX += (aimX - ringX) * ease;
        ringY += (aimY - ringY) * ease;
        translate(dot, x, y);
        translate(ring, ringX, ringY);
        layer.classList.add('is-visible');
        root.classList.add('et-cursor-active');
        let unsettled = Math.hypot(aimX - ringX, aimY - ringY) > .08;

        magnets.forEach((state, el) => {
          const active = el === button && buttonRect;
          const tx = active ? Math.max(-2, Math.min(2, (x - buttonRect.left - buttonRect.width / 2) * .025)) : 0;
          const ty = active ? Math.max(-2, Math.min(2, (y - buttonRect.top - buttonRect.height / 2) * .025)) : 0;
          state.x += (tx - state.x) * ease;
          state.y += (ty - state.y) * ease;
          if (!active && Math.hypot(state.x, state.y) < .04) {
            el.style.translate = state.original;
            magnets.delete(el);
          } else {
            el.style.translate = `${state.x.toFixed(2)}px ${state.y.toFixed(2)}px`;
            unsettled ||= Math.hypot(tx - state.x, ty - state.y) > .04;
          }
        });

        if (cardRect && moved) translate(light, x - cardRect.left - 100, y - cardRect.top - 100);
        const distance = Math.hypot(x - previousX, y - previousY);
        if (moved && distance / dt > .9 && now - lastParticle > 30) {
          const p = particles[particleIndex++ % particles.length];
          p.x = previousX;
          p.y = previousY;
          p.born = now;
          lastParticle = now;
        }
        particles.forEach(p => {
          const age = (now - p.born) / 160;
          if (!p.born || age >= 1) {
            p.born = 0;
            p.el.style.opacity = '0';
          } else {
            translate(p.el, p.x, p.y);
            p.el.style.opacity = `${.10 * (1 - age)}`;
            unsettled = true;
          }
        });
        previousX = x;
        previousY = y;
        moved = false;
        if (unsettled) wake();
      } catch (error) {
        // A failed enhancement must never leave an invisible system cursor.
        destroy();
      }
    }

    listen(document, 'pointermove', event => {
      if (event.pointerType !== 'mouse' || event.buttons || !capable.matches) {
        hide();
        return;
      }
      x = event.clientX;
      y = event.clientY;
      target = event.target instanceof Element ? event.target : null;
      moved = true;
      wake();
    }, { passive: true });

    listen(document, 'pointerdown', event => {
      if (event.pointerType !== 'mouse' || !event.target.closest(interactive)) hide();
    }, { passive: true });

    listen(document, 'click', event => {
      if (document.querySelector('dialog[open]')) { hide(); return; }
      if (!visible || !event.detail || !event.target.closest(interactive) || event.target.closest(native)) return;
      if (pulseAnimation) pulseAnimation.cancel();
      const position = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      pulseAnimation = pulse.animate([
        { transform: `${position} scale(.6)`, opacity: .35 },
        { transform: `${position} scale(2.2)`, opacity: 0 }
      ], { duration: 380, easing: 'ease-out' });
    });

    listen(document, 'pointerout', event => { if (!event.relatedTarget) hide(); });
    listen(document, 'focusin', event => { if (event.target.closest(native)) hide(); });
    listen(document, 'keydown', hide);
    listen(document, 'visibilitychange', hide);
    listen(window, 'blur', hide);
    listen(window, 'pagehide', hide);
    // Discard cached geometry on scroll/resize; resume only on a fresh mouse move.
    listen(window, 'scroll', hide, { capture: true, passive: true });
    listen(window, 'resize', hide, { passive: true });
    return destroy;
  }
})();
