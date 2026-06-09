import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { TOOLS } from '../data/tools'

// Custom drag MIME type for dragging a tool from the sidebar onto the dashboard.
export const TOOL_DRAG_TYPE = 'application/x-vs-tool'

const RECENT_KEY = 'vs-recent-tools'
const PINNED_KEY = 'vs-pinned-tools'
const MAX_RECENT = 6
// The dashboard ships with Colour Studio and the Font Gallery (Font of the Day)
// pinned by default, alongside the image converter and resources.
const DEFAULT_PINNED = ['color-studio', 'fontgallery', 'icons', 'imgconvert', 'resources']
// Tools that should be back-filled into existing users' boards once, so an
// added default (the Font Gallery) shows up without wiping their layout.
const PIN_VERSION_KEY = 'vs-pinned-v'
const PIN_VERSION = '3'
const PIN_BACKFILL = ['color-studio', 'fontgallery']
const WorkspaceContext = createContext()

function loadList(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Ensure newly-introduced default panels appear for returning visitors exactly
// once, then remember we've done so. Brand-new users already get DEFAULT_PINNED.
function loadPinned() {
  const list = loadList(PINNED_KEY, DEFAULT_PINNED)
  try {
    if (localStorage.getItem(PIN_VERSION_KEY) !== PIN_VERSION) {
      localStorage.setItem(PIN_VERSION_KEY, PIN_VERSION)
      const merged = [...list]
      let changed = false
      PIN_BACKFILL.forEach(id => {
        if (!merged.includes(id)) { merged.push(id); changed = true }
      })
      if (changed) saveList(PINNED_KEY, merged)
      return merged
    }
  } catch { /* ignore */ }
  return list
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
  const [pinned, setPinned] = useState(loadPinned)
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

  // Add to pinned without toggling off — used by drag-to-dashboard.
  // Optionally insert at a specific index, otherwise append.
  const addPinned = useCallback((toolId, atIndex = null) => {
    setPinned(prev => {
      if (prev.includes(toolId)) return prev
      const next = [...prev]
      if (atIndex == null || atIndex >= next.length) next.push(toolId)
      else next.splice(Math.max(0, atIndex), 0, toolId)
      saveList(PINNED_KEY, next)
      return next
    })
  }, [])

  const reorderPinned = useCallback((fromIdx, toIdx) => {
    setPinned(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
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

  const value = { recent, pinned, trackVisit, togglePinned, addPinned, reorderPinned }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
