import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import en from '../locales/en.json'
import { onAccountApplied } from '../utils/accountEvents'

const I18nContext = createContext()
const STORAGE_KEY = 'vs-lang'

const LANGUAGES = [
  { code: 'en', label: 'English (AU)', native: 'English (AU)', flag: '🇦🇺', region: 'AU' },
  { code: 'en-US', label: 'English (US)', native: 'English (US)', flag: '🇺🇸', region: 'US' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸', region: 'ES' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷', region: 'FR' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪', region: 'DE' },
  { code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹', region: 'IT' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷', region: 'BR' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵', region: 'JP' },
  { code: 'zh', label: 'Chinese', native: '中文', flag: '🇨🇳', region: 'CN' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷', region: 'KR' },
]

function detectBrowserLang() {
  try {
    const nav = navigator.language || navigator.languages?.[0] || ''
    if (nav.startsWith('en-US') || nav.startsWith('en-GB')) return 'en-US'
    if (nav.startsWith('en')) return 'en'
    const base = nav.split('-')[0].toLowerCase()
    if (LANGUAGES.some(l => l.code === base)) return base
  } catch { /* SSR safety */ }
  return 'en'
}

// Only `en` ships with the entry, so first paint is synchronous and t() never
// returns a raw key on the first frame. en-US is a real locale (a US or GB
// browser lands on it, and it is in the language picker) but differs from `en` in
// 24 of 471 strings, so it loads like every other locale: it is NOT in the first
// wave, and a visitor who lands on it sees the `en` copy until its chunk arrives,
// which is started here at module evaluation rather than after the first render.
// Other locales (es, …) load async and swap in via the effect below.
let localeCache = { en }

const localeLoads = {}
function loadLocale(code) {
  localeLoads[code] ||= import(`../locales/${code}.json`).then((mod) => {
    const data = mod.default || mod
    localeCache[code] = data
    return data
  }).catch((err) => {
    delete localeLoads[code]   // a failed fetch is tried again, not remembered
    throw err
  })
  return localeLoads[code]
}
try {
  if ((localStorage.getItem(STORAGE_KEY) || detectBrowserLang()) === 'en-US') loadLocale('en-US').catch(() => {})
} catch { /* no storage, or no window: the effect below loads it */ }

function resolve(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || detectBrowserLang() } catch { return 'en' }
  })
  // Seed synchronously from the statically-imported English locales so the very
  // first paint renders the correct copy — no raw keys, and no Colour→Color flash
  // for en-US users (P1). Non-English locales fall back to en here, then swap in
  // async via the effect below.
  const [messages, setMessages] = useState(() => localeCache[lang] || en)

  // THE DOCUMENT HAS TO SAY WHAT LANGUAGE IT IS IN.
  //
  // index.html ships `<html lang="en-AU">` and nothing ever changed it, so all
  // ten locales rendered under en-AU — Japanese and French content declared as
  // Australian English on every route. That is WCAG 3.1.1 (Language of Page),
  // and it is not cosmetic: a screen reader picks its voice and its
  // pronunciation rules from this attribute, so it reads Japanese aloud with
  // English phonetics. It also decides hyphenation and which quotation marks a
  // browser substitutes.
  //
  // Written here rather than in the render because it is a DOM side effect on
  // an element outside the React tree, and it has to survive a locale change
  // rather than only a first paint.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // The language follows the account.
  useEffect(() => onAccountApplied([STORAGE_KEY], () => {
    try { setLangState(localStorage.getItem(STORAGE_KEY) || detectBrowserLang()) } catch { /* keep the current one */ }
  }), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (localeCache[lang]) {
        setMessages(localeCache[lang])
        return
      }
      try {
        const data = await loadLocale(lang)
        if (!cancelled) setMessages(data)
      } catch {
        if (lang !== 'en') {
          const fallback = await import('../locales/en.json')
          const data = fallback.default || fallback
          localeCache[lang] = data
          if (!cancelled) setMessages(data)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [lang])

  const setLang = useCallback((code) => {
    setLangState(code)
    try { localStorage.setItem(STORAGE_KEY, code) } catch {}
  }, [])

  const t = useCallback((key, replacements) => {
    if (!messages) return key
    let val = resolve(messages, key)
    // Fall back to the complete base locale (en) before ever surfacing a raw key,
    // so a key missing from en-US / a partial locale never leaks (e.g. the
    // "emojiLibrary.subtitle" string that showed on the Icon/Emoji surface).
    if (val == null && messages !== en) val = resolve(en, key)
    if (val == null) return key
    if (Array.isArray(val)) return val
    if (typeof val !== 'string') return key
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      })
    }
    return val
  }, [messages])

  return (
    <I18nContext.Provider value={{ t, lang, setLang, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
