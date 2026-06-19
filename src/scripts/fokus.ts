/* fokus.ts — JSON-driven Fokus lesson player nav
   Models on deck.ts patterns: one step at a time, prev/next,
   clickable dots in topbar, arrow keys, reduced-motion support. */

// Document-level arrow key listener set once per page lifecycle.
let activeGo: ((dir: 'next' | 'prev') => void) | null = null;
let keysBound = false;

function bindKeysOnce() {
  if (keysBound) return;
  keysBound = true;
  document.addEventListener('keydown', (e) => {
    if (!activeGo) return;
    const t = e.target as HTMLElement;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activeGo('next');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activeGo('prev');
    }
  });
}

function buildControls(
  steps: HTMLElement[],
  noMotion: boolean
): {
  nav: HTMLElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
} {
  const nav = document.createElement('nav');
  nav.className = 'fokus__controls';
  nav.setAttribute('aria-label', 'Stegnavigering');

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'fokus-nav fokus-nav--prev';
  prevBtn.dataset.fokusPrev = '';
  prevBtn.textContent = 'Tillbaka';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'fokus-nav fokus-nav--next';
  nextBtn.dataset.fokusNext = '';
  nextBtn.textContent = 'Fortsatt';

  if (noMotion) {
    prevBtn.style.transition = 'none';
    nextBtn.style.transition = 'none';
  }

  nav.append(prevBtn, nextBtn);
  return { nav, prevBtn, nextBtn };
}

function initFokus(article: HTMLElement) {
  if (article.dataset.built) return;
  article.dataset.built = '1';

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stepsContainer = article.querySelector<HTMLElement>('[data-fokus-steps]');
  if (!stepsContainer) return;
  const steps = Array.from(stepsContainer.querySelectorAll<HTMLElement>('[data-step]'));
  if (steps.length === 0) return;

  const total = steps.length;
  const last = total - 1;

  // Topbar containers
  const dotsContainer = document.querySelector<HTMLElement>('[data-fokus-dots]');
  const counterEl = document.querySelector<HTMLElement>('[data-fokus-counter]');

  // Rail containers
  const railStepEl = document.querySelector<HTMLElement>('[data-fokus-rail-step]');
  const railFillEl = document.querySelector<HTMLElement>('[data-fokus-rail-fill]');

  // Adjacent-lesson hidden links
  const nextLessonLink = document.querySelector<HTMLAnchorElement>('.fokus-pn--next');
  const prevLessonLink = document.querySelector<HTMLAnchorElement>('.fokus-pn--prev');

  // Build topbar dots
  let topbarDots: HTMLButtonElement[] = [];
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'fokus-dot';
      dot.dataset.go = String(i);
      dot.setAttribute('aria-label', `Ga till steg ${i + 1}`);
      dotsContainer.appendChild(dot);
      topbarDots.push(dot);
    }
  }

  // Build controls and append to article
  const { nav, prevBtn, nextBtn } = buildControls(steps, noMotion);
  article.appendChild(nav);

  let index = 0;

  function scrollToTop() {
    const y = article.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: noMotion ? 'auto' : 'smooth' });
  }

  function show(i: number, _dir: 'next' | 'prev') {
    index = Math.max(0, Math.min(last, i));

    // Show/hide steps
    steps.forEach((s, k) => {
      const active = k === index;
      s.classList.toggle('is-active', active);
      s.hidden = !active;
    });

    // Update topbar dots
    topbarDots.forEach((d, k) => {
      d.classList.toggle('is-active', k === index);
      d.classList.toggle('is-seen', k < index);
    });

    const stepText = `${index + 1} / ${total}`;
    if (counterEl) counterEl.textContent = stepText;
    if (railStepEl) railStepEl.textContent = stepText;
    if (railFillEl) railFillEl.style.width = `${((index + 1) / total) * 100}%`;

    // Update prev button
    if (index === 0) {
      prevBtn.textContent = 'Till kursoversikte';
      prevBtn.classList.add('fokus-nav--overview');
    } else {
      prevBtn.textContent = 'Tillbaka';
      prevBtn.classList.remove('fokus-nav--overview');
    }
    prevBtn.removeAttribute('disabled');

    // Update next button
    if (index === last) {
      nextBtn.textContent = 'Slutfor lektionen';
      nextBtn.classList.add('fokus-nav--complete');
    } else {
      nextBtn.textContent = 'Fortsatt';
      nextBtn.classList.remove('fokus-nav--complete');
    }

    scrollToTop();
  }

  function go(dir: 'next' | 'prev') {
    if (dir === 'next') {
      if (index === last) {
        nextLessonLink?.click();
      } else {
        show(index + 1, 'next');
      }
    } else {
      if (index === 0) {
        window.location.href = '/oversikt';
      } else {
        show(index - 1, 'prev');
      }
    }
  }

  nextBtn.addEventListener('click', () => go('next'));
  prevBtn.addEventListener('click', () => go('prev'));

  topbarDots.forEach((d) => {
    d.addEventListener('click', () => {
      const target = Number(d.dataset.go);
      show(target, target >= index ? 'next' : 'prev');
    });
  });

  activeGo = go;
  bindKeysOnce();

  article.classList.add('is-ready');
  show(0, 'next');
}

export function setupFokus() {
  // Reset activeGo on each page load so the old closure doesn't linger
  activeGo = null;
  const article = document.querySelector<HTMLElement>('[data-fokus]');
  if (article) initFokus(article);
}
