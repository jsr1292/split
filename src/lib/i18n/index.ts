import en from './en.json';
import es from './es.json';

export type Lang = 'en' | 'es';

const translations: Record<Lang, Record<string, string>> = { en, es };

// Module-level reactive state for language
let _forceUpdate = $state(0);
let currentLang: Lang = $state(
  typeof localStorage !== 'undefined'
    ? (localStorage.getItem('split-lang') as Lang) || 'es'
    : 'es'
);

export function t(key: string, params?: Record<string, string | number>): string {
  // Reference _forceUpdate to make this reactive
  void _forceUpdate;
  const lang = currentLang;
  let text = translations[lang]?.[key] || translations['es']?.[key] || key;
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
  _forceUpdate++;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('split-lang', lang);
  }
}

export function getLocale(): string {
  return currentLang === 'en' ? 'en-US' : 'es-ES';
}

export function getLangLabel(): string {
  return currentLang === 'en' ? 'EN' : 'ES';
}
