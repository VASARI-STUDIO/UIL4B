import { createContext, useContext, useState, useCallback } from 'react'

const ExportContext = createContext()

export function ExportProvider({ children }) {
  // exportActions: per-page exporter registered by the current tool
  //   { downloadHTML, downloadCSS, copyCSS, label }
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
