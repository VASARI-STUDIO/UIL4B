# From image: sample photos

The four sample photos offered in the From image dialog on `/create/palette`.
Each has a full-size file (1536 px on the long side, WebP) and a 320 px thumbnail.

I could not verify an Unsplash licence page for any candidate photo
(unsplash.com answers automated requests with a bot challenge), so none was used.
These are generated images, made for UIL4B with OpenAI's image model through the
Codex CLI on 2026-10-31. They show no real person, place or brand, so there is no
photographer to credit and no third-party licence. They are ours to ship.

| File | What it shows | Source | Licence |
| --- | --- | --- | --- |
| `market.webp` | A fruit and flower market stall | Generated for UIL4B | Ours; no third-party rights |
| `coast.webp` | A rocky coastal headland at dusk | Generated for UIL4B | Ours; no third-party rights |
| `interior.webp` | A sunlit hall with one blue door | Generated for UIL4B | Ours; no third-party rights |
| `leaf.webp` | A close-up of a green leaf with water drops | Generated for UIL4B | Ours; no third-party rights |

The data the dialog reads (labels, files, credit line) is in
`src/data/fromImageSamples.js`.
