import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const I18nContext = createContext()
const STORAGE_KEY = 'vs-lang'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English (AU)', flag: '🇦🇺', region: 'AU' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸', region: 'ES' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷', region: 'FR' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪', region: 'DE' },
  { code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹', region: 'IT' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷', region: 'BR' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵', region: 'JP' },
  { code: 'zh', label: 'Chinese', native: '中文', flag: '🇨🇳', region: 'CN' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷', region: 'KR' },
]

let localeCache = {}

function resolve(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'en' } catch { return 'en' }
  })
  const [messages, setMessages] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (localeCache[lang]) {
        setMessages(localeCache[lang])
        return
      }
      try {
        const mod = await import(`../locales/${lang}.json`)
        const data = mod.default || mod
        localeCache[lang] = data
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
