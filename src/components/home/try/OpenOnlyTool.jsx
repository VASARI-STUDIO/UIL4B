import { route } from '../../spectrum/spectrumFacts'
import { ToolLink } from './tryParts'

// A frame that only links into its full tool. It holds the slot (and the fixed
// 600px frame) for a tool whose mini version is not built yet.
export default function OpenOnlyTool({ toolId, label, line }) {
  return (
    <div className="ht-tool ht-tool--open">
      <p className="ht-open-line">{line}</p>
      <ToolLink to={route(toolId)} line="Opens the full tool.">{`Open in ${label}`}</ToolLink>
    </div>
  )
}
