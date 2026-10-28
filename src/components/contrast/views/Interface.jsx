// Rostra, the Interface view of a Contrast Checker pair: a settings screen with
// a form, a week strip, a toggle, a select, a focused input, a checkbox and two
// buttons. Painted in exactly two colours (--pv-text and --pv-canvas), so the
// picture is what the pair does to a real screen.
//
// Pure: no state, no effects, no props. PairExample sorts the pieces into the
// three tests at runtime (data-size); this file only names the parts that are
// not text, as classes UI_PARTS lists. Two rules keep that sorting honest:
//   - a border or fill sits on a wrapper and the words in a span inside it, so
//     the part is measured as a UI part and the label as text;
//   - the focus ring is a 2px border on a wrapper (not an outline, which the
//     marking would override).
import { ACTIONS, BRAND, FORM, HEAD, NAV, WEEK } from './Interface.data.js'
import './Interface.css'

const NAV_ICONS = {
  roster: <g><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></g>,
  team: <g><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M18 14a5 5 0 0 1 3 5" /></g>,
  timesheets: <g><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></g>,
  settings: <g><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></g>,
  billing: <g><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10.5h18" /></g>,
}

// Line icons share one recipe: 1.5px stroke in the text colour, no fill.
const Icon = ({ size, className, children }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

export default function Interface() {
  return (
    <div className="ro">
      {/* 800px and up: the rail. Narrower: the top bar below it. */}
      <div className="ro-rail">
        <p className="ro-brand">{BRAND}</p>
        <ul className="ro-nav">
          {NAV.map((n) => (
            <li key={n.id} className={n.current ? 'ro-navitem is-on' : 'ro-navitem'}>
              {n.current && <i className="ro-navbar" />}
              <Icon size={20} className="ro-navico">{NAV_ICONS[n.id]}</Icon>
              <span>{n.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="ro-bar">
        <p className="ro-brand">{BRAND}</p>
        <Icon size={24} className="ro-menuico"><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
      </div>

      <div className="ro-main">
        <div className="ro-head">
          <p className="ro-title">{HEAD.title}</p>
          <p className="ro-meta">{HEAD.meta}</p>
        </div>

        <div className="ro-week">
          <p className="ro-weeklab">{WEEK.label}</p>
          <div className="ro-days">
            {WEEK.days.map((d) => (
              <div key={d.name} className="ro-day">
                <span className="ro-dayname">{d.name}</span>
                {d.shifts.map((s) => <span key={s} className="ro-shift"><span>{s}</span></span>)}
              </div>
            ))}
          </div>
        </div>

        <div className="ro-card">
          <div className="ro-col">
            <div className="ro-field">
              <div className="ro-fhead">
                <p className="ro-lab ro-lab--big">{FORM.reminders.label}</p>
                <span className="ro-toggle"><i className="ro-knob" /></span>
              </div>
              <p className="ro-help">{FORM.reminders.help}</p>
            </div>
            <div className="ro-field ro-field--lead">
              <p className="ro-lab">{FORM.lead.label}</p>
              <span className="ro-select">
                <span className="ro-selv">{FORM.lead.value}</span>
                <Icon size={16} className="ro-chev"><path d="M6 9l6 6 6-6" /></Icon>
              </span>
            </div>
          </div>
          <div className="ro-col">
            <div className="ro-field">
              <p className="ro-lab">{FORM.email.label}</p>
              <span className="ro-focus"><span className="ro-input"><span className="ro-inv">{FORM.email.value}</span></span></span>
              <p className="ro-help ro-help--small">{FORM.email.help}</p>
            </div>
            <div className="ro-checkrow">
              <span className="ro-check">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <p className="ro-lab">{FORM.digest}</p>
            </div>
          </div>
        </div>

        <div className="ro-foot">
          <span className="ro-btn ro-btn--outline"><span>{ACTIONS.cancel}</span></span>
          <span className="ro-btn ro-btn--fill"><span>{ACTIONS.save}</span></span>
        </div>
      </div>
    </div>
  )
}
