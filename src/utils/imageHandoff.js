// Tiny in-memory hand-off so the dashboard's quick-upload tile can pass picked
// files straight into the Image Converter. File objects stay alive across the
// SPA route change (no page reload), so a module variable is all we need.
let pending = null

export function setPendingImages(files) {
  pending = files && files.length ? Array.from(files) : null
}

export function takePendingImages() {
  const f = pending
  pending = null
  return f
}
