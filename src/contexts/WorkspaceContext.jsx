import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { TOOLS } from '../data/tools'

const RECENT_KEY = 'vs-recent-tools'
const PINNED_KEY = 'vs-pinned-tools'
const MAX_RECENT = 6
const DEFAULT_PINNED = ['palette', 'tints', 'contrast', 'typescale', 'buttons', 'icons']

const WorkspaceContext = createContext()

function loadList(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* ignore quota */
  }
}

export function WorkspaceProvider({ children }) {
  const [recent, setRecent] = useState(() => loadList(RECENT_KEY))
  const [pinned, setPinned] = useState(() => loadList(PINNED_KEY, DEFAULT_PINNED))
  const location = useLocation()

  const trackVisit = useCallback((toolId) => {
    setRecent(prev => {
      const next = [toolId, ...prev.filter(id => id !== toolId)].slice(0, MAX_RECENT)
      saveList(RECENT_KEY, next)
      return next
    })
  }, [])

  const togglePinned = useCallback((toolId) => {
    setPinned(prev => {
      const next = prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
      saveList(PINNED_KEY, next)
      return next
    })
  }, [])

  // Auto-track tool visits by route — bridge router state to localStorage
  useEffect(() => {
    const tool = TOOLS.find(t => t.path === location.pathname)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tool) trackVisit(tool.id)
  }, [location.pathname, trackVisit])

  const value = { recent, pinned, trackVisit, togglePinned }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
