import {
  ADDED, ALT_KEYS, ALT_TEXT, ALT_WORDS, ALL_TILES, BIKE, DISPLAY_TILES, EASE, FIELD_KEYS, FONTS, GRID, NAMES, PALS,
  PICK, PK_FROM, PK_HUE, PK_TO, RATIOS, RESULTS, ROLES, SEARCH_KEYS, TONES,
  fgFor, hsvHex, lerp3, tone,
} from './loopData'

// WHAT EACH PANEL DRAWS AT A BEAT.
//
// deriveVals turns the loop's state (useLoop) into the plain values the JSX
// binds: colours, opacities, transforms and transitions. It holds no markup and
// no pixel positions; a size passes its own measurements as `geo`:
//
//   picker    { box, padAt, hueAt }  the colour popover's top-left and thumb positions
//   next      [x, y]                 centre of the Next button, where the cursor presses it
//   tileW     width the font tiles' names may take, for sizing them
//   icons     { count, shown, browse, perRow }  grid cells, how many a search keeps, how many
//             the browse grid shows, and cells per row
//   rows      (i, styleGuide) => [x, y]  an export row's offset
//   bars      { base, size, stroke }  widths of the three slider tracks

const INK = '#EFEEEA'
const dim = (a) => `rgba(239,238,234,${a})`
const segment = (n, on) => ({ n, bg: on ? INK : 'transparent', c: on ? '#0B0C0E' : dim('.72'), border: dim('.12'), sc: 1 })

/** Offsets for a single column of export rows, the Pro run set apart by a gap. */
export const stackedRows = ({ row, gap, run, shift }) => (i, sg) => [0, i * (row + gap) + (i >= 3 ? run : 0) + (sg && i >= 2 ? shift : 0)]

/** Offsets for two columns of three: the free rows left, the Pro rows right. */
export const splitRows = ({ row, shift, x }) => (i, sg) => {
  const col = i >= 3 ? 1 : 0
  const r = i % 3
  return [col ? x : 0, r * row + (!col && sg && r >= 2 ? shift : 0)]
}

// The six exports, with the export dialog's names. A row is Pro when its files are.
const FORMATS = [['UI kit', ''], ['Style guide', ''], ['Code', ''], ['Book', 'Pro'], ['Slides', 'Pro'], ['App-ready', 'Pro']]
const TOOLS = [[0, 'Palette'], [1, 'Font Pair'], [2, 'Type Scale'], [3, 'Icon Library'], [4, 'Export'], [6, 'Alt Text']]
const LADDER = [['--text-4xl', 6], ['--text-3xl', 5], ['--text-2xl', 4], ['--text-xl', 3], ['--text-lg', 2], ['--text-base', 0]]
const CHIPS = ['All', 'Sans', 'Serif', 'Display', 'Script', 'Mono']

export function deriveVals(loop, model, geo) {
  const { TL, IDX, DUR, travel, moveMs, FIRST, chapters: CHAPTERS } = model
  const { k, playing, done, cut, say, reduced, rewound, scene: s, beat, cx, cy, press, fresh, P, at, pressed } = loop
  const { picker, tileW, icons: iconGeo, bars } = geo

  // Palette-scene state, which the closing beat resets.
  const P0 = (name) => !rewound && P(name)
  const hd = press === 0 && travel(k) >= 8 ? `${Math.max(0, moveMs(k) - 120)}ms` : '0ms'

  // Palette
  const pal = P0('pR2') ? PALS[2] : P0('pR1') ? PALS[1] : PALS[0]
  const added = P0('pAdd')
  const locked = P0('pLock')
  const tintsOpen = s === 0 && P0('pStrip')
  const lockHover = P0('goLock') && !P0('pLock')
  const columns = [...pal, ADDED].map((c, i) => {
    const on = i < 3 || added
    const fg = fgFor(c)
    const r = [30, 45, 60, 75, 90].map((l) => tone(c, l))
    const isLock = i === 0
    const delay = isLock && locked ? 0 : i * 80
    const opDelay = on && i === 3 ? '250ms' : '0ms'
    return {
      bg: c, fg, hex: c, role: (pal === PALS[2] && NAMES[c]) || ROLES[i], grow: on ? 1 : 0, op: on ? 1 : 0,
      ty: '0%', delay: `${delay}ms`,
      r0: r[0], r1: r[1], r2: r[2], r3: r[3], r4: r[4],
      lockOp: isLock && (locked || lockHover) ? 1 : 0, lockBg: fg === '#1A1A1A' ? 'rgba(26,26,26,.1)' : 'rgba(255,255,255,.16)',
      lockScale: pressed('pLock') && isLock ? 0.97 : 1, openOp: isLock && locked ? 0 : 1, shutOp: isLock && locked ? 1 : 0,
      stripRing: i === 0 && P0('goStrip') && s === 0 ? `0 0 0 2px ${fg}` : 'none', stripScale: i === 0 && pressed('pStrip') ? 0.97 : 1,
      tr: `background 600ms ${EASE} ${delay}ms, color 600ms ease ${delay}ms, opacity 400ms ease ${opDelay}`,
      growTr: `flex-grow 500ms ${EASE}`,
    }
  })
  const tints = TONES.map((t, i) => ({ tone: `T${t}`, c: tone(pal[0], t), hl: s === 0 && at('h5') && i === 2 ? dim('.1') : 'transparent' }))

  // Font pair
  const headName = P('pFr') ? 'Archivo' : 'Bricolage Grotesque'
  const [headFont, headWeight, headMeta] = FONTS[headName]
  const dlg = P('pHead') && !P('pFr')
  const disp = P('pDisp')
  const hoverTile = at('goFr', 'pFr') ? 0 : -1
  const tiles = (disp ? DISPLAY_TILES : ALL_TILES).map((n, i) => ({
    name: n, font: FONTS[n][0], w: FONTS[n][1], meta: FONTS[n][2], size: Math.min(30, Math.floor(tileW / (n.length * 0.62))),
    op: 1, delay: `${i * 40}ms`,
    bg: i === hoverTile ? dim('.08') : 'transparent', border: i === hoverTile ? dim('.4') : dim('.12'),
    sc: pressed('pFr') && i === 0 ? 0.97 : 1,
  }))
  const chips = CHIPS.map((n, i) => {
    const on = disp ? i === 3 : i === 0
    return { n, bg: on ? INK : 'transparent', c: on ? '#0B0C0E' : dim('.72'), sc: pressed('pDisp') && i === 3 ? 0.97 : 1 }
  })
  const textAt = (prefix, keys) => keys.reduce((t, [txt], i) => (P(prefix + i) ? txt : t), '')
  const typed = s === 1 ? textAt('k', FIELD_KEYS) : ''
  const focused = s === 1 && P('pField')

  // Type scale
  const ratio = P('pPick') ? 1.618 : 1.25
  const base = P('drag') ? 15 : 17
  const menuOpen = P('pDrop') && !P('pPick')
  const hoverRatio = at('hov3', 'pPick') ? 5 : -1
  const step = (n) => Math.round(base * Math.pow(ratio, n))
  const h1Px = step(3)
  const dragMs = at('drag') ? DUR[IDX.drag] : 200

  // Icons
  const filtered = P('q')
  const searchTyped = textAt('s', SEARCH_KEYS)
  const searching = P('pSearch') && !P('pCup')
  const flipped = P('pFlip')
  const picked = P('pCup')
  const stepOf = (prefix, n, a, b) => {
    for (let i = n - 1; i >= 0; i--) if (P(prefix + i)) return lerp3(a, b, (i + 1) / n)
    return a
  }
  const pk = !P('dh0') ? PK_FROM : !P('dp0') ? stepOf('dh', 2, PK_FROM, PK_HUE) : stepOf('dp', 3, PK_HUE, PK_TO)
  const pkHex = P('dh0') ? hsvHex(pk) : INK
  const dragStep = /^d[ph](\d)$/.exec(beat)
  const dragN = dragStep ? (beat[1] === 'p' ? 3 : 2) : 0
  const dEase = !dragStep ? 'cubic-bezier(.45,.05,.2,1)'
    : +dragStep[1] === 0 ? 'cubic-bezier(.5,0,1,1)'
      : +dragStep[1] === dragN - 1 ? 'cubic-bezier(0,0,.3,1)' : 'linear'
  const stroke = 1.5
  // A result paints as its pack draws it, stroked or filled; the browse grid before the search is stroked.
  const glyph = (r) => (r ? { d: r[0], vb: r[1], fill: r[2] === 'fill' ? INK : 'none', stroke: r[2] === 'fill' ? 'none' : INK, sw: r[3] || 0, fr: r[4] } : null)
  const icons = Array.from({ length: iconGeo.count }, (_, i) => {
    const hidden = filtered ? i >= iconGeo.shown : i >= iconGeo.browse
    return {
      d: GRID[i], vb: '0 0 24 24', fill: 'none', stroke: INK, sw: 1.5, fr: 'nonzero',
      ...glyph(filtered && RESULTS[i]), op: hidden ? 0 : 1, sc: filtered && hidden ? 0.92 : 1,
      delay: filtered ? `${Math.min(i, 12) * 15}ms` : `${Math.floor(i / iconGeo.perRow) * 40 + (i % iconGeo.perRow) * 15}ms`,
      border: picked && i === PICK ? INK : dim('.1'), bg: at('goCup') && i === PICK ? dim('.06') : 'transparent',
    }
  })

  // Export
  const sg = P('pSG')
  const formats = FORMATS.map(([n, tier], i) => {
    const on = i === (sg ? 1 : 0)
    const [x, y] = geo.rows(i, sg)
    return {
      n, tier, x, y, on: on ? 1 : 0, dot: on ? INK : dim('.4'), bg: on ? dim('.08') : 'transparent',
      c: tier === 'Pro' ? dim('.72') : INK, tierBg: tier ? dim('.1') : 'transparent', sc: pressed('pSG') && i === 1 ? 0.97 : 1,
    }
  })
  // Export keeps its finished frame through the closing rewind, so nothing in it snaps back while it fades out.
  const exporting = at('prog')
  const exported = P('done')
  const opened = P('pOpen')

  // Chapter strip: past chapters sit dim and full, the current one fills as it plays, the rest are empty.
  const strip = CHAPTERS.map((c, i) => {
    const { cur, fill, ms } = loop.chapterFill(i)
    return {
      i, n: c.name, cur: cur ? 'true' : 'false', aria: `${c.name}, chapter ${i + 1} of ${CHAPTERS.length}`,
      c: cur ? INK : dim('.62'), fill: (loop.armed || done ? fill : 0).toFixed(3), fillBg: cur ? INK : dim('.4'),
      tr: ms ? `transform ${ms}ms linear` : 'none',
    }
  })
  const nxt = loop.nextInfo
  const nextName = nxt ? nxt.name : null
  const onNext = cx === geo.next[0] && cy === geo.next[1] && !done
  // The closing rewind dips through the panel's ground: Export fades out, then the opening Palette fades in.
  const sceneTr = (n) => (rewound ? (n === 0 ? `opacity 260ms ${EASE} 300ms` : 'opacity 240ms ease-out') : s === n ? `opacity 220ms ${EASE} 100ms` : 'opacity 90ms ease-out')
  const layer = (n) => (s === n ? 1 : 0)
  const padPos = picker.padAt(pk)
  const huePos = picker.hueAt(pk)
  const sliderX = (v, min, span, w) => (v - min) / span * w

  return {
    rootClass: fresh ? 'lp-cut' : '', say,
    nextLabel: nextName ? `Next: ${nextName}` : 'Next section',
    nextAria: nextName ? `Next: ${nextName}${FIRST.includes(nxt.k) ? ' chapter' : ''}` : 'Next section of the page',
    nextD: nextName ? 'M5 12h14M13 6l6 6-6 6' : 'M12 5v14M6 13l6 6 6-6', nextDirCls: nextName ? '' : 'mi-nx--d',
    nextSim: onNext ? (press === 1 ? 'press' : 'hover') : '', nextHd: onNext && press === 0 ? hd : '0ms',
    chapters: strip,
    toolLabels: TOOLS.map(([n, name]) => ({ name, op: layer(n), tr: sceneTr(n), hid: s === n ? 'false' : 'true' })),
    // Past Palette the dot is the kit's primary, Signal. At the seam the bar changes with the scene, not before it.
    toolDot: s === 0 ? pal[0] : '#FF5A1F', dotDelay: rewound ? '300ms' : '0ms', actionDelay: rewound ? '300ms' : '0ms',
    actionName: s === 1 ? 'Shuffle' : 'Randomise', actionOp: s === 0 || s === 1 ? 1 : 0, kbdOp: s === 0 ? 1 : 0,
    actionBg: press === 1 && cy < 60 && cx < 360 ? dim('.14') : 'transparent',
    actionScale: press === 1 && cy < 60 && cx < 360 ? 0.97 : 1,
    exportBg: pressed('pExp') ? dim('.14') : 'transparent', exportScale: pressed('pExp') ? 0.97 : 1,
    // Hidden until the last tool is done.
    exportOp: !rewound && P('h6c') ? 1 : 0,

    tr0: sceneTr(0), tr1: sceneTr(1), tr2: sceneTr(2), tr3: sceneTr(3), tr4: sceneTr(4), tr6: sceneTr(6),
    kitTr: sg ? 'opacity 90ms ease-out' : `opacity 220ms ${EASE} 100ms`, sgTr: sg ? `opacity 220ms ${EASE} 100ms` : 'opacity 90ms ease-out',
    op0: layer(0), op4: layer(4), columns, addBg: pressed('pAdd') ? dim('.08') : 'transparent', addScale: pressed('pAdd') ? 0.97 : 1,
    tintOp: tintsOpen ? 1 : 0, tintScale: tintsOpen ? 1 : 0.96, tintBase: pal[0], tints,

    op1: layer(1),
    headFont, headWeight, headName, headMeta,
    headBorder: at('goHead', 'pHead') ? dim('.5') : dim('.16'), headScale: pressed('pHead') ? 0.97 : 1,
    specimen: typed || 'Typography that carries the whole page',
    fieldText: typed || (focused ? '' : 'Your own words…'), fieldC: typed ? INK : dim('.6'),
    fieldBorder: focused ? INK : dim('.16'), caretOp: focused ? 1 : 0, caretClass: focused && !/^k\d/.test(beat) ? 'blink' : '',
    dlgScrim: dlg ? 0.6 : 0, dlgOp: dlg ? 1 : 0, dlgScale: dlg ? 1 : 0.96, chips, tiles,

    op2: layer(2),
    ratioLabel: `${RATIOS.find((r) => r[1] === ratio)[0]} ${ratio}`,
    dropBorder: menuOpen || at('goDrop') ? dim('.5') : dim('.16'), dropScale: pressed('pDrop') ? 0.97 : 1,
    menuOp: menuOpen ? 1 : 0, menuScale: menuOpen ? 1 : 0.96,
    ratios: RATIOS.map(([n, v], i) => ({ n, v: String(v), tick: v === ratio ? 1 : 0, hl: i === hoverRatio ? dim('.1') : 'transparent' })),
    baseX: sliderX(base, 10, 18, bars.base), baseFill: (base - 10) / 18, baseLabel: `${base}px`, dragMs,
    thumbScale: press === 2 && s === 2 ? 1.15 : 1,
    ladder: LADDER.map(([tag, n], i) => {
      const px = step(n)
      return { tag, px: `${px}px`, sx: Math.min(1, px / 270).toFixed(3), delay: `${i * 40}ms` }
    }),
    h1Px, h1Label: `${h1Px}px`, bodyPx: base, h4Px: step(1),

    op3: layer(3),
    searchText: searchTyped || (searching ? '' : 'Search icons…'), searchC: searchTyped ? INK : dim('.6'),
    searchBorder: searching ? INK : dim('.16'), searchCaret: searching ? 1 : 0, searchCaretClass: searching && !/^sd/.test(beat) ? 'blink' : '',
    icons, hintOp: picked ? 0 : 1, custOp: picked ? 1 : 0, custX: picked ? 0 : 24,
    cupPath: BIKE, custColour: P('pColour') ? pkHex : INK,
    pkOp: s === 3 && P('pColour') && !P('pShut') ? 1 : 0, pkScale: s === 3 && P('pColour') && !P('pShut') ? 1 : 0.96,
    pkHex, pkHexText: pkHex, pkHue: `hsl(${pk[0].toFixed(1)} 100% 50%)`, pkMs: dragStep ? TL[k][2] : 300, dEase,
    pdX: (padPos[0] - picker.box[0]).toFixed(1), pdY: (padPos[1] - picker.box[1]).toFixed(1), hX: (huePos[0] - picker.box[0]).toFixed(1),
    custStroke: stroke, flipDeg: flipped ? 180 : 0,
    flipHBg: flipped ? INK : 'transparent', flipHC: flipped ? '#0B0C0E' : dim('.72'),
    flipHBorder: flipped ? INK : at('goFlip') ? dim('.5') : dim('.12'), flipHScale: pressed('pFlip') ? 0.97 : 1,
    flipVBg: 'transparent', flipVC: dim('.72'), flipVBorder: dim('.12'), flipVScale: 1,
    sizeLabel: '24px', sizeX: sliderX(24, 12, 116, bars.size), sizeFill: ((24 - 12) / 116).toFixed(3),
    strokeLabel: `${stroke}px`, strokeX: sliderX(stroke, 0.5, 7.5, bars.size), strokeFill: ((stroke - 0.5) / 7.5).toFixed(3),
    whiteRing: P('pColour') ? 'none' : '0 0 0 2px #111215, 0 0 0 4px #EFEEEA',
    customBg: P('pColour') ? pkHex : 'conic-gradient(from 0deg, #E8503A, #F2B33D, #5CB85C, #3AA5C9, #8E6CE0, #E8503A)',
    customRing: P('pColour') ? '0 0 0 2px #111215, 0 0 0 4px #EFEEEA' : 'none', customScale: pressed('pColour') ? 0.97 : 1,
    capType: 'round', joinType: 'round',
    ends: [['round', 'Round ends'], ['butt', 'Flat ends'], ['square', 'Square ends']].map(([v, n]) => ({ ...segment(n, v === 'round'), v })),
    corners: [['round', 'Round corners'], ['miter', 'Sharp corners'], ['bevel', 'Bevel corners']].map(([v, n]) => ({ ...segment(n, v === 'round'), v })),
    copyLabel: P('pCopy') ? 'Copied!' : 'Copy SVG', copyScale: pressed('pCopy') ? 0.97 : 1,

    formats,
    kitOp: sg ? 0 : 1, sgOp: sg ? 1 : 0, sgY: sg ? '0px' : '8px',
    fileName: ['uil4b-ui-kit.html', 'kerbside-style-guide.html'][sg ? 1 : 0], fileTick: exported ? 1 : 0, tickW: exported ? 12 : 0, tickM: exported ? 0 : -6,
    chipBg: at('goOpen', 'pOpen') ? 'rgba(11,12,14,.92)' : 'rgba(11,12,14,.78)',
    chipRing: at('goOpen', 'pOpen') ? '0 0 0 1px rgba(239,238,234,.45)' : '0 0 0 1px rgba(239,238,234,0)', chipScale: pressed('pOpen') ? 0.97 : 1,
    guideOp: opened ? 1 : 0, guideSc: opened ? 1 : 0.97,
    guideTr: opened ? `opacity 260ms ${EASE}, transform 420ms ${EASE}` : 'opacity 90ms ease-out, transform 0ms linear 90ms',
    gOp: opened ? 1 : 0, gY: opened ? '0px' : '10px', gD0: opened ? '180ms' : '0ms', gD1: opened ? '260ms' : '0ms', gD2: opened ? '340ms' : '0ms',
    goOp: exported ? 0 : 1, goScale: pressed('pGo') ? 0.97 : 1,
    prog: exporting ? 1 : 0, progMs: exporting ? 700 : 0, goLabel: exporting ? 'Exporting…' : sg ? 'Export style guide' : 'Export UI kit',
    swOp: sg ? 1 : 0, swY: sg ? 0 : -6,
    doneOp: exported ? 1 : 0, doneY: exported ? '0px' : '6px',

    hd,

    op6: layer(6),
    ctxText: 'Kerbside homepage',
    genLabel: at('gen') ? 'Generating…' : 'Generate (1)', genScale: pressed('pGen') ? 0.97 : 1,
    shimOp: at('gen') ? 1 : 0, resOp: P('w0') ? 1 : 0, resBorder: at('gen') || /^w\d/.test(beat) ? dim('.4') : dim('.14'),
    resWords: ALT_WORDS.filter((w, i) => P(`w${i}`)).map((w, i, all) => {
      const stem = w.replace(/[,.]$/, '')
      const key = ALT_KEYS.has(stem) && P('hAlt')
      return {
        w: stem, tail: w.slice(stem.length), sp: i < all.length - 1 ? ' ' : '',
        bg: key ? 'rgba(201,214,226,.16)' : 'transparent', ring: key ? '0 0 0 2px rgba(201,214,226,.16)' : 'none',
        c: key || !P('hAlt') ? INK : dim('.86'), delay: `${i * 18}ms`,
      }
    }),
    resActOp: P('hAlt') ? 1 : 0, charCount: ALT_TEXT.length,
    copy6Label: P('pCopy6') ? 'Copied' : 'Copy', copy6Scale: pressed('pCopy6') ? 0.97 : 1,
    cx, cy, cScale: press ? 0.92 : 1,
    cEx: dragStep ? dEase : 'cubic-bezier(.45,.05,.2,1)',
    cEy: dragStep ? dEase : press === 2 ? 'cubic-bezier(.45,.05,.2,1)' : 'cubic-bezier(.3,.55,.25,1)',
    cMs: cut ? 0 : press === 2 ? TL[k][2] : moveMs(k), cOp: done ? 0 : 1,
    showControl: reduced ? 'none' : 'flex',
    showPause: playing && !done, showPlay: !playing && !done, showReplay: done,
    toggleText: done ? 'Replay' : playing ? 'Pause' : 'Play',
    toggleLabel: done ? 'Replay the animation' : playing ? 'Pause the animation' : 'Play the animation',
  }
}
