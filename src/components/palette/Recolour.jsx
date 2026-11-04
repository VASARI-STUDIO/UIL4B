// A neutral render tinted with a palette colour, so one file serves every
// palette and the texture and light of the object survive.
//
// Three layers, in a stacking context of their own so the blends touch nothing
// outside the wrapper:
//   1. the neutral image;
//   2. a layer of the colour, cut to the asset's mask and multiplied onto it;
//   3. the same image again, cut to the mask and screened on at 25%, to bring
//      the highlights back that the multiply took away.
// A very light colour would multiply to nearly nothing and the screen would wash
// it out, so above OKLCH lightness 0.9 the colour layer takes 85% and the
// highlight layer is off.
//
// `data-role` sits on the wrapper, so "Where each colour lands" outlines the
// whole object. Anything the example draws on the object (a wordmark, a number)
// is passed as children and sits above the layers.
import { hexToOklch } from '../../utils/colors'
import { maskUrl } from '../../data/previewAssets'
import PreviewImage from './PreviewImage'
import './Recolour.css'

const VERY_LIGHT = 90

/**
 * @param {object} props
 * @param {object} props.asset a recolourable entry of PREVIEW_ASSETS
 * @param {string} props.color the colour to paint, as a hex
 * @param {string} [props.role] the colour role, for the legend
 * @param {string} [props.sizes] the displayed width, as the `sizes` attribute reads it
 * @param {boolean} [props.eager] true for an image in the first screen
 * @param {string} [props.className]
 * @param {object} [props.style]
 * @param {import('react').ReactNode} [props.children]
 */
export default function Recolour({ asset, color, role = 'primary', sizes, eager, className = '', style, children }) {
  const light = hexToOklch(color)[0] > VERY_LIGHT
  return (
    <span
      className={`rc ${className}`.trim()}
      data-role={role}
      data-light={light ? 'true' : undefined}
      style={{
        '--rc-color': color,
        '--rc-mask': `url(${maskUrl(asset)})`,
        aspectRatio: `${asset.width} / ${asset.height}`,
        ...style,
      }}
    >
      <PreviewImage asset={asset} sizes={sizes} eager={eager} className="rc-base" />
      <i className="rc-tint" aria-hidden="true" />
      {!light && <PreviewImage asset={asset} sizes={sizes} eager={eager} alt="" className="rc-shine" />}
      {children}
    </span>
  )
}
