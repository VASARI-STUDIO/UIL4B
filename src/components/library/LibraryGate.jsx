import GalleryEndGate, { GateFadeRows } from './GalleryEndGate'
import VerticalPanelTile, { VptGrid } from './VerticalPanelTile'
import { libraryGateCopy } from '../../data/galleryGateCopy'
import { gradientCss } from '../../data/gradientGallery'
import { standinFromStub, standinGradients, standinPalettes, STANDIN_COUNT } from '../../utils/gateStandins'
import { lockedMeta } from '../../utils/galleryMeta'

// The gate under the Palette and Gradient libraries: what is withheld, what a
// filter would open, and the way on. One component so the two pages say the same
// thing the same way.
//
//   kind         'palettes' | 'gradients'.
//   gate         the result of gateFor() (utils/galleryCounts.js), never null here;
//                the page decides whether a gate shows and passes the answer.
//   counts       the result of countGallery(): S, A, T, lockedUnknown, and the
//                rows the fade draws (nextRows, lockedRows).
//   opens        what a free account opens in all (utils/lockedPreview freeOpens).
//   nounFor      (count) => the filtered noun ("radial gradients").
//   onSignup     'signup' action: the sign-up flow.
//   onLogin      'login' action: the sign-in flow.
//   onPlans      called as the plans link is followed (reports the upsell).
//   id           the heading's id.
//
// The faded rows draw no Pro value. `nextRows` are real free rows (a free account
// opens them); `lockedRows` are stubs, drawn through standinFromStub in the
// neutral ramp. Where the filter asks about a field the stubs do not carry
// (`counts.lockedUnknown`) the fade is neutral stand-ins that claim no count.

const TILE_LABEL = { free: 'Free account', pro: 'Pro' }

// One faded tile: the gallery's own tile, locked, with no button to focus.
function fadeTile(kind, item) {
  if (kind === 'palettes') {
    return (
      <VerticalPanelTile
        key={item.id}
        locked
        name={item.name}
        meta={item.meta}
        hexes={item.colors}
      />
    )
  }
  return (
    <VerticalPanelTile
      key={item.id}
      locked
      name={item.name}
      meta={item.meta}
      mediaStyle={{ background: gradientCss(item.type, item.angle, item.stops) }}
    />
  )
}

/** The rows the fade draws, in order, each carrying the meta its tile prints. */
function fadeItemsFor(kind, counts) {
  const single = kind === 'palettes' ? 'palette' : 'gradient'
  const { nextRows = [], lockedRows = [], lockedUnknown = false } = counts
  const items = [
    ...nextRows.map((row) => ({
      ...row,
      meta: TILE_LABEL.free,
    })),
    ...lockedRows.map((stub, i) => {
      const stand = standinFromStub(kind, stub, i)
      return { ...stand, meta: lockedMeta(single, stub.slots) }
    }),
  ]
  // A filter the stubs cannot answer: neutral placeholders fill what is left of
  // the fade. They carry no count, because the copy speaks for the whole library.
  if (lockedUnknown && items.length < STANDIN_COUNT) {
    const fill = kind === 'palettes' ? standinPalettes() : standinGradients()
    items.push(...fill.slice(0, STANDIN_COUNT - items.length).map((stand) => ({ ...stand, meta: TILE_LABEL.pro })))
  }
  return items
}

export default function LibraryGate({
  kind, gate, counts, opens, nounFor, onSignup, onLogin, onPlans, id = 'lib-gate-h', pending = false,
}) {
  if (!gate || pending) return null
  const copy = libraryGateCopy(kind, {
    variant: gate.variant,
    anonymous: gate.anonymous,
    S: counts.S,
    A: counts.A,
    T: counts.T,
    P: gate.P,
    opens,
    nounFor,
  })
  const handlers = { signup: onSignup, login: onLogin }
  const control = (c) => (c.action === 'plans'
    ? { label: c.label, to: '/plans', onClick: onPlans }
    : { label: c.label, onClick: handlers[c.action] })
  const items = fadeItemsFor(kind, counts)
  return (
    <GalleryEndGate
      kind={gate.anonymous ? 'anon' : 'free'}
      id={id}
      heading={copy.heading}
      body={copy.body}
      primary={control(copy.primary)}
      secondary={copy.secondary ? control(copy.secondary) : undefined}
      reveal
      fade={items.length ? (
        <GateFadeRows
          tiles
          initial={{ cols: 4, gap: 16 }}
          items={items}
          render={(slice) => <VptGrid>{slice.map((item) => fadeTile(kind, item))}</VptGrid>}
        />
      ) : undefined}
    />
  )
}
