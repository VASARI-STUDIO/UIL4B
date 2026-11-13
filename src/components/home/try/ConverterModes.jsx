// The File Converter's other three tabs as small preview screens: Animation, Video and
// Extract frames. They are drawn from the sample photo and show what each setting means;
// nothing here encodes, edits or extracts anything. The full tool does that, and each
// screen's link opens it.

import { SCREENS } from './converterScreens'

const PHOTO = '/home-try/riders-640.webp'
const PHOTO_SET = '/home-try/riders-640.webp 640w, /home-try/riders-1280.webp 1280w'
const ENGINE_NOTE = 'The video tools download a converter engine, about 9 MB, the first time.'

const clock = (s) => `0:${String(Math.round(s)).padStart(2, '0')}`

const SPEEDS = [0.5, 1, 2]
const TIMINGS = [100, 200, 500]
const EVERY = [1, 2, 4]
const CLIP_S = 8
const ANIM_FRAMES = 6

function Caption({ text }) {
  return (
    <p className="ht-cv-cap">
      <span data-l>{`${text} ${ENGINE_NOTE}`}</span>
      <span data-s>The video tools download a 9 MB engine first.</span>
    </p>
  )
}

function Photo({ sizes }) {
  return <img className="ht-cv-photo" src={PHOTO} srcSet={PHOTO_SET} sizes={sizes} width="640" height="389" loading="lazy" decoding="async" alt="" />
}

function AnimationScreen({ v, items, text }) {
  const ms = TIMINGS[v[1]]
  const total = ((ANIM_FRAMES * ms) / 1000).toFixed(1)
  return (
    <div className="ht-cv-scr">
      <div className="ht-cv-view" role="img" aria-label="The first frame of the animation, with all six frames in a row beneath it.">
        <Photo sizes="(min-width: 1200px) 520px, 90vw" />
        <span className="ht-cv-chip">{items[0][v[0]]}</span>
      </div>
      <ol className="ht-cv-strip" aria-hidden="true">
        {Array.from({ length: ANIM_FRAMES }, (_, i) => (
          <li key={i} style={{ '--x': `${i * 20}%` }}><span className="ht-cv-n">{i + 1}</span></li>
        ))}
      </ol>
      <p className="ht-cv-spec">{`${items[0][v[0]]} · ${ANIM_FRAMES} frames · ${ms} ms each · ${total} s`}</p>
      <Caption text={text} />
    </div>
  )
}

function VideoScreen({ v, items, text }) {
  const crop = items[0][v[0]]
  const turn = items[1][v[1]]
  const speed = SPEEDS[v[2]]
  const reversed = v[3] === 1
  const out = CLIP_S / speed
  const parts = [`${clock(CLIP_S)} to ${clock(out)}`]
  if (crop !== 'Free') parts.push(`crop ${crop}`)
  if (v[1] !== 0) parts.push(`turned ${turn}`)
  if (reversed) parts.push('reversed')
  return (
    <div className="ht-cv-scr">
      <div className="ht-cv-clipwrap">
        <div
          className="ht-cv-view ht-cv-clip"
          data-turn={String(parseInt(turn, 10))}
          role="img"
          aria-label={`A sample clip with a ${crop === 'Free' ? 'free' : crop} crop, turned ${turn}, at ${speed} times speed${reversed ? ', reversed' : ''}.`}
        >
          <Photo sizes="(min-width: 1200px) 400px, 70vw" />
          <i className="ht-cv-crop" data-crop={crop} />
          <span className="ht-cv-chip">{`${speed}×${reversed ? ' reversed' : ''}`}</span>
        </div>
      </div>
      <p className="ht-cv-spec">{parts.join(', ')}</p>
      <Caption text={text} />
    </div>
  )
}

function FramesScreen({ v, items, text }) {
  const every = EVERY[v[0]]
  const ext = items[1][v[1]]
  const times = Array.from({ length: CLIP_S / every }, (_, i) => i * every)
  return (
    <div className="ht-cv-scr">
      <div className="ht-cv-scrubwrap" aria-hidden="true">
        <div className="ht-cv-scrub">
          {Array.from({ length: CLIP_S }, (_, i) => <i key={i} style={{ '--x': `${(i * 100) / (CLIP_S - 1)}%` }} />)}
          {times.map((t) => <b key={t} className="ht-cv-tick" style={{ '--t': t / CLIP_S }} />)}
        </div>
        <div className="ht-cv-times"><span>{clock(0)}</span><span>{clock(CLIP_S)}</span></div>
      </div>
      <ol className="ht-cv-grid" role="img" aria-label={`${times.length} frames pulled from an eight second clip, one every ${every} seconds.`}>
        {times.map((t) => (
          <li key={t} style={{ '--x': `${(t * 100) / (CLIP_S - 1)}%` }}><span className="ht-cv-n">{clock(t)}</span></li>
        ))}
      </ol>
      <p className="ht-cv-spec">{`${times.length} frames, one every ${every} s, as ${ext}`}</p>
      <Caption text={text} />
    </div>
  )
}

const BY_MODE = { 1: AnimationScreen, 2: VideoScreen, 3: FramesScreen }

/** The preview for tab `mode` (1 to 3), `v` being the choice made in each of its settings. */
export function ModeScreen({ mode, v, text }) {
  const Screen = BY_MODE[mode]
  return <Screen v={v} items={SCREENS[mode].settings.map((s) => s.items)} text={text} />
}
