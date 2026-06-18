/* Deck: gör om en lektion till bitesized steg (slides).
   Ett steg per ##-sektion; `---` (hr) är en valfri manuell sidbrytning.
   Progressiv förbättring: utan JS visas allt som en vanlig artikel. */

import { recordPosition } from './state';

function makeSlide(nodes: Node[], type: string, extraClass = ''): HTMLElement {
  const s = document.createElement('section');
  s.className = `slide slide--${type} ${extraClass}`.trim();
  s.setAttribute('role', 'group');
  nodes.forEach((n) => s.appendChild(n));
  return s;
}

function buildSlides(stage: HTMLElement): HTMLElement[] {
  const slides: HTMLElement[] = [];

  const intro = stage.querySelector<HTMLElement>('[data-src="intro"]');
  if (intro) slides.push(makeSlide(Array.from(intro.childNodes), 'intro'));

  const body = stage.querySelector<HTMLElement>('[data-src="body"]');
  if (body) {
    let group: Element[] = [];
    const flush = () => {
      if (group.length) {
        slides.push(makeSlide(group, 'body', 'prose'));
        group = [];
      }
    };
    Array.from(body.children).forEach((el) => {
      if (el.tagName === 'HR') {
        flush();
        return; // bryt här, släng linjen
      }
      if (el.tagName === 'H2' && group.length) flush();
      group.push(el);
    });
    flush();
  }

  const quiz = stage.querySelector<HTMLElement>('[data-src="quiz"]');
  if (quiz) slides.push(makeSlide(Array.from(quiz.childNodes), 'quiz'));

  const outro = stage.querySelector<HTMLElement>('[data-src="outro"]');
  if (outro) slides.push(makeSlide(Array.from(outro.childNodes), 'outro'));

  return slides;
}

function buildControls(total: number): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'deck__controls';
  nav.setAttribute('aria-label', 'Stegnavigering');

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'deck-nav deck-nav--prev';
  prev.dataset.deckPrev = '';
  prev.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>Tillbaka</span>';

  const dots = document.createElement('div');
  dots.className = 'deck-dots';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'deck-dot';
    dot.dataset.go = String(i);
    dot.setAttribute('aria-label', `Gå till steg ${i + 1}`);
    dots.appendChild(dot);
  }

  const step = document.createElement('span');
  step.className = 'deck-step';
  step.dataset.deckStep = '';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'deck-nav deck-nav--next';
  next.dataset.deckNext = '';
  next.innerHTML =
    '<span>Fortsätt</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  const left = document.createElement('div');
  left.className = 'deck-controls__side';
  left.appendChild(prev);

  const center = document.createElement('div');
  center.className = 'deck-controls__center';
  center.append(dots, step);

  const right = document.createElement('div');
  right.className = 'deck-controls__side deck-controls__side--right';
  right.appendChild(next);

  nav.append(left, center, right);
  return nav;
}

// Dokumentnivå-lyssnare för piltangenter sätts EN gång; pekar mot aktivt deck.
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

function initDeck(deck: HTMLElement) {
  if (deck.dataset.built) return;
  deck.dataset.built = '1';

  const lessonId = deck.dataset.lessonId || '';

  const stage = deck.querySelector<HTMLElement>('[data-deck-stage]');
  const fill = deck.querySelector<HTMLElement>('[data-deck-fill]');
  if (!stage) return;

  // Topbar containers (may or may not be present)
  const topbarDotsContainer = document.querySelector<HTMLElement>('[data-deck-dots]');
  const topbarCounter = document.querySelector<HTMLElement>('[data-deck-counter]');

  // Rail containers (may or may not be present)
  const railStepEl = document.querySelector<HTMLElement>('[data-deck-rail-step]');
  const railFillEl = document.querySelector<HTMLElement>('[data-deck-rail-fill]');

  const slides = buildSlides(stage);
  if (slides.length === 0) return;

  // Töm scenen (källwrappers är nu tomma) och lägg in slides.
  stage.innerHTML = '';
  slides.forEach((s) => stage.appendChild(s));

  // Tvinga fram synlighet på reveal-element (deck sköter egen animation).
  deck.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));

  const controls = buildControls(slides.length);
  deck.appendChild(controls);

  const prevBtn = controls.querySelector<HTMLButtonElement>('[data-deck-prev]')!;
  const nextBtn = controls.querySelector<HTMLButtonElement>('[data-deck-next]')!;
  const stepEl = controls.querySelector<HTMLElement>('[data-deck-step]')!;
  const bottomDots = Array.from(controls.querySelectorAll<HTMLButtonElement>('.deck-dot'));

  // Build topbar dots if container present
  let topbarDots: HTMLButtonElement[] = [];
  if (topbarDotsContainer) {
    topbarDotsContainer.innerHTML = '';
    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'deck-dot';
      dot.dataset.go = String(i);
      dot.setAttribute('aria-label', `Gå till steg ${i + 1}`);
      topbarDotsContainer.appendChild(dot);
      topbarDots.push(dot);
    }
  }

  let index = 0;
  const last = slides.length - 1;

  function scrollToTop() {
    const y = deck.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
  }

  function show(i: number, dir: 'next' | 'prev') {
    index = Math.max(0, Math.min(last, i));
    deck.dataset.dir = dir;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === index));

    // Update bottom dots
    bottomDots.forEach((d, k) => {
      d.classList.toggle('is-active', k === index);
      d.classList.toggle('is-seen', k < index);
    });

    // Update topbar dots
    topbarDots.forEach((d, k) => {
      d.classList.toggle('is-active', k === index);
      d.classList.toggle('is-seen', k < index);
    });

    const stepText = `${index + 1} / ${slides.length}`;
    stepEl.textContent = stepText;

    // Update topbar counter
    if (topbarCounter) topbarCounter.textContent = stepText;

    prevBtn.disabled = index === 0;
    nextBtn.hidden = index === last;
    if (fill) fill.style.width = ((index + 1) / slides.length) * 100 + '%';

    // Update rail step progress
    if (railStepEl) railStepEl.textContent = stepText;
    if (railFillEl) railFillEl.style.width = ((index + 1) / slides.length) * 100 + '%';

    // Record position in localStorage
    if (lessonId) recordPosition(lessonId, index);

    scrollToTop();
  }

  function go(dir: 'next' | 'prev') {
    if (dir === 'next') {
      if (index === last) {
        document.querySelector<HTMLAnchorElement>('.pn--next')?.click();
      } else show(index + 1, 'next');
    } else {
      if (index === 0) {
        document.querySelector<HTMLAnchorElement>('.pn--prev')?.click();
      } else show(index - 1, 'prev');
    }
  }

  nextBtn.addEventListener('click', () => go('next'));
  prevBtn.addEventListener('click', () => go('prev'));
  bottomDots.forEach((d) =>
    d.addEventListener('click', () => {
      const target = Number(d.dataset.go);
      show(target, target >= index ? 'next' : 'prev');
    })
  );
  topbarDots.forEach((d) =>
    d.addEventListener('click', () => {
      const target = Number(d.dataset.go);
      show(target, target >= index ? 'next' : 'prev');
    })
  );

  activeGo = go;
  bindKeysOnce();

  deck.classList.add('is-ready');
  show(0, 'next');
}

export function setupDeck() {
  const deck = document.querySelector<HTMLElement>('[data-deck]');
  if (deck) initDeck(deck);
}
