// /terms — Terms of Service.
//
// The legal text is written here in English and is not translated. The
// English version is the one that binds, and the page says so. Keeping the
// text in one file means a clause cannot be updated in one language and left
// stale in another. Under another locale the page root is marked lang="en" so
// a screen reader reads the terms in the right voice.
//
// Each clause is a function in SECTIONS. The same list builds the contents
// (LegalContents: the sticky rail, or the "On this page" disclosure on narrow
// screens) and the document, so a clause cannot exist in one and not the other.
// Each clause ends with a BackToContents link, which is drawn only where the
// contents is the disclosure. Ids are fixed (`terms-sN`) so a deep link
// survives a change of heading.
//
import { Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import LegalContents, { BackToContents } from '../components/legal/LegalContents'
import '../styles/pages/content.css'
import '../styles/pages/legal.css'

const SUPPORT = 'support@uil4b.com'

function Mail() {
  return <a className="lgl-a" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>
}

function Acceptance() {
  return (
    <p className="lgl-p">
      UIL4B Design Toolkit (&quot;UIL4B&quot; or &quot;the Service&quot;) is provided by Dylan Coleman, a sole trader based in Brisbane, Queensland, Australia (&quot;we&quot;, &quot;us&quot;). By creating an account or using the Service, you agree to these Terms and to our <Link className="lgl-a" to="/privacy">Privacy Policy</Link>.
    </p>
  )
}

function Account() {
  return (
    <p className="lgl-p">
      You can create an account with an email and password, or with Google. You are responsible for keeping your sign-in details secure and for what happens under your account. You must be at least 18 years old to create an account or use UIL4B&apos;s AI features. If we learn that an account belongs to someone under 18, we will close it and delete its data.
    </p>
  )
}

function Plans() {
  return (
    <>
      <p className="lgl-p">
        UIL4B has a free plan with core features and a Pro plan with more. What each plan includes, and the AI generation allowances, are on the <Link className="lgl-a" to="/plans">Plans page</Link>. Those allowances are part of what you buy, and we will not reduce them during a billing period you have already paid for.
      </p>
      <p className="lgl-p"><strong>Pro subscriptions.</strong> Pro is billed on one of these cycles:</p>
      <div className="lgl-table-wrap">
        <table className="lgl-table">
          <thead>
            <tr>
              <th>Cycle</th>
              <th>Price (USD)</th>
              <th>Free trial</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Cycle">Monthly</td>
              <td data-label="Price (USD)">$7 every month</td>
              <td data-label="Free trial">None. You are charged when you subscribe.</td>
            </tr>
            <tr>
              <td data-label="Cycle">Yearly</td>
              <td data-label="Price (USD)">$48 every year</td>
              <td data-label="Free trial">7 days</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="lgl-p">
        Prices in other currencies are shown on the Plans page and at checkout. <strong>The price and currency shown at checkout are what you pay.</strong> Your bank may add its own currency-conversion fees.
      </p>
      <p className="lgl-p">
        <strong>GST and tax.</strong> We are not registered for GST, so our prices do not include GST and we do not charge it.
      </p>
    </>
  )
}

function TrialsAndRenewal() {
  return (
    <ul className="lgl-list">
      <li><strong>Monthly has no trial.</strong> You are charged the monthly price when you subscribe.</li>
      <li><strong>Yearly starts with a 7-day free trial.</strong> You add a card at checkout. If you do not cancel before the trial ends, your card is charged the full yearly price (for example US$48) automatically. If you cancel during the trial, you pay nothing.</li>
      <li><strong>Subscriptions renew automatically.</strong> After the trial (or straight away, for monthly), your subscription renews at the end of each cycle at the plan price and charges your card, until you cancel.</li>
      <li><strong>Price changes.</strong> If we change the price of your plan, we will email you at least 30 days before it applies to your next renewal, so you can cancel first.</li>
      <li><strong>Reminders.</strong> We show a notice in UIL4B shortly before a trial ends. We do not currently promise reminder emails, so note the date your trial ends.</li>
    </ul>
  )
}

function Cancelling() {
  return (
    <ul className="lgl-list">
      <li><strong>Online, any time.</strong> Go to Settings → Subscription → <strong>Manage billing</strong> (or <strong>Cancel plan</strong>). This opens our secure billing portal, run by Stripe, where you can cancel, change your card and see your invoices. You can also email <Mail /> and we will cancel for you.</li>
      <li><strong>When cancelling takes effect.</strong> Pro continues until the end of the period you have already paid for, then your account moves to the free plan. You will not be charged again. Your work stays in your account.</li>
      <li><strong>During a trial.</strong> Cancelling before the trial ends means you are never charged.</li>
      <li><strong>Deleting your account</strong> (Settings → Delete account) cancels your subscription <strong>immediately</strong> and deletes your data. If you delete your account part-way through a period you have paid for, email <Mail /> before or after deleting and we will refund the unused part.</li>
    </ul>
  )
}

function Refunds() {
  return (
    <>
      <p className="lgl-p">
        Our services come with guarantees that cannot be excluded under the Australian Consumer Law. For major failures with the service, you are entitled:
      </p>
      <ul className="lgl-list">
        <li>to cancel your service contract with us; and</li>
        <li>to a refund for the unused portion, or to compensation for its reduced value.</li>
      </ul>
      <p className="lgl-p">
        You are also entitled to choose a refund or compensation for any other reasonably foreseeable loss or damage. If a failure does not amount to a major failure, you are entitled to have problems with the service rectified in a reasonable time and, if this is not done, to cancel your contract and obtain a refund for the unused portion of the contract.
      </p>
      <p className="lgl-p">
        <strong>Beyond those rights:</strong> we give refunds where the law requires them, including the right to withdraw in section 6A if you are a consumer in the EU or the UK. We do not offer an extra refund window on top of that. Nothing in these Terms limits your rights under the Australian Consumer Law.
      </p>
    </>
  )
}

function Withdrawal() {
  return (
    <>
      <p className="lgl-p">
        <strong>Your right to withdraw.</strong> If you are a consumer in the European Union or the United Kingdom, you can withdraw from a Pro subscription within 14 days of the day you subscribed (the day your free trial started, if you had one), without giving a reason.
      </p>
      <p className="lgl-p">
        <strong>How to withdraw.</strong> Email <Mail /> from your account&apos;s email address and tell us you are withdrawing. You can use the form below, but you do not have to. To meet the deadline, send your withdrawal before the 14 days end.
      </p>
      <p className="lgl-p">
        <strong>Refund.</strong> We refund every payment you made for the subscription within 14 days of receiving your withdrawal, to the payment method you used, at no cost to you. We do not deduct anything for the days you used Pro.
      </p>
      <p className="lgl-p">
        <strong>Model withdrawal form.</strong> To Dylan Coleman, <Mail />: I give notice that I withdraw from my contract for the UIL4B Pro subscription. Subscribed on: ___. Name: ___. Account email: ___. Date: ___.
      </p>
      <p className="lgl-p">
        These rights add to your rights under section 6 and to any other rights your local law gives you.
      </p>
    </>
  )
}

function YourWork() {
  return (
    <>
      <p className="lgl-p">
        <strong>Your work is yours.</strong> Designs, palettes, gradients, type scales, exports and other things you make with UIL4B belong to you. You give us permission to store, copy and process your work only as needed to run the Service for you. That includes syncing it to your account and sending it to our AI providers when you use an AI tool (see our <Link className="lgl-a" to="/privacy">Privacy Policy</Link>).
      </p>
      <p className="lgl-p">
        <strong>Third-party material.</strong> Some of what UIL4B gives you (icon sets, fonts, logos and similar) comes from other people under their own licences, listed on our <Link className="lgl-a" to="/credits">Credits</Link> page. Using UIL4B does not change those licences. You must follow those licences: some require credit, and some require that works using them carry the same licence. For example, a font in your export is still under its own licence, and company logos stay their owners&apos; trade marks.
      </p>
      <p className="lgl-p"><strong>Community submissions.</strong> When you submit a prompt, palette, gradient, design or media to the UIL4B community:</p>
      <ul className="lgl-list">
        <li>you confirm you have the right to share it, and that it does not infringe anyone else&apos;s rights;</li>
        <li>you give us a non-exclusive, worldwide, royalty-free licence to host, display, reproduce, adapt (for example resize or reformat) and distribute it within UIL4B and in material that promotes UIL4B, for as long as it is published and a reasonable time after;</li>
        <li>you understand we review submissions and may decline or remove any of them;</li>
        <li>you can ask us to remove a submission at any time, and deleting your account removes all of them.</li>
      </ul>
      <p className="lgl-p">
        <strong>Our property.</strong> The Service itself (its code, design, content, name and documentation) belongs to us and is protected by copyright and other laws. The published source code is covered by its own licence (the LICENSE file in the repository), which lets you read it but not use it.
      </p>
    </>
  )
}

function Ai() {
  return (
    <ul className="lgl-list">
      <li><strong>AI output can be wrong.</strong> Alt text, prompts and Brand Starter palettes and font choices come from AI models. They can be inaccurate, incomplete or unsuitable. <strong>Check AI output before you rely on it.</strong> This matters most for alt text used to meet accessibility obligations.</li>
      <li><strong>What you send leaves your device.</strong> When you use an AI tool, the image or text you send goes to outside providers, in the United States (Google Gemini, and OpenRouter, which passes text to DeepInfra). The <Link className="lgl-a" to="/privacy#privacy-ai">Privacy Policy</Link> says which tool sends what. Do not send images or text you do not have the right to use, or that contain other people&apos;s personal information without their permission.</li>
      <li><strong>Provider terms apply.</strong> Images and text you submit to the Service&apos;s AI tools are processed by third-party AI providers under those providers&apos; own terms. Images, and any text sent with them, go to Google Gemini, whose terms may allow Google to use what it receives to improve its products. Text-only requests go first to a model reached through OpenRouter, which we set to use only hosts that do not retain or train on it, and fall back to Google Gemini if that route is unavailable, in which case Google&apos;s terms above apply.</li>
      <li><strong>Output may not be unique.</strong> Other people may get similar results, and we cannot promise AI output is free of third-party rights.</li>
      <li><strong>AI capacity is limited and shared.</strong> The AI features are in beta and depend on outside providers. AI allowances are on the Plans page. If a provider is unavailable, an AI feature may be temporarily down.</li>
    </ul>
  )
}

function AcceptableUse() {
  return (
    <>
      <p className="lgl-p">You agree not to:</p>
      <ul className="lgl-list">
        <li>use the Service for anything unlawful, harmful or fraudulent;</li>
        <li>try to access other users&apos; accounts or data without permission;</li>
        <li>reverse engineer, decompile or disassemble the Service, except where the law allows it;</li>
        <li>scrape or extract data from the Service with automated tools;</li>
        <li>get around usage limits, for example by opening multiple accounts or calling our AI endpoints directly;</li>
        <li>upload content that infringes someone&apos;s rights, or that is illegal, abusive or sexually explicit;</li>
        <li>interfere with the Service or its security.</li>
      </ul>
      <p className="lgl-p">
        We may suspend or close an account that seriously or repeatedly breaks these rules. If we close a paid account for a reason other than a breach of these Terms, we will refund the unused part of your subscription.
      </p>
      <p className="lgl-p">
        <strong>How we moderate community content.</strong> A person reviews each community submission before it is published. We do not use automated moderation. Until a submission is reviewed, other signed-in users may be able to see it. We decline or remove content that is illegal or breaks these Terms, and may suspend accounts that repeatedly do so. If we decline or remove your content or restrict your account, you can email <Mail /> to ask why, or to ask us to take a second look.
      </p>
      <p className="lgl-p">
        <strong>Reporting content.</strong> Anyone, with or without an account, can report community content they believe is illegal or breaks these Terms by emailing <Mail />. Tell us where the content is, why you think it is illegal or against these Terms, and your name and email address (you can leave these out if you are reporting child sexual abuse material). We will confirm we have received your report, decide promptly, and tell you what we decided.
      </p>
      <p className="lgl-p">
        <strong>Copyright and trade mark complaints</strong> go to the same address. Tell us which work or mark you own and where it appears.
      </p>
    </>
  )
}

function ChangesToService() {
  return (
    <p className="lgl-p">
      UIL4B is still being built. We may add, change or remove features. If we remove something that is a material part of Pro during a period you have paid for, we will email you and you can cancel and get a pro-rata refund.
    </p>
  )
}

function Liability() {
  return (
    <>
      <p className="lgl-p">
        Apart from the guarantees you have under the Australian Consumer Law (section 6) and any other rights the law gives you that cannot be excluded, we provide the Service as it is, and we do not make other promises about it, such as that it will always be available or error-free.
      </p>
      <p className="lgl-p">Nothing in this section limits your rights under the Australian Consumer Law. To the extent the law allows, and only where the Service is not of a kind ordinarily acquired for personal, domestic or household use:</p>
      <ul className="lgl-list">
        <li>we are not liable for indirect or consequential loss, such as lost profits or lost data, arising from your use of the Service; and</li>
        <li>our liability for failing to meet a consumer guarantee is limited to supplying the service again or paying the cost of having it supplied again.</li>
      </ul>
    </>
  )
}

function ChangesToTerms() {
  return (
    <p className="lgl-p">
      We may update these Terms. For a material change, we will email you at least 30 days before it takes effect. If you keep using the Service after that, the new Terms apply. If you do not agree, you can cancel before they take effect.
    </p>
  )
}

function Governing() {
  return (
    <p className="lgl-p">
      These Terms are governed by the laws of Queensland, Australia. You and we submit to the courts of that state and the courts that can hear appeals from them. If you are a consumer outside Australia, you keep any protections your local law gives you that cannot be excluded.
    </p>
  )
}

function Contact() {
  return (
    <>
      <p className="lgl-p">
        Questions about these Terms, billing or refunds? Email <Mail />.
      </p>
      <p className="lgl-p">
        Dylan Coleman, sole trader, Brisbane, Queensland, Australia.
      </p>
      <p className="lgl-p">
        <strong>Point of contact.</strong> Users and authorities, including under the EU Digital Services Act, can contact us at <Mail />, in English.
      </p>
      <p className="lgl-p">
        These Terms are written in English. If a translated page shows a different version of any clause, the English version is the one that applies.
      </p>
    </>
  )
}

const SECTIONS = [
  { id: 'terms-s1', heading: '1. Who we are and acceptance', render: Acceptance },
  { id: 'terms-s2', heading: '2. Your account', render: Account },
  { id: 'terms-s3', heading: '3. Free and Pro plans', render: Plans },
  { id: 'terms-s4', heading: '4. Free trials and automatic renewal', render: TrialsAndRenewal },
  { id: 'terms-s5', heading: '5. Cancelling', render: Cancelling },
  { id: 'terms-s6', heading: '6. Refunds and your rights under the Australian Consumer Law', render: Refunds },
  { id: 'terms-s6a', heading: '6A. If you are a consumer in the EU or the UK', render: Withdrawal },
  { id: 'terms-s7', heading: '7. Your work and what you share', render: YourWork },
  { id: 'terms-s8', heading: '8. AI features', render: Ai },
  { id: 'terms-s9', heading: '9. Acceptable use and community content', render: AcceptableUse },
  { id: 'terms-s10', heading: '10. Changes to the Service', render: ChangesToService },
  { id: 'terms-s11', heading: '11. Limitation of liability', render: Liability },
  { id: 'terms-s12', heading: '12. Changes to these Terms', render: ChangesToTerms },
  { id: 'terms-s13', heading: '13. Governing law', render: Governing },
  { id: 'terms-s14', heading: '14. Contact', render: Contact },
]

export default function Terms() {
  const { lang } = useI18n()
  const textLang = lang.startsWith('en') ? undefined : 'en'

  return (
    <div className="sec cpg lgl" lang={textLang}>
      <header className="lgl-head">
        <h1 className="cpg-h1">Terms of Service</h1>
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
