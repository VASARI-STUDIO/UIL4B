// THE FLAGS BEHIND EVERY ANIMATED FILE THE CONVERTER HANDS OVER.
//
// src/utils/mediaEncode.js turns "Animated WebP, 12 fps, play twice" into an
// ffmpeg argument list. A wrong flag there does not error — it produces a
// perfectly valid file that loops forever when the visitor asked for once, or
// a GIF with no transparency, and nothing on screen says so. So the lists are
// asserted as data. The loop semantics are the ones measured against the real
// engine and read back with ImageDecoder (see the table at the top of the
// module); tests/user-sim/99-animation-builder.spec.js reads a real encoded
// file back the same way.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ANIMATION_FORMATS, PLAY_OPTIONS, FPS_MAX, MAX_ANIMATION_SIDE, clampFps, loopArgs,
  framesToAnimationArgs, videoToAnimationArgs, parseFrame, parseTime, moveItem,
  animationSize, fitContain, describeTiming, frameName, FRAME_PATTERN, findFormat,
} from '../../src/utils/mediaEncode.js'

const after = (args, flag) => args[args.indexOf(flag) + 1]

test('THE ONE THAT MATTERS: GIF counts repeats, WebP and APNG count plays', () => {
  // Play once. GIF needs -1 (no NETSCAPE loop block); 0 would loop FOREVER.
  assert.deepEqual(loopArgs('gif', 1), ['-loop', '-1'])
  assert.deepEqual(loopArgs('webp', 1), ['-loop', '1'])
  assert.deepEqual(loopArgs('apng', 1), ['-plays', '1'])
  // Forever.
  assert.deepEqual(loopArgs('gif', 0), ['-loop', '0'])
  assert.deepEqual(loopArgs('webp', 0), ['-loop', '0'])
  assert.deepEqual(loopArgs('apng', 0), ['-plays', '0'])
  // Three plays = two repeats for GIF.
  assert.deepEqual(loopArgs('gif', 3), ['-loop', '2'])
  assert.deepEqual(loopArgs('webp', 3), ['-loop', '3'])
  assert.deepEqual(loopArgs('apng', 3), ['-plays', '3'])
})

test('video containers get no loop flag, and the format list says they cannot loop', () => {
  assert.deepEqual(loopArgs('mp4', 1), [])
  assert.deepEqual(loopArgs('webm', 0), [])
  for (const f of ANIMATION_FORMATS) {
    assert.equal(f.loops, f.kind === 'image', `${f.id}: only the image formats store a loop count`)
  }
  for (const id of ['mp4', 'webm']) {
    const args = framesToAnimationArgs({ format: id, fps: 10, plays: 2 })
    assert.ok(!args.includes('-loop') && !args.includes('-plays'), `${id} carried a loop flag: ${args.join(' ')}`)
  }
})

test('every play option maps to a flag for every loopable format', () => {
  for (const { id: plays } of PLAY_OPTIONS) {
    for (const f of ANIMATION_FORMATS.filter((x) => x.loops)) {
      const flags = loopArgs(f.id, plays)
      assert.equal(flags.length, 2, `${f.id} plays=${plays}`)
      assert.ok(Number.isInteger(Number(flags[1])))
    }
  }
})

test('frames → animation: the sequence input, the rate and the right encoder per format', () => {
  const gif = framesToAnimationArgs({ format: 'gif', fps: 12, plays: 1, quality: 'high' })
  assert.deepEqual(gif.slice(0, 4), ['-framerate', '12', '-i', FRAME_PATTERN])
  // Transparent frames: the palette must reserve a slot or every clear pixel
  // turns into the nearest opaque colour.
  assert.match(after(gif, '-vf'), /palettegen=reserve_transparent=1/)
  assert.match(after(gif, '-vf'), /paletteuse=dither=sierra2_4a$/)
  assert.equal(after(gif, '-loop'), '-1')
  assert.equal(gif.at(-1), 'output.gif')

  const webp = framesToAnimationArgs({ format: 'webp', fps: 8, quality: 'low' })
  assert.equal(after(webp, '-c:v'), 'libwebp_anim')
  assert.equal(after(webp, '-quality'), '50')
  assert.equal(webp.at(-1), 'output.webp')

  const apng = framesToAnimationArgs({ format: 'apng', fps: 8 })
  assert.equal(after(apng, '-f'), 'apng')
  assert.equal(after(apng, '-pix_fmt'), 'rgba', 'APNG must keep its alpha channel')
  assert.equal(apng.at(-1), 'output.png')

  const mp4 = framesToAnimationArgs({ format: 'mp4', fps: 24 })
  assert.equal(after(mp4, '-c:v'), 'libx264')
  assert.equal(after(mp4, '-pix_fmt'), 'yuv420p')
  assert.ok(mp4.includes('+faststart'))

  const webm = framesToAnimationArgs({ format: 'webm', fps: 24 })
  // VP9 crashes this engine build (measured) — it must be VP8.
  assert.equal(after(webm, '-c:v'), 'libvpx')
  assert.ok(!webm.includes('libvpx-vp9'))
  assert.equal(after(webm, '-pix_fmt'), 'yuva420p', 'WebM keeps alpha')
  assert.equal(after(webm, '-auto-alt-ref'), '0', 'VP8 cannot encode alpha with alt-ref frames on')
})

test('video → animation keeps the GIF it always made, and trims when asked', () => {
  // The Video → GIF command before this change, for the default settings:
  //   -i input.mp4 -vf fps=10,scale=480:-1:flags=lanczos,split[s0][s1];
  //   [s0]palettegen[p];[s1][p]paletteuse=dither=bayer:bayer_scale=2 -loop 0 output.gif
  // Height is -2 now (even, which MP4 needs); nothing else moved.
  const gif = videoToAnimationArgs({ format: 'gif', input: 'input.mp4', fps: 10, width: 480 })
  assert.deepEqual(gif, ['-i', 'input.mp4', '-vf',
    'fps=10,scale=480:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=bayer:bayer_scale=2',
    '-loop', '0', 'output.gif'])

  const trimmed = videoToAnimationArgs({ format: 'mp4', input: 'in.mov', fps: 30, width: 720, start: 1.5, length: 3 })
  assert.deepEqual(trimmed.slice(0, 6), ['-ss', '1.5', '-i', 'in.mov', '-t', '3'])
  assert.equal(after(trimmed, '-vf'), 'fps=30,scale=720:-2:flags=lanczos')
  assert.ok(trimmed.includes('-an'), 'the video outputs are silent, and say so in the UI')

  const clamped = videoToAnimationArgs({ format: 'webp', input: 'a', fps: 999, width: 99999 })
  assert.equal(after(clamped, '-vf'), `fps=${FPS_MAX},scale=2000:-2:flags=lanczos`)
})

test('fps is clamped to what GIF can actually store', () => {
  assert.equal(clampFps(0), 1)
  assert.equal(clampFps(-4), 1)
  assert.equal(clampFps('abc'), 1)
  assert.equal(clampFps(12.4), 12)
  assert.equal(clampFps(120), FPS_MAX)
  assert.equal(FPS_MAX, 50, 'GIF delays are in hundredths of a second; above 50 fps rates collide')
})

test('progress comes from the encoder\'s own status lines', () => {
  const line = 'frame=   12 fps=0.0 q=-0.0 Lsize=       2kB time=00:00:01.39 bitrate=  13.1kbits/s speed=82.7x'
  assert.equal(parseFrame(line), 12)
  assert.equal(parseTime(line), 1.39)
  assert.equal(parseTime('time=01:02:03.50'), 3723.5)
  assert.equal(parseFrame('Stream #0:0: Video: gif'), null)
  assert.equal(parseTime(''), null)
  assert.equal(parseFrame(undefined), null)
})

test('reordering moves one frame and leaves the rest in order', () => {
  const l = ['a', 'b', 'c', 'd']
  assert.deepEqual(moveItem(l, 0, 2), ['b', 'c', 'a', 'd'])
  assert.deepEqual(moveItem(l, 3, 0), ['d', 'a', 'b', 'c'])
  assert.deepEqual(moveItem(l, 1, 2), ['a', 'c', 'b', 'd'])
  assert.equal(moveItem(l, 0, 0), l)
  assert.equal(moveItem(l, -1, 2), l, 'out of range is a no-op, not a splice at -1')
  assert.equal(moveItem(l, 0, 4), l)
  assert.deepEqual(l, ['a', 'b', 'c', 'd'], 'the input was mutated')
})

test('output size: first frame sets the shape; even only where H.264 demands it', () => {
  assert.deepEqual(animationSize(640, 480, 320), { w: 320, h: 240 })
  assert.deepEqual(animationSize(333, 333, 333), { w: 333, h: 333 })
  assert.deepEqual(animationSize(333, 333, 333, { evenDims: true }), { w: 332, h: 332 })
  assert.deepEqual(animationSize(100, 37, 101, { evenDims: true }), { w: 100, h: 36 })
  // Capped on both axes.
  const tall = animationSize(100, 4000, 1000)
  assert.ok(tall.h <= MAX_ANIMATION_SIDE && tall.w <= MAX_ANIMATION_SIDE, JSON.stringify(tall))
  assert.equal(animationSize(8000, 100, 8000).w, MAX_ANIMATION_SIDE)
  assert.deepEqual(animationSize(0, 0, 100), { w: 0, h: 0 })
})

test('frames are contained and centred, never stretched', () => {
  assert.deepEqual(fitContain(200, 100, 100, 100), { x: 0, y: 25, w: 100, h: 50 })
  assert.deepEqual(fitContain(100, 200, 100, 100), { x: 25, y: 0, w: 50, h: 100 })
  assert.deepEqual(fitContain(50, 50, 100, 100), { x: 0, y: 0, w: 100, h: 100 })
})

test('the timing line states the file\'s real timing', () => {
  assert.equal(describeTiming(12, 8), '12 frames · 1.5 s · 125 ms each')
  assert.equal(describeTiming(1, 10), '1 frame · 0.1 s · 100 ms each')
  assert.equal(describeTiming(300, 24), '300 frames · 12.5 s · 42 ms each')
})

test('frame names match the pattern the encoder reads', () => {
  assert.equal(frameName(0), 'f0001.png')
  assert.equal(frameName(299), 'f0300.png')
  assert.equal(FRAME_PATTERN, 'f%04d.png')
  assert.equal(findFormat('nope').id, 'gif', 'an unknown id falls back rather than throwing')
})
