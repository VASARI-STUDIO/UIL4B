import fillCss from '../styles/pages/gradient-fill.css?inline'
import { saveBlobAs, PNG_MAX_PX } from './iconDownload'

const material = {
  satin: '/previews/gradient-satin.webp',
  folds: '/previews/gradient-folds.svg',
  halftone: '/previews/gradient-halftone.svg',
}

async function embeddedMaterial(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error('Missing fill texture')
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Lay out the same art at its preview dimensions before scaling it. This keeps
// the pitch of a flute and the crop of a texture in proportion at export size.
export async function saveFillPng(artwork, style, filename) {
  const width = artwork.clientWidth
  const height = artwork.clientHeight
  if (!width || !height) throw new Error('Empty fill')
  const scale = PNG_MAX_PX / Math.max(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))

  const frame = document.createElement('div')
  frame.className = 'grd'
  frame.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden'
  const rules = document.createElement('style')
  const path = material[style]
  const layer = artwork.cloneNode(true)
  layer.querySelector('.grd-fx-cap')?.remove()
  layer.style.cssText += ';position:absolute;inset:0;border:0;border-radius:0'
  // Media queries in an SVG image see the image viewport, not the editor.
  const computed = getComputedStyle(artwork)
  for (const key of ['--fx-grain', '--fx-pitch', '--fx-slice']) {
    layer.style.setProperty(key, computed.getPropertyValue(key))
  }
  rules.textContent = path ? fillCss.replaceAll(path, await embeddedMaterial(path)) : fillCss
  frame.append(rules, layer)
  const content = new XMLSerializer().serializeToString(frame)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><foreignObject width="${width}" height="${height}">${content}</foreignObject></svg>`
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  canvas.getContext('2d').drawImage(image, 0, 0)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('PNG encoding failed')
  saveBlobAs(blob, filename)
}
