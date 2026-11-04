// /privacy — Privacy & data.
//
// The policy text is written here in English and is not translated. The
// English version is the one that binds, and the page says so. Under another
// locale the page root is marked lang="en" so a screen reader reads the policy
// in the right voice.
//
// Each clause is a function in SECTIONS. The same list builds the contents
// (LegalContents: the sticky rail, or the "On this page" disclosure on narrow
// screens) and the document, so a clause cannot exist in one and not the other.
// Each clause ends with a BackToContents link, which is drawn only where the
// contents is the disclosure. Ids are fixed (`privacy-…`) so a deep link
// survives a change of heading.
//
// Three things here are held to the code by tests and must stay true:
//   · the storage table is generated from KEY_PURPOSES in utils/dataExport.js,
//     the same table the exporter and "Clear local data" use, so the policy
//     cannot list keys the app does not write;
//   · the Vercel Web Analytics sentence matches the <Analytics /> mount in
//     src/main.jsx;
//   · the policy claims no stored passwords. Sign-in is Firebase Authentication.
//
// The storage table keeps its `data-label` cells: below 640px legal.css hides
// the <thead> and lays each row out as a list item. The other tables (AI
// tools, providers) use `lgl-table`, which stacks prose cells under their
// labels instead.
//
import { Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import LegalContents, { BackToContents } from '../components/legal/LegalContents'
import { KEY_PURPOSES } from '../utils/dataExport'
import '../styles/pages/content.css'
import '../styles/pages/legal.css'

const SUPPORT = 'support@uil4b.com'

function Mail() {
  return <a className="lgl-a" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>
}

// Generated from the single shared table in utils/dataExport.js.
const STORAGE_DISCLOSURE = Object.entries(KEY_PURPOSES)
  .map(([key, meta]) => ({ key, ...meta }))
  .sort((a, b) => a.key.localeCompare(b.key))

function About() {
  return (
    <>
      <p className="lgl-p">
        UIL4B (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is run by Dylan Coleman, a sole trader based in Brisbane, Queensland, Australia. We handle your personal information in line with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles. This policy covers what we collect, why, where it goes (including overseas), how long we keep it, and how to reach us.
      </p>
      <p className="lgl-p">
        This policy is written in English. If a translated page shows a different version of any clause, the English version is the one that applies.
      </p>
    </>
  )
}

function Collect() {
  return (
    <>
      <p className="lgl-p">We only collect what we need to run UIL4B.</p>
      <p className="lgl-p">
        <strong>Without an account.</strong> Every tool except the four AI tools works signed out, and your work stays in your browser (see &quot;What we store on your device&quot;). The AI tools need an account, and section 3 says what they send. Some things still leave your device when you are signed out: Vercel&apos;s page-view analytics and named product events, Google&apos;s sign-in script, and automatic crash reports. Each is described below.
      </p>
      <p className="lgl-p"><strong>When you create an account:</strong></p>
      <ul className="lgl-list">
        <li>Account details: email address, a password if you sign up with email (kept by Firebase Authentication, which we cannot read), display name, and profile photo (the photo only if you sign in with Google), plus any bio or community handle you add.</li>
        <li>Your onboarding answer, if you give one (what you want to make first).</li>
        <li>Your settings and work. When you are signed in, they sync to your account (Google Firebase, which stores it in Google data centres that may be outside Australia, including in the United States). That covers, for example, your saved projects (including any logo you upload), your current design, your AI prompt library, pinned and recent tools, theme, language and appearance settings.</li>
        <li>Your plan and billing status: plan, subscription status, renewal or trial-end dates, and the Stripe customer ID that links your account to Stripe.</li>
        <li>AI usage counts: how many AI generations your account has used against its allowance (a lifetime total for a free account, a monthly total for Pro). These are counts only, not the content.</li>
      </ul>
      <p className="lgl-p">
        <strong>When you pay:</strong> Stripe collects your card details and billing address. <strong>We never see or store your full card number.</strong>
      </p>
      <p className="lgl-p">
        <strong>When you send feedback or a bug report:</strong> your message, its subject and type, and your email if you give it. With the feedback form you can also choose to send page context: the page and tool you were on, your screen size, theme, motion setting, plan, whether you are signed in, and the app version. You can untick any of these before sending.
      </p>
      <p className="lgl-p">
        <strong>When you submit to the community</strong> (a prompt, palette, gradient or design): the submission, any image or video you attach, and your display name.
      </p>
      <p className="lgl-p">
        <strong>Automatically:</strong> like every website, our host receives your IP address and browser details with each request. To limit abuse, our servers keep a scrambled (salted and hashed) form of your IP address for rate limiting, not the address itself.
      </p>
      <p className="lgl-p">
        <strong>Google&apos;s sign-in script.</strong> While you are signed out, every page loads Google&apos;s sign-in script so it can offer the One Tap prompt. Google therefore receives your IP address, browser details and its own cookies, even if you never click the prompt. What Google does with them is covered by Google&apos;s own privacy policy.
      </p>
      <p className="lgl-p">
        <strong>Crash reports.</strong> If UIL4B hits an uncaught error, it can send us an automatic crash report, whether or not you are signed in. The report holds the page route (without any query string), the error message with email addresses removed, and the top lines of the error&apos;s stack trace (file names and line numbers). It does not hold your account details. We store it with feedback in our database (Google Firebase), receive it by email (Resend), and copy it to a spreadsheet (Google Sheets) if that is switched on. Sending it also creates the scrambled IP rate-limit record described above. A browser sends at most two a session, and the session storage remembers which ones it has sent.
      </p>
      <p className="lgl-p">
        <strong>We do not collect</strong> government identifiers, precise location, contacts or advertising IDs.
      </p>
    </>
  )
}

function Ai() {
  return (
    <>
      <p className="lgl-p">
        Four features send content to an outside AI provider. Everything else in UIL4B runs in your browser. Google, OpenRouter and DeepInfra are United States companies.
      </p>
      <div className="lgl-table-wrap">
        <table className="lgl-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>What is sent</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Feature">Alt Text generator</td>
              <td data-label="What is sent"><span><strong>The image you upload</strong>, plus any page context you type</span></td>
              <td data-label="Provider">Google (Gemini API)</td>
            </tr>
            <tr>
              <td data-label="Feature">Scan photo (prompt tools)</td>
              <td data-label="What is sent"><strong>The photo you upload</strong></td>
              <td data-label="Provider">Google (Gemini API)</td>
            </tr>
            <tr>
              <td data-label="Feature">AI prompt generator</td>
              <td data-label="What is sent">The description, style and platform you type</td>
              <td data-label="Provider">OpenRouter, which passes it to an AI model run by DeepInfra (our default model is DeepSeek V3, and we may change it). If that fails, Google (Gemini API) is used instead.</td>
            </tr>
            <tr>
              <td data-label="Feature">Brand Starter</td>
              <td data-label="What is sent">The brief you type</td>
              <td data-label="Provider">OpenRouter (same as above), with Google (Gemini API) as the fallback</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="lgl-p">
        We do not send your name, email or account ID with these requests. We do send the content itself, so <strong>do not put personal or confidential information in an image or brief</strong> you send to an AI tool. We do not store the images or text you send; the providers handle them under their own terms.
      </p>
      <p className="lgl-p">
        <strong>How the providers may use it.</strong> We use the free tier of the Gemini API. Under Google&apos;s terms for that tier, Google may use what we send to improve its products, and trained human reviewers may read it. This applies to the image tools, and to the text tools whenever they fall back to Google. For the text tools, we set OpenRouter to use only DeepInfra, and only on terms that do not allow the host to store your text or train on it. OpenRouter and DeepInfra also have their own policies, which apply on top of those settings.
      </p>
      <p className="lgl-p">
        We do not use computer programs to make decisions that significantly affect your rights or interests. AI usage limits are fixed counts set by your plan.
      </p>
    </>
  )
}

function StorageSection() {
  return (
    <>
      <p className="lgl-p">
        UIL4B writes the following keys to your browser&apos;s localStorage. It also uses your browser&apos;s sessionStorage for short-lived items (for example the record of which crash reports this session has sent), and the sign-in library (Firebase Authentication) keeps your sign-in state in your browser&apos;s IndexedDB database. <strong>Signed out, all of the keys below stay on your device.</strong> When you are signed in, some of it (for example your saved projects and current design) is also copied to your account so it follows you between devices. You can inspect, export, or clear all of this from <Link className="lgl-a" to="/settings">Settings → Your data</Link>.
      </p>
      <div className="lgl-table-wrap">
        <table className="storage-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Purpose</th>
              <th>Personal data</th>
            </tr>
          </thead>
          <tbody>
            {/* `data-label` is what the stacked phone layout shows as the row
                label: below 640px the <thead> is hidden, and without these
                each card would be an unlabelled key, sentence and YES/NO. */}
            {STORAGE_DISCLOSURE.map(row => (
              <tr key={row.key}>
                <td data-label="Key"><span className="storage-key">{row.key}</span></td>
                <td className="storage-purpose" data-label="Purpose">{row.purpose}</td>
                <td data-label="Personal data"><span className="sr-only">Personal data: </span><span className={`storage-pii ${row.pii}`}>{row.pii === 'yes' ? 'Yes' : row.pii === 'local' ? 'Account-bound' : 'No'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lgl-aside">
        <strong>Note:</strong> &quot;Account-bound&quot; means the data is tied to your account. Signed out, it never leaves your device. While you are signed in, some of it is also stored in your account (Google Firebase). Deleting your account deletes that copy, and clearing local data deletes the device copy.
      </p>
      <p className="lgl-p">
        Beyond the keys above, we store small markers named <span className="storage-key">uil4b-event-once:</span> followed by an event name in localStorage. One is set the first time you use a tool, and another the first time you copy or export a result, so each of those events is sent once per browser. They hold no personal information. Clearing your browser&apos;s site data removes them.
      </p>
    </>
  )
}

function AggregateSection() {
  return (
    <p className="lgl-p">
      When you are <strong>signed in</strong>, UIL4B records anonymous, aggregate usage counts in our Firestore database (Google Firebase; see &quot;Who we share it with, and where it goes&quot;) to understand which features are useful and where to invest. Specifically, we increment per-day tallies of which page paths are visited (for example <span className="storage-key">/create/color</span>) and how many times tools are used (for example a font copy or a colour pick). These are running totals shared across all users. They contain <strong>no message content, no prompt text, no colours or fonts you chose, and nothing that identifies you</strong>. We cannot tie a count back to an individual account. Signed-out visitors add nothing to these database counts; the separate Vercel analytics below still apply to them.
    </p>
  )
}

/* Named because src/main.jsx mounts <Analytics /> from @vercel/analytics on
   every route. The sentence states what Vercel's own privacy page states and
   nothing more; tests/unit/analytics-environment.test.js holds it to the
   import in main.jsx in both directions. */
function VercelSection() {
  return (
    <>
      <p className="lgl-p">
        UIL4B also runs Vercel Web Analytics for every visitor, signed in or not. It records each page view with the page URL, referrer, approximate location, device type, operating system and browser; it sets no cookies, ties nothing to your IP address, and tells visits apart by a hash of the request that Vercel discards after 24 hours.
      </p>
      <p className="lgl-p">
        We also send Vercel a few named product events, again for signed-out visitors too: <span className="storage-key">sign_up</span>, <span className="storage-key">checkout_started</span>, <span className="storage-key">upgrade_gate_shown</span>, <span className="storage-key">first_tool_used</span> and <span className="storage-key">first_copy_export</span>. An event can carry a tool name, a kind of result, a plan name or the name of the Pro prompt that opened. It never carries your name, email or account ID.
      </p>
      <p className="lgl-p">
        <strong>Cookies.</strong> We set no advertising or cross-site tracking cookies. Stripe may set fraud-prevention cookies when you open checkout. Google&apos;s sign-in script loads for every signed-out visitor, so Google may use its own cookies on your device whether or not you use Google sign-in.
      </p>
    </>
  )
}

function HowWeUse() {
  return (
    <>
      <p className="lgl-p">We use your information only to:</p>
      <ul className="lgl-list">
        <li>run your account and the toolkit, and sync your work across your devices;</li>
        <li>process payments and manage your subscription;</li>
        <li>run the AI features you ask for and enforce their plan limits;</li>
        <li>read and reply to feedback and support messages, and review community submissions;</li>
        <li>prevent abuse and keep the service secure;</li>
        <li>understand, in aggregate, which features are used;</li>
        <li>send essential service messages (account security, billing, changes to these policies).</li>
      </ul>
      <p className="lgl-p"><strong>We will never sell your personal information or use it for advertising.</strong></p>
    </>
  )
}

function Sharing() {
  const rows = [
    ['Vercel (Vercel Inc.)', 'Hosts the website and runs our server code; Web Analytics (page views and the named product events)', 'Every request, including your IP address, and anything you send to our server (AI requests, feedback, crash reports, checkout and account-deletion requests). Analytics events carry no personal identifiers', 'Our server functions run in Sydney, Australia. Vercel is a United States company, and requests also pass through its global edge network'],
    ['Google Firebase (Google LLC): Authentication, Firestore, Storage', 'Sign-in, your account, synced settings and work, feedback and crash reports, community submissions, usage counts', 'The account, work, feedback, submission and usage information described above. Not card details, and not the content of AI requests', 'Google data centres, which may be outside Australia, including in the United States. This covers the database, file storage and sign-in'],
    ['Google sign-in and One Tap (Google LLC)', '“Continue with Google” and the One Tap prompt. The script loads for every signed-out visitor', 'Your IP address, browser details and Google cookies whenever a signed-out page loads. If you sign in with Google, also your Google account identity', 'United States and other Google locations'],
    ['Google Gemini API (Google LLC)', 'Alt Text, Scan Photo, and the AI fallback', 'Images and text you send to those tools', 'United States and other Google locations'],
    ['OpenRouter (OpenRouter, Inc.) and DeepInfra, the model host it routes to', 'AI prompt generator and Brand Starter', 'Text you send to those tools', 'United States (both companies are US-based)'],
    ['Stripe (Stripe Payments Australia Pty Ltd, with Stripe, Inc.)', 'Payments, subscriptions, invoices, customer billing portal', 'Your email, card and billing details, and your account ID', 'Australia and the United States'],
    ['Resend (Resend, Inc.)', 'Emails feedback, support messages and crash reports to us', 'Your feedback message and the email you gave, or the crash report', 'United States'],
    ['Google Sheets (Google Apps Script)', 'A copy of feedback messages and crash reports in a spreadsheet only we can open. We use this only if we switch it on', 'Your feedback message and email, or the crash report', 'United States and other Google locations'],
    ['Google Fonts (Google LLC)', 'Loads the fonts you preview in the type tools', 'Your IP address and browser details', 'United States and other Google locations'],
    ['Iconify (api.iconify.design)', 'Icon search and icon images', 'Your search terms, IP address and browser details', 'Not stated by the provider. Assume outside Australia'],
    ['logo.dev', 'Company logos in the icon library', 'The company domain being shown, your IP address and browser details', 'Not stated by the provider. Assume outside Australia'],
    ['jsDelivr (cdn.jsdelivr.net)', 'Downloads the video-conversion, 3D and CAD engines to your browser, and font licence files. Your files are not sent', 'Your IP address and browser details', 'Global CDN'],
    ['flagcdn.com', 'Country flag images in Settings → Language', 'Your IP address and browser details', 'Global CDN'],
  ]
  return (
    <>
      <p className="lgl-p">
        We use the service providers below. <strong>Most of them store or process your information outside Australia, mainly in the United States.</strong> We choose established providers and rely on their published security and privacy terms, and we stay responsible under Australian law for how they handle what we send them.
      </p>
      <div className="lgl-table-wrap">
        <table className="lgl-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>What it does for us</th>
              <th>What it receives</th>
              <th>Where</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td data-label="Provider">{r[0]}</td>
                <td data-label="What it does for us">{r[1]}</td>
                <td data-label="What it receives">{r[2]}</td>
                <td data-label="Where">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lgl-p">We may also disclose information if the law requires it, or to protect our users or the service.</p>
    </>
  )
}

function Security() {
  return (
    <>
      <p className="lgl-p">We protect your information with:</p>
      <ul className="lgl-list">
        <li>encryption in transit (HTTPS) and at rest (by our providers);</li>
        <li>Firestore and Storage security rules, so only you can read your account and synced work, and billing fields can only be changed by our server;</li>
        <li>server-side checks on payments, AI limits and account deletion.</li>
      </ul>
      <p className="lgl-p">
        <strong>What other people can see.</strong> Community submissions (prompts, palettes, gradients, designs) and your display name are visible to other signed-in users, including while they wait for review. <strong>Images or videos you attach to a community submission can be opened by anyone who has the link.</strong>
      </p>
      <p className="lgl-p"><strong>How long we keep it:</strong></p>
      <ul className="lgl-list">
        <li>Account data and synced work: until you delete your account.</li>
        <li>Feedback, support messages and crash reports: until you ask us to delete them. Deleting your account removes the copies in our database whose email matches your account&apos;s email. Copies we received by email, and copies in a spreadsheet if that is switched on, stay until you ask us to delete them.</li>
        <li>AI usage counts: until you delete your account.</li>
        <li>Scrambled IP records used for rate limiting: they are not linked to your account, and we do not delete them automatically.</li>
        <li>Payment records: Stripe keeps these, and we keep invoices as long as tax law requires (generally 5 years in Australia). Deleting your account cancels your subscription, but Stripe keeps its payment records.</li>
        <li>AI content: we do not store the images or text you send to the AI tools. The providers keep them under their own terms.</li>
      </ul>
    </>
  )
}

function Rights() {
  return (
    <>
      <p className="lgl-p">You can:</p>
      <ul className="lgl-list">
        <li><strong>see</strong> your information at any time in Settings;</li>
        <li><strong>correct</strong> it by editing your profile;</li>
        <li><strong>export</strong> everything on this device as a JSON file (Settings → Your data → Export);</li>
        <li><strong>delete your account.</strong> Settings → Delete account removes your profile, synced work, AI usage counts, community submissions, uploaded media, and the feedback in our database that was sent with your account&apos;s email address. Copies of feedback we received by email or in a spreadsheet stay until you ask us to delete them. It also cancels any subscription immediately. This cannot be undone;</li>
        <li><strong>ask us</strong> for a copy of what we hold, or to correct or delete it, by emailing <Mail />. We will reply within 30 days.</li>
      </ul>
    </>
  )
}

function Children() {
  return (
    <p className="lgl-p">
      UIL4B is not meant for anyone under 18. If we learn that an account belongs to someone under 18, we will close it and delete its data.
    </p>
  )
}

function Europe() {
  return (
    <>
      <p className="lgl-p">
        <strong>Who is responsible.</strong> Dylan Coleman, a sole trader based in Brisbane, Australia, is the controller of your personal information. Contact us at <Mail />.
      </p>
      <p className="lgl-p"><strong>Why we may use your information (legal bases).</strong></p>
      <ul className="lgl-list">
        <li><em>To provide the service you signed up for</em> (contract): your account, syncing your work, billing, and the AI features you ask for.</li>
        <li><em>Our legitimate interests</em> (which we have weighed against yours): keeping UIL4B secure and preventing abuse (including the scrambled IP records), aggregate usage counts, privacy-friendly page-view analytics, and loading fonts and icons you ask to preview.</li>
        <li><em>Legal obligations</em>: keeping tax and payment records.</li>
        <li><em>Consent</em>: optional page details you choose to attach to feedback. You can withdraw consent at any time.</li>
      </ul>
      <p className="lgl-p">
        <strong>Your rights.</strong> You can ask to access, correct, delete or restrict your information, receive it in a portable format, and object to processing based on legitimate interests. Most of this you can do yourself in Settings, and for the rest email <Mail />. We reply within one month. You can also complain to your local data protection authority (in the UK, the Information Commissioner&apos;s Office; in Switzerland, the Federal Data Protection and Information Commissioner).
      </p>
      <p className="lgl-p">
        <strong>International transfers.</strong> We are based in Australia, and our providers process data in the United States and elsewhere (see &quot;Who we share it with, and where it goes&quot;). Where the law requires it, we rely on the transfer safeguards our providers offer: the European Commission&apos;s standard contractual clauses (and the UK and Swiss equivalents), or the provider&apos;s certification under the EU-US Data Privacy Framework.
      </p>
      <p className="lgl-p">
        <strong>Automated decisions.</strong> We do not make decisions about you by automated means that have legal or similarly significant effects. AI usage limits are fixed counts set by your plan.
      </p>
      <p className="lgl-p">
        <strong>Data breaches.</strong> If a breach of your information is likely to put you at risk, we will tell the regulator and you as the law requires.
      </p>
    </>
  )
}

function ChangesToPolicy() {
  return (
    <p className="lgl-p">
      When we make a material change, we will update the date at the top of this page.
    </p>
  )
}

function Contact() {
  return (
    <>
      <p className="lgl-p">
        For privacy questions, access requests or complaints, email <Mail />. We will reply within 30 days.
      </p>
      <p className="lgl-p">
        If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at{' '}
        <a className="lgl-a" href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
      </p>
    </>
  )
}

const SECTIONS = [
  { id: 'privacy-s1', heading: '1. About this policy', render: About },
  { id: 'privacy-s2', heading: '2. What we collect', render: Collect },
  { id: 'privacy-ai', heading: '3. AI tools: what leaves your device', render: Ai },
  { id: 'privacy-storage', heading: '4. What we store on your device', render: StorageSection },
  { id: 'privacy-aggregate', heading: '5. Aggregate usage counts', render: AggregateSection },
  { id: 'privacy-vercel', heading: '6. Vercel Web Analytics and cookies', render: VercelSection },
  { id: 'privacy-use', heading: '7. How we use your information', render: HowWeUse },
  { id: 'privacy-sharing', heading: '8. Who we share it with, and where it goes', render: Sharing },
  { id: 'privacy-security', heading: '9. Storage, security and retention', render: Security },
  { id: 'privacy-rights', heading: '10. Your rights', render: Rights },
  { id: 'privacy-children', heading: '11. Children', render: Children },
  { id: 'privacy-eu', heading: '12. If you are in the EU, the UK or Switzerland', render: Europe },
  { id: 'privacy-changes', heading: '13. Changes to this policy', render: ChangesToPolicy },
  { id: 'privacy-contact', heading: '14. Contact and complaints', render: Contact },
]

export default function Privacy() {
  const { lang } = useI18n()
  const textLang = lang.startsWith('en') ? undefined : 'en'

  return (
    <div className="sec cpg lgl" lang={textLang}>
      <header className="lgl-head">
        <h1 className="cpg-h1">Privacy &amp; data.</h1>
        <p className="cpg-cap lgl-updated">Last updated: 4 November 2026</p>
      </header>

      <div className="cpg-split">
        <LegalContents items={SECTIONS.map((s) => ({ id: s.id, label: s.heading }))} />

        <div className="legal-card lgl-doc">
          {SECTIONS.map((s) => {
            const Body = s.render
            return (
              <section className="lgl-sec" id={s.id} key={s.id}>
                <h2 className="legal-h lgl-h" tabIndex={-1}>{s.heading}</h2>
                <Body />
                <BackToContents />
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
