(() => {
  'use strict';
  const page = document.querySelector('.surabhi-about');
  if (!page) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  const tabList = page.querySelector('[data-ab-tablist]');
  const tabs = [...tabList.querySelectorAll('button')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  let activeTab = -1;
  let panelMotion;

  function showPanel(index, focus = false) {
    if (focus) tabs[index].focus();
    if (index === activeTab) return;
    panelMotion?.revert();
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    const entering = activeTab !== -1;
    activeTab = index;
    if (entering && gsap && !motion.matches) {
      panelMotion = gsap.context(() => {
        gsap.timeline()
          .from('.ab-panel-media', { opacity: 0, duration: .35, ease: 'power1.out' })
          .from('.ab-panel-copy', { opacity: 0, y: 12, duration: .36, ease: 'power2.out' }, .05);
      }, panels[index]);
    }
    ScrollTrigger?.refresh();
  }

  tabList.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', () => showPanel(index));
    tab.addEventListener('keydown', event => {
      const key = event.key;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
      event.preventDefault();
      const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1
        : (index + (key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
      showPanel(next, true);
    });
  });
  showPanel(0);
  tabList.hidden = false;

  page.querySelectorAll('[data-ab-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.ab-track');
    const cards = [...track.children];
    const controls = carousel.querySelector('[data-ab-controls]');
    const count = controls.querySelector('[data-ab-position]');
    const buttons = [...controls.querySelectorAll('button')];
    const format = number => String(number).padStart(2, '0');
    let positions = [0];
    let frame;

    function positionIndex() {
      return positions.reduce((closest, offset, index) =>
        Math.abs(offset - track.scrollLeft) < Math.abs(positions[closest] - track.scrollLeft)
          ? index : closest, 0);
    }

    function update() {
      const index = positionIndex();
      const label = `${format(index + 1)} / ${format(positions.length)}`;
      if (count.textContent !== label) count.textContent = label;
      buttons[0].setAttribute('aria-disabled', String(index === 0));
      buttons[1].setAttribute('aria-disabled', String(index === positions.length - 1));
    }

    function measure() {
      const max = track.scrollWidth - track.clientWidth;
      positions = [...new Set(cards.map(card => Math.min(card.offsetLeft - cards[0].offsetLeft, max)))];
      controls.hidden = positions.length < 2;
      update();
    }

    function step(direction) {
      const target = positions[positionIndex() + direction];
      if (target === undefined) return;
      track.scrollTo({ left: target, behavior: motion.matches ? 'instant' : 'smooth' });
    }

    buttons.forEach(button => button.addEventListener('click', () => step(Number(button.dataset.abStep))));
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    });
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }, { passive: true });
    new ResizeObserver(measure).observe(track);
    measure();
  });

  if (!gsap || !ScrollTrigger) return;
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const hero = page.querySelector('.ab-hero');
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(hero.querySelector('.ab-hero-media'), { scale: 1.075, opacity: .65, duration: 1.2 })
      .from(hero.querySelectorAll('.ab-hero-copy > *'), { y: 20, opacity: 0, duration: .7, stagger: .09 }, .08);

    page.querySelectorAll('[data-ab-reveal]').forEach(element => {
      gsap.from(element, {
        y: 24, opacity: 0, duration: .65, ease: 'power2.out',
        scrollTrigger: { trigger: element, start: 'top 90%', once: true },
      });
    });
    page.querySelectorAll('[data-ab-mask]').forEach(element => {
      gsap.from(element, {
        clipPath: 'inset(0 0 14% 0)', duration: .95, ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 89%', once: true },
      });
    });
    page.querySelectorAll('[data-ab-count]').forEach(element => {
      const number = Number(element.dataset.abCount);
      const value = { amount: 0 };
      gsap.to(value, {
        amount: number, duration: .75, ease: 'power2.out',
        onUpdate: () => { element.textContent = String(Math.round(value.amount)); },
        scrollTrigger: { trigger: element, start: 'top 92%', once: true },
      });
    });
    return () => {
      page.querySelectorAll('[data-ab-count]').forEach(element => { element.textContent = element.dataset.abCount; });
    };
  });

  media.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
    page.querySelectorAll('[data-ab-parallax]').forEach(mediaFrame => {
      gsap.fromTo(mediaFrame.querySelector('img'), { yPercent: -3, scale: 1.1 }, {
        yPercent: 3, scale: 1.1, ease: 'none',
        scrollTrigger: { trigger: mediaFrame.closest('section'), start: 'top bottom', end: 'bottom top', scrub: .65 },
      });
    });
  });
  motion.addEventListener('change', () => panelMotion?.revert());
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    panelMotion?.revert();
    media.revert();
  });
})();
