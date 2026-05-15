import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'

const ProjectContext = createContext()

const CURRENT_KEY = 'vs-current-design'
const PROJECTS_KEY = 'vs-projects'

export const DEFAULT_DESIGN = {
  palette: {
    base: '#2563EB',
    harmony: 'analogous',
    extraColors: [],
    activeIdx: 0,
    colors: ['#2563EB'],
  },
  states: { success: 0, warning: 0, error: 0, info: 0 },
  tints: { lumBias: 82, satDecay: 12, oled: true, scale: [] },
  gradient: {
    stops: [{ color: null, position: 0 }, { color: null, position: 100 }],
    angle: 135,
    type: 'Linear',
  },
  fonts: {
    heading: { family: 'Inter', weight: 700, category: 'sans-serif' },
    body: { family: 'Inter', weight: 400, category: 'sans-serif' },
  },
  typeScale: {
    base: 16,
    ratio: 1.25,
    lineHeight: 1.5,
    headingSpacing: 0,
    bodySpacing: 0,
  },
}

function loadCurrent() {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    if (!raw) return DEFAULT_DESIGN
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_DESIGN, ...parsed }
  } catch {
    return DEFAULT_DESIGN
  }
}

function saveCurrent(design) {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(design))
  } catch { /* quota */ }
}

function loadAllProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '{}')
  } catch { return {} }
}

function saveAllProjects(data) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(data))
  } catch { /* quota */ }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function ProjectProvider({ children }) {
  const { user } = useAuth()
  const userKey = user?.email?.toLowerCase() || null

  const [design, setDesign] = useState(loadCurrent)
  const [allProjects, setAllProjects] = useState(loadAllProjects)

  // Auto-persist current design
  useEffect(() => {
    saveCurrent(design)
  }, [design])

  const projects = useMemo(() => {
    if (!userKey) return []
    return allProjects[userKey] || []
  }, [allProjects, userKey])

  const updateDesign = useCallback((patch) => {
    setDesign(prev => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(patch)) {
        if (value && typeof value === 'object' && !Array.isArray(value) && prev[key] && typeof prev[key] === 'object' && !Array.isArray(prev[key])) {
          next[key] = { ...prev[key], ...value }
        } else {
          next[key] = value
        }
      }
      return next
    })
  }, [])

  const setPalette = useCallback((patch) => {
    updateDesign({ palette: patch })
  }, [updateDesign])

  const setFonts = useCallback((patch) => {
    updateDesign({ fonts: patch })
  }, [updateDesign])

  const setTypeScale = useCallback((patch) => {
    updateDesign({ typeScale: patch })
  }, [updateDesign])

  const setStates = useCallback((patch) => {
    updateDesign({ states: patch })
  }, [updateDesign])

  const setTints = useCallback((patch) => {
    updateDesign({ tints: patch })
  }, [updateDesign])

  const setGradient = useCallback((patch) => {
    updateDesign({ gradient: patch })
  }, [updateDesign])

  const saveProject = useCallback((name) => {
    if (!userKey) throw new Error('Sign in to save projects')
    const id = newId()
    const project = {
      id,
      name: name.trim() || `Project ${new Date().toLocaleDateString()}`,
      design: JSON.parse(JSON.stringify(design)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setAllProjects(prev => {
      const next = { ...prev, [userKey]: [...(prev[userKey] || []), project] }
      saveAllProjects(next)
      return next
    })
    return id
  }, [design, userKey])

  const updateProject = useCallback((id, patch) => {
    if (!userKey) return
    setAllProjects(prev => {
      const list = prev[userKey] || []
      const next = list.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)
      const updated = { ...prev, [userKey]: next }
      saveAllProjects(updated)
      return updated
    })
  }, [userKey])

  const renameProject = useCallback((id, name) => {
    updateProject(id, { name: name.trim() })
  }, [updateProject])

  const overwriteProject = useCallback((id) => {
    if (!userKey) return
    setAllProjects(prev => {
      const list = prev[userKey] || []
      const next = list.map(p => p.id === id
        ? { ...p, design: JSON.parse(JSON.stringify(design)), updatedAt: new Date().toISOString() }
        : p
      )
      const updated = { ...prev, [userKey]: next }
      saveAllProjects(updated)
      return updated
    })
  }, [design, userKey])

  const loadProject = useCallback((id) => {
    if (!userKey) return
    const list = allProjects[userKey] || []
    const project = list.find(p => p.id === id)
    if (project) {
      setDesign({ ...DEFAULT_DESIGN, ...project.design })
    }
  }, [allProjects, userKey])

  const deleteProject = useCallback((id) => {
    if (!userKey) return
    setAllProjects(prev => {
      const list = (prev[userKey] || []).filter(p => p.id !== id)
      const next = { ...prev, [userKey]: list }
      saveAllProjects(next)
      return next
    })
  }, [userKey])

  const resetDesign = useCallback(() => {
    setDesign(DEFAULT_DESIGN)
  }, [])

  const value = {
    design,
    projects,
    canSaveProjects: !!userKey,
    setPalette,
    setFonts,
    setTypeScale,
    setStates,
    setTints,
    setGradient,
    updateDesign,
    saveProject,
    overwriteProject,
    renameProject,
    loadProject,
    deleteProject,
    resetDesign,
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)

// Legacy compatibility shim — existing code uses usePalette() with .palette and savePalette()
export const usePalette = () => {
  const ctx = useContext(ProjectContext)
  if (!ctx) return { palette: [], savePalette: () => {} }
  return {
    palette: ctx.design?.palette?.colors || [],
    savePalette: (colors) => {
      if (Array.isArray(colors)) ctx.setPalette({ colors })
    },
  }
}
