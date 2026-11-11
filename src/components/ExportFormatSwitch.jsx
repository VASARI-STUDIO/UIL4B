import useRovingRadio from '../hooks/useRovingRadio'

// The file-type switch inside a row's options: HTML, Markdown, PNG, JPEG for the
// style guide; CSS, JSON for the tokens. One stop in the Tab order (the checked
// pill); the arrow keys move and choose, Home and End jump, and the ends wrap,
// as a native radio group does.
//
// `options` is [{ id, label }]. Rendered as pills at 44px so the targets hold on
// a phone, and never wrapped: if the pills outgrow the row (a 320px screen) the
// row scrolls sideways and the chosen pill is brought into view.
export default function ExportFormatSwitch({ label, options, value, onChange }) {
  const { refs, onKeyDown } = useRovingRadio(options.length, (i) => onChange(options[i].id))

  return (
    <>
      {/* The caption is for the eye: on a phone the switch sits under every row,
          Pro ones included, and would otherwise read as part of them. The group
          keeps its own accessible name, which ends in the same words. */}
      <span className="exp-switch-label" aria-hidden="true">File type</span>
      <div className="exp-switch" role="radiogroup" aria-label={label}>
        {options.map((o, i) => {
          const checked = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={checked ? 'exp-pill is-active' : 'exp-pill'}
              ref={(el) => { refs.current[i] = el }}
              onClick={() => onChange(o.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
