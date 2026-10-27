import {
  LOGO_HEIGHT, LOCKUP_WIDTH, SYMBOL_WIDTH, SYMBOL_PATHS, WORDMARK_LETTERS,
} from '../config/brandLogo'

// The UI L4B logo as inline SVG, drawn in currentColor so it follows the text
// colour of whatever it sits in — light theme, dark theme and forced colours
// need no second asset. Geometry lives in config/brandLogo.js.
//
// Size it from CSS: the box is `height: 1em` by default (`.brand-logo` in
// global.css), so a wrapper's font-size sets the logo's height, and the width
// follows from the viewBox. Passing `label` makes the SVG an image with that
// accessible name; without it the SVG is decorative and the surrounding link,
// button or heading must supply the name.
function Svg({ kind, width, className, label, children }) {
  const named = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <svg
      className={`brand-logo brand-logo--${kind}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${width} ${LOGO_HEIGHT}`}
      fill="currentColor"
      focusable="false"
      {...named}
    >
      {children}
    </svg>
  )
}

/** The symbol on its own. */
export function BrandSymbol({ className, label }) {
  return (
    <Svg kind="symbol" width={SYMBOL_WIDTH} className={className} label={label}>
      {SYMBOL_PATHS.map((d) => <path key={d} d={d} />)}
    </Svg>
  )
}

/** The symbol and the UI L4B wordmark. */
export function BrandLockup({ className, label }) {
  return (
    <Svg kind="lockup" width={LOCKUP_WIDTH} className={className} label={label}>
      {SYMBOL_PATHS.map((d) => <path key={d} d={d} />)}
      <g fillRule="evenodd">
        {WORDMARK_LETTERS.map(({ x, y, d }) => (
          <path key={x} transform={`translate(${x} ${y})`} d={d} />
        ))}
      </g>
    </Svg>
  )
}
