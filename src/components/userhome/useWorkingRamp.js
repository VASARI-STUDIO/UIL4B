import { useMemo } from 'react'
import { tintConfigFor } from '../../data/designDefaults'
import { generateTintScale } from '../../utils/colors'

// The ramp the workspace draws as the Palette Builder's sample: the working design's palette
// when it has one, otherwise the eleven-stop ramp the Tint tool builds from its base (the same
// ramp /learn/help shows as "what a new project starts from"). A real render of the tool's own
// output, never a drawn stand-in.
export default function useWorkingRamp(design) {
  return useMemo(() => {
    const colors = (design?.palette?.colors || []).filter(Boolean)
    if (colors.length > 1) return colors
    try { return generateTintScale(tintConfigFor(design)) } catch { return colors }
  }, [design])
}
