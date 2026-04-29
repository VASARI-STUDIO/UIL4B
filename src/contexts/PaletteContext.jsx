import { createContext, useContext, useState, useCallback } from 'react'

const PaletteContext = createContext()

export function PaletteProvider({ children }) {
  const [palette, setPalette] = useState(() => {
    try {
      const raw = localStorage.getItem('vs-palette')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const savePalette = useCallback((colors) => {
    if (!Array.isArray(colors)) return
    setPalette(colors)
    try {
      localStorage.setItem('vs-palette', JSON.stringify(colors))
    } catch {
      /* ignore quota errors */
    }
  }, [])

  return (
    <PaletteContext.Provider value={{ palette, savePalette }}>
      {children}
    </PaletteContext.Provider>
  )
}

export const usePalette = () => useContext(PaletteContext)
