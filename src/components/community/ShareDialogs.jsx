import { useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Dialog from '../overlay/Dialog'
import IconSubmissionPreview from '../discover/IconSubmissionPreview'
import { useProject } from '../../contexts/ProjectContext'
import { kitFromProject } from '../dashboard/kit'
import { COMMUNITY_CATEGORIES } from '../../data/communityDesigns'
import { ICON_ACCEPT_ATTR, ICON_ACCEPT_LABEL, ICON_MAX_LABEL, normaliseIconSvg } from '../../utils/iconSubmission'

const CATEGORIES = COMMUNITY_CATEGORIES.filter((c) => c !== 'All')
const NOTE = 'Submissions are saved to your account and queued for review, so they follow you across devices.'
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_MAX = 5 * 1024 * 1024
const NEUTRAL = ['#1A1A1A', '#E6E4DE']

const PICKS = [
  { id: 'project', title: 'A project', line: 'A kit or export you made here' },
  { id: 'link', title: 'A link', line: 'A site or design that lives somewhere else' },
  { id: 'icon', title: 'An icon', line: 'An SVG file you drew' },
]

const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
)

function Field({ id, label, error, hint, children }) {
  return (
    <div className="cm-field">
      <label className="cm-label" htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="cm-hint" id={`${id}-h`}>{hint}</p>}
      {error && <p className="cm-error" id={`${id}-e`}><ErrorIcon /><span>{error}</span></p>}
    </div>
  )
}

const focusFirst = (ids) => {
  const first = ids.find((id) => document.getElementById(id))
  if (first) document.getElementById(first).focus()
}

const normaliseUrl = (raw) => {
  const text = raw.trim()
  if (!text) return ''
  return /^https?:\/\//i.test(text) ? text : `https://${text}`
}
const urlOk = (url) => /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(url)

function Footer({ back, onBack, children }) {
  return (
    <div className="cm-dfoot">
      {back && <button type="button" className="cm-btn cm-btn-tonal" onClick={onBack}>{back}</button>}
      {children}
    </div>
  )
}

function PickStep({ hub, kind, setKind }) {
  return (
    <>
      <fieldset className="cm-picks">
        <legend className="cm-sr">What are you sharing?</legend>
        {PICKS.map((p) => (
          <label key={p.id} className="cm-pick" data-on={kind === p.id}>
            <input type="radio" name="cm-pick" value={p.id} checked={kind === p.id} onChange={() => setKind(p.id)} />
            <span className="cm-pick-t">{p.title}</span>
            <span className="cm-pick-l">{p.line}</span>
          </label>
        ))}
      </fieldset>
      <Footer>
        <button type="button" className="cm-btn cm-btn-ink" onClick={() => hub.setOpen(kind)}>Next</button>
      </Footer>
    </>
  )
}

function ProjectStep({ hub, onSent }) {
  const { projects = [], projectsLoading } = useProject() || {}
  const list = useMemo(() => projects.filter((p) => !p.archived).map((p) => {
    const set = kitFromProject(p).parts[0]
    return { id: p.id, name: p.name || 'Untitled project', colours: set.set ? set.stops.map((s) => s.c) : [] }
  }), [projects])
  const [chosen, setChosen] = useState(null)
  const [typed, setTitle] = useState(null)
  const [topic, setTopic] = useState(CATEGORIES[0])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const uid = useId().replace(/:/g, '')
  const current = list.find((p) => p.id === chosen) || list[0] || null
  const title = typed ?? (current ? current.name : '')

  const pick = (p) => { setChosen(p.id); setTitle(p.name) }

  const send = async () => {
    if (!current) return
    if (!title.trim()) { setError('Give your piece a title.'); focusFirst([`${uid}-t`]); return }
    setBusy(true)
    const colours = current.colours.length >= 2 ? current.colours : NEUTRAL
    const ok = await hub.submitDesign({
      name: title.trim(), author: hub.queueAuthorName(), category: topic, url: '#', c1: colours[0], c2: colours[1],
    })
    setBusy(false)
    if (ok) onSent('design')
    else hub.setOpen(null)
  }

  if (!projectsLoading && list.length === 0) {
    return (
      <>
        <p className="cm-note">You have no projects yet. Make a palette in the Palette Builder, then share it from here.</p>
        <Footer back="Back" onBack={() => hub.setOpen('pick')}>
          <Link to="/create/palette" className="cm-btn cm-btn-ink" onClick={() => hub.setOpen(null)}>Open the Palette Builder</Link>
        </Footer>
      </>
    )
  }
  return (
    <>
      <fieldset className="cm-projects">
        <legend className="cm-label">Project</legend>
        {list.map((p) => (
          <label key={p.id} className="cm-pick cm-pick-sm" data-on={current?.id === p.id}>
            <input type="radio" name="cm-project" checked={current?.id === p.id} onChange={() => pick(p)} />
            <span className="cm-pick-t">{p.name}</span>
          </label>
        ))}
      </fieldset>
      <div className="cm-preview" role="img" aria-label={current?.colours.length ? `Palette of ${current.name}` : 'This project has no palette yet'}>
        {current?.colours.length ? current.colours.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />) : <span className="cm-preview-empty">No palette set yet</span>}
      </div>
      <Field id={`${uid}-t`} label="Title" error={error}>
        <input id={`${uid}-t`} className="cm-input" value={title} maxLength={80} aria-invalid={!!error} aria-describedby={error ? `${uid}-t-e` : undefined}
          onChange={(e) => { setTitle(e.target.value); setError('') }} />
      </Field>
      <Field id={`${uid}-c`} label="Topic">
        <select id={`${uid}-c`} className="cm-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <p className="cm-note">{NOTE}</p>
      <Footer back="Back" onBack={() => hub.setOpen('pick')}>
        <button type="button" className="cm-btn cm-btn-ink" disabled={busy || !current} onClick={send}>{busy ? 'Sending…' : 'Share for review'}</button>
      </Footer>
    </>
  )
}

function LinkStep({ hub, onSent }) {
  const uid = useId().replace(/:/g, '')
  const [form, setForm] = useState({ name: '', author: '', url: '', category: CATEGORIES[0] })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((x) => ({ ...x, [key]: '' })) }

  const send = async () => {
    const url = normaliseUrl(form.url)
    const next = {}
    if (!form.name.trim()) next.name = 'Give your design a name.'
    if (url && !urlOk(url)) next.url = 'That URL doesn’t look right.'
    if (Object.keys(next).length) {
      setErrors(next)
      focusFirst([next.name && `${uid}-n`, next.url && `${uid}-u`].filter(Boolean))
      return
    }
    setBusy(true)
    const ok = await hub.submitDesign({
      name: form.name.trim(), author: form.author.trim() || hub.queueAuthorName(), category: form.category,
      url: url || '#', c1: NEUTRAL[0], c2: NEUTRAL[1],
    })
    setBusy(false)
    if (ok) onSent('design')
    else hub.setOpen(null)
  }

  return (
    <>
      <Field id={`${uid}-n`} label="Name" error={errors.name}>
        <input id={`${uid}-n`} className="cm-input" value={form.name} maxLength={80} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${uid}-n-e` : undefined} onChange={set('name')} />
      </Field>
      <Field id={`${uid}-u`} label="Link (optional)" error={errors.url}>
        <input id={`${uid}-u`} className="cm-input" value={form.url} inputMode="url" autoComplete="url" aria-invalid={!!errors.url} aria-describedby={errors.url ? `${uid}-u-e` : undefined} onChange={set('url')} />
      </Field>
      <div className="cm-two">
        <Field id={`${uid}-c`} label="Topic">
          <select id={`${uid}-c`} className="cm-input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field id={`${uid}-a`} label="Your name (optional)">
          <input id={`${uid}-a`} className="cm-input" value={form.author} maxLength={40} onChange={set('author')} />
        </Field>
      </div>
      <p className="cm-note">{NOTE}</p>
      <Footer back="Back" onBack={() => hub.setOpen('pick')}>
        <button type="button" className="cm-btn cm-btn-ink" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Submit design'}</button>
      </Footer>
    </>
  )
}

function IconStep({ hub, onSent }) {
  const uid = useId().replace(/:/g, '')
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [markup, setMarkup] = useState('')
  const [filename, setFilename] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  // Checked on every change, so the preview is the real artwork or the real reason there is none.
  const checked = markup.trim() ? normaliseIconSvg(markup) : null
  const preview = checked && !checked.error ? checked.svg : ''

  const readFile = (file) => {
    if (!file) return
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = () => { setMarkup(String(reader.result || '')); setErrors((x) => ({ ...x, svg: '' })) }
    reader.onerror = () => setErrors((x) => ({ ...x, svg: 'That file does not look like an SVG.' }))
    reader.readAsText(file)
  }

  const send = async () => {
    const next = {}
    if (!name.trim()) next.name = 'Give your icon a name.'
    const result = normaliseIconSvg(markup)
    if (result.error) next.svg = result.error
    if (Object.keys(next).length) {
      setErrors(next)
      focusFirst([next.name && `${uid}-n`, next.svg && `${uid}-s`].filter(Boolean))
      return
    }
    setBusy(true)
    const ok = await hub.submitIcon({ name: name.trim(), author: author.trim() || hub.queueAuthorName(), svg: result.svg })
    setBusy(false)
    if (ok) onSent('design')
    else hub.setOpen(null)
  }

  return (
    <>
      <Field id={`${uid}-n`} label="Name" error={errors.name}>
        <input id={`${uid}-n`} className="cm-input" value={name} maxLength={60} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${uid}-n-e` : undefined}
          onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: '' })) }} />
      </Field>
      <Field id={`${uid}-a`} label="Your name (optional)">
        <input id={`${uid}-a`} className="cm-input" value={author} maxLength={40} onChange={(e) => setAuthor(e.target.value)} />
      </Field>
      <Field id={`${uid}-s`} label="SVG" error={errors.svg || (checked && checked.error) || ''} hint={`${ICON_ACCEPT_LABEL} file · up to ${ICON_MAX_LABEL}`}>
        <div className="cm-file">
          <button type="button" className="cm-btn cm-btn-tonal" onClick={() => fileRef.current?.click()}>{filename ? 'Replace file' : 'Choose file'}</button>
          {filename && <span className="cm-file-name">{filename}</span>}
          <input ref={fileRef} type="file" accept={ICON_ACCEPT_ATTR} className="cm-sr" tabIndex={-1} aria-hidden="true" onChange={(e) => readFile(e.target.files?.[0])} />
        </div>
        <textarea id={`${uid}-s`} className="cm-input cm-area" rows={4} value={markup} spellCheck={false} placeholder="Or paste the SVG code" aria-invalid={!!(errors.svg || (checked && checked.error))}
          aria-describedby={errors.svg || (checked && checked.error) ? `${uid}-s-e` : `${uid}-s-h`} onChange={(e) => { setMarkup(e.target.value); setErrors((x) => ({ ...x, svg: '' })) }} />
      </Field>
      {preview && <div className="cm-icon-pv"><IconSubmissionPreview svg={preview} name={name || 'Your icon'} size={64} /></div>}
      <p className="cm-note">{NOTE}</p>
      <Footer back="Back" onBack={() => hub.setOpen('pick')}>
        <button type="button" className="cm-btn cm-btn-ink" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Submit icon'}</button>
      </Footer>
    </>
  )
}

const RULES = [
  'Allowed: images that show design decisions, such as screens, posters, packaging, signage, type and colour in the world, and your own photos.',
  'Credit: say whether you made it. For someone else’s work, name the maker and link to where you found it.',
  'Not allowed: someone else’s work without its maker and link, a real company’s logo shown as your own, a photo of an identifiable person without their consent, or anything covered by the report reasons.',
  'Files: JPG, PNG or WebP, up to 5 MB.',
]

function UploadStep({ hub, onSent }) {
  const uid = useId().replace(/:/g, '')
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [mine, setMine] = useState(true)
  const [by, setBy] = useState('')
  const [source, setSource] = useState('')
  const [rights, setRights] = useState(false)
  const [errors, setErrors] = useState({})
  const [rules, setRules] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef(null)

  const take = (picked) => {
    if (!picked) return
    if (!IMAGE_TYPES.includes(picked.type)) { setFile(null); setErrors((x) => ({ ...x, file: 'Choose a JPG, PNG or WebP image.' })); return }
    if (picked.size > IMAGE_MAX) {
      setFile(null)
      setErrors((x) => ({ ...x, file: `That file is ${(picked.size / 1048576).toFixed(1)} MB. Images can be up to 5 MB.` }))
      return
    }
    setFile(picked)
    setErrors((x) => ({ ...x, file: '' }))
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, '').slice(0, 80))
  }

  const send = () => {
    const next = {}
    if (!file) next.file = errors.file || 'Choose a JPG, PNG or WebP image.'
    if (!title.trim()) next.title = 'Give your image a title.'
    const link = normaliseUrl(source)
    if (!mine) {
      if (!by.trim()) next.by = 'Say who made it.'
      if (!link || !urlOk(link)) next.source = 'Add the link where you found it.'
    }
    if (!rights) next.rights = 'Tick the box to confirm you can share this.'
    if (Object.keys(next).length) {
      setErrors(next)
      focusFirst([next.file && `${uid}-f`, next.title && `${uid}-t`, next.by && `${uid}-b`, next.source && `${uid}-l`, next.rights && `${uid}-r`].filter(Boolean))
      return
    }
    hub.addUpload({ name: title.trim(), fileName: file.name, credit: mine ? 'own' : 'other', by: mine ? '' : by.trim(), source: mine ? '' : link })
    onSent('image')
  }

  return (
    <>
      <div className="cm-field">
        <div
          className="cm-drop"
          data-drag={drag}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]) }}
        >
          {file ? (
            <p className="cm-drop-file">{file.name} <span>· {(file.size / 1048576).toFixed(1)} MB</span></p>
          ) : (
            <p className="cm-drop-t">Drop an image, or choose a file</p>
          )}
          <button id={`${uid}-f`} type="button" className="cm-btn cm-btn-tonal" aria-describedby={errors.file ? `${uid}-f-e` : undefined} onClick={() => fileRef.current?.click()}>
            {file ? 'Replace image' : 'Choose image'}
          </button>
          <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="cm-sr" tabIndex={-1} aria-hidden="true" onChange={(e) => take(e.target.files?.[0])} />
        </div>
        {errors.file ? <p className="cm-error" id={`${uid}-f-e`}><ErrorIcon /><span>{errors.file}</span></p> : <p className="cm-hint">JPG, PNG or WebP · up to 5 MB</p>}
      </div>
      <Field id={`${uid}-t`} label="Title" error={errors.title}>
        <input id={`${uid}-t`} className="cm-input" value={title} maxLength={80} aria-invalid={!!errors.title} aria-describedby={errors.title ? `${uid}-t-e` : undefined}
          onChange={(e) => { setTitle(e.target.value); setErrors((x) => ({ ...x, title: '' })) }} />
      </Field>
      <fieldset className="cm-seg" aria-label="Who made it">
        <label data-on={mine}><input type="radio" name="cm-credit" checked={mine} onChange={() => setMine(true)} />I made this</label>
        <label data-on={!mine}><input type="radio" name="cm-credit" checked={!mine} onChange={() => setMine(false)} />Someone else made this</label>
      </fieldset>
      {!mine && (
        <div className="cm-two">
          <Field id={`${uid}-b`} label="Made by" error={errors.by}>
            <input id={`${uid}-b`} className="cm-input" value={by} maxLength={60} aria-invalid={!!errors.by} aria-describedby={errors.by ? `${uid}-b-e` : undefined}
              onChange={(e) => { setBy(e.target.value); setErrors((x) => ({ ...x, by: '' })) }} />
          </Field>
          <Field id={`${uid}-l`} label="Where you found it" error={errors.source}>
            <input id={`${uid}-l`} className="cm-input" value={source} inputMode="url" aria-invalid={!!errors.source} aria-describedby={errors.source ? `${uid}-l-e` : undefined}
              onChange={(e) => { setSource(e.target.value); setErrors((x) => ({ ...x, source: '' })) }} />
          </Field>
        </div>
      )}
      <div className="cm-field">
        <label className="cm-check">
          <input id={`${uid}-r`} type="checkbox" checked={rights} aria-invalid={!!errors.rights} aria-describedby={errors.rights ? `${uid}-r-e` : undefined}
            onChange={(e) => { setRights(e.target.checked); setErrors((x) => ({ ...x, rights: '' })) }} />
          I have the right to share this image
        </label>
        {errors.rights && <p className="cm-error" id={`${uid}-r-e`}><ErrorIcon /><span>{errors.rights}</span></p>}
      </div>
      <p className="cm-note">
        Image uploads are not open yet. Your image is checked here and kept in this tab only. It is never sent or stored.{' '}
        <button type="button" className="cm-link" aria-expanded={rules} onClick={() => setRules((v) => !v)}>What can I upload?</button>
      </p>
      {rules && <ul className="cm-rules">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>}
      <Footer>
        <button type="button" className="cm-btn cm-btn-tonal" onClick={() => hub.setOpen(null)}>Cancel</button>
        <button type="button" className="cm-btn cm-btn-ink" onClick={send}>Upload for review</button>
      </Footer>
    </>
  )
}

function SentStep({ hub, kind }) {
  const navigate = useNavigate()
  const image = kind === 'image'
  const toProfile = () => { hub.setOpen(null); navigate(`/u/${hub.ownHandle}#your-submissions`) }
  return (
    <>
      <p className="cm-note cm-note-lead">
        {image
          ? 'Image uploads are not open yet, so this one was checked and kept in this tab only. It shows in Your submissions as Not sent, and it is gone when you close the tab.'
          : 'It shows on your profile as Pending review. You can withdraw it at any time.'}
      </p>
      <Footer>
        <button type="button" className="cm-btn cm-btn-tonal" onClick={toProfile}>See your profile</button>
        <button type="button" className="cm-btn cm-btn-ink" onClick={() => hub.setOpen(null)}>Done</button>
      </Footer>
    </>
  )
}

const TITLES = {
  pick: 'Share your work', project: 'Share a project', link: 'Submit a design', icon: 'Submit an icon',
  upload: 'Upload inspiration',
}

/** Every dialog of the share flow, driven by hub.open. */
export default function ShareDialogs({ hub }) {
  const [kind, setKind] = useState('project')
  const [sent, setSent] = useState('design')
  const step = hub.open
  const onSent = (what) => { setSent(what); hub.setOpen('sent') }
  const close = () => hub.setOpen(null)
  const known = step && (step in TITLES || step === 'sent')
  return (
    <Dialog
      open={!!known}
      onClose={close}
      title={step === 'sent' ? (sent === 'image' ? 'Not sent yet' : 'Sent for review') : TITLES[step] || ''}
      size="m"
      showClose
      className={`cm-dialog${step === 'upload' ? ' cm-dialog-wide' : ''}`}
    >
      {step === 'pick' && <PickStep hub={hub} kind={kind} setKind={setKind} />}
      {step === 'project' && <ProjectStep hub={hub} onSent={onSent} />}
      {step === 'link' && <LinkStep hub={hub} onSent={onSent} />}
      {step === 'icon' && <IconStep hub={hub} onSent={onSent} />}
      {step === 'upload' && <UploadStep hub={hub} onSent={onSent} />}
      {step === 'sent' && <SentStep hub={hub} kind={sent} />}
    </Dialog>
  )
}
