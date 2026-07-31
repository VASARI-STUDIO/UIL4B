import { useRef, useState } from 'react'

const SCENES = [
  { id: 'workspace', label: 'Product Workspace', title: 'Sprint overview', sub: '12 tasks are ready for review' },
  { id: 'settings', label: 'Settings Form', title: 'Workspace settings', sub: 'Manage identity and notifications' },
  { id: 'commerce', label: 'Commerce', title: 'Order summary', sub: 'Three items · Standard delivery' },
  { id: 'docs', label: 'Documentation', title: 'Getting started', sub: 'Install, configure and ship tokens' },
  { id: 'mobile', label: 'Mobile App', title: 'Today', sub: 'Your next three priorities' },
]

function schemeRef(scheme) {
  return element => {
    if (!element) return
    const roles = scheme.roles
    for (const [name, value] of Object.entries(roles)) {
      element.style.setProperty(`--uis-${name}`, value.hex)
    }
  }
}

function LabCanvas({ scheme }) {
  return (
    <div className="uis-lab-canvas" ref={schemeRef(scheme)} data-theme={scheme.theme}>
      <div className="uis-lab-bar">
        <span>Component canvas</span>
        <span>{scheme.theme}</span>
      </div>
      <div className="uis-lab-content">
        <section className="uis-lab-block">
          <h3>Button states</h3>
          <div className="uis-button-states">
            <button type="button" className="uis-demo-button">Default</button>
            <button type="button" className="uis-demo-button uis-demo-button--hover">Hover</button>
            <button type="button" className="uis-demo-button uis-demo-button--pressed" aria-pressed="true">Pressed</button>
            <button type="button" className="uis-demo-button uis-demo-button--focus">Focus</button>
            <button type="button" className="uis-demo-button" disabled>Disabled</button>
          </div>
        </section>

        <section className="uis-lab-block">
          <h3>Status alerts</h3>
          <div className="uis-alert-list">
            <div className="uis-alert uis-alert--success"><span aria-hidden="true">✓</span><span><strong>Saved</strong> Your changes are live.</span></div>
            <div className="uis-alert uis-alert--warning"><span aria-hidden="true">!</span><span><strong>Review</strong> Two fields need attention.</span></div>
            <div className="uis-alert uis-alert--error"><span aria-hidden="true">×</span><span><strong>Couldn’t publish</strong> Check the marked fields.</span></div>
            <div className="uis-alert uis-alert--information"><span aria-hidden="true">i</span><span><strong>New version</strong> Tokens were regenerated.</span></div>
          </div>
        </section>

        <section className="uis-lab-block">
          <h3>Forms and surfaces</h3>
          <div className="uis-form-grid">
            <label>
              <span>Default field</span>
              <input type="text" value="Design system" readOnly />
            </label>
            <label>
              <span>Focused field</span>
              <input className="uis-input--focus" type="text" value="Primary action" readOnly />
            </label>
            <label>
              <span>Invalid field</span>
              <input className="uis-input--invalid" type="text" value="Missing value" aria-invalid="true" readOnly />
              <small><span aria-hidden="true">!</span> Add a valid token name.</small>
            </label>
            <article className="uis-demo-card">
              <span className="uis-demo-card-kicker">Surface raised</span>
              <strong>System card</strong>
              <p>Primary text, secondary text, canvas and border tokens working together.</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}

function WorkspaceScene() {
  return (
    <div className="uis-workspace-scene">
      <aside><strong>Northstar</strong><span>Overview</span><span>Projects</span><span>Team</span></aside>
      <main>
        <header><div><small>Product workspace</small><h3>Sprint overview</h3><p>12 tasks are ready for review</p></div><button type="button">New task</button></header>
        <div className="uis-workspace-progress"><span>Launch readiness</span><strong>81%</strong><i><b /></i></div>
        <div className="uis-kanban">
          <section><h4>To do <span>3</span></h4><article><strong>Audit empty states</strong><small>Design system</small></article><article><strong>Write release notes</strong><small>Content</small></article></section>
          <section><h4>In progress <span>2</span></h4><article><strong>Token migration</strong><small>Frontend</small></article><article><strong>Mobile QA</strong><small>Engineering</small></article></section>
          <section><h4>Review <span>4</span></h4><article><strong>Checkout states</strong><small>Product</small></article><article><strong>Contrast pass</strong><small>Accessibility</small></article></section>
        </div>
      </main>
    </div>
  )
}

function SettingsScene() {
  return (
    <div className="uis-settings-scene">
      <aside><strong>Settings</strong><button type="button" className="is-active">Workspace</button><button type="button">Members</button><button type="button">Notifications</button></aside>
      <main>
        <header><small>Settings form</small><h3>Workspace settings</h3><p>Manage identity and notifications</p></header>
        <form>
          <label>Workspace name<input value="Northstar Studio" readOnly /></label>
          <label>Workspace URL<span className="uis-prefix-field"><i>uil4b.com/</i><input value="northstar" readOnly /></span></label>
          <fieldset><legend>Email notifications</legend><label className="uis-switch-row"><span><strong>Weekly summary</strong><small>Project activity every Monday</small></span><input type="checkbox" defaultChecked /></label></fieldset>
          <div><button type="button" className="uis-secondary-action">Cancel</button><button type="button">Save changes</button></div>
        </form>
      </main>
    </div>
  )
}

function CommerceScene() {
  return (
    <div className="uis-commerce-scene">
      <header><strong>Field Supply</strong><span>Secure checkout</span></header>
      <div className="uis-checkout-grid">
        <main>
          <small>Commerce</small><h3>Payment details</h3>
          <label>Card number<input value="4242 4242 4242 4242" readOnly /></label>
          <div><label>Expiry<input value="10 / 29" readOnly /></label><label>CVC<input value="•••" readOnly /></label></div>
          <label className="uis-payment-choice"><input type="radio" defaultChecked /><span><strong>Standard delivery</strong><small>Arrives 4–6 August</small></span><b>$8.00</b></label>
        </main>
        <aside>
          <small>Order summary</small><h3>Three items</h3>
          <article><i /><span><strong>Canvas field bag</strong><small>Sand · One size</small></span><b>$84</b></article>
          <article><i /><span><strong>Studio notebook</strong><small>Grid · A5</small></span><b>$18</b></article>
          <dl><div><dt>Subtotal</dt><dd>$102.00</dd></div><div><dt>Delivery</dt><dd>$8.00</dd></div><div><dt>Total</dt><dd>$110.00</dd></div></dl>
          <button type="button">Pay $110.00</button>
        </aside>
      </div>
    </div>
  )
}

function DocsScene() {
  return (
    <div className="uis-docs-scene">
      <header><strong>UIL4B Docs</strong><label>Search documentation <input placeholder="Search docs…" readOnly /></label><span>v2.7</span></header>
      <div>
        <nav><strong>Foundations</strong><a className="is-active">Getting started</a><a>Colour tokens</a><a>Typography</a><strong>Components</strong><a>Buttons</a><a>Forms</a></nav>
        <main>
          <small>Documentation</small><h3>Getting started</h3><p>Install, configure and ship a complete token system in a few deliberate steps.</p>
          <h4>Install the package</h4><pre><code>npm install @uil4b/tokens</code><button type="button">Copy</button></pre>
          <h4>Apply semantic roles</h4><p>Import the generated light and dark aliases, then map components to roles instead of raw scale values.</p>
          <aside><strong>Good to know</strong><span>Every paired foreground in this export has measured contrast evidence.</span></aside>
        </main>
        <aside><small>On this page</small><a>Install</a><a>Configure</a><a>Semantic roles</a></aside>
      </div>
    </div>
  )
}

function MobileScene() {
  return (
    <div className="uis-mobile-stage">
      <div className="uis-mobile-phone">
        <header><span>9:41</span><i>•••</i></header>
        <main>
          <div><small>Friday, 31 July</small><h3>Good morning, Maya</h3><p>Your next three priorities</p></div>
          <article className="uis-mobile-focus"><small>Up next · 10:30</small><strong>Design review</strong><span>Checkout and account states</span><button type="button">Join review</button></article>
          <section><h4>Today <span>3 tasks</span></h4><label><input type="checkbox" defaultChecked /><span><strong>Send token handoff</strong><small>Completed</small></span></label><label><input type="checkbox" /><span><strong>Review mobile QA</strong><small>Product workspace</small></span></label></section>
        </main>
        <nav aria-label="Mobile preview navigation"><button type="button" className="is-active">Today</button><button type="button">Tasks</button><button type="button">Profile</button></nav>
      </div>
    </div>
  )
}

function ScenePreview({ scene, scheme }) {
  const content = {
    workspace: <WorkspaceScene />,
    settings: <SettingsScene />,
    commerce: <CommerceScene />,
    docs: <DocsScene />,
    mobile: <MobileScene />,
  }[scene.id]
  return (
    <div
      id="uis-scene-panel"
      role="tabpanel"
      aria-labelledby={`uis-scene-tab-${scene.id}`}
      tabIndex="0"
      className="uis-scene-preview"
      ref={schemeRef(scheme)}
      data-scene={scene.id}
    >
      {content}
    </div>
  )
}

export default function UiSystemLab({ system, isPro, entitlementLoading, onGate }) {
  const [labMode, setLabMode] = useState('side')
  const [sceneId, setSceneId] = useState('workspace')
  const [sceneTabStop, setSceneTabStop] = useState('workspace')
  const sceneTabRefs = useRef(new Map())
  const scene = SCENES.find(item => item.id === sceneId) || SCENES[0]

  const chooseScene = id => {
    if (entitlementLoading) {
      onGate('loading')
      return
    }
    if (!isPro) {
      onGate('scenes')
      return
    }
    setSceneId(id)
  }

  const moveSceneTab = (event, currentIndex) => {
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % SCENES.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + SCENES.length) % SCENES.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = SCENES.length - 1
    if (nextIndex == null) return
    event.preventDefault()
    const nextId = SCENES[nextIndex].id
    setSceneTabStop(nextId)
    sceneTabRefs.current.get(nextId)?.focus()
  }

  return (
    <>
      <section className="uis-section" aria-labelledby="uis-roles-title">
        <div className="uis-section-head">
          <div>
            <p className="uis-kicker">Semantic aliases</p>
            <h2 id="uis-roles-title">Deterministic light and dark role maps</h2>
          </div>
          <p>The source column states the actual shade selected. Paired foreground ratios are measured, not assumed.</p>
        </div>
        <div className="uis-role-maps">
          {['light', 'dark'].map(theme => {
            const scheme = system.schemes[theme]
            return (
              <article className="uis-role-map" key={theme}>
                <h3>{theme === 'light' ? 'Light interface' : 'Dark interface'}</h3>
                <dl>
                  {Object.entries(scheme.roles).map(([name, value]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd><span className="uis-role-dot" ref={schemeRef({ roles: { role: value } })} aria-hidden="true" />{value.source} · {value.hex}</dd>
                    </div>
                  ))}
                </dl>
                <div className="uis-role-pairs">
                  {scheme.pairs.map(pair => (
                    <p key={pair.name}>
                      <span aria-hidden="true">{pair.ratio >= 4.5 ? '✓' : '×'}</span>
                      {pair.name} / on-{pair.name}: {pair.ratio.toFixed(2)}:1
                    </p>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="uis-section" aria-labelledby="uis-lab-title">
        <div className="uis-section-head">
          <div>
            <p className="uis-kicker">Component Lab</p>
            <h2 id="uis-lab-title">Test the system on interface states</h2>
          </div>
          <div className="uis-segmented" role="group" aria-label="Component Lab theme">
            {[
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['side', 'Side-by-side'],
            ].map(([id, label]) => (
              <button
                type="button"
                className={labMode === id ? 'uis-segmented-on' : ''}
                aria-pressed={labMode === id}
                onClick={() => setLabMode(id)}
                key={id}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={labMode === 'side' ? 'uis-lab uis-lab--side' : 'uis-lab'}>
          {(labMode === 'light' || labMode === 'side') && <LabCanvas scheme={system.schemes.light} />}
          {(labMode === 'dark' || labMode === 'side') && <LabCanvas scheme={system.schemes.dark} />}
        </div>
      </section>

      <section className="uis-section uis-scenes" aria-labelledby="uis-scenes-title">
        <div className="uis-section-head">
          <div>
            <p className="uis-kicker">Applied previews <span className="uis-pro-label">Pro</span></p>
            <h2 id="uis-scenes-title">Five product scenes</h2>
          </div>
          <p>One intact preview at a time, using the same roles shown above. Scene selection is a Pro action.</p>
        </div>
        <div className="uis-scene-tabs" role="tablist" aria-label="Pro UI scenes">
          {SCENES.map(item => (
            <button
              type="button"
              role="tab"
              id={`uis-scene-tab-${item.id}`}
              aria-controls="uis-scene-panel"
              aria-selected={scene.id === item.id}
              tabIndex={sceneTabStop === item.id ? 0 : -1}
              className={scene.id === item.id ? 'uis-scene-tab uis-scene-tab--on' : 'uis-scene-tab'}
              ref={element => {
                if (element) sceneTabRefs.current.set(item.id, element)
                else sceneTabRefs.current.delete(item.id)
              }}
              onFocus={() => setSceneTabStop(item.id)}
              onKeyDown={event => moveSceneTab(event, SCENES.indexOf(item))}
              onClick={() => {
                setSceneTabStop(item.id)
                chooseScene(item.id)
              }}
              key={item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ScenePreview scene={scene} scheme={system.schemes.light} />
      </section>
    </>
  )
}
