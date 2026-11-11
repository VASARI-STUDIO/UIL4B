// The height of a Font Gallery band, from the name's size.
//
// A band is the name's line box (1.1 times its size) plus the room around it:
// the room above the name (`--fg-y`), the meta line (18px), the gap between the
// name and the meta line (`--fg-gap`), the room below (`--fg-yb`) and the 1px
// hairline. Those four CSS values are spacing tokens in font-gallery.css; the
// sums here are the same values in pixels, because the list sets one fixed
// height from JS so a size change moves the whole list once. A test reads both
// and fails if they drift apart.

const META = 18
const HAIRLINE = 1

// The tokens in pixels: --s-7 is 48, --s-6 is 32, --s-5 is 24.
export const BAND_SPACE = {
  wide: { y: 48, yb: 32, gap: 48 },
  phone: { y: 24, yb: 32, gap: 24 },
}

const room = ({ y, yb, gap }) => y + META + gap + yb + HAIRLINE

export const BAND_ROOM = { wide: room(BAND_SPACE.wide), phone: room(BAND_SPACE.phone) }

// A band is never shorter than this, however small the name.
export const BAND_MIN = { wide: 200, phone: 140 }

export const bandHeight = (mode, size) =>
  mode === 'phone'
    ? Math.max(BAND_MIN.phone, Math.ceil(size * 1.1) + BAND_ROOM.phone)
    : Math.max(BAND_MIN.wide, Math.round(size * 1.1) + BAND_ROOM.wide)
