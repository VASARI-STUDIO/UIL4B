import { REPORT_PROBLEM_EVENT } from '../utils/errorReport'

// A quiet "Report a problem" control for the screens where the floating
// Feedback bubble steps aside on a small screen (see FeedbackButton's
// FORM_ROUTE). It opens the same dialog the bubble opens, by the same event the
// crash screen uses, so there is still one feedback pipeline. global.css shows
// it only where the bubble is hidden. If nothing answers the event it falls
// back to the /feedback page.
export default function ReportProblemLink({ subject, className = '' }) {
  const open = () => {
    const event = new CustomEvent(REPORT_PROBLEM_EVENT, { cancelable: true, detail: { typeId: 'bug', subject } })
    if (window.dispatchEvent(event)) window.location.assign('/feedback')
  }
  return (
    <button type="button" className={('report-problem ' + className).trim()} onClick={open}>
      Report a problem
    </button>
  )
}
