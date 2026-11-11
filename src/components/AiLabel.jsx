import { AI_GENERATED_LABEL } from '../config/aiLabel'
import './AiLabel.css'

// A small, quiet marker on a result an AI model produced. `what` names the
// thing for a screen reader only ("AI-generated alt text"); the visible word
// stays short and the same on every tool. The visible text is the start of the
// accessible name, so voice-control users can say what they see.
export default function AiLabel({ what, className = '' }) {
  return (
    <span className={className ? `ai-label ${className}` : 'ai-label'} data-testid="ai-label">
      {AI_GENERATED_LABEL}
      {what && <span className="sr-only"> {what}</span>}
    </span>
  )
}
