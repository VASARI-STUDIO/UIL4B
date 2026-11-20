// A small picture drawn on the spot, so a visitor can watch the converter work
// before they have a file to hand. Nothing is fetched and nothing is uploaded:
// it is a canvas, turned into a PNG File that goes through exactly the path a
// chosen file does. The corners and the sky are transparent on purpose, so the
// background and format controls have something real to act on.

export const SAMPLE_W = 640
export const SAMPLE_H = 400

/** @returns {Promise<File>} a transparent 640 x 400 PNG named sample-landscape.png */
export function makeSampleImage() {
  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_W
  canvas.height = SAMPLE_H
  const ctx = canvas.getContext('2d')
  // Rounded frame, left transparent outside it.
  const r = 36
  ctx.beginPath()
  ctx.roundRect(0, 0, SAMPLE_W, SAMPLE_H, r)
  ctx.clip()
  ctx.fillStyle = '#cfe0f3'
  ctx.fillRect(0, 0, SAMPLE_W, SAMPLE_H)
  ctx.fillStyle = '#f2c14e'
  ctx.beginPath()
  ctx.arc(486, 118, 52, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#5b7fa6'
  ctx.beginPath()
  ctx.moveTo(-10, 330)
  ctx.lineTo(170, 150)
  ctx.lineTo(300, 290)
  ctx.lineTo(400, 200)
  ctx.lineTo(560, 340)
  ctx.lineTo(SAMPLE_W + 10, 330)
  ctx.lineTo(SAMPLE_W + 10, SAMPLE_H + 10)
  ctx.lineTo(-10, SAMPLE_H + 10)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#2f4a63'
  ctx.fillRect(0, 330, SAMPLE_W, SAMPLE_H - 330)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], 'sample-landscape.png', { type: 'image/png' })) : reject(new Error('Could not draw the sample'))),
      'image/png',
    )
  })
}
