import { useLocation } from 'react-router-dom'
import { useExport } from '../contexts/ExportContext'
import { useProject } from '../contexts/ProjectContext'
import { isUntouched } from '../utils/accountSync'

// These tools render the working system even before the first edit.
const PREVIEW_PATHS = new Set([
  '/create/semantic-color', '/create/tint', '/create/gradient',
  '/create/contrast', '/create/font-pair', '/create/type-scale',
])

// A tool can supply its live, unsaved preview through the existing exporter.
// Both the header's availability check and the dialog read this snapshot.
export default function useExportDesign() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '')
  const { exportActions } = useExport()
  const { design } = useProject()
  if (exportActions?.path === path && exportActions.design) return exportActions.design
  if (path === '/create/palette') return null // Wait for the board's live draw.
  if (PREVIEW_PATHS.has(path) || path.startsWith('/projects/')) return design
  return isUntouched('vs-current-design', design) ? null : design
}
