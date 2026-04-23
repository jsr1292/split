import en from './en.json';
import es from './es.json';

export type Lang = 'en' | 'es';

const translations: Record<Lang, Record<string, string>> = { en, es };

// Simple module-level state (no Svelte runes — this is a .ts file)
let currentLang: Lang = 'es';

// Initialize from localStorage on client
if (typeof localStorage !== 'undefined') {
  const stored = localStorage.getItem('split-lang') as Lang;
  if (stored === 'en' || stored === 'es') {
    currentLang = stored;
  }
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[currentLang]?.[key] || translations['es']?.[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('split-lang', lang);
  }
  // Force page reload to apply new language everywhere
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function getLocale(): string {
  return currentLang === 'en' ? 'en-US' : 'es-ES';
}

// System locale for number/currency formatting — always follows the device, not the app UI language
// Locale resolved once on first client load and stored, so SSR and client match
let _resolvedLocale: string | null = null;

export function getSystemLocale(): string {
  if (_resolvedLocale) return _resolvedLocale;
  if (typeof navigator !== 'undefined') {
    _resolvedLocale = navigator.language || navigator.languages?.[0] || 'es-ES';
    return _resolvedLocale;
  }
  return 'es-ES';
}

export function setSystemLocale(locale: string) {
  _resolvedLocale = locale;
}

export function getLangLabel(): string {
  return currentLang === 'en' ? 'EN' : 'ES';
}
