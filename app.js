(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preloaderKey = 'bgBaulandPreloaderShown';
  const framePathFor = (index) => `./assets/frames/transformation/frame_${String(index + 1).padStart(4, '0')}.webp`;
  const frameBlobCache = new Map();
  const frameBlobRequests = new Map();
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const getFrameBlob = (index) => {
    if (frameBlobCache.has(index)) return Promise.resolve(frameBlobCache.get(index));
    if (frameBlobRequests.has(index)) return frameBlobRequests.get(index);
    const request = fetch(framePathFor(index), { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Frame ${index + 1} konnte nicht geladen werden.`);
        return response.blob();
      })
      .then((blob) => {
        frameBlobCache.set(index, blob);
        frameBlobRequests.delete(index);
        return blob;
      })
      .catch((error) => {
        frameBlobRequests.delete(index);
        throw error;
      });
    frameBlobRequests.set(index, request);
    return request;
  };

  const initPreloader = () => {
    const preloader = document.querySelector('[data-preloader]');
    const root = document.documentElement;
    if (!preloader) {
      root.classList.remove('preloader-pending');
      return;
    }
    if (root.classList.contains('preloader-seen')) {
      clearTimeout(window.__bgBaulandPreloaderFailsafe);
      preloader.remove();
      return;
    }

    try { sessionStorage.setItem(preloaderKey, 'true'); } catch { /* Session storage may be unavailable. */ }

    const progress = preloader.querySelector('[role="progressbar"]');
    const progressBar = preloader.querySelector('.site-preloader__bar');
    const percentage = preloader.querySelector('.site-preloader__percentage');
    const startedAt = performance.now();
    const minimumDuration = 500;
    const maximumWorkDuration = reduceMotion ? 900 : 1900;
    let completedWeight = 0;
    const totalWeight = 14;
    let targetProgress = 0;
    let displayedProgress = 0;
    let progressRaf = 0;
    let finished = false;
    let lastAnnouncedProgress = -1;

    const paintProgress = (value) => {
      const rounded = Math.max(0, Math.min(100, Math.round(value)));
      progressBar?.style.setProperty('--preloader-progress', String(rounded / 100));
      if (percentage) percentage.textContent = `${rounded} %`;
      if (rounded === 100 || lastAnnouncedProgress < 0 || rounded - lastAnnouncedProgress >= 5) {
        lastAnnouncedProgress = rounded;
        progress?.setAttribute('aria-valuenow', String(rounded));
      }
    };
    const animateProgress = () => {
      const difference = targetProgress - displayedProgress;
      displayedProgress += Math.abs(difference) < 0.4 ? difference : Math.max(0.35, difference * 0.12);
      paintProgress(displayedProgress);
      if (Math.abs(targetProgress - displayedProgress) > 0.05) progressRaf = requestAnimationFrame(animateProgress);
      else progressRaf = 0;
    };
    const setTargetProgress = (value) => {
      targetProgress = Math.max(targetProgress, Math.min(100, value));
      if (!progressRaf) progressRaf = requestAnimationFrame(animateProgress);
    };
    const markComplete = (weight) => {
      completedWeight += weight;
      setTargetProgress(Math.min(92, (completedWeight / totalWeight) * 92));
    };
    const track = (promise, weight) => Promise.resolve(promise).finally(() => markComplete(weight));
    const loadImage = (source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = resolve;
      image.onerror = reject;
      image.src = source;
      if (image.complete && image.naturalWidth) resolve();
    });
    const fetchAsset = (source) => fetch(source, { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error(`${source} konnte nicht geladen werden.`);
      return response.blob();
    });
    const loadPriorityFrames = async () => {
      const queue = [0, 1, 2, 3, 4, 5, 10, 20];
      const workers = Array.from({ length: 3 }, async () => {
        while (queue.length) {
          const index = queue.shift();
          await track(getFrameBlob(index).catch(() => null), 1);
        }
      });
      await Promise.all(workers);
    };

    const essentialWork = Promise.allSettled([
      track(loadImage('./assets/images/hero-bg-bauland.webp'), 3),
      track(loadImage('./assets/images/bg-logo.png?v=2'), 1),
      track(fetchAsset('./assets/fonts/inter-latin.woff2?v=1'), 1),
      track(fetchAsset('./assets/fonts/roboto-condensed-latin.woff2?v=1'), 1),
      loadPriorityFrames()
    ]);

    const finish = async () => {
      if (finished) return;
      finished = true;
      const remainingMinimum = minimumDuration - (performance.now() - startedAt);
      if (remainingMinimum > 0) await wait(remainingMinimum);
      if (progressRaf) cancelAnimationFrame(progressRaf);
      targetProgress = 100;
      displayedProgress = 100;
      paintProgress(100);
      preloader.setAttribute('aria-busy', 'false');
      preloader.classList.add('is-ready');
      await wait(reduceMotion ? 80 : 140);
      clearTimeout(window.__bgBaulandPreloaderFailsafe);
      root.classList.add('preloader-revealing');
      preloader.classList.add('is-closing');
      requestAnimationFrame(() => root.classList.remove('preloader-pending'));
      await wait(reduceMotion ? 140 : 620);
      preloader.remove();
      root.classList.remove('preloader-revealing');
      root.classList.add('preloader-complete');
    };

    Promise.race([essentialWork, wait(maximumWorkDuration)]).then(finish, finish);
  };

  initPreloader();

  if (document.body.classList.contains('service-page') && nav && !nav.querySelector('.nav-home-link')) {
    const homeLink = document.createElement('a');
    homeLink.className = 'nav-home-link';
    homeLink.href = '../index.html#top';
    homeLink.textContent = 'Startseite';
    nav.prepend(homeLink);
  }

  let headerScrolled;
  let headerRaf = 0;
  const updateHeader = () => {
    headerRaf = 0;
    const nextState = window.scrollY > 24;
    if (nextState === headerScrolled) return;
    headerScrolled = nextState;
    header?.classList.toggle('is-scrolled', nextState);
  };
  const requestHeaderUpdate = () => {
    if (!headerRaf) headerRaf = requestAnimationFrame(updateHeader);
  };
  updateHeader();
  window.addEventListener('scroll', requestHeaderUpdate, { passive: true });

  let menuScrollY = 0;
  const setMenuState = (open, restoreFocus = false) => {
    const wasOpen = document.body.classList.contains('menu-open');
    if (open === wasOpen) return;

    if (open) {
      menuScrollY = window.scrollY;
      document.body.style.top = `-${menuScrollY}px`;
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
      document.body.style.removeProperty('top');
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, menuScrollY);
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
      if (restoreFocus) menuButton?.focus({ preventScroll: true });
    }

    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.querySelector('.sr-only')?.replaceChildren(open ? 'Navigation schließen' : 'Navigation öffnen');
  };

  const closeMenu = (restoreFocus = false) => setMenuState(false, restoreFocus);
  const serviceNav = document.querySelector('[data-service-nav]');
  const serviceToggle = serviceNav?.querySelector('.nav-services-toggle');
  const setServiceMenuState = (open) => {
    serviceNav?.classList.toggle('is-open', open);
    serviceToggle?.setAttribute('aria-expanded', String(open));
  };
  const closeServiceMenu = () => setServiceMenuState(false);

  menuButton?.addEventListener('click', () => setMenuState(!document.body.classList.contains('menu-open')));
  serviceToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    setServiceMenuState(!serviceNav.classList.contains('is-open'));
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    closeServiceMenu();
    closeMenu(false);
  }));
  document.addEventListener('pointerdown', (event) => {
    if (serviceNav && !serviceNav.contains(event.target)) closeServiceMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeServiceMenu();
    closeMenu(true);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
    closeServiceMenu();
    if (event.matches) closeMenu(false);
  });

  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          instance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
  } else {
    document.querySelectorAll('.reveal').forEach((node) => node.classList.add('is-visible'));
  }

  const counter = document.querySelector('[data-counter]');
  const counterValue = counter?.querySelector('[data-counter-value]');
  if (counter && counterValue && !reduceMotion && 'IntersectionObserver' in window) {
    const target = Number(counter.dataset.counterTarget) || 20;
    counterValue.textContent = '0';
    const counterObserver = new IntersectionObserver((entries, instance) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      instance.disconnect();
      const duration = 1250;
      const startedAt = performance.now();
      let lastValue = -1;
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        if (value !== lastValue) {
          lastValue = value;
          counterValue.textContent = String(value);
        }
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.45 });
    counterObserver.observe(counter);
  }

  const experienceImage = document.querySelector('.experience > img');
  const experienceSection = document.querySelector('.experience');
  if (experienceImage && experienceSection && !reduceMotion && window.matchMedia('(min-width: 901px)').matches) {
    let parallaxRaf = 0;
    const updateParallax = () => {
      parallaxRaf = 0;
      const rect = experienceSection.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const offset = Math.max(-20, Math.min(20, (sectionCenter - viewportCenter) * -.04));
      experienceImage.style.setProperty('--parallax-y', `${offset}px`);
    };
    const requestParallax = () => {
      if (!parallaxRaf) parallaxRaf = requestAnimationFrame(updateParallax);
    };
    window.addEventListener('scroll', requestParallax, { passive: true });
    updateParallax();
  }

  const form = document.querySelector('[data-contact-form]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = {
      name: form.elements.name,
      email: form.elements.email,
      message: form.elements.message
    };
    let valid = true;
    Object.values(fields).forEach((field) => {
      let message = '';
      if (!field.value.trim()) message = 'Bitte füllen Sie dieses Feld aus.';
      if (field.type === 'email' && field.value && !field.validity.valid) message = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      field.setAttribute('aria-invalid', String(Boolean(message)));
      const error = document.querySelector(`#${field.id}-error`);
      if (error) error.textContent = message;
      if (message) valid = false;
    });
    if (!valid) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const subject = `Projektanfrage – ${form.elements.service.value}`;
    const body = [
      'Guten Tag BG Bauland,', '',
      `mein Name ist ${form.elements.name.value.trim()}.`,
      `E-Mail: ${form.elements.email.value.trim()}`,
      `Telefon: ${form.elements.phone.value.trim() || 'nicht angegeben'}`,
      `Gewünschte Leistung: ${form.elements.service.value}`, '',
      'Projektbeschreibung:', form.elements.message.value.trim(), '',
      'Freundliche Grüße', form.elements.name.value.trim()
    ].join('\n');
    window.location.href = `mailto:info@bg-bauland.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  const cinematic = document.querySelector('[data-cinematic]');
  const canvas = cinematic?.querySelector('canvas');
  if (!cinematic || !canvas || reduceMotion) return;

  const context = canvas.getContext('2d', { alpha: false });
  const frameCount = 100;
  const mobileFrameMode = window.matchMedia('(max-width: 900px)').matches;
  const frames = new Array(frameCount);
  const frameSources = mobileFrameMode ? new Array(frameCount) : null;
  const frameAccess = mobileFrameMode ? new Array(frameCount).fill(0) : null;
  let loadedCount = 0;
  let currentFrame = -1;
  let pendingFrame = 0;
  let rafId = 0;
  let decodeBusy = false;
  let decodeGeneration = 0;
  const reportDecodedFrameCount = () => {
    if (mobileFrameMode) cinematic.dataset.decodedFrames = String(frames.filter(Boolean).length);
  };
  const loader = cinematic.querySelector('.frame-loader');
  const progressBar = loader?.querySelector('.loader-track i');
  const progressText = loader?.querySelector('.loader-percent');
  const stageNumber = cinematic.querySelector('.stage-label span');
  const stageName = cinematic.querySelector('.stage-label strong');
  const stages = ['Ausgangszustand','Abbruch','Vorbereitung','Bewehrung','Fertigwände','Trockenbau','Pflasterarbeiten','Fertiges Ergebnis'];

  const pathFor = framePathFor;
  const drawCover = (image) => {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const ratio = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight);
    const width = sourceWidth * ratio;
    const height = sourceHeight * ratio;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  };
  const findNearest = (target) => {
    for (let distance = 0; distance < frameCount; distance += 1) {
      const before = target - distance;
      const after = target + distance;
      if (before >= 0 && frames[before]) return { image: frames[before], index: before };
      if (after < frameCount && frames[after]) return { image: frames[after], index: after };
    }
    return null;
  };
  const releaseFrame = (index) => {
    const image = frames[index];
    if (!image) return;
    if (typeof image.close === 'function') image.close();
    else if ('src' in image) image.src = '';
    frames[index] = null;
    if (currentFrame === index) currentFrame = -1;
  };
  const pruneMobileFrames = (aggressive = false) => {
    if (!mobileFrameMode) return;
    const limit = aggressive ? 1 : 8;
    const decoded = frames.map((image, index) => image ? index : -1).filter((index) => index >= 0);
    decoded
      .sort((a, b) => {
        const distance = Math.abs(b - pendingFrame) - Math.abs(a - pendingFrame);
        return distance || frameAccess[a] - frameAccess[b];
      })
      .slice(0, Math.max(0, decoded.length - limit))
      .forEach(releaseFrame);
    reportDecodedFrameCount();
  };
  const decodeFrame = async (index) => {
    if (!mobileFrameMode || frames[index] || !frameSources[index]) return frames[index];
    const blob = frameSources[index];
    let image;
    if ('createImageBitmap' in window) {
      image = await createImageBitmap(blob);
    } else {
      image = await new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const fallbackImage = new Image();
        fallbackImage.decoding = 'async';
        fallbackImage.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(fallbackImage);
        };
        fallbackImage.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Frame konnte nicht decodiert werden.'));
        };
        fallbackImage.src = objectUrl;
      });
    }
    frames[index] = image;
    frameAccess[index] = performance.now();
    reportDecodedFrameCount();
    return image;
  };
  const runMobileDecodeQueue = async () => {
    if (!mobileFrameMode || decodeBusy) return;
    decodeBusy = true;
    while (true) {
      const generation = decodeGeneration;
      const target = pendingFrame;
      const candidates = [target, target - 1, target + 1, target - 2, target + 2]
        .filter((index) => index >= 0 && index < frameCount);
      for (const index of candidates) {
        if (generation !== decodeGeneration) break;
        try { await decodeFrame(index); } catch { /* The nearest available frame remains visible. */ }
      }
      pruneMobileFrames(false);
      requestRender(pendingFrame, false);
      if (generation === decodeGeneration) break;
    }
    decodeBusy = false;
  };
  const requestMobileDecode = () => {
    if (!mobileFrameMode) return;
    decodeGeneration += 1;
    runMobileDecodeQueue();
  };
  const render = () => {
    rafId = 0;
    if (pendingFrame === currentFrame && frames[pendingFrame]) return;
    const nearest = findNearest(pendingFrame);
    if (nearest) {
      drawCover(nearest.image);
      currentFrame = nearest.index;
      if (mobileFrameMode) frameAccess[nearest.index] = performance.now();
    }
  };
  const requestRender = (index, requestDecode = true) => {
    pendingFrame = Math.max(0, Math.min(frameCount - 1, index));
    if (mobileFrameMode && requestDecode) requestMobileDecode();
    if (!rafId) rafId = requestAnimationFrame(render);
  };
  const updateProgress = () => {
    const percentage = Math.round((loadedCount / frameCount) * 100);
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}%`;
    if (loadedCount === frameCount) loader?.classList.add('is-complete');
  };
  const loadFrame = async (index) => {
    if (mobileFrameMode) {
      try {
        frameSources[index] = await getFrameBlob(index);
        loadedCount += 1;
        updateProgress();
        if (index === 0 || Math.abs(index - pendingFrame) < 3) requestMobileDecode();
      } catch { /* A nearby loaded frame is used when one request fails. */ }
      return;
    }
    await new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        frames[index] = image;
        loadedCount += 1;
        updateProgress();
        if (index === 0 || Math.abs(index - pendingFrame) < 3) requestRender(pendingFrame);
        resolve();
      };
      image.onerror = resolve;
      image.src = pathFor(index);
    });
  };
  const preload = async () => {
    const priority = [0,1,2,3,4,5,10,15,20,30,40,50,60,70,80,90,99];
    const remaining = Array.from({ length: frameCount }, (_, index) => index).filter((index) => !priority.includes(index));
    const queue = [...priority, ...remaining];
    const workers = Array.from({ length: mobileFrameMode ? 3 : 4 }, async () => {
      while (queue.length) await loadFrame(queue.shift());
    });
    await Promise.all(workers);
  };
  let cinematicActive = false;
  let scrollRafId = 0;
  const updateCinematic = () => {
    scrollRafId = 0;
    if (!cinematicActive) return;
    const rect = cinematic.getBoundingClientRect();
    const distance = cinematic.offsetHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    const frame = Math.round(progress * (frameCount - 1));
    requestRender(frame);
    const stage = Math.min(stages.length - 1, Math.floor(progress * stages.length));
    if (stageNumber) stageNumber.textContent = String(stage + 1).padStart(2, '0');
    if (stageName) stageName.textContent = stages[stage];
  };
  const requestCinematicUpdate = () => {
    if (cinematicActive && !scrollRafId) scrollRafId = requestAnimationFrame(updateCinematic);
  };
  const resize = () => {
    const pixelRatio = window.matchMedia('(max-width: 900px)').matches ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    const nextWidth = Math.round((canvas.clientWidth || window.innerWidth) * pixelRatio);
    const nextHeight = Math.round((canvas.clientHeight || window.innerHeight) * pixelRatio);
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    currentFrame = -1;
    requestRender(pendingFrame);
    requestCinematicUpdate();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', requestCinematicUpdate, { passive: true });
  let preloadStarted = false;
  const beginPreload = () => {
    if (preloadStarted) return;
    preloadStarted = true;
    preload();
  };
  if ('IntersectionObserver' in window) {
    const activityObserver = new IntersectionObserver((entries) => {
      cinematicActive = entries.some((entry) => entry.isIntersecting);
      if (!cinematicActive) pruneMobileFrames(true);
      requestCinematicUpdate();
    });
    activityObserver.observe(cinematic);
    const preloadObserver = new IntersectionObserver((entries, instance) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      instance.disconnect();
      beginPreload();
    }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    preloadObserver.observe(cinematic);
  } else {
    beginPreload();
  }
})();
