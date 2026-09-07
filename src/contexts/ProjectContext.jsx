import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { trackActivation } from '../utils/analytics'
// URGENT access: both sync effects are behind a truthy `uid`, so auth has
// already resolved to a signed-in person whose projects are being synced.
// See src/utils/firebaseAccess.js for patient vs urgent.
import { loadFirestore } from '../utils/firebaseAccess'
import {
  mergeProjects, projectListsEqual, mergeTombstones, pruneTombstones,
  readRemoteProjects, writeRemoteProjects, syncFailureMessage, classifyError,
} from '../utils/projectSync'
import { reportSyncFailure, reportSyncNotice, reportSyncOk } from '../utils/syncStatus'
import { useAuth } from './AuthContext'
import { useSubscription } from './SubscriptionContext'
import { DEFAULT_DESIGN } from '../data/designDefaults'

const ProjectContext = createContext()

const CURRENT_KEY = 'vs-current-design'
const PROJECTS_KEY = 'vs-projects'
// Deletes, recorded so they can PROPAGATE. Kept in a key of their own rather
// than as `deleted: true` inside vs-projects, because every reader of that key
// — the save cap, the User Home's figures, 58-flows-project-lifecycle's store
// assertions — counts its length, and a soft-deleted record living in it would
// have made the cap refuse a save for a project the user had thrown away.
const TOMBSTONES_KEY = 'vs-project-tombstones'

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

function loadAllTombstones() {
  try {
    return JSON.parse(localStorage.getItem(TOMBSTONES_KEY) || '{}')
  } catch { return {} }
}

function saveAllTombstones(data) {
  try {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(data))
  } catch { /* quota */ }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Cross-device sync. THE MERGE RULES, THE DOCUMENT SHAPE AND THE MIGRATION NOW
// LIVE IN src/utils/projectSync.js — they were here, which meant they could not
// be tested without React, a router and the Firebase SDK, and so were not. All
// four defects the 2026-09-06 review found in them were unit-testable in a line
// once they were somewhere a unit test could reach.
//
// What stayed here is the WIRING: when to pull, when to push, what to write to
// localStorage, and what to put on screen when either one fails.
const PUSH_DEBOUNCE_MS = 1500

// The channel this provider reports into. See src/utils/syncStatus.js.
const SYNC_CHANNEL = 'projects'

// The conflict sentence. Written here because it is the answer to "what does
// the user see when two devices disagree", and that answer is: the newer copy,
// plus a line saying so. Never a silent swap, and never a discarded edit — the
// merge keeps the newer side of every project and reports which ones moved.
function conflictMessage(replaced, removed) {
  const parts = []
  if (replaced.length) {
    const names = replaced.slice(0, 2).map((p) => `“${p.name}”`).join(' and ')
    parts.push(replaced.length === 1
      ? `${names} was edited on another device. You’re now looking at that newer version.`
      : `${replaced.length} projects (${names}…) were edited on another device. You’re now looking at the newer version of each.`)
  }
  if (removed.length) {
    const names = removed.slice(0, 2).map((p) => `“${p.name}”`).join(' and ')
    parts.push(removed.length === 1
      ? `${names} was deleted on another device, so it’s gone from here too.`
      : `${removed.length} projects deleted on another device (${names}…) are gone from here too.`)
  }
  return parts.join(' ')
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
  const [allTombstones, setAllTombstones] = useState(loadAllTombstones)

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

  const tombstones = useMemo(() => {
    if (!userKey) return {}
    return allTombstones[userKey] || {}
  }, [allTombstones, userKey])

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

  /**
   * Delete, and RECORD THE DELETE.
   *
   * Removing the record from the local list was the whole of this function, and
   * it is why deletes did not propagate: the next pull found the project still
   * present in the remote list, saw no reason to drop it, and merged it back
   * in. A user who deleted a project on their laptop watched it reappear.
   *
   * The tombstone is what turns "absent here" into "deleted, at this time" —
   * the only form of the fact that survives a merge with a device that still
   * has the project. It carries a timestamp rather than a flag so that an edit
   * made elsewhere AFTER the delete still wins (mergeProjects decides that),
   * because resurrecting work beats destroying it.
   */
  const deleteProject = useCallback((id) => {
    if (!userKey) return
    setAllProjects(prev => {
      const list = (prev[userKey] || []).filter(p => p.id !== id)
      const next = { ...prev, [userKey]: list }
      saveAllProjects(next)
      return next
    })
    setAllTombstones(prev => {
      const mine = { ...(prev[userKey] || {}), [id]: new Date().toISOString() }
      const next = { ...prev, [userKey]: pruneTombstones(mine) }
      saveAllTombstones(next)
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

  // ── Cross-device sync ───────────────────────────────────────────────────
  //
  // THE EMPTY CATCH IS GONE, and that is the point of this half of the change.
  // Both effects below used to end in `catch {}`, which meant that once the
  // single sync document passed Firestore's 1 MiB ceiling, every push failed,
  // the user kept editing, localStorage kept working, and NOTHING SAID SO. A
  // new device then pulled the last list that fitted. That is the same defect
  // that hid the feedback queue's permission refusal this week, and the rule it
  // produced is the one these lines now follow: silent success is worse than
  // visible failure.
  //
  // So every outcome ends up in exactly one of three places:
  //   · reportSyncOk       — it worked; clear any standing failure.
  //   · reportSyncFailure  — it did not, with the reason and a Try again.
  //   · reportSyncNotice   — it worked and CHANGED something under the user.
  //
  // `retryRef` exists because the failure notice carries a retry button and the
  // function it must call is defined below the report that hands it over.
  const retryRef = useRef(null)
  const pushRef = useRef(null)
  const retry = useCallback(() => { retryRef.current?.() }, [])

  const pullNow = useCallback(async (signal) => {
    if (!uid || !userKey) return
    suppressPushRef.current = true
    try {
      const fs = await loadFirestore()
      if (signal?.cancelled) return
      const remote = await readRemoteProjects(fs, uid)
      if (signal?.cancelled) return

      // Read from the store rather than from state: every mutator on this
      // provider writes through to localStorage before it returns, so the store
      // is current, and merging outside the state updater keeps that updater
      // pure under StrictMode's double-invoke.
      const localList = loadAllProjects()[userKey] || []
      const localTombstones = loadAllTombstones()[userKey] || {}
      const merged = mergeProjects(localList, remote.list, {
        localTombstones,
        remoteTombstones: remote.tombstones,
      })

      if (!projectListsEqual(localList, merged.list)) {
        setAllProjects(prev => {
          const next = { ...prev, [userKey]: merged.list }
          saveAllProjects(next)
          return next
        })
      }
      const nextTombstones = mergeTombstones(localTombstones, merged.tombstones)
      if (JSON.stringify(nextTombstones) !== JSON.stringify(localTombstones)) {
        setAllTombstones(prev => {
          const next = { ...prev, [userKey]: nextTombstones }
          saveAllTombstones(next)
          return next
        })
      }

      // A conflict is news, not an error: the newer side of every project was
      // kept, and the user is told which ones moved under them.
      if (merged.replaced.length || merged.removed.length) {
        reportSyncNotice(SYNC_CHANNEL, conflictMessage(merged.replaced, merged.removed))
      }
      reportSyncOk(SYNC_CHANNEL)
    } catch (error) {
      reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)), retry)
    } finally {
      if (!signal?.cancelled) {
        // Release the suppression shortly after the merge settles so the next
        // genuine local edit can push — and then PUSH ONCE, unprompted.
        //
        // THE SECOND HALF IS NEW AND IT IS THE POINT. Before it, the push
        // effect ran exactly once, during the same commit in which the pull had
        // just set suppressPushRef, so it returned early and nothing rescheduled
        // it: a signed-in session pushed NOTHING until the user next edited a
        // project. Two consequences, and the second is the P1 itself —
        //
        //   · a device holding projects that had never reached the account kept
        //     holding them, indefinitely, in silence;
        //   · a write that Firestore would refuse (the 1 MiB ceiling) was not
        //     attempted, so the failure could not be reported, so a user could
        //     not learn that sync had stopped without editing something first.
        //
        // "Is my work reaching my account?" has to be answerable on load. It
        // costs one small document write per session.
        setTimeout(() => {
          if (signal?.cancelled) return
          suppressPushRef.current = false
          pushRef.current?.()
        }, 1200)
      }
    }
  }, [uid, userKey, retry])

  const pushNow = useCallback(async () => {
    if (!uid) return
    try {
      const fs = await loadFirestore()
      const result = await writeRemoteProjects(fs, uid, { list: projects, tombstones })
      if (result.ok) {
        reportSyncOk(SYNC_CHANNEL)
        return
      }
      const detail = result.reason === 'too-large'
        ? `${Math.round(result.bytes / 1024)} KB of a 1 MB limit`
        : null
      reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(result.reason, detail), retry)
    } catch (error) {
      // loadFirestore() itself can reject on a deferred build whose chunk never
      // arrived. That is still a sync failure and still gets said out loud.
      reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)), retry)
    }
  }, [uid, projects, tombstones, retry])

  // Declared BEFORE the pull effect on purpose: effects fire in declaration
  // order, so the retry is wired up before the first pull can fail and hand
  // the notice a button.
  useEffect(() => {
    retryRef.current = () => { pullNow(); pushNow() }
    pushRef.current = pushNow
  }, [pullNow, pushNow])

  // PULL on login / uid change.
  useEffect(() => {
    if (!uid || !userKey) return
    const signal = { cancelled: false }
    pullNow(signal)
    return () => {
      signal.cancelled = true
      suppressPushRef.current = false
    }
  }, [uid, userKey, pullNow])

  // PUSH (debounced) on any local change to the list OR to the tombstones —
  // a delete changes only the second, and before this it produced no push at
  // all, which is the other half of why deletes never propagated.
  useEffect(() => {
    if (!uid) return
    if (suppressPushRef.current) return
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => { pushNow() }, PUSH_DEBOUNCE_MS)
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [uid, pushNow])

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
