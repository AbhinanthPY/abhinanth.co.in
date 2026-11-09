(() => {
  'use strict';

  const storageKey = 'surabhi-morning-sound';
  const audio = document.createElement('audio');
  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'site-sound';
  control.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 9.5h3.5l5-4v13l-5-4H3z"/>
      <path class="site-sound-wave" d="M14.5 9.5a4 4 0 0 1 0 5"/>
      <path class="site-sound-wave" d="M17.2 7.2a7 7 0 0 1 0 9.6"/>
      <path class="site-sound-wave" d="M20 4.9a10.4 10.4 0 0 1 0 14.2"/>
      <path class="site-sound-cross" d="m15.5 9.5 5 5m0-5-5 5"/>
    </svg>
    <span class="site-sound-label" aria-hidden="true">Enable Sound</span>`;

  audio.loop = true;
  audio.preload = 'none';
  for (const [extension, type] of [
    ['ogg', 'audio/ogg; codecs="opus"'],
    ['mp3', 'audio/mpeg'],
  ]) {
    const source = document.createElement('source');
    source.src = new URL(`../audio/surabhi-morning.${extension}`, document.currentScript.src).href;
    source.type = type;
    audio.append(source);
  }

  // Both encodes already play at 15% of the original level, including on iOS.
  audio.volume = 0;
  const canFade = audio.volume === 0;
  audio.volume = 1;

  let muted = false;
  let resumeAt = 0;
  let playing = false;
  let blocked = false;
  let active = true;
  let requestMode = null;
  let revision = 0;
  let fadeFrame = 0;

  function restore() {
    try {
      const preference = JSON.parse(sessionStorage.getItem(storageKey));
      muted = preference?.muted === true;
      resumeAt = Number.isFinite(preference?.time) ? Math.max(0, preference.time) : 0;
    } catch { /* Sound works without storage. */ }
  }

  function save() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        muted,
        time: resumeAt || audio.currentTime,
      }));
    } catch { /* Sound works without storage. */ }
  }

  function seekToSavedTime() {
    if (!resumeAt || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = resumeAt % audio.duration;
    resumeAt = 0;
  }

  function render() {
    control.dataset.state = playing ? 'playing' : blocked ? 'blocked' : 'off';
    control.setAttribute('aria-label', playing && !muted ? 'Mute background sound' : 'Enable Sound');
  }

  function fadeTo(volume, duration, done) {
    cancelAnimationFrame(fadeFrame);
    if (!canFade || audio.volume === volume) {
      done?.();
      return;
    }
    const from = audio.volume;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      audio.volume = from + (volume - from) * progress;
      if (progress < 1) fadeFrame = requestAnimationFrame(tick);
      else done?.();
    }
    fadeFrame = requestAnimationFrame(tick);
  }

  function start(interactive) {
    const attempt = ++revision;
    requestMode = interactive ? 'interactive' : 'automatic';
    cancelAnimationFrame(fadeFrame);
    if (interactive && muted) {
      muted = false;
      save();
    }
    if (audio.paused) audio.volume = interactive && canFade ? 0 : 1;
    if (audio.error) audio.load();
    seekToSavedTime();
    render();
    audio.play().then(() => {
      if (attempt !== revision) return;
      requestMode = null;
      fadeTo(1, 350);
    }).catch((error) => {
      if (attempt !== revision) return;
      requestMode = null;
      playing = false;
      blocked = error.name === 'NotAllowedError';
      render();
    });
  }

  function stop() {
    revision++;
    requestMode = null;
    muted = true;
    blocked = false;
    save();
    render();
    const pause = () => {
      audio.pause();
      save();
    };
    if (playing) fadeTo(0, 240, pause);
    else {
      cancelAnimationFrame(fadeFrame);
      pause();
    }
  }

  audio.addEventListener('loadedmetadata', seekToSavedTime);
  audio.addEventListener('playing', () => {
    if (audio.paused || !active) return;
    playing = true;
    blocked = false;
    render();
  });
  for (const event of ['pause', 'waiting', 'ended', 'error']) {
    audio.addEventListener(event, () => {
      playing = false;
      render();
    });
  }

  control.addEventListener('click', () => {
    if (!muted && (playing || requestMode === 'interactive' || !audio.paused && !requestMode)) stop();
    else start(true);
  });
  document.addEventListener('click', (event) => {
    if (!event.isTrusted || !active || muted || playing || requestMode === 'interactive' ||
      control.contains(event.target)) return;
    if (blocked || requestMode === 'automatic') start(true);
  }, { capture: true });

  addEventListener('pagehide', () => {
    active = false;
    revision++;
    requestMode = null;
    save();
    cancelAnimationFrame(fadeFrame);
    audio.pause();
  });
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    active = true;
    restore();
    blocked = false;
    render();
    if (!muted) start(false);
  });

  restore();
  render();
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) skipLink.after(control);
  else document.body.prepend(control);
  document.body.append(audio);
  if (!muted) start(false);
})();
