// A preview's photograph or render: AVIF first, WebP behind it, and the asset's
// 16px blurred placeholder showing until the file arrives, so the first frame is
// never an empty tile. The image carries its width and height, so it reserves
// its space and nothing shifts when it loads.
//
// An image in the first screen of the open preview passes `eager` (loaded now,
// fetched at high priority); every other image loads when it nears the screen.
import { assetUrl, srcSet } from '../../data/previewAssets'

/**
 * @param {object} props
 * @param {object} props.asset an entry of PREVIEW_ASSETS
 * @param {string} [props.sizes] the displayed width, as the `sizes` attribute reads it
 * @param {boolean} [props.eager] true for an image in the first screen
 * @param {string} [props.alt] overrides the asset's alt text; '' marks the image decorative
 * @param {string} [props.className]
 * @param {object} [props.style]
 */
export default function PreviewImage({ asset, sizes = '100vw', eager = false, alt = asset.alt, className, style }) {
  const widest = asset.widths[asset.widths.length - 1]
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(asset, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(asset, 'webp')} sizes={sizes} />
      <img
        className={className}
        src={assetUrl(asset, widest, 'webp')}
        alt={alt}
        width={asset.width}
        height={asset.height}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        style={{ backgroundImage: `url(${asset.placeholder})`, backgroundSize: '100% 100%', ...style }}
      />
    </picture>
  )
}
