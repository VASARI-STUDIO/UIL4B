import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { trackActivation } from '../utils/analytics'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from './AuthContext'
import { useSubscription } from './SubscriptionContext'
import { db } from '../utils/firebase'
import { DEFAULT_DESIGN } from '../data/designDefaults'

const ProjectContext = createContext()

const CURRENT_KEY = 'vs-current-design'
const PROJECTS_KEY = 'vs-projects'

// DEFAULT_DESIGN moved to src/data/designDefaults.js and is re-exported here, so
// every existing `import { DEFAULT_DESIGN } from '../contexts/ProjectContext'`
// keeps working unchanged.
//
// It moved because the User Home now COMPARES a saved project against it to
// answer “which parts of this system has anyone actually built?”, and that read
// has to be DOM-free to be testable — importing this file pulls in React, the
// auth context and the Firestore SDK. The alternative was hard-coding ‘Inter’,
// 16 and 1.25 into the progress logic, where a change to the defaults would
// silently make the progress display lie.
export { DEFAULT_DESIGN }

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

// Cross-device sync constant: separate Firestore doc id from useFirestoreSync's 'data'.
const SYNC_DOC = 'projects'
const PUSH_DEBOUNCE_MS = 1500

// Pure, NON-DESTRUCTIVE merge of two project lists.
// - Union by `id`. When an id exists in both, keep the one with the newer
//   `updatedAt` (Date.parse). If timestamps are equal/missing/unparseable,
//   prefer the local copy.
// - Never drops a project that exists in either list (deletes do not
//   propagate in v1 — losing data is worse than a resurrected project).
// - Always returns a new array.
function mergeProjects(localList, remoteList) {
  const local = Array.isArray(localList) ? localList : []
  const remote = Array.isArray(remoteList) ? remoteList : []

  const byId = new Map()
  // Seed with local so local wins ties by default.
  for (const p of local) {
    if (p && p.id != null) byId.set(p.id, p)
  }
  for (const r of remote) {
    if (!r || r.id == null) continue
    const existing = byId.get(r.id)
    if (!existing) {
      byId.set(r.id, r)
      continue
    }
    const localTime = Date.parse(existing.updatedAt)
    const remoteTime = Date.parse(r.updatedAt)
    // Take remote only when it is strictly newer and parseable.
    if (!Number.isNaN(remoteTime) && (Number.isNaN(localTime) || remoteTime > localTime)) {
      byId.set(r.id, r)
    }
    // else keep local (covers equal timestamps, missing/unparseable remote).
  }

  return Array.from(byId.values())
}

// Shallow structural compare keyed by id+updatedAt — enough to know whether a
// merged list differs from the local list and therefore needs persisting.
function projectListsEqual(a, b) {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  const aById = new Map(a.map(p => [p && p.id, p]))
  for (const p of b) {
    const other = aById.get(p && p.id)
    if (!other) return false
    if ((other.updatedAt || '') !== (p.updatedAt || '')) return false
  }
  return true
}

export function ProjectProvider({ children }) {
  const { user } = useAuth()
  const { plan } = useSubscription()
  const userKey = user?.email?.toLowerCase() || null

  const uid = user?.uid || null

  // Free-tier save cap. Read live from the active plan so it stays in one place
  // (SubscriptionContext) — Pro resolves to Infinity, so this is a no-op for Pro.
  const projectLimit = plan?.limits?.projects ?? Infinity

  const [design, setDesign] = useState(loadCurrent)
  const [allProjects, setAllProjects] = useState(loadAllProjects)

  // Cross-device sync plumbing (mirrors src/hooks/useFirestoreSync.js):
  //  - suppressPushRef: set while/just after a pull so the resulting state
  //    update does not bounce straight back as a redundant push.
  //  - pushTimerRef: debounce handle for the push effect.
  const suppressPushRef = useRef(false)
  const pushTimerRef = useRef(null)

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

  const saveProject = useCallback((name, opts = {}) => {
    if (!userKey) throw new Error('Sign in to save projects')
    // Free-tier cap: block a NEW save once the allowance is reached. Never
    // touches existing projects (non-destructive) and never blocks sync merges.
    const current = allProjects[userKey] || []
    if (current.length >= projectLimit) {
      throw new Error(`Free plan saves up to ${projectLimit} projects — go Pro for unlimited.`)
    }
    const id = newId()
    const snapshot = opts.blank ? DEFAULT_DESIGN : design
    const project = {
      id,
      name: name.trim() || `Project ${new Date().toLocaleDateString()}`,
      design: JSON.parse(JSON.stringify(snapshot)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setAllProjects(prev => {
      const next = { ...prev, [userKey]: [...(prev[userKey] || []), project] }
      saveAllProjects(next)
      return next
    })
    // P-001 ACTIVATION. A saved project is the first thing that requires an
    // account and survives the session — the audit's own definition of the
    // first real win — so this is the moment the product became useful to
    // someone. Fired after the write succeeds, and only for a genuine save:
    // `opts.blank` creates an empty shell, which is a container, not work.
    if (!opts.blank) {
      try { trackActivation('project', 'save') } catch { /* never break a save */ }
    }
    return id
  }, [design, userKey, allProjects, projectLimit])

  /**
   * Copy a project, cap and all.
   *
   * THE CAP IS RE-CHECKED HERE rather than trusted from the caller. Duplicating
   * is a NEW save — it takes a slot — so it has to answer to the same rule
   * saveProject() answers to, and it throws the same message. A duplicate button
   * that quietly created a fourth project on a three-project plan would be the
   * cap leaking, and the cap is the thing Pro sells.
   *
   * The copy is a deep clone with a fresh id and fresh timestamps. It carries the
   * DESIGN, not the identity: `archived` is deliberately not copied, because
   * duplicating something you have put away in order to work on the copy is the
   * whole reason to duplicate an archived project.
   */
  const duplicateProject = useCallback((id) => {
    if (!userKey) throw new Error('Sign in to save projects')
    const current = allProjects[userKey] || []
    if (current.length >= projectLimit) {
      throw new Error(`Free plan saves up to ${projectLimit} projects — go Pro for unlimited.`)
    }
    const source = current.find((p) => p.id === id)
    if (!source) throw new Error('That project no longer exists')
    const now = new Date().toISOString()
    const copy = {
      id: newId(),
      name: `${source.name} copy`,
      design: JSON.parse(JSON.stringify(source.design)),
      createdAt: now,
      updatedAt: now,
    }
    setAllProjects(prev => {
      const next = { ...prev, [userKey]: [...(prev[userKey] || []), copy] }
      saveAllProjects(next)
      return next
    })
    return copy.id
  }, [userKey, allProjects, projectLimit])
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

  const archiveProject = useCallback((id) => {
    if (!userKey) return
    setAllProjects(prev => {
      const list = (prev[userKey] || []).map(p =>
        p.id === id ? { ...p, archived: !p.archived, updatedAt: new Date().toISOString() } : p
      )
      const next = { ...prev, [userKey]: list }
      saveAllProjects(next)
      return next
    })
  }, [userKey])

  // Auto-create a default project on first sign-in if user has none
  useEffect(() => {
    if (!userKey) return
    const list = allProjects[userKey]
    if (list && list.length > 0) return
    const id = newId()
    const project = {
      id,
      name: 'Default Project',
      design: JSON.parse(JSON.stringify(design)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setAllProjects(prev => {
      const next = { ...prev, [userKey]: [project] }
      saveAllProjects(next)
      return next
    })
  }, [userKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cross-device sync: PULL on login / uid change ───────────────────────────
  // Non-destructive: merge remote projects into the local list. Wrapped in
  // try/catch so an offline device or Firestore error never blocks the UI —
  // localStorage stays the working source of truth.
  useEffect(() => {
    if (!uid || !userKey) return
    let cancelled = false
    // Suppress pushes while the pull is in flight and briefly after, so the
    // merged state update doesn't immediately echo back to Firestore.
    suppressPushRef.current = true
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'sync', SYNC_DOC))
        if (cancelled) return
        if (snap.exists()) {
          const remote = snap.data()
          if (remote && Array.isArray(remote.list)) {
            setAllProjects(prev => {
              const localList = prev[userKey] || []
              const merged = mergeProjects(localList, remote.list)
              if (projectListsEqual(localList, merged)) return prev
              const next = { ...prev, [userKey]: merged }
              saveAllProjects(next)
              return next
            })
          }
        }
      } catch {
        // Offline / permission / transient — ignore, keep local data.
      } finally {
        if (!cancelled) {
          // Release the suppression shortly after the merge settles so the next
          // genuine local edit can push.
          setTimeout(() => { suppressPushRef.current = false }, 1200)
        }
      }
    })()
    return () => {
      cancelled = true
      suppressPushRef.current = false
    }
  }, [uid, userKey])

  // ── Cross-device sync: PUSH (debounced) on local project changes ────────────
  // Watches the current user's list and debounces a non-blocking setDoc. The
  // suppress ref prevents the echo right after a pull. Any failure is ignored.
  useEffect(() => {
    if (!uid) return
    if (suppressPushRef.current) return
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      ;(async () => {
        try {
          await setDoc(
            doc(db, 'users', uid, 'sync', SYNC_DOC),
            // JSON round-trip strips undefined fields — Firestore rejects
            // documents containing undefined, which would silently fail sync.
            { list: JSON.parse(JSON.stringify(projects)), _updatedAt: Date.now() },
            { merge: true }
          )
        } catch {
          // Offline / transient — local data is unaffected.
        }
      })()
    }, PUSH_DEBOUNCE_MS)
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [uid, projects])

  const value = {
    design,
    projects,
    canSaveProjects: !!userKey,
    projectLimit,
    atProjectLimit: (allProjects[userKey] || []).length >= projectLimit,
    setPalette,
    setFonts,
    setTypeScale,
    setStates,
    setTints,
    setGradient,
    updateDesign,
    saveProject,
    duplicateProject,
    overwriteProject,
    renameProject,
    loadProject,
    deleteProject,
    archiveProject,
    resetDesign,
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)
