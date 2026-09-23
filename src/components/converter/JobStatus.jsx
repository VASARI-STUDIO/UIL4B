import { formatBytes, formatTime } from '../../utils/mediaEncode'

// WHAT AN ENGINE JOB IS DOING, IN ITS OWN UNITS.
//
// ffmpeg.wasm here is the single-threaded core (see utils/ffmpegEngine.js), so
// a long encode is simply slow — it cannot be made fast, only honest. Every
// stage therefore reports a count it actually has rather than a spinner:
//
//   prepare  frames drawn and written to the engine, "Preparing frame 3 of 12"
//   engine   bytes of the 9 MB core received, against the CDN's stated total
//            when that total can be trusted
//   encode   the frame (or the second of video) ffmpeg's own status line says
//            it has finished — parsed from its log, not estimated
//
// `job` is { stage, done, total, received, bytesTotal, unit } or null.
export default function JobStatus({ job, engineFailed, onCancel }) {
  if (!job && !engineFailed) return null
  if (!job) {
    return (
      <p className="fc-status fc-status-err">
        The converter engine failed to load. Image conversion still works on the Image tab.
      </p>
    )
  }

  let text
  let bar = null
  if (job.stage === 'prepare') {
    text = `Preparing frame ${job.done} of ${job.total}`
    bar = { now: job.done, max: job.total, label: 'Frames prepared' }
  } else if (job.stage === 'engine') {
    text = 'Loading converter engine… (about 9 MB, first run only)'
    if (job.bytesTotal > 0) bar = { now: job.received, max: job.bytesTotal, label: 'Converter engine download' }
  } else {
    // A clip whose length the browser could not read (a recorded WebM often
    // reports none) still shows the seconds done — just not a total it lacks.
    text = job.unit === 'time'
      ? (job.total > 0 ? `Encoding… ${formatTime(job.done)} of ${formatTime(job.total)}` : `Encoding… ${formatTime(job.done)} done`)
      : `Encoding frame ${Math.min(job.done, job.total)} of ${job.total}`
    if (job.total > 0) bar = { now: Math.min(job.done, job.total), max: job.total, label: 'Encoding progress' }
  }
  const pct = bar && bar.max > 0 ? Math.min(100, Math.round((bar.now / bar.max) * 100)) : 0

  return (
    <div className="fc-job">
      <div className="fc-status" role="status">
        <span className="fc-spinner" aria-hidden="true" />
        <span>{text}</span>
        {job.stage === 'engine' && job.received != null && (
          <span className="fc-status-bytes">
            {formatBytes(job.received)}{job.bytesTotal ? ` of ${formatBytes(job.bytesTotal)}` : ''}
          </span>
        )}
      </div>
      {bar && (
        <div className="fc-progress" role="progressbar" aria-label={bar.label} aria-valuemin={0} aria-valuemax={bar.max} aria-valuenow={bar.now}>
          <div className="fc-progress-bar" style={{ '--fc-pct': `${pct}%` }} />
        </div>
      )}
      {onCancel && (
        <button type="button" className="fc-btn fc-btn--quiet" onClick={onCancel}>Cancel</button>
      )}
    </div>
  )
}
