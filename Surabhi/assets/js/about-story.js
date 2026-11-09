(() => {
  'use strict';
  const story = document.querySelector('[data-ab-story]');
  if (!story) return;

  const stage = story.querySelector('.ab-story-stage');
  const slides = [...story.querySelectorAll('.ab-story-slide')];
  const controls = [...story.querySelectorAll('[data-story-step]')];
  const indexLabel = story.querySelector('[data-story-index]');
  const status = story.querySelector('[data-story-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  let active = -1;
  let transition;
  let pin;

  function finishTransition() {
    transition?.revert();
    transition = undefined;
    slides.forEach(slide => slide.classList.remove('is-leaving'));
  }

  function show(index) {
    if (index === active) return;
    finishTransition();
    const previous = slides[active];
    const next = slides[index];
    const animate = previous && gsap && !motion.matches;

    slides.forEach((slide, i) => {
      slide.classList.toggle('is-current', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    active = index;
    const number = String(index + 1).padStart(2, '0');
    indexLabel.textContent = number;
    status.textContent = `Panel ${index + 1} of ${slides.length}: ${next.querySelector('h3').textContent}`;
    stage.style.setProperty('--story-progress', (index + 1) / slides.length);
    controls[0].setAttribute('aria-disabled', String(index === 0));
    controls[1].setAttribute('aria-disabled', String(index === slides.length - 1));

    if (animate) {
      previous.classList.add('is-leaving');
      transition = gsap.timeline({ onComplete: () => previous.classList.remove('is-leaving') })
        .fromTo(next, { opacity: 0 }, { opacity: 1, duration: .54, ease: 'power2.out' })
        .fromTo(next.querySelector('img'), { scale: 1.055 }, { scale: 1, duration: .78, ease: 'power2.out' }, 0)
        .fromTo(next.querySelectorAll('.ab-story-copy > *'), { y: 11 }, { y: 0, stagger: .045, duration: .48, ease: 'power2.out' }, .08);
    }
  }

  function step(direction) {
    const index = active + direction;
    if (index < 0 || index >= slides.length) return;
    if (pin) {
      const progress = (index + .5) / slides.length;
      window.scrollTo({ top: pin.start + progress * (pin.end - pin.start), behavior: 'instant' });
      ScrollTrigger.update();
    }
    show(index);
  }

  story.classList.add('is-ready');
  show(0);
  story.querySelector('[data-story-ui]').hidden = false;
  controls.forEach(button => {
    button.addEventListener('click', () => step(Number(button.dataset.storyStep)));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    });
  });

  let touchStart;
  stage.addEventListener('touchstart', event => {
    touchStart = !pin && event.touches.length === 1 && event.target.closest('.ab-story-photo')
      ? event.touches[0] : undefined;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const x = touch.clientX - touchStart.clientX;
    const y = touch.clientY - touchStart.clientY;
    touchStart = undefined;
    if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.4) step(x < 0 ? 1 : -1);
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touchStart = undefined; }, { passive: true });
  motion.addEventListener('change', finishTransition);

  if (!gsap || !ScrollTrigger) return;
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(slides[0].querySelector('.ab-story-copy'), {
      opacity: .65, y: 15, duration: .7, ease: 'power2.out',
      scrollTrigger: { trigger: story, start: 'top 78%', once: true },
    });
  });
  media.add('(min-width: 1024px) and (min-height: 680px) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    story.classList.add('is-pinned');
    const headerOffset = parseFloat(getComputedStyle(story).getPropertyValue('--story-top'));
    function sync(self) {
      show(Math.min(slides.length - 1, Math.floor(self.progress * slides.length)));
    }
    pin = ScrollTrigger.create({
      trigger: story,
      pin: stage,
      start: `top top+=${headerOffset}`,
      end: () => `+=${Math.round(innerHeight * (slides.length - 1) * .8)}`,
      refreshPriority: 1,
      onRefresh: sync,
      onUpdate: sync,
    });
    ScrollTrigger.refresh();
    return () => {
      pin = undefined;
      story.classList.remove('is-pinned');
      finishTransition();
    };
  });

  addEventListener('pagehide', event => {
    if (event.persisted) return;
    media.revert();
    finishTransition();
  });
})();
