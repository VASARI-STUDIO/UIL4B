import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const I18nContext = createContext()
const STORAGE_KEY = 'vs-lang'

const LANGUAGES = [
  { code: 'en', label: 'English (AU)', flag: '🇦🇺' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
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

  if (!messages) return null

  return (
    <I18nContext.Provider value={{ t, lang, setLang, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
