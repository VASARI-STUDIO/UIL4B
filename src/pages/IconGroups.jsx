import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProject } from '../contexts/ProjectContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import useExportGate from '../hooks/useExportGate'
import ColorPickerPop from '../components/ColorPickerPop'
import { LockedIconGroupCard, LockedTeaseCta } from '../components/library/LockedTease'
import {
  DEFAULT_GROUP_STROKE, GROUP_PREVIEW_COUNT, GROUP_STROKES, GROUP_STYLE_PACKS, ICON_GROUPS_ROUTE,
  PREMADE_ICON_GROUPS, glyphRequestPlan, groupById, groupNeeds, groupPacks, groupRoute, parseIconRef,
} from '../data/iconGroups'
import { viewerTier } from '../data/iconPackTiers'
import { packCredit } from '../data/iconPackCredits'
import { partsPresent } from '../utils/userHome'
import { normalizeHex } from '../utils/colorFormats'
import { glyphFor, loadGroupGlyphs } from '../utils/iconGroupGlyphs'
import { groupFileNames, groupIconDataUri, groupIconSvg, groupSprite } from '../utils/iconGroupSvg'
import '../styles/pages/icon-groups.css'

const packNames = (g) => groupPacks(g).map((p) => packCredit(p)?.name || p).join(' · ')

// Re-render once a batch of glyphs lands. Returns [ready, failed, retry].
function useGroupGlyphs(groups, tier, limit) {
  const [state, setState] = useState({ key: '', ready: false, failed: false })
  const [attempt, setAttempt] = useState(0)
  const plan = useMemo(() => glyphRequestPlan(groups, tier, { limit }), [groups, tier, limit])
  const key = `${tier}|${[...plan].map(([p, n]) => `${p}:${n.join(',')}`).join('|')}|${attempt}`
  useEffect(() => {
    if (!plan.size) return undefined
    let live = true
    loadGroupGlyphs(glyphRequestPlan(groups, tier, { limit })).then((ok) => {
      if (live) setState({ key, ready: true, failed: !ok })
    })
    return () => { live = false }
  }, [groups, tier, limit, plan, key])
  const settled = state.key === key
  return [settled && state.ready, settled && state.failed, () => setAttempt((n) => n + 1)]
}

function Glyph({ iconRef, color, stroke }) {
  const glyph = glyphFor(iconRef)
  const { name } = parseIconRef(iconRef)
  if (!glyph) return <span className="igp-wait" aria-hidden="true" />
  return (
    <img
      src={groupIconDataUri(glyph, { color, stroke })}
      width="24"
      height="24"
      alt={name}
      className={color ? '' : 'ig-inv'}
    />
  )
}

function GroupCard({ group, tier }) {
  const need = groupNeeds(group, tier)
  if (need) return <li><LockedIconGroupCard preview={{ id: group.id, label: group.label, slots: group.icons.length }} /></li>
  return (
    <li>
      <Link className="igp-card" to={groupRoute(group.id)} aria-label={`${group.label}, ${group.icons.length} icons`}>
        <span className="igp-card-preview" aria-hidden="true">
          {group.icons.slice(0, GROUP_PREVIEW_COUNT).map((ref) => <Glyph key={ref} iconRef={ref} stroke={DEFAULT_GROUP_STROKE} />)}
        </span>
        <span className="igp-card-foot">
          <span className="igp-card-name">{group.label}</span>
          <span className="igp-card-meta">{group.icons.length} icons · {packNames(group)}</span>
        </span>
      </Link>
    </li>
  )
}

function GroupIndex({ tier }) {
  const [, failed, retry] = useGroupGlyphs(PREMADE_ICON_GROUPS, tier, GROUP_PREVIEW_COUNT)
  return (
    <div className="igp-index">
      {failed && <Refused onRetry={retry} />}
      <ul className="igp-cards" aria-label="Icon groups">
        {PREMADE_ICON_GROUPS.map((g) => <GroupCard key={g.id} group={g} tier={tier} />)}
      </ul>
    </div>
  )
}

function Refused({ onRetry }) {
  return (
    <div className="ig-notice" role="status">
      <span>Couldn’t reach the icon service.</span>
      <button type="button" className="lib-btn ig-notice-btn" onClick={onRetry}>Try again</button>
    </div>
  )
}

function BackLink() {
  return (
    <Link className="igp-back" to={ICON_GROUPS_ROUTE}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      All groups
    </Link>
  )
}

function DownloadGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  )
}

// The project's palette, when the current project has one of its own.
function useProjectColours() {
  const { design } = useProject()
  return useMemo(() => {
    if (!design || !partsPresent(design).palette) return []
    return [...new Set((design.palette?.colors || []).map(normalizeHex).filter(Boolean))]
  }, [design])
}

function licencesText(group) {
  return groupPacks(group).map((p) => {
    const c = packCredit(p)
    return c ? `${c.name} — ${c.author} — ${c.licenceName} (${c.licenceUrl})\n${c.url}\n${c.licenceAsks}\n` : p
  }).join('\n')
}

function GroupView({ group, tier, onCopy }) {
  const { requireLogin } = useLoginPrompt()
  const requireExportAccount = useExportGate()
  const need = groupNeeds(group, tier)
  const projectColours = useProjectColours()
  const [color, setColor] = useState(() => projectColours[0] || '')
  const [stroke, setStroke] = useState(DEFAULT_GROUP_STROKE)
  const [busy, setBusy] = useState(false)
  const groups = useMemo(() => [group], [group])
  const [ready, failed, retry] = useGroupGlyphs(groups, tier, Infinity)
  const strokable = groupPacks(group).every((p) => p in GROUP_STYLE_PACKS)
  const names = useMemo(() => groupFileNames(group.icons), [group])

  const copyIcon = useCallback((ref) => {
    const glyph = glyphFor(ref)
    if (glyph) onCopy?.(groupIconSvg(glyph, { color, stroke }))
  }, [color, stroke, onCopy])

  const exportGroup = async () => {
    if (need || busy) return
    if (!(await requireExportAccount('export this icon group'))) return
    setBusy(true)
    try {
      if (group.icons.some((ref) => !glyphFor(ref))) {
        await loadGroupGlyphs(glyphRequestPlan([group], tier))
      }
      const entries = group.icons.map((ref) => ({ ref, glyph: glyphFor(ref) }))
      if (entries.some((e) => !e.glyph)) return
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      const dir = zip.folder(`${group.id}-icons`)
      entries.forEach((e, i) => dir.file(`svg/${names[i]}.svg`, groupIconSvg(e.glyph, { color, stroke })))
      dir.file(`${group.id}-sprite.svg`, groupSprite(entries, { color, stroke }))
      dir.file('LICENSES.txt', licencesText(group))
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${group.id}-icons.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setBusy(false)
    }
  }

  const head = (
    <div className="igp-head">
      <BackLink />
      <h2 className="igp-title">{group.label}</h2>
      <p className="igp-meta">{group.icons.length} icons · {packNames(group)}</p>
    </div>
  )

  if (need) {
    return (
      <div className="igp-view" data-group={group.id} data-locked="true">
        {head}
        {need === 'paid' ? (
          <LockedTeaseCta
            gate="icon-group-locked-view"
            heading={`${group.label} is Pro`}
            body={`${group.icons.length} icons from ${packNames(group)}.`}
            action="See what Pro includes"
          />
        ) : (
          <div className="lockt-cta">
            <div className="lockt-cta-copy">
              <p className="lockt-cta-head">{`${group.label} needs a free account`}</p>
              <p className="lockt-cta-body">{`${group.icons.length} icons from ${packNames(group)}.`}</p>
            </div>
            <button type="button" className="btn btn-accent lockt-cta-btn" onClick={() => requireLogin('open this icon group')}>Log in</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="igp-view" data-group={group.id}>
      {head}
      <div className="igp-toolbar" role="toolbar" aria-label="Group settings">
        <ColorPickerPop
          value={color || '#1a1a1a'}
          onChange={setColor}
          ariaLabel="Group colour"
          swatches={projectColours.length ? projectColours : undefined}
          swatchesLabel={projectColours.length ? 'Project colours' : undefined}
          triggerClassName="igp-colour"
          triggerChildren={(
            <>
              <span className={`igp-colour-chip${color ? '' : ' is-ink'}`} style={color ? { background: color } : undefined} aria-hidden="true" />
              <span className="igp-label">Colour</span>
            </>
          )}
        />
        {strokable && (
          <div className="igp-stroke" role="group" aria-label="Stroke weight">
            {GROUP_STROKES.map((w) => (
              <button
                key={w}
                type="button"
                className="igp-stroke-btn"
                aria-pressed={stroke === w}
                aria-label={`${w}px stroke`}
                onClick={() => setStroke(w)}
              >
                {w}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="lib-btn lib-btn--primary igp-export"
          onClick={exportGroup}
          disabled={busy || !ready}
          aria-label="Export group"
        >
          <DownloadGlyph />
          <span className="igp-label">Export group</span>
        </button>
      </div>

      {failed && <Refused onRetry={retry} />}

      <div className="ig igp-grid" aria-busy={!ready}>
        {group.icons.map((ref) => {
          const { name } = parseIconRef(ref)
          return (
            <button key={ref} type="button" className="ic" aria-label={`Copy ${name} SVG`} onClick={() => copyIcon(ref)}>
              <Glyph iconRef={ref} color={color} stroke={stroke} />
              <span>{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function IconGroups({ onCopy }) {
  const { isPro } = useSubscription()
  const { user, loading: authLoading } = useAuth()
  const tier = viewerTier({ user, isPro, resolving: authLoading })
  const [params] = useSearchParams()
  const group = groupById(params.get('group'))
  return (
    <div className="igp-page">
      {group
        ? <GroupView key={group.id} group={group} tier={tier} onCopy={onCopy} />
        : <GroupIndex tier={tier} />}
    </div>
  )
}
