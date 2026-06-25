function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function colorDistance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

function kMeans(pixels, k, maxIter = 20) {
  let centroids = []
  const step = Math.max(1, Math.floor(pixels.length / k))
  for (let i = 0; i < k; i++) centroids.push([...pixels[Math.min(i * step, pixels.length - 1)]])

  for (let iter = 0; iter < maxIter; iter++) {
    const clusters = Array.from({ length: k }, () => [])
    for (const px of pixels) {
      let minD = Infinity, closest = 0
      for (let c = 0; c < k; c++) {
        const d = colorDistance(px, centroids[c])
        if (d < minD) { minD = d; closest = c }
      }
      clusters[closest].push(px)
    }

    let moved = false
    for (let c = 0; c < k; c++) {
      if (!clusters[c].length) continue
      const avg = [0, 0, 0]
      for (const px of clusters[c]) { avg[0] += px[0]; avg[1] += px[1]; avg[2] += px[2] }
      const len = clusters[c].length
      const newC = [Math.round(avg[0] / len), Math.round(avg[1] / len), Math.round(avg[2] / len)]
      if (colorDistance(newC, centroids[c]) > 1) moved = true
      centroids[c] = newC
    }

    if (!moved) break
  }

  return centroids
}

export function extractColorsFromImage(file, count = 5) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxDim = 150
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      const data = ctx.getImageData(0, 0, w, h).data
      const pixels = []
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a < 128) continue
        if (r > 245 && g > 245 && b > 245) continue
        if (r < 10 && g < 10 && b < 10) continue
        pixels.push([r, g, b])
      }

      if (pixels.length < count) {
        resolve(pixels.map(p => rgbToHex(...p)))
        return
      }

      const centroids = kMeans(pixels, count)
      const sorted = centroids
        .map(c => ({ hex: rgbToHex(...c), lum: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] }))
        .sort((a, b) => b.lum - a.lum)
        .map(c => c.hex)

      resolve(sorted)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Slice 3 (Colour System popup, Image tab): the eyedropper instrument needs the
// extracted colours AND where they live on the image, so auto-seeded points land
// on real pixels (back-map cluster → representative pixel). Returns both the hexes
// and normalised 0–1 coordinates (origin top-left) of the closest source pixel to
// each kMeans centroid, so points survive zoom/resize/letterbox.
// Mirrors extractColorsFromImage's downscale/skip rules so the centroids match.
export function extractColorPointsFromImage(file, count = 5) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const maxDim = 150
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, w, h)

        const data = ctx.getImageData(0, 0, w, h).data
        // Keep the source pixel's coordinate alongside its colour so we can map a
        // centroid back to a real location. Sample every 4th pixel (stride 16 bytes).
        const pixels = []
        const coords = []
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue
          if (r > 245 && g > 245 && b > 245) continue
          if (r < 10 && g < 10 && b < 10) continue
          const px = (i >> 2) % w
          const py = Math.floor((i >> 2) / w)
          pixels.push([r, g, b])
          coords.push([px / w, py / h])
        }

        if (!pixels.length) { resolve([]); URL.revokeObjectURL(img.src); return }

        const k = Math.min(count, pixels.length)
        const centroids = kMeans(pixels, k)
        const points = centroids.map(c => {
          // Nearest source pixel to this centroid = its on-image representative.
          let minD = Infinity, best = 0
          for (let p = 0; p < pixels.length; p++) {
            const d = colorDistance(pixels[p], c)
            if (d < minD) { minD = d; best = p }
          }
          return { hex: rgbToHex(...pixels[best]), x: coords[best][0], y: coords[best][1] }
        })
        // De-dupe points that collapsed onto the same pixel (tiny/flat images).
        const seen = new Set()
        const unique = points.filter(p => {
          const key = `${Math.round(p.x * 1000)}:${Math.round(p.y * 1000)}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        resolve(unique)
        URL.revokeObjectURL(img.src)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to process image'))
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
