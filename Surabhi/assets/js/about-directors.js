(() => {
  'use strict';

  const section = document.querySelector('[data-directors]');
  if (!section) return;

  const directors = [
    { name: "Jyothykumar K", image: "assets/images/directors/Jyothykumar%20K.webp", role: "Chairman" },
    { name: "Saju Narayanan", image: "assets/images/directors/Saju%20Narayanan.webp", role: "Vice Chairman" },
    { name: "Ananthu Babukuttan", image: "assets/images/directors/Ananthu%20Babukuttan.webp", whiteBackground: true },
    { name: "Arun Mohan", image: "assets/images/directors/Arun%20Mohan.webp" },
    { name: "Beena Anil", image: "assets/images/directors/Beena%20Anil.webp" },
    { name: "Biju Devarajan", image: "assets/images/directors/Biju%20Devarajan.webp" },
    { name: "C. Anilkumar", image: "assets/images/directors/C.%20Anilkumar.webp" },
    { name: "Dara Raj", image: "assets/images/directors/Dara%20Raj.webp" },
    { name: "Manu. K. Prathap", image: "assets/images/directors/Manu.%20K%20.%20Prathap.webp" },
    { name: "Parvathi Roop Raj", image: "assets/images/directors/Parvathi%20Roop%20Raj.webp" },
  ];
  const track = section.querySelector('.ab-directors-track');
  const controls = section.querySelector('.ab-directors-controls');
  const buttons = [...controls.querySelectorAll('button')];
  const counter = section.querySelector('[data-directors-counter]');
  const status = section.querySelector('[data-directors-status]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pad = value => String(value).padStart(2, '0');

  const cards = directors.map(({ name, image, role, whiteBackground }, index) => {
    const card = document.createElement('li');
    card.className = 'ab-director';
    card.style.setProperty('--director-order', index);
    const figure = document.createElement('figure');
    const frame = document.createElement('div');
    frame.className = 'ab-director-photo';
    if (whiteBackground) frame.classList.add('ab-director-photo-white');
    const photo = document.createElement('img');
    photo.src = image;
    photo.alt = `Portrait of ${name}`;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    photo.draggable = false;
    const caption = document.createElement('figcaption');
    caption.textContent = name;
    if (role) {
      const designation = document.createElement('span');
      designation.className = 'ab-director-role';
      designation.textContent = role;
      caption.append(designation);
    }
    frame.append(photo);
    figure.append(frame, caption);
    card.append(figure);
    return card;
  });
  track.append(...cards);

  let stops = [];
  let max = 0;
  let updateFrame;
  let drag;

  function measure() {
    const origin = cards[0].offsetLeft;
    max = Math.max(0, track.scrollWidth - track.clientWidth);
    stops = [...new Set(cards.map(card => Math.min(max, card.offsetLeft - origin)))];
    controls.hidden = max < 2;
    update();
  }

  function update() {
    const left = track.scrollLeft;
    const start = left <= 2;
    const end = left >= max - 2;
    const first = cards.findIndex(card => card.offsetLeft - cards[0].offsetLeft >= left - 2);
    const current = Math.max(0, first);
    const label = `${pad(current + 1)} / ${pad(cards.length)}`;
    if (counter.textContent !== label) {
      counter.textContent = label;
      status.textContent = `Director ${current + 1} of ${cards.length}, ${directors[current].name}`;
    }
    track.classList.toggle('can-go-back', !start);
    track.classList.toggle('can-go-next', !end);
    buttons[0].setAttribute('aria-disabled', String(start));
    buttons[1].setAttribute('aria-disabled', String(end));
  }

  function move(left) {
    track.scrollTo({ left, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  function step(direction) {
    const left = track.scrollLeft;
    const target = direction > 0
      ? stops.find(stop => stop > left + 2)
      : stops.findLast(stop => stop < left - 2);
    if (target !== undefined) move(target);
  }

  buttons.forEach(button => button.addEventListener('click', () => step(Number(button.dataset.directorsStep))));
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') move(event.key === 'Home' ? 0 : max);
    else step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(updateFrame);
    updateFrame = requestAnimationFrame(update);
  }, { passive: true });

  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || max < 2) return;
    drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
  });
  track.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(delta) < 6) return;
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    event.preventDefault();
    track.scrollLeft = drag.left - delta;
  });

  function finishDrag(event) {
    if (drag?.id !== event.pointerId) return;
    const { moved } = drag;
    drag = undefined;
    if (!moved) return;
    const left = track.scrollLeft;
    const nearest = stops.reduce((best, stop) =>
      Math.abs(stop - left) < Math.abs(best - left) ? stop : best);
    track.classList.remove('is-dragging');
    move(nearest);
  }

  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('lostpointercapture', finishDrag);
  track.addEventListener('pointerleave', event => {
    if (drag && !drag.moved) finishDrag(event);
  });

  new ResizeObserver(measure).observe(track);
  measure();

  if (!reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      section.classList.add('is-entering');
      observer.disconnect();
    }, { threshold: .14 });
    observer.observe(section);
  }
})();
