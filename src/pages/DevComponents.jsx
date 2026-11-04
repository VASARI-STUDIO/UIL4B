import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
// The families this sheet shows: the export pills, the font tabs, the library
// tray (and its empty state and multi-select hint, which live in the tool shell)
// and the form-field rules each live in their own sheet, so they come in with
// this route's chunk and nowhere else.
import '../styles/deferred/overlay.css'
import '../styles/deferred/type.css'
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/auth.css'
import '../styles/pages/dev-components.css'
import LibrarySearch from '../components/library/LibrarySearch'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import { ToolbarModeContext } from '../components/library/toolbarMode'
import MenuSelect from '../components/tool/MenuSelect'
import ThemeChoice from '../components/ThemeChoice'
import ThemeCycle from '../components/nav/ThemeCycle'
import ExportFormatSwitch from '../components/ExportFormatSwitch'
import { FontDossierTabs } from '../components/FontDossier'
import Toast from '../components/Toast'
import { buildReportTarget, requestContentReport } from '../utils/contentReport'

// DEV AND TEST BUILDS ONLY (see DEV_SHEET in App.jsx). Every control below is the
// real component or the real shared class; nothing here is a copy of one. The
// one thing a stylesheet cannot be asked for is a pseudo-state, so hover and
// focus are shown with `.dcs-hover` / `.dcs-focus`, which repeat the source
// rule's declarations. tests/unit/dev-component-sheet-not-in-production.test.js
// fails when a repeat drifts from its source.

function Section({ id, title, children }) {
  return (
    <section className="dcs-section" id={id} aria-labelledby={`${id}-h`} data-dcs-section={id}>
      <h2 className="dcs-h2" id={`${id}-h`}>{title}</h2>
      {children}
    </section>
  )
}
function Family({ name, note, children }) {
  return (
    <div className="dcs-family" data-dcs-family={name}>
      <h3 className="dcs-h3">{name}</h3>
      {note && <p className="dcs-note">{note}</p>}
      <div className="dcs-grid">{children}</div>
    </div>
  )
}
function Cell({ state, wide, children }) {
  return (
    <figure className={`dcs-cell${wide ? ' dcs-wide' : ''}`} data-state={state}>
      <div className="dcs-stage">{children}</div>
      <figcaption>{state}</figcaption>
    </figure>
  )
}

const STATES = [
  ['default', {}],
  ['hover', { className: 'dcs-hover' }],
  ['focus-visible', { className: 'dcs-focus' }],
  ['disabled', { disabled: true }],
  ['loading', { disabled: true, 'aria-busy': true }],
]
const BUTTONS = [
  ['Default', 'btn'], ['Primary', 'btn btn-accent'], ['Inverse', 'btn btn-inverse'],
  ['Ghost', 'btn btn-ghost'], ['Small', 'btn btn-s'], ['Small primary', 'btn btn-s btn-accent'],
]
const PILLS = [
  ['Ink', 'ui-pill ui-pill-sm ui-pill-ink'], ['Outline', 'ui-pill ui-pill-sm ui-pill-out'],
  ['Accent', 'ui-pill ui-pill-sm ui-pill-accent'], ['Ghost', 'ui-pill ui-pill-sm ui-pill-ghost'],
]

function StateRow({ name, cls }) {
  return (
    <Family name={name}>
      {STATES.map(([state, extra]) => (
        <Cell key={state} state={state}>
          <button type="button" {...extra} className={`${cls}${extra.className ? ` ${extra.className}` : ''}`}>
            {state === 'loading' ? 'Saving…' : name}
          </button>
        </Cell>
      ))}
    </Family>
  )
}

const MOODS = [
  { id: 'all', label: 'All', count: 48 }, { id: 'warm', label: 'Warm', count: 12 },
  { id: 'cool', label: 'Cool', count: 14 }, { id: 'soft', label: 'Soft', count: 9 },
  { id: 'bold', label: 'Bold', count: 13 },
]
const FORMATS = [{ id: 'css', label: 'CSS' }, { id: 'json', label: 'JSON' }, { id: 'png', label: 'PNG' }]

function ButtonsAndFields() {
  const [query, setQuery] = useState('')
  const [val, setVal] = useState('Sunset')
  return (
    <Section id="buttons-fields" title="Buttons and fields">
      {BUTTONS.map(([name, cls]) => <StateRow key={name} name={`Button, ${name.toLowerCase()}`} cls={cls} />)}
      {PILLS.map(([name, cls]) => <StateRow key={name} name={`Pill, ${name.toLowerCase()}`} cls={cls} />)}
      <Family name="Text input" note="Global field default. It has no hover rule.">
        <Cell state="default"><input type="text" aria-label="Default" placeholder="Name" /></Cell>
        <Cell state="filled"><input type="text" aria-label="Filled" value={val} onChange={(e) => setVal(e.target.value)} /></Cell>
        <Cell state="focus-visible"><input type="text" aria-label="Focused" className="dcs-field-focus" defaultValue="Sunset" /></Cell>
        <Cell state="disabled"><input type="text" aria-label="Disabled" disabled defaultValue="Sunset" /></Cell>
      </Family>
      <Family name="Form field" note="Label, input and help line, as the sign-in form sets them.">
        {[['default', {}, 'Used on your receipts.'], ['focus-visible', { className: 'dcs-field-focus' }, 'Used on your receipts.'],
          ['disabled', { disabled: true }, 'Used on your receipts.'], ['invalid', { 'aria-invalid': 'true' }, 'Enter a valid email address.']].map(([state, extra, help]) => (
          <Cell key={state} state={state}>
            <div className="auth-form-root"><div className="auth-field">
              <label htmlFor={`dcs-f-${state}`}>Email</label>
              <input id={`dcs-f-${state}`} type="email" defaultValue={state === 'invalid' ? 'sam@' : ''} placeholder="you@example.com" {...extra} />
              <p className={`auth-help${state === 'invalid' ? ' auth-help--err' : ''}`}>{help}</p>
            </div></div>
          </Cell>
        ))}
      </Family>
      <Family name="Textarea">
        <Cell state="default"><textarea rows={3} aria-label="Default" placeholder="Notes" /></Cell>
        <Cell state="focus-visible"><textarea rows={3} aria-label="Focused" className="dcs-field-focus" defaultValue="Notes" /></Cell>
        <Cell state="disabled"><textarea rows={3} aria-label="Disabled" disabled defaultValue="Notes" /></Cell>
      </Family>
      <Family name="Select">
        <Cell state="default"><MenuSelect label="Pack" value="all" onChange={() => {}} options={[{ value: 'all', label: 'All packs' }, { value: 'line', label: 'Line' }]} /></Cell>
        <Cell state="disabled"><MenuSelect label="Pack" value="all" disabled onChange={() => {}} options={[{ value: 'all', label: 'All packs' }]} /></Cell>
        <Cell state="native"><select aria-label="Native select" defaultValue="a"><option value="a">Option A</option><option value="b">Option B</option></select></Cell>
      </Family>
      <div className="lib-surface">
        <Family name="Search" note="The library search field.">
          <Cell state="default"><LibrarySearch value="" onChange={() => {}} label="Search" placeholder="Search gradients" /></Cell>
          <Cell state="filled"><LibrarySearch value={query || 'Sunset'} onChange={setQuery} label="Search filled" /></Cell>
          <Cell state="focus-visible"><LibrarySearch value="Sunset" onChange={() => {}} label="Search focused" className="dcs-focus-within" /></Cell>
        </Family>
      </div>
    </Section>
  )
}

// Opens a real popover control once, and only when its stage is wholly on screen.
// Opened earlier it would be placed against an off-screen trigger (the popover
// flips and aligns by measuring where the trigger is) and moving focus into it
// would scroll the page to it. Wholly in view, both are already settled.
function useOpenWhenSeen(ref, selector) {
  useEffect(() => {
    const stage = ref.current
    if (!stage || typeof IntersectionObserver === 'undefined') return undefined
    const obs = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.intersectionRatio >= 0.99)) return
      obs.disconnect()
      const el = stage.querySelector(selector)
      if (el && el.getAttribute('aria-expanded') !== 'true') el.click()
    }, { threshold: 1 })
    obs.observe(stage)
    return () => obs.disconnect()
  }, [ref, selector])
}
const askMenu = (section) => window.dispatchEvent(new CustomEvent('uil4b:open-menu', { detail: { section }, cancelable: true }))

function MenusAndNav() {
  const [params] = useSearchParams()
  const [mood, setMood] = useState('warm')
  const stage = useRef(null)
  useOpenWhenSeen(stage, '.lbry-filtertrig')
  const first = params.get('menu')
  useEffect(() => {
    if (!['create', 'discover', 'learn'].includes(first)) return undefined
    const id = requestAnimationFrame(() => askMenu(first))
    return () => cancelAnimationFrame(id)
  }, [first])
  return (
    <Section id="menus-nav" title="Menus and nav">
      <Family name="Filter menu, open" note="The collapsed library filter with its list forced open.">
        <div className="dcs-menu-stage lib-surface" ref={stage} data-dcs-open-menu>
          <LibraryFilterGroup label="Filter by mood" triggerLabel="Mood" value={mood} onChange={setMood} options={MOODS} alwaysCollapsed />
        </div>
      </Family>
      <Family name="Theme controls" note="Both change the theme of this page.">
        <Cell state="cycle"><ThemeCycle /></Cell>
        <Cell state="choice" wide><ThemeChoice /></Cell>
      </Family>
      <Family name="PillNav, mega panel" note="The live header is the real PillNav. These ask it to open a panel (on a phone, the menu sheet). Add ?menu=create, discover or learn to open one on load.">
        {['create', 'discover', 'learn'].map((s) => (
          <Cell key={s} state={s}><button type="button" className="btn btn-s" data-open-menu={s} onClick={() => askMenu(s)}>Open {s} menu</button></Cell>
        ))}
      </Family>
    </Section>
  )
}

function Feedback({ toast }) {
  const [kind, setKind] = useState('all')
  const [multi, setMulti] = useState(['warm'])
  const [on, setOn] = useState(true)
  const [tab, setTab] = useState('about')
  const [fmt, setFmt] = useState('css')
  const [params] = useSearchParams()
  const wantModal = params.get('modal') === 'report'
  const openModal = () => requestContentReport(buildReportTarget({ kind: 'design', id: 'dev-sheet', name: 'Component sheet sample' }))
  useEffect(() => {
    if (!wantModal) return undefined
    const id = requestAnimationFrame(openModal)
    return () => cancelAnimationFrame(id)
  }, [wantModal])
  return (
    <Section id="feedback" title="Feedback">
      <Family name="Chips" note="The segmented tray, one choice and many. As on a phone toolbar, the tray never wraps: it scrolls sideways.">
        <ToolbarModeContext.Provider value="expand">
          <div className="lib-surface dcs-wide"><div className="lbry-toolbar-quick dcs-quick"><LibraryFilterGroup label="Filter by mood" value={kind} onChange={setKind} options={MOODS} /></div></div>
          <div className="lib-surface dcs-wide"><div className="lbry-toolbar-quick dcs-quick"><LibraryFilterGroup label="Filter by mood, several" value={multi} onChange={setMulti} options={MOODS} multiSelect hint="Shift-click to pick more than one" /></div></div>
        </ToolbarModeContext.Provider>
        <Cell state="badge"><span className="soon-badge">Soon</span></Cell>
      </Family>
      <Family name="Toggles">
        <Cell state="off"><button type="button" role="switch" aria-checked="false" aria-label="Off" className="toggle-switch" /></Cell>
        <Cell state={on ? 'on' : 'off, live'}><button type="button" role="switch" aria-checked={on} aria-label="Live" className={`toggle-switch${on ? ' on' : ''}`} onClick={() => setOn(!on)} /></Cell>
        <Cell state="segmented" wide><ThemeChoice /></Cell>
      </Family>
      <Family name="Tabs">
        <div className="dcs-wide"><FontDossierTabs value={tab} onChange={setTab} idBase="dcs-tabs" label="Sample tabs" /></div>
        <div className="dcs-wide"><ExportFormatSwitch label="Sample file type" options={FORMATS} value={fmt} onChange={setFmt} /></div>
      </Family>
      <Family name="Toasts" note="Shown in flow here. The app's own toast is fixed to the corner.">
        <div className="dcs-toasts">
          <Toast visible type="success" message="Palette copied." onDismiss={() => {}} />
          <Toast visible type="error" message="That file could not be read." onDismiss={() => {}} />
          <Toast visible type="info" message="Saved to this browser only." />
          <Toast visible type="warning" message="You are close to the free limit." action={{ label: 'Undo', onAction: () => {} }} onDismiss={() => {}} />
        </div>
        <Cell state="live"><button type="button" className="btn btn-s" onClick={() => toast?.('Copied to your clipboard.', 'success')}>Show a toast</button></Cell>
      </Family>
      <Family name="Modal" note="The report dialog, the app's real modal. Add ?modal=report to open it on load.">
        <Cell state="open"><button type="button" className="btn btn-s" data-open-modal onClick={openModal}>Open the dialog</button></Cell>
      </Family>
      <Family name="Empty and loading">
        <div className="lib-surface dcs-wide"><LibraryEmpty title="No gradients match" detail="Try a different search or clear the filters." onClear={() => {}} /></div>
        {/* The loader itself, not RouteLoading: that wraps it in `.page-loading`,
            which the test helpers wait to leave the document. */}
        <div className="dcs-wide dcs-loading" data-state="loading"><div className="fg-loader" /></div>
      </Family>
    </Section>
  )
}

export default function DevComponents({ toast }) {
  return (
    <div className="dcs" data-dev-sheet="components">
      <header className="dcs-head">
        <h1 className="dcs-h1">Component sheet</h1>
        <p className="dcs-lede">Dev and test builds only. Each control is the real component or shared class, shown in the states it can reach.</p>
        <nav className="dcs-jump" aria-label="Sections">
          <a href="#buttons-fields">Buttons and fields</a>
          <a href="#menus-nav">Menus and nav</a>
          <a href="#feedback">Feedback</a>
        </nav>
      </header>
      <ButtonsAndFields />
      <MenusAndNav />
      <Feedback toast={toast} />
    </div>
  )
}
