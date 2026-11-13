(() => {
  const loader = document.querySelector('.solar-loader');
  const canvas = loader.querySelector('canvas');
  const context = canvas.getContext('2d');
  const light = loader.querySelector('.solar-loader__progress-button');
  const status = loader.querySelector('[role="status"]');
  const progress = loader.querySelector('progress');
  const percent = loader.querySelector('.solar-loader__percent');
  const retry = loader.querySelector('.solar-loader__retry');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const video = document.querySelector('.solar-hero video');
  const videoSource = video.src;
  const poster = document.querySelector('.solar-hero-poster');
  const wordmark = document.querySelector('.solar-wordmark image');
  const texture = document.getElementById('solar-card-texture');
  const loaded = new Set();
  const interaction = new AbortController();
  const { signal: interactionSignal } = interaction;
  let width = 0;
  let height = 0;
  let pointerX = 0;
  let pointerY = 0;
  let radius = 0;
  let frame = 0;
  let revealStarted = 0;
  let finishReveal;

  // Use the open attribute for first paint, then move to a modal dialog for
  // keyboard focus and native inertness of the page underneath.
  loader.removeAttribute('open');
  loader.showModal();
  loader.addEventListener('cancel', event => event.preventDefault());

  function draw(now) {
    if (!context) return;
    const animated = !motion.matches;
    const time = animated ? now / 1000 : 0;
    const reveal = finishReveal ? Math.min((now - revealStarted) / 520, 1) : 0;
    const growth = reveal * reveal;
    const target = Math.min(width, height) * (.115 + .22 * progress.value / 100);
    radius = animated ? radius + (target - radius) * .12 : target;
    const edge = radius + Math.hypot(width, height) * .75 * growth;
    const x = width / 2;
    const y = height / 2;
    const bright = light.getAttribute('aria-pressed') === 'true';
    const contour = new Path2D();
    for (let point = 0; point < 120; point++) {
      const angle = point / 120 * Math.PI * 2;
      const wave = Math.sin(angle * 3 - time * 2.1) * .068 +
        Math.sin(angle * 5 + time * 1.4) * .038 +
        Math.sin(angle * 11 - time * 2.6) * .018 +
        Math.sin(angle * 19 + time * 2) * .008;
      const distance = edge * (1 + wave);
      const px = x + Math.cos(angle) * distance * 1.04 + pointerX;
      const py = y + Math.sin(angle) * distance * .96 + pointerY;
      if (point === 0) contour.moveTo(px, py);
      else contour.lineTo(px, py);
    }
    contour.closePath();

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    if (finishReveal) {
      context.globalCompositeOperation = 'destination-out';
      context.fill(contour);
      context.globalCompositeOperation = 'source-over';
    }

    context.save();
    context.clip(contour);
    const lightX = x + Math.cos(time * .8) * edge * .45 + pointerX;
    const lightY = y + Math.sin(time * .7) * edge * .55 + pointerY;
    const glass = context.createRadialGradient(lightX, lightY, 0, x, y, edge * 1.15);
    glass.addColorStop(0, 'rgba(150, 151, 154, .32)');
    glass.addColorStop(.45, 'rgba(53, 54, 57, .19)');
    glass.addColorStop(.72, 'rgba(15, 16, 17, .43)');
    glass.addColorStop(1, 'rgba(141, 142, 146, .42)');
    context.globalAlpha = 1 - Math.sqrt(reveal);
    context.fillStyle = glass;
    context.fillRect(0, 0, width, height);
    const sheen = context.createLinearGradient(x - edge, y - edge, x + edge, y + edge);
    sheen.addColorStop(.18, '#17181900');
    sheen.addColorStop(.36 + Math.sin(time) * .08, '#b6b9c132');
    sheen.addColorStop(.52 + Math.sin(time) * .08, '#02020365');
    sheen.addColorStop(.74, '#17181900');
    context.fillStyle = sheen;
    context.fillRect(0, 0, width, height);
    context.restore();

    context.globalAlpha = 1 - reveal;
    context.strokeStyle = bright ? '#b9c7e376' : '#8e939f5c';
    context.lineWidth = bright ? 4 : 2.8;
    context.shadowColor = bright ? '#e8efff' : '#b9c4d4';
    context.shadowBlur = bright ? 15 : 8;
    context.stroke(contour);
    context.shadowBlur = 0;
    context.strokeStyle = '#e5e5e3';
    context.lineWidth = 1.05;
    context.stroke(contour);
    context.globalAlpha = 1;

    if (reveal === 1) {
      finishReveal();
      return;
    }
    frame = animated || finishReveal ? requestAnimationFrame(draw) : 0;
  }

  function scheduleFrame() {
    if (context && !frame) frame = requestAnimationFrame(draw);
  }

  function sizeCanvas() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(devicePixelRatio, 1.25, 1280 / width);
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    context?.setTransform(scale, 0, 0, scale, 0, 0);
    scheduleFrame();
  }

  light.addEventListener('click', () => {
    light.setAttribute('aria-pressed', String(light.getAttribute('aria-pressed') === 'false'));
    scheduleFrame();
  }, { signal: interactionSignal });
  loader.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType !== 'mouse') return;
    pointerX = (event.clientX - width / 2) * .028;
    pointerY = (event.clientY - height / 2) * .038;
  }, { passive: true, signal: interactionSignal });
  loader.addEventListener('pointerleave', () => { pointerX = pointerY = 0; }, { signal: interactionSignal });
  window.addEventListener('resize', sizeCanvas, { signal: interactionSignal });
  motion.addEventListener('change', scheduleFrame, { signal: interactionSignal });
  sizeCanvas();

  function showProgress(value) {
    if (progress.value === value) return;
    progress.value = value;
    percent.textContent = `${value}%`;
    scheduleFrame();
  }

  async function loadVideo(signal, onProgress) {
    // A browser can suspend native preloading after a partial buffer.
    // Use a local copy so the entire scroll range is available immediately.
    const response = await fetch(videoSource, { signal, priority: 'high' });
    if (!response.ok || response.status === 206) throw new Error('Incomplete video response');
    const length = Number(response.headers.get('Content-Length'));
    let file;
    if (length > 0 && response.body) {
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        onProgress(Math.min(received / length, 1) * .98);
      }
      file = new Blob(chunks, { type: 'video/mp4' });
    } else {
      file = await response.blob();
    }
    signal.throwIfAborted();
    if (!file.size) throw new Error('Empty video response');

    const url = URL.createObjectURL(file);
    try {
      await new Promise((resolve, reject) => {
        const events = new AbortController();
        function finish(error) {
          events.abort();
          if (error) reject(error);
          else resolve();
        }
        video.addEventListener('loadeddata', () => finish(), { signal: events.signal });
        video.addEventListener('error', () => finish(video.error), { signal: events.signal });
        signal.addEventListener('abort', () => finish(signal.reason), { signal: events.signal });
        video.src = url;
        video.preload = 'auto';
      });
    } catch (error) {
      video.preload = 'none';
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function loadImage(source) {
    const image = new Image();
    image.src = source;
    return image.decode();
  }

  async function prepareSite() {
    const controller = new AbortController();
    const { signal } = controller;
    const animated = !motion.matches && CSS.supports('position', 'sticky');
    let videoProgress = 0;
    const imageCount = animated ? 3 : 2;
    function updateProgress() {
      const imagesLoaded = loaded.size - Number(loaded.has(video));
      const fraction = imagesLoaded / imageCount;
      showProgress(Math.floor((animated ? .1 * fraction + .9 * videoProgress : fraction) * 100));
    }
    const tasks = [
      [poster, () => poster.decode()],
      [texture, () => loadImage(texture.href)],
    ];
    if (animated) {
      videoProgress = Number(loaded.has(video));
      tasks.push([wordmark, () => loadImage(wordmark.href.baseVal)], [video, () => loadVideo(signal, fraction => {
        videoProgress = fraction;
        updateProgress();
      })]);
    }

    retry.hidden = true;
    status.textContent = 'Loading Aptech Solar';
    updateProgress();
    const slow = setTimeout(() => {
      status.textContent = 'Still loading Aptech Solar';
    }, 8000);
    const deadline = setTimeout(() => controller.abort(), 45000);
    const interrupted = new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });

    try {
      await Promise.race([
        interrupted,
        Promise.all(tasks.map(async ([asset, load]) => {
          if (loaded.has(asset)) return;
          await load();
          signal.throwIfAborted();
          loaded.add(asset);
          if (asset === video) videoProgress = 1;
          updateProgress();
        })),
      ]);
    } catch {
      controller.abort();
      status.textContent = 'Loading was interrupted.';
      retry.hidden = false;
      return;
    } finally {
      clearTimeout(slow);
      clearTimeout(deadline);
    }

    status.textContent = 'Ready';
    if (!motion.matches && context) {
      await new Promise(resolve => {
        finishReveal = resolve;
        revealStarted = performance.now();
        loader.setAttribute('data-revealing', '');
        scheduleFrame();
      });
    } else if (!motion.matches) {
      await loader.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 180,
        easing: 'ease-out',
        fill: 'forwards',
      }).finished;
    }
    cancelAnimationFrame(frame);
    interaction.abort();
    // Let the close event run before removing the dialog.
    loader.addEventListener('close', () => loader.remove(), { once: true });
    loader.close();
  }

  retry.addEventListener('click', prepareSite);
  prepareSite();
})();
