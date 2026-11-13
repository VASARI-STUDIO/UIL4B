import { useEffect, useMemo } from 'react'
import { useProject } from '../../contexts/ProjectContext'
import EdgeScreen, { EdgeBlock, EdgePill } from './EdgeScreen'
import { projectRows } from './edgeData'
import { holdPageTitle } from '../../utils/pageTitle'

// A project link that cannot open for a signed-in person. It stays at the same
// address, so the link in the bar is still the one they were sent. The words are
// the same whether the project was deleted or belongs to someone else, so they
// do not reveal which.
export default function ProjectMissing() {
  const { projects } = useProject()
  const rows = useMemo(() => projectRows(projects), [projects])

  useEffect(() => holdPageTitle('UI L4B | Project not found'), [])

  return (
    <EdgeScreen
      art="calm"
      soft
      title="That project isn’t in your account"
      body="It may have been deleted, here or on another device."
      safe={rows.length ? 'Your other projects are saved.' : undefined}
      actions={<EdgePill to="/projects" go>Open your workspace</EdgePill>}
      trail={[
        { to: '/', label: 'Back to the homepage' },
        { to: '/learn/help', label: 'Help centre' },
      ]}
      below={rows.length ? <EdgeBlock heading="Your recent projects" rows={rows} /> : null}
    />
  )
}
