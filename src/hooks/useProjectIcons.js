import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import {
  readLegacyIcons, writeLegacyIcons, iconMap, planIconMigration,
} from '../utils/projectIcons'

/**
 * Project icons, stored ON the project so they follow the account.
 *
 * A drop-in for the workspace's old `vs-project-icons` state:
 *
 *   const { icons, pickIcon } = useProjectIcons()
 *   icons[project.id]          // the glyph name or data: URL, or undefined
 *   pickIcon(project.id, glyph) // saves it on the project (and syncs)
 *
 * On first use it moves any icon this browser kept in the old map onto its
 * project — see planIconMigration for the merge rule.
 */
export default function useProjectIcons() {
  const { projects, updateProject, canSaveProjects } = useProject()
  const [legacy, setLegacy] = useState(() => {
    try { return readLegacyIcons(localStorage) } catch { return {} }
  })

  useEffect(() => {
    if (!canSaveProjects || !updateProject || !projects.length) return
    const { moves, remaining } = planIconMigration(projects, legacy)
    if (!moves.length && Object.keys(remaining).length === Object.keys(legacy).length) return
    for (const { id, icon } of moves) updateProject(id, { icon })
    try { writeLegacyIcons(localStorage, remaining) } catch { /* storage unavailable */ }
    setLegacy(remaining)
  }, [projects, legacy, canSaveProjects, updateProject])

  const icons = useMemo(() => iconMap(projects, legacy), [projects, legacy])

  const pickIcon = useCallback((id, icon) => {
    if (!updateProject) return
    updateProject(id, { icon: icon || null })
  }, [updateProject])

  return { icons, pickIcon }
}
