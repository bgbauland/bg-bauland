(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

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
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        counterValue.textContent = String(Math.round(target * eased));
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
  const frames = new Array(frameCount);
  let loadedCount = 0;
  let currentFrame = -1;
  let pendingFrame = 0;
  let rafId = 0;
  const loader = cinematic.querySelector('.frame-loader');
  const progressBar = loader?.querySelector('.loader-track i');
  const progressText = loader?.querySelector('.loader-percent');
  const stageNumber = cinematic.querySelector('.stage-label span');
  const stageName = cinematic.querySelector('.stage-label strong');
  const stages = ['Ausgangszustand','Abbruch','Vorbereitung','Bewehrung','Fertigwände','Trockenbau','Pflasterarbeiten','Fertiges Ergebnis'];

  const pathFor = (index) => `./assets/frames/transformation/frame_${String(index + 1).padStart(4, '0')}.webp`;
  const drawCover = (image) => {
    const ratio = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * ratio;
    const height = image.naturalHeight * ratio;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  };
  const findNearest = (target) => {
    for (let distance = 0; distance < frameCount; distance += 1) {
      const before = target - distance;
      const after = target + distance;
      if (before >= 0 && frames[before]?.complete) return frames[before];
      if (after < frameCount && frames[after]?.complete) return frames[after];
    }
    return null;
  };
  const render = () => {
    rafId = 0;
    if (pendingFrame === currentFrame) return;
    const image = findNearest(pendingFrame);
    if (image) { drawCover(image); currentFrame = pendingFrame; }
  };
  const requestRender = (index) => {
    pendingFrame = Math.max(0, Math.min(frameCount - 1, index));
    if (!rafId) rafId = requestAnimationFrame(render);
  };
  const updateProgress = () => {
    const percentage = Math.round((loadedCount / frameCount) * 100);
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}%`;
    if (loadedCount === frameCount) loader?.classList.add('is-complete');
  };
  const loadFrame = (index) => new Promise((resolve) => {
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
  const preload = async () => {
    const priority = [0,1,2,3,4,5,10,15,20,30,40,50,60,70,80,90,99];
    const remaining = Array.from({ length: frameCount }, (_, index) => index).filter((index) => !priority.includes(index));
    const queue = [...priority, ...remaining];
    const workers = Array.from({ length: 4 }, async () => {
      while (queue.length) await loadFrame(queue.shift());
    });
    await Promise.all(workers);
  };
  const handleScroll = () => {
    const rect = cinematic.getBoundingClientRect();
    const distance = cinematic.offsetHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    const frame = Math.round(progress * (frameCount - 1));
    requestRender(frame);
    const stage = Math.min(stages.length - 1, Math.floor(progress * stages.length));
    if (stageNumber) stageNumber.textContent = String(stage + 1).padStart(2, '0');
    if (stageName) stageName.textContent = stages[stage];
  };
  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    currentFrame = -1;
    requestRender(pendingFrame);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
  let preloadStarted = false;
  const beginPreload = () => {
    if (preloadStarted) return;
    preloadStarted = true;
    preload();
  };
  if ('IntersectionObserver' in window) {
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
