// The settings and foot text of the File Converter's preview tabs (Animation, Video and
// Extract frames), keyed by the tab's index in the converter's MODES list. `settings` are
// the controls, with the choice each starts on; `line` is the foot's status text.

export const SCREENS = {
  1: {
    label: 'Animation',
    settings: [
      { label: 'Format', items: ['GIF', 'WebP', 'APNG', 'MP4', 'WebM'], start: 0 },
      { label: 'Timing', items: ['100 ms', '200 ms', '500 ms'], start: 1 },
    ],
    line: 'A preview. You build the animation in the full tool.',
    short: 'Build it in the full tool.',
  },
  2: {
    label: 'Video',
    settings: [
      { label: 'Crop', items: ['Free', '1:1', '16:9', '9:16'], start: 0 },
      { label: 'Turn', items: ['0°', '90°', '180°', '270°'], start: 0 },
      { label: 'Speed', items: ['0.5×', '1×', '2×'], start: 1 },
      { label: 'Reverse', items: ['Off', 'On'], start: 0 },
    ],
    line: 'A preview. You edit your clip in the full tool.',
    short: 'Edit your clip in the full tool.',
  },
  3: {
    label: 'Extract frames',
    settings: [
      { label: 'Every', items: ['1 s', '2 s', '4 s'], start: 1 },
      { label: 'Format', items: ['PNG', 'JPEG', 'WebP'], start: 0 },
    ],
    line: 'A preview. You pull frames from your video in the full tool.',
    short: 'Pull frames in the full tool.',
  },
}
