// A schematic of the sample delivery. Solid track is travelled, dashed is ahead.
export default function KerbsideRoute() {
  return (
    <svg className="kerbside-route" viewBox="0 0 480 78" width="480" height="78" role="img" aria-label="Delivery route from Brunswick Street to Adelaide Street. The rider is past halfway.">
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity=".16" aria-hidden="true">
        <path d="M0 10h480M0 38h480M0 68h480M42 0v78M110 0v78M192 0v78M278 0v78M344 0v78M428 0v78M0 74 116 0m236 78L480 5" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 38h98V10h82v28h86" />
        <path d="M278 38h66v30h84V38h40" strokeDasharray="5 5" />
      </g>
      <circle cx="12" cy="38" r="6" fill="currentColor" />
      <circle cx="468" cy="38" r="6" fill="var(--route-paper,white)" stroke="currentColor" strokeWidth="3" />
      <circle cx="278" cy="38" r="9" fill="var(--route-signal,currentColor)" stroke="var(--route-paper,white)" strokeWidth="3" />
    </svg>
  )
}
