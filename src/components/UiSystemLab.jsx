import { useState } from 'react'

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

function ScenePreview({ scene, scheme }) {
  return (
    <div className="uis-scene-preview" ref={schemeRef(scheme)} data-scene={scene.id}>
      <aside className="uis-scene-nav" aria-hidden="true">
        <span className="uis-scene-logo" />
        <span />
        <span />
        <span />
      </aside>
      <div className="uis-scene-main">
        <header>
          <div>
            <p>{scene.label}</p>
            <h3>{scene.title}</h3>
            <span>{scene.sub}</span>
          </div>
          <button type="button">Primary action</button>
        </header>
        <div className="uis-scene-stats">
          <article><span>Active</span><strong>24</strong></article>
          <article><span>Pending</span><strong>7</strong></article>
          <article><span>Complete</span><strong>81%</strong></article>
        </div>
        <article className="uis-scene-panel">
          <div><strong>System status</strong><span className="uis-scene-status"><i aria-hidden="true" /> On track</span></div>
          <p>Roles in this scene are connected directly to the generated semantic aliases.</p>
          <div className="uis-scene-lines" aria-hidden="true"><span /><span /><span /></div>
        </article>
      </div>
    </div>
  )
}

export default function UiSystemLab({ system, isPro, entitlementLoading, onGate }) {
  const [labMode, setLabMode] = useState('side')
  const [sceneId, setSceneId] = useState('workspace')
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
              aria-selected={scene.id === item.id}
              className={scene.id === item.id ? 'uis-scene-tab uis-scene-tab--on' : 'uis-scene-tab'}
              onClick={() => chooseScene(item.id)}
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
