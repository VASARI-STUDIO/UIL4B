import { useState, useCallback, useRef, useEffect } from 'react'
import JSZip from 'jszip'
import { useI18n } from '../contexts/I18nContext'

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const FORMAT_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' }
const ACCEPTED_VIDEO = '.mp4,.webm,.mov,.avi'

const INTERVAL_OPTIONS = [
  { label: 'Every frame', value: 'every' },
  { label: 'Every 2nd frame', value: 'every2' },
  { label: 'Every 5th frame', value: 'every5' },
  { label: 'Every 10th frame', value: 'every10' },
  { label: 'Every 30th frame', value: 'every30' },
  { label: 'Custom FPS', value: 'custom' },
]

const SCALE_OPTIONS = [
  { label: '100% (Original)', value: 1 },
  { label: '75%', value: 0.75 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 },
]

export default function VideoToFrames({ toast }) {
  const { t } = useI18n()

  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoMeta, setVideoMeta] = useState(null)

  const [format, setFormat] = useState('image/png')
  const [quality, setQuality] = useState(100)
  const [scale, setScale] = useState(1)
  const [interval, setInterval_] = useState('every')
  const [customFps, setCustomFps] = useState(1)

  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [frames, setFrames] = useState([])
  const [zipping, setZipping] = useState(false)

  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Clean up object URL on unmount or when video changes
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const handleVideoFile = useCallback((file) => {
    if (!file || !file.type.startsWith('video/')) {
      toast('Please select a valid video file')
      return
    }
    // Clean up previous URL
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoUrl(url)
    setFrames([])
    setProgress(0)
    setVideoMeta(null)
  }, [videoUrl, toast])

  const handleFiles = useCallback((files) => {
    const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'))
    if (videoFiles.length > 0) handleVideoFile(videoFiles[0])
  }, [handleVideoFile])

  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setVideoMeta({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    })
  }, [])

  const getVideoFps = useCallback(() => {
    // Default assumption for videos without explicit FPS metadata
    return 30
  }, [])

  const computeFrameCount = useCallback(() => {
    if (!videoMeta) return 0
    const fps = getVideoFps()
    const totalFrames = Math.floor(videoMeta.duration * fps)

    switch (interval) {
      case 'every': return totalFrames
      case 'every2': return Math.ceil(totalFrames / 2)
      case 'every5': return Math.ceil(totalFrames / 5)
      case 'every10': return Math.ceil(totalFrames / 10)
      case 'every30': return Math.ceil(totalFrames / 30)
      case 'custom': {
        const cFps = Math.max(0.1, Math.min(customFps, fps))
        return Math.floor(videoMeta.duration * cFps)
      }
      default: return totalFrames
    }
  }, [videoMeta, interval, customFps, getVideoFps])

  const computeTimeStep = useCallback(() => {
    if (!videoMeta) return 1 / 30
    const fps = getVideoFps()

    switch (interval) {
      case 'every': return 1 / fps
      case 'every2': return 2 / fps
      case 'every5': return 5 / fps
      case 'every10': return 10 / fps
      case 'every30': return 30 / fps
      case 'custom': {
        const cFps = Math.max(0.1, Math.min(customFps, fps))
        return 1 / cFps
      }
      default: return 1 / fps
    }
  }, [videoMeta, interval, customFps, getVideoFps])

  const extractFrames = useCallback(async () => {
    if (!videoUrl || !videoMeta) return

    setExtracting(true)
    setProgress(0)
    setFrames([])

    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = videoUrl

    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve
      video.onerror = reject
    })

    const outW = Math.round(videoMeta.width * scale)
    const outH = Math.round(videoMeta.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')

    const timeStep = computeTimeStep()
    const totalFrames = computeFrameCount()
    const ext = FORMAT_EXT[format] || 'png'
    const qualityVal = format === 'image/png' ? undefined : quality / 100

    const extractedFrames = []
    let currentTime = 0
    let frameIdx = 0

    while (currentTime < videoMeta.duration && frameIdx < totalFrames) {
      video.currentTime = currentTime

      await new Promise((resolve) => {
        video.onseeked = resolve
      })

      // Clear canvas for transparency support
      ctx.clearRect(0, 0, outW, outH)
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, outW, outH)
      }
      ctx.drawImage(video, 0, 0, outW, outH)

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, format, qualityVal)
      })

      if (blob) {
        const thumbUrl = URL.createObjectURL(blob)
        extractedFrames.push({
          blob,
          thumbUrl,
          name: `frame-${String(frameIdx + 1).padStart(5, '0')}.${ext}`,
          time: currentTime,
          size: blob.size,
          width: outW,
          height: outH,
        })
      }

      frameIdx++
      currentTime += timeStep
      setProgress(Math.round((frameIdx / totalFrames) * 100))
    }

    setFrames(extractedFrames)
    setExtracting(false)
    setProgress(100)
    toast(`Extracted ${extractedFrames.length} frames`)
  }, [videoUrl, videoMeta, format, quality, scale, computeTimeStep, computeFrameCount, toast])

  const downloadFrame = useCallback((frame) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(frame.blob)
    a.download = frame.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
    toast('Downloaded ' + frame.name)
  }, [toast])

  const downloadAll = useCallback(async () => {
    if (!frames.length) return
    setZipping(true)

    try {
      const zip = new JSZip()
      frames.forEach((frame) => {
        zip.file(frame.name, frame.blob)
      })

      const content = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `frames-${videoFile?.name?.replace(/\.[^.]+$/, '') || 'video'}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      toast(`Downloaded ZIP with ${frames.length} frames`)
    } catch {
      toast('Failed to create ZIP file')
    }

    setZipping(false)
  }, [frames, videoFile, toast])

  const clearAll = useCallback(() => {
    frames.forEach(f => URL.revokeObjectURL(f.thumbUrl))
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setVideoMeta(null)
    setFrames([])
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [frames, videoUrl])

  const estimatedFrames = computeFrameCount()
  const title = t('tools.videoFrames.label') !== 'tools.videoFrames.label'
    ? t('tools.videoFrames.label')
    : 'Video to Frames'
  const description = t('tools.videoFrames.description') !== 'tools.videoFrames.description'
    ? t('tools.videoFrames.description')
    : 'Extract individual frames from video files as high-quality images. All processing happens locally in your browser.'

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {/* Upload area */}
      {!videoUrl && (
        <div className="sub">
          <div
            className="img-drop-zone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; handleFiles(e.dataTransfer.files) }}
          >
            <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 4 }}>
              Drop a video here or click to browse
            </p>
            <p style={{ fontSize: 11, color: 'var(--t2)' }}>
              MP4, WebM, MOV, AVI
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_VIDEO}
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
        </div>
      )}

      {/* Video preview and info */}
      {videoUrl && (
        <>
          <div className="sub">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 min(400px, 100%)', minWidth: 0 }}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  onLoadedMetadata={handleVideoLoaded}
                  style={{
                    width: '100%',
                    maxHeight: 360,
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-2)',
                    display: 'block',
                  }}
                />
              </div>
              {videoMeta && (
                <div className="card" style={{ flex: '1 1 200px', minWidth: 0, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--t0)' }}>
                    Video Information
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 2 }}>
                    <div><strong>File:</strong> {videoFile?.name}</div>
                    <div><strong>Size:</strong> {formatBytes(videoFile?.size || 0)}</div>
                    <div><strong>Duration:</strong> {formatTime(videoMeta.duration)}</div>
                    <div><strong>Resolution:</strong> {videoMeta.width} &times; {videoMeta.height}px</div>
                    <div><strong>Est. frames:</strong> {estimatedFrames.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extraction controls */}
          {videoMeta && (
            <div className="sub">
              <div className="sl">Extraction Settings</div>
              <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: 'wrap' }}>

                {/* Format */}
                <div>
                  <div className="seg-label">Output Format</div>
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    style={{ width: 130 }}
                    disabled={extracting}
                  >
                    <option value="image/png">PNG</option>
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/webp">WebP</option>
                    <option value="image/avif">AVIF</option>
                  </select>
                </div>

                {/* Quality */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="seg-label">Quality</div>
                  <div className="row">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={quality}
                      style={{ flex: 1 }}
                      onChange={e => setQuality(+e.target.value)}
                      disabled={extracting || format === 'image/png'}
                    />
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quality}
                      style={{ width: 64, textAlign: 'center' }}
                      onChange={e => setQuality(Math.max(1, Math.min(100, +e.target.value || 100)))}
                      disabled={extracting || format === 'image/png'}
                    />
                    <span style={{ fontSize: 11, color: 'var(--t1)' }}>%</span>
                  </div>
                  {format === 'image/png' && (
                    <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>
                      PNG is always lossless
                    </div>
                  )}
                </div>

                {/* Scale */}
                <div>
                  <div className="seg-label">Scale</div>
                  <select
                    value={scale}
                    onChange={e => setScale(+e.target.value)}
                    style={{ width: 150 }}
                    disabled={extracting}
                  >
                    {SCALE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {scale < 1 && videoMeta && (
                    <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>
                      {Math.round(videoMeta.width * scale)} &times; {Math.round(videoMeta.height * scale)}px
                    </div>
                  )}
                </div>

                {/* Frame interval */}
                <div>
                  <div className="seg-label">Frame Interval</div>
                  <select
                    value={interval}
                    onChange={e => setInterval_(e.target.value)}
                    style={{ width: 170 }}
                    disabled={extracting}
                  >
                    {INTERVAL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {interval === 'custom' && (
                    <div className="row" style={{ marginTop: 6, gap: 6 }}>
                      <input
                        type="number"
                        min="0.1"
                        max="60"
                        step="0.1"
                        value={customFps}
                        style={{ width: 70, textAlign: 'center' }}
                        onChange={e => setCustomFps(Math.max(0.1, +e.target.value || 1))}
                        disabled={extracting}
                      />
                      <span style={{ fontSize: 11, color: 'var(--t1)' }}>fps</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estimated output */}
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                background: 'var(--bg-1)',
                borderRadius: 'var(--radius-s)',
                fontSize: 12,
                color: 'var(--t1)',
              }}>
                <strong>Estimated output:</strong>{' '}
                {estimatedFrames.toLocaleString()} frames at{' '}
                {Math.round(videoMeta.width * scale)} &times; {Math.round(videoMeta.height * scale)}px{' '}
                ({FORMAT_EXT[format]?.toUpperCase()})
              </div>

              {/* Action buttons */}
              <div className="row" style={{ marginTop: 14, gap: 8 }}>
                <button
                  className="btn btn-accent"
                  onClick={extractFrames}
                  disabled={extracting}
                >
                  {extracting ? `Extracting... ${progress}%` : 'Extract Frames'}
                </button>
                <button className="btn" onClick={clearAll} disabled={extracting}>
                  Clear
                </button>
              </div>

              {/* Progress bar */}
              {extracting && (
                <div style={{
                  marginTop: 12,
                  height: 6,
                  background: 'var(--bg-2)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--accent)',
                    borderRadius: 3,
                    transition: 'width 0.2s ease',
                  }} />
                </div>
              )}
            </div>
          )}

          {/* Extracted frames grid */}
          {frames.length > 0 && (
            <div className="sub">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="sl">
                  Extracted Frames ({frames.length.toLocaleString()})
                </div>
                <button
                  className="btn btn-accent"
                  onClick={downloadAll}
                  disabled={zipping}
                >
                  {zipping ? 'Creating ZIP...' : 'Download All as ZIP'}
                </button>
              </div>

              <div style={{
                fontSize: 11,
                color: 'var(--t2)',
                marginBottom: 10,
              }}>
                Total size: {formatBytes(frames.reduce((sum, f) => sum + f.size, 0))}
                {' • '}
                Click a frame to download individually
              </div>

              <div className="img-grid">
                {frames.map((frame, idx) => (
                  <div
                    key={idx}
                    className="card"
                    style={{ padding: 10, cursor: 'pointer' }}
                    onClick={() => downloadFrame(frame)}
                    title={`Download ${frame.name}`}
                  >
                    <div style={{
                      background: 'var(--bg-2)',
                      marginBottom: 8,
                      overflow: 'hidden',
                      borderRadius: 8,
                    }}>
                      <img
                        src={frame.thumbUrl}
                        style={{
                          width: '100%',
                          display: 'block',
                          maxHeight: 160,
                          objectFit: 'contain',
                        }}
                        alt={frame.name}
                      />
                    </div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--mono)',
                    }}>
                      {frame.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 2 }}>
                      {frame.width} &times; {frame.height}px
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                      {formatBytes(frame.size)} &bull; {formatTime(frame.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden canvas for extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
