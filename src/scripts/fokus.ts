/* fokus.ts, broadsheet Fokus lesson player.
   One step at a time, segmented track + folio counter, bottom nav,
   arrow keys, reduced-motion aware. Marks the lesson done and shows a
   completion panel on finish. */

import { touchStreak, getStreak } from './state';
import { markFokusDone, getFokusDone } from './fokus-progress';

interface FokusMeta {
  lektion: string;
  kapitel: number;
  chapterIds: string[];
  courseIds: string[];
  nextHref: string | null;
}

let activeGo: ((dir: 'next' | 'prev') => void) | null = null;
let keysBound = false;

function bindKeysOnce() {
  if (keysBound) return;
  keysBound = true;
  document.addEventListener('keydown', (e) => {
    if (!activeGo) return;
    const t = e.target as HTMLElement;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); activeGo('next'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); activeGo('prev'); }
  });
}

function readMeta(): FokusMeta | null {
  const el = document.querySelector('[data-fokus-meta]');
  if (!el) return null;
  try { return JSON.parse(el.textContent || 'null'); } catch { return null; }
}

function initFokus(host: HTMLElement) {
  if (host.dataset.built) return;
  host.dataset.built = '1';

  const meta = readMeta();
  const lessonId = host.dataset.lektion ?? meta?.lektion ?? '';

  // Count this visit toward the streak.
  touchStreak();

  const stepsContainer = host.querySelector<HTMLElement>('[data-fokus-steps]');
  if (!stepsContainer) return;
  const steps = Array.from(stepsContainer.querySelectorAll<HTMLElement>('[data-step]'));
  if (steps.length === 0) return;

  const total = steps.length;
  const last = total - 1;

  const player = host.closest<HTMLElement>('[data-player]');
  const trackEl = document.querySelector<HTMLElement>('[data-track]');
  const fnowEl = document.querySelector<HTMLElement>('[data-fnow]');
  const backBtn = document.querySelector<HTMLButtonElement>('[data-back]');
  const nextBtn = document.querySelector<HTMLButtonElement>('[data-next]');

  // Build segmented track.
  let segs: HTMLElement[] = [];
  if (trackEl) {
    trackEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const seg = document.createElement('span');
      seg.className = 'seg';
      seg.dataset.go = String(i);
      seg.addEventListener('click', () => show(Number(seg.dataset.go)));
      trackEl.appendChild(seg);
      segs.push(seg);
    }
  }

  let index = 0;

  // Resume position: persist the current step per lesson so reloading or leaving
  // mid-lesson returns you where you were. Cleared on completion so a revisit of
  // a finished lesson starts fresh.
  const posKey = lessonId ? `kurs:fokus:pos:${lessonId}` : '';
  function savePos(i: number) { if (!posKey) return; try { localStorage.setItem(posKey, String(i)); } catch {} }
  function clearPos() { if (!posKey) return; try { localStorage.removeItem(posKey); } catch {} }
  function readPos(): number { if (!posKey) return 0; try { const v = Number(localStorage.getItem(posKey)); return Number.isFinite(v) ? v : 0; } catch { return 0; } }

  function scrollTop() {
    // Calm pass: jump to top instantly on step change instead of smooth-scrolling
    // the whole viewport, which read as the floor moving for motion-sensitive users.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function show(i: number) {
    index = Math.max(0, Math.min(last, i));
    savePos(index);
    steps.forEach((s, k) => {
      const active = k === index;
      s.classList.toggle('is-active', active);
      s.hidden = !active;
    });
    segs.forEach((sg, k) => {
      sg.classList.toggle('done', k < index);
      sg.classList.toggle('cur', k === index);
    });
    if (fnowEl) fnowEl.textContent = String(index + 1).padStart(2, '0');
    if (backBtn) backBtn.textContent = index === 0 ? '← Till kursöversikten' : '← Tillbaka';
    if (nextBtn) nextBtn.textContent = index === last ? 'Slutför lektionen' : 'Fortsätt →';
    scrollTop();
  }

  function finish() {
    if (lessonId) markFokusDone(lessonId);
    clearPos();
    if (!player) {
      // No completion panel, fall back to next lesson or overview.
      window.location.href = meta?.nextHref || '/fokus';
      return;
    }
    // Populate completion stats from localStorage.
    const done = new Set(getFokusDone());
    const chapDone = (meta?.chapterIds ?? []).filter((id) => done.has(id)).length;
    const courseDone = (meta?.courseIds ?? []).filter((id) => done.has(id)).length;
    const chapEl = document.querySelector<HTMLElement>('[data-done-chap]');
    const totalEl = document.querySelector<HTMLElement>('[data-done-total]');
    const streakEl = document.querySelector<HTMLElement>('[data-done-streak]');
    if (chapEl) chapEl.textContent = String(chapDone);
    if (totalEl) totalEl.textContent = String(courseDone);
    if (streakEl) streakEl.textContent = String(getStreak());
    player.classList.add('is-done');
    scrollTop();
  }

  function go(dir: 'next' | 'prev') {
    if (dir === 'next') {
      if (index === last) finish();
      else show(index + 1);
    } else {
      if (index === 0) window.location.href = '/fokus';
      else show(index - 1);
    }
  }

  nextBtn?.addEventListener('click', () => go('next'));
  backBtn?.addEventListener('click', () => go('prev'));

  activeGo = go;
  bindKeysOnce();
  show(Math.max(0, Math.min(last, readPos())));
}

export function setupFokus() {
  activeGo = null;
  const host = document.querySelector<HTMLElement>('[data-fokus]');
  if (host) initFokus(host);
}
