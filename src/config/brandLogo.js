// THE UI L4B LOGO, as geometry. The one place the symbol and the wordmark are
// defined; the React component, the prerendered boot shells and the share-card
// generator all draw from these strings so none of them can drift.
//
// Every letter is a path, so the logo has no font dependency and renders the
// same on every machine. Coordinates are on the master's 200-unit-tall grid:
// the symbol is a golden-ratio pair of rounded shapes, the wordmark follows it
// at a gap of 76.39 units. Numbers are rounded to 2 decimals (0.005 units of
// error on a 200-unit grid is far below a device pixel at any size we draw).

/** Height of both the symbol and the lockup, in grid units. */
export const LOGO_HEIGHT = 200
/** Width of the symbol on its own. */
export const SYMBOL_WIDTH = 323.61
/** Width of symbol plus wordmark. */
export const LOCKUP_WIDTH = 1195.5

/** The two shapes of the symbol, origin top-left. */
export const SYMBOL_PATHS = Object.freeze([
  'M0 0H100V123.61A123.61 123.61 0 0 0 126.43 200H76.39A76.39 76.39 0 0 1 0 123.61Z',
  'M125 0H177.79A47.21 47.21 0 0 1 225 47.21V125H276.39A47.21 47.21 0 0 1 323.61 172.21V200H201.39A76.39 76.39 0 0 1 125 123.61Z',
])

/**
 * The five letters of the wordmark, each with its own offset on the lockup
 * grid. The glyphs are 190 units tall and sit 5 units down so their optical
 * centre lines up with the symbol. The 4 and the B have counters, so the group
 * is drawn with fill-rule evenodd.
 */
export const WORDMARK_LETTERS = Object.freeze([
  { x: 400, y: 5, d: 'M0 0H45V107A38 38 0 0 0 121 107V0H166V107A83 83 0 0 1 0 107Z' },
  { x: 580, y: 5, d: 'M0 0H45V190H0Z' },
  { x: 686, y: 5, d: 'M0 0H45V145H143V190H0Z' },
  { x: 841, y: 5, d: 'M101 0H153V109H171V151H153V190H108V151H0V105ZM108 49L55 109H108Z' },
  { x: 1026, y: 5, d: 'M0 0H107A47.5 47.5 0 0 1 107 95H122A47.5 47.5 0 0 1 122 190H0ZM45 40V65H100A12.5 12.5 0 0 0 100 40ZM45 125V150H110A12.5 12.5 0 0 0 110 125Z' },
])

const symbolMarkup = () => SYMBOL_PATHS.map((d) => `<path d="${d}"/>`).join('')

const wordmarkMarkup = () => `<g fill-rule="evenodd">${WORDMARK_LETTERS
  .map(({ x, y, d }) => `<path transform="translate(${x} ${y})" d="${d}"/>`).join('')}</g>`

/**
 * The logo as the inside of an <svg> (no wrapper), for server-side and build
 * scripts. `kind` is 'symbol' or 'lockup'.
 */
export function logoMarkup(kind = 'lockup') {
  return kind === 'symbol' ? symbolMarkup() : symbolMarkup() + wordmarkMarkup()
}

/** The viewBox for `kind`. */
export const logoViewBox = (kind = 'lockup') =>
  `0 0 ${kind === 'symbol' ? SYMBOL_WIDTH : LOCKUP_WIDTH} ${LOGO_HEIGHT}`

/**
 * A complete <svg> string for build scripts. Drawn in `currentColor` unless a
 * `colour` is given, which share-card generation needs because it renders in a
 * standalone document with no inherited colour. `attrs` is raw attribute text
 * (a class, a size) inserted after the viewBox.
 */
export function logoSvg({ kind = 'lockup', colour = 'currentColor', attrs = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logoViewBox(kind)}" fill="${colour}"${attrs ? ` ${attrs}` : ''}>${logoMarkup(kind)}</svg>`
}
