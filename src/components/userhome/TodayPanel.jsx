import LocalClock from '../LocalClock'
import PlanStrip from './PlanStrip'

// "Today": the viewer's own date and time as a feature, with the day's allowances directly under
// it (the date frames a daily allowance, which is why they share a surface).
//
// The clock is the viewer's machine's (LocalClock renders nothing until the browser has answered, so
// no prerendered shell carries a date). Its two rows reserve their height, so the meters below never
// move when it mounts. Digits change in place on the minute, with no transition.
//
// Signed out there is no plan to report; the panel carries the sign-in instead (the sentence this page
// has always given a stranger, minus its dash).
//
//   meters = null         no allowances drawn (resolving, signed out, projects failed to load)
//   signedOut + onSignIn  the sign-in block
export default function TodayPanel({ meters, signedOut, onSignIn }) {
  return (
    <section className="uh-today" aria-labelledby="uh-today-h">
      <h2 id="uh-today-h" className="uh-sr">Today</h2>
      <div className="uh-today-clock">
        <LocalClock className="uh-clock" stacked />
      </div>
      {meters && (
        <>
          <hr className="uh-rule" />
          <PlanStrip {...meters} />
        </>
      )}
      {signedOut && (
        <>
          <hr className="uh-rule" />
          <div className="uh-signin">
            <p className="uh-signin-title">Sign in to keep what you build</p>
            <p className="uh-signin-text">
              Every tool works without an account. Signing in is what makes a palette, a pairing and a
              scale survive the tab, saved together as a project you can reopen on any device.
            </p>
            <button type="button" className="uh-ghost uh-block" onClick={onSignIn}>Sign in</button>
          </div>
        </>
      )}
    </section>
  )
}
