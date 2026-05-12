import { createContext, useContext, useState, useCallback } from 'react'

const ExportContext = createContext()

export function ExportProvider({ children }) {
  const [exportActions, setExportActions] = useState(null)

  const registerExport = useCallback((actions) => {
    setExportActions(actions)
  }, [])

  const clearExport = useCallback(() => {
    setExportActions(null)
  }, [])

  return (
    <ExportContext.Provider value={{ exportActions, registerExport, clearExport }}>
      {children}
    </ExportContext.Provider>
  )
}

export const useExport = () => useContext(ExportContext)
