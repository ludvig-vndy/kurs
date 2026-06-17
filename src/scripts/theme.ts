/* Tema-toggle. Mörkt är default. Initieras utan flash via inline-script
   i <head> (se BaseLayout). Den här modulen sköter toggle-knappen. */

const KEY = 'kurs:theme';
export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignorera */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
