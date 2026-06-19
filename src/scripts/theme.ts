/* Tema-toggle. Mörkt är default. Initieras utan flash via inline-script
   i <head> (se BaseLayout). Delas av alla ytor via nyckeln agarboken-theme. */

const KEY = 'agarboken-theme';
const OLD_KEY = 'kurs:theme';
export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' ? 'dark' : 'light';
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

/** Engångsmigrering: kopiera gammal nyckel till ny om den nya saknas. */
export function migrateThemeKey(): void {
  try {
    if (!localStorage.getItem(KEY)) {
      const old = localStorage.getItem(OLD_KEY);
      if (old === 'light' || old === 'dark') localStorage.setItem(KEY, old);
    }
  } catch {
    /* ignorera */
  }
}
