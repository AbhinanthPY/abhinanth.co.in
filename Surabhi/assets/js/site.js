/* Surabhi — framework-free navigation, interactions and motion.
   All page content is delivered in HTML. No data leaves the enquiry form. */
(() => {
  'use strict';
  const soundScript = document.createElement('script');
  soundScript.src = new URL('ambient-audio.js', document.currentScript.src).href;
  document.head.append(soundScript);

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  // Plain relative HTML links work on a custom domain and GitHub Pages.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  let lenis;
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  function scrollToPosition(target, immediate = false) {
    if (lenis) lenis.scrollTo(target, { immediate, force: true });
    else window.scrollTo({ top: target, behavior: immediate || reduce.matches ? 'instant' : 'smooth' });
  }

  // Scroll-aware branding and reading progress.
  const header = $('.site-header');
  let scrollFrame = 0;
  function paintHeader() {
    header?.classList.toggle('is-scrolled', scrollY > 35);
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--scroll-progress', Math.min(1, Math.max(0, scrollY / total)));
    scrollFrame = 0;
  }
  function scheduleHeader() { if (!scrollFrame) scrollFrame = requestAnimationFrame(paintHeader); }
  addEventListener('scroll', scheduleHeader, { passive: true });
  addEventListener('resize', scheduleHeader);
  paintHeader();
  const copyright = $('.footer-bottom > span');
  if (copyright) copyright.textContent = copyright.textContent.replace(/\d{4}/, String(new Date().getFullYear()));
  $('.footer-bottom button')?.addEventListener('click', () => scrollToPosition(0));

  const heroVideo = $('.hero-video');
  if (heroVideo) {
    const toggle = $('.hero-video-toggle');
    let inView = false;
    let userPaused = false;
    let failed = false;

    function syncHeroVideo() {
      toggle.hidden = reduce.matches || failed || !heroVideo.hasAttribute('src');
      if (reduce.matches || failed || !inView || document.hidden || userPaused) {
        heroVideo.pause();
        return;
      }
      if (!heroVideo.hasAttribute('src')) heroVideo.src = heroVideo.dataset.src;
      heroVideo.muted = true;
      heroVideo.play().catch(error => {
        if (error.name === 'NotAllowedError' && !reduce.matches) toggle.hidden = false;
      });
    }

    heroVideo.addEventListener('playing', () => {
      heroVideo.classList.add('is-ready');
      toggle.hidden = reduce.matches;
      toggle.textContent = 'Pause video';
    });
    heroVideo.addEventListener('pause', () => { toggle.textContent = 'Play video'; });
    heroVideo.addEventListener('error', () => {
      failed = true;
      heroVideo.classList.remove('is-ready');
      toggle.hidden = true;
    });
    toggle.addEventListener('click', () => {
      userPaused = !heroVideo.paused;
      syncHeroVideo();
    });
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncHeroVideo();
    });
    observer.observe(heroVideo.closest('.hero'));
    reduce.addEventListener('change', syncHeroVideo);
    document.addEventListener('visibilitychange', syncHeroVideo);
  }

  // Native dialog supplies focus containment and Escape behavior.
  const menu = $('#mobile-menu');
  const menuButton = $('.menu-toggle');
  let menuAnimation;
  let previousOverflow = '';
  function closeMenu() { if (menu?.open) menu.close(); }
  menuButton?.addEventListener('click', () => {
    previousOverflow = document.body.style.overflow;
    menu.showModal();
    document.body.style.overflow = 'hidden';
    lenis?.stop();
    menuButton.setAttribute('aria-expanded', 'true');
    if (gsap && !reduce.matches) menuAnimation = gsap.fromTo($$('nav a', menu), {y:24, opacity:0}, {y:0, opacity:1, duration:.55, stagger:.055, ease:'power3.out', clearProps:'transform,opacity'});
  });
  $('.menu-close')?.addEventListener('click', closeMenu);
  $$('a', menu || document.createElement('div')).forEach(link => link.addEventListener('click', closeMenu));
  menu?.addEventListener('close', () => {
    menuAnimation?.kill();
    $$('nav a', menu).forEach(a => { a.style.removeProperty('opacity'); a.style.removeProperty('transform'); });
    document.body.style.overflow = previousOverflow;
    lenis?.start();
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.focus({preventScroll:true});
  });
  matchMedia('(min-width: 1100px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  // Responsive images recover to their original JPEG before showing a text fallback.
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest('.photo')) return;
    if (!image.dataset.fallbackAttempted && (image.srcset || image.closest('picture')?.querySelector('source'))) {
      image.dataset.fallbackAttempted = 'true';
      image.closest('picture')?.querySelectorAll('source').forEach(source => source.remove());
      image.removeAttribute('srcset');
      image.src = image.getAttribute('src');
    } else {
      const photo = image.closest('.photo');
      photo.classList.add('photo-failed');
      photo.setAttribute('role', 'img');
      photo.setAttribute('aria-label', image.alt);
      const fallback = document.createElement('span');
      fallback.className = 'photo-fallback';
      fallback.textContent = 'A shared future, rooted in nature.';
      photo.replaceChildren(fallback);
    }
  }, true);

  // Directory filters operate on the complete HTML card collection.
  function setupDirectory(section, cardSelector, noun, allLabel, searchEnabled = false) {
    if (!section) return;
    const cards = $$(cardSelector, section);
    const buttons = $$('.filter-bar button', section);
    const search = $('input[type="search"]', section);
    let category = allLabel;
    let clear;
    let empty;
    if (searchEnabled) {
      clear = document.createElement('button');
      clear.type = 'button';
      clear.setAttribute('aria-label', 'Clear search');
      clear.textContent = '×';
      clear.hidden = true;
      $('.search-box', section).append(clear);
      empty = document.createElement('div');
      empty.className = 'empty-results';
      empty.hidden = true;
      empty.innerHTML = '<h2>No matching perspectives.</h2><p>Try another subject or explore all demonstration articles.</p><button class="text-link" type="button">Show all perspectives ↗</button>';
      $('.news-grid', section).after(empty);
      $('button', empty).addEventListener('click', () => { category = allLabel; search.value = ''; update(); search.focus(); });
      clear.addEventListener('click', () => { search.value = ''; update(); search.focus(); });
      search.addEventListener('input', update);
    }
    buttons.forEach((button, index) => {
      button.dataset.category = index === 0 ? allLabel : button.textContent.trim();
      button.addEventListener('click', () => { category = button.dataset.category; update(); });
    });
    function update() {
      const query = search?.value.trim().toLowerCase() || '';
      let count = 0;
      cards.forEach(card => {
        const cardCategory = $('.card-meta span', card)?.textContent.trim();
        const matches = (category === allLabel || cardCategory === category) && card.textContent.toLowerCase().includes(query);
        card.hidden = !matches;
        if (matches) count++;
      });
      buttons.forEach(button => {
        const selected = button.dataset.category === category;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      $('.results-count', section).textContent = `${count} ${noun}${count === 1 ? '' : 's'} ${searchEnabled ? 'found' : 'to explore'}`;
      if (clear) clear.hidden = !search.value;
      if (empty) empty.hidden = count > 0;
      ScrollTrigger?.refresh();
    }
  }
  setupDirectory($('.project-directory'), '.project-card', 'initiative', 'All initiatives');
  setupDirectory($('.journal-section'), '.news-card', 'perspective', 'All perspectives', true);

  // Local-only enquiry validation and review; no network request or persistence.
  function setupEnquiry() {
    const form = $('.enquiry-form');
    if (!form) return;
    const subjects = {general:'General enquiry', membership:'Membership information', projects:'Proposed initiatives', activities:'Areas of activity', documents:'Official documents'};
    const topic = new URLSearchParams(location.search).get('topic');
    const initialSubject = subjects[topic] ? topic : 'general';
    const field = name => $(`#enquiry-${name}`, form);
    field('subject').value = initialSubject;
    const review = document.createElement('div');
    review.className = 'enquiry-review';
    review.tabIndex = -1;
    review.setAttribute('role', 'status');
    review.hidden = true;
    review.innerHTML = '<span aria-hidden="true">✓</span><h3>Your enquiry is ready to review.</h3><p>Demo complete. Nothing was sent or stored. You can copy the text to use once the society’s official contact channel is verified.</p><dl><dt>Name</dt><dd data-review="name"></dd><dt>Email</dt><dd data-review="email"></dd><dt>Subject</dt><dd data-review="subject"></dd><dt>Message</dt><dd class="review-message" data-review="message"></dd></dl><div class="review-actions"><button type="button" class="text-link" data-copy>Copy enquiry text</button><button type="button" class="text-link" data-clear>Clear enquiry</button></div><p data-copy-error hidden>Clipboard access is unavailable. Please select and copy the reviewed text above.</p>';
    form.after(review);
    function clearError(name) {
      $(`#error-${name}`, form)?.remove();
      field(name).setAttribute('aria-invalid', 'false');
      if (name === 'message') field(name).setAttribute('aria-describedby', 'message-help');
      else field(name).removeAttribute('aria-describedby');
    }
    function resetReview() {
      review.hidden = true;
      $('[data-copy]', review).textContent = 'Copy enquiry text';
      $('[data-copy-error]', review).hidden = true;
    }
    ['name','email','subject','message','consent'].forEach(name => {
      field(name).addEventListener(name === 'consent' || name === 'subject' ? 'change' : 'input', () => {
        clearError(name);
        resetReview();
        $('#message-help').textContent = `${field('message').value.length}/3000 characters · Minimum 20 characters`;
      });
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const errors = {};
      ['name','email','subject','message','consent'].forEach(clearError);
      if (field('name').value.trim().length < 2) errors.name = 'Please enter your name (at least 2 characters).';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field('email').value.trim())) errors.email = 'Please enter a valid email address.';
      if (field('message').value.trim().length < 20) errors.message = 'Please add a little more detail (at least 20 characters).';
      if (!field('consent').checked) errors.consent = 'Please acknowledge the demonstration-only form.';
      Object.entries(errors).forEach(([name, message]) => {
        const error = document.createElement('span');
        error.id = `error-${name}`;
        error.className = 'field-error';
        error.textContent = message;
        const input = field(name);
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', error.id);
        (name === 'consent' ? $('.form-consent', form) : input.parentElement).append(error);
      });
      if (Object.keys(errors).length) { resetReview(); field(Object.keys(errors)[0]).focus(); return; }
      ['name','email','message'].forEach(name => { $(`[data-review="${name}"]`, review).textContent = field(name).value.trim(); });
      $('[data-review="subject"]', review).textContent = subjects[field('subject').value];
      review.hidden = false;
      review.focus();
      ScrollTrigger?.refresh();
    });
    $('[data-copy]', review).addEventListener('click', async () => {
      try {
        const text = `Name: ${field('name').value.trim()}\nEmail: ${field('email').value.trim()}\nSubject: ${subjects[field('subject').value]}\n\n${field('message').value.trim()}`;
        await navigator.clipboard.writeText(text);
        $('[data-copy]', review).textContent = 'Copied to clipboard';
        $('[data-copy-error]', review).hidden = true;
      } catch { $('[data-copy-error]', review).hidden = false; }
    });
    $('[data-clear]', review).addEventListener('click', () => {
      form.reset();
      field('subject').value = initialSubject;
      ['name','email','subject','message','consent'].forEach(clearError);
      $('#message-help').textContent = '0/3000 characters · Minimum 20 characters';
      resetReview();
      field('name').focus();
      ScrollTrigger?.refresh();
    });
    // Inert markup prevents accidental default submission before handlers exist.
    form.removeAttribute('inert');
  }
  setupEnquiry();

  // Shared activity selection also works when animation libraries are unavailable.
  const activitySection = $('#our-fields');
  let activityTrigger;
  let active = 0;
  const fields = window.SurabhiContent?.activities || [];
  function showField(index) {
    if (!activitySection || !fields[index]) return;
    active = index;
    $$('.activity-item', activitySection).forEach((item, i) => {
      const selected = i === index;
      item.classList.toggle('is-active', selected);
      $('.activity-trigger', item).setAttribute('aria-expanded', String(selected));
      $('.activity-toggle', item).textContent = selected ? '−' : '+';
      $('.activity-body', item).hidden = !selected;
    });
    $$('.activity-slide', activitySection).forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    $$('.activity-scroll-steps button', activitySection).forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    $$('.activity-steps > span', activitySection).forEach((step, i) => step.classList.toggle('is-active', i === index));
    const number = $('.activity-big-number', activitySection);
    number.firstChild.nodeValue = fields[index].number;
    $('.activity-visual-overlay > p', activitySection).textContent = fields[index].summary;
    $('.activity-image-label > span', activitySection).textContent = fields[index].shortTitle;
  }
  function selectField(index) {
    if (activityTrigger) {
      const target = activityTrigger.start + ((index + .5) / fields.length) * (activityTrigger.end - activityTrigger.start);
      scrollToPosition(target, true);
      ScrollTrigger.update();
    }
    showField(index);
  }
  if (activitySection) {
    $$('.activity-trigger', activitySection).forEach((button, index) => button.addEventListener('click', () => selectField(index)));
    $$('.activity-scroll-steps button', activitySection).forEach((button, index) => button.addEventListener('click', () => selectField(index)));
  }

  // Optional, locally bundled GSAP and Lenis enhance the static documents.
  if (gsap && ScrollTrigger) {
    const desktop = matchMedia('(min-width:900px) and (pointer:fine)');
    const tick = time => lenis?.raf(time * 1000);
    function configureSmoothScroll() {
      lenis?.destroy();
      lenis = undefined;
      gsap.ticker.remove(tick);
      if (!reduce.matches && desktop.matches && window.Lenis) {
        lenis = new window.Lenis({duration:1.05, smoothWheel:true, syncTouch:false, anchors:true});
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(tick);
      }
    }
    configureSmoothScroll();
    reduce.addEventListener('change', configureSmoothScroll);
    desktop.addEventListener('change', configureSmoothScroll);
    const media = gsap.matchMedia();
    if (activitySection) media.add('(min-height:620px) and (prefers-reduced-motion:no-preference)', () => {
      activitySection.classList.add('activity-scroll-enabled');
      function update(self) {
        const index = Math.min(fields.length - 1, Math.floor(self.progress * fields.length));
        if (active !== index) showField(index);
      }
      activityTrigger = ScrollTrigger.create({
        trigger:$('.activity-scroll-stage', activitySection),
        start:() => `top ${innerWidth < 900 ? 94 : 110}px`,
        end:() => `+=${Math.round(innerHeight * .8 * fields.length)}`,
        pin:true, anticipatePin:1, invalidateOnRefresh:true, refreshPriority:1,
        onUpdate:update, onRefresh:update,
      });
      return () => { activityTrigger = undefined; activitySection.classList.remove('activity-scroll-enabled'); showField(0); };
    });
    media.add({reduce:'(prefers-reduced-motion:reduce)', mobile:'(max-width:899px)', desktop:'(min-width:900px)'}, context => {
      if (context.conditions.reduce) return;
      const mobile = context.conditions.mobile;
      $$('[data-reveal-lines]').forEach(heading => gsap.from($$('.reveal-line-content', heading), {
        yPercent:mobile ? 80 : 108, rotation:mobile ? 0 : .65, transformOrigin:'left bottom',
        duration:mobile ? .7 : 1.15, stagger:mobile ? .055 : .11, ease:'power4.out',
        scrollTrigger:{trigger:heading,start:mobile ? 'top 96%' : 'top 91%',once:true},
      }));
      $$('[data-reveal]').forEach(element => gsap.from(element, {y:mobile ? 18 : 32,opacity:0,duration:mobile ? .6 : .9,ease:'power3.out',scrollTrigger:{trigger:element,start:'top 94%',once:true}}));
      $$('[data-image-reveal]').forEach(element => gsap.from(element, {clipPath:mobile ? 'inset(0 0 7% 0)' : 'inset(0 0 18% 0)',duration:mobile ? .75 : 1.25,ease:'power3.out',scrollTrigger:{trigger:element,start:'top 93%',once:true}}));
      const hero = $('.hero');
      if (hero) {
        gsap.timeline({defaults:{ease:'power4.out'}})
          .from($$('.hero-line > span',hero),{yPercent:105,rotation:mobile?0:1,duration:mobile ? .95 : 1.35,stagger:.12},.08)
          .from($$('.hero-detail',hero),{opacity:0,y:mobile?10:17,duration:.85,stagger:.07},.25)
          .fromTo($('.hero-image',hero),{scale:1.045},{scale:1,duration:1.9,ease:'power2.out'},0);
        if (!mobile) {
          gsap.to($('.hero-content',hero),{y:95,opacity:.25,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:.65}});
          gsap.to($$('.hero-image :is(img, video)',hero),{yPercent:9,scale:1.07,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:.8}});
        }
      }
      if (!mobile) $$('[data-parallax]').forEach(image => gsap.fromTo(image,{yPercent:-5},{yPercent:5,ease:'none',scrollTrigger:{trigger:image.closest('.photo'),start:'top bottom',end:'bottom top',scrub:.7}}));
      const timeline = $('.timeline');
      if (timeline && $('.timeline-progress')) gsap.fromTo($('.timeline-progress'),{scaleY:0},{scaleY:1,ease:'none',scrollTrigger:{trigger:timeline,start:'top 72%',end:'bottom 65%',scrub:.4}});
    });
    let refreshFrame;
    function refresh() { cancelAnimationFrame(refreshFrame); refreshFrame = requestAnimationFrame(() => {lenis?.resize(); ScrollTrigger.refresh();}); }
    $$('img').forEach(image => image.addEventListener('load', refresh));
    document.fonts?.ready.then(refresh);
    addEventListener('load', refresh, {once:true});
    refresh();
  }

  // Same-document anchors respect the shared masthead offset, including the skip link.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname.replace(/\/$/,'') !== location.pathname.replace(/\/$/,'') || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    const top = scrollY + target.getBoundingClientRect().top - 100;
    if (location.protocol !== 'file:') history.pushState(null, '', url.hash);
    scrollToPosition(top);
    if (target.hasAttribute('tabindex')) target.focus({preventScroll:true});
  });
  // Recalculate pins before following deep-link anchors on a full page load.
  addEventListener('load', () => {
    if (!location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => scrollToPosition(scrollY + target.getBoundingClientRect().top - 100, true));
  }, {once:true});
})();
