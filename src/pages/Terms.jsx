export default function Terms() {
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Terms of Service</h1>
        <p>Last updated: March 2026</p>
      </div>

      <div className="card" style={{ maxWidth: 720, lineHeight: 1.8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>1. Acceptance</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>
          By using Visari Studio Web Design Toolkit (&quot;the Service&quot;), you agree to these Terms of Service.
          The Service is provided by Visari Studio, an Australian-based business. These terms are governed by the
          laws of Australia.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>2. Account</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>
          You may create an account using email/password or Google authentication. You are responsible for maintaining
          the security of your account credentials. You must be at least 16 years old to create an account.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>3. Free & Pro Tiers</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>
          The Service offers a free tier with core features and a Pro tier with additional tools.
          Pro subscriptions are billed monthly or annually. You may cancel at any time; access continues
          until the end of the billing period. Refunds are handled on a case-by-case basis in accordance
          with Australian Consumer Law.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>4. Intellectual Property</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>
          Designs, palettes, gradients, and other outputs you create using the Service belong to you.
          The Service itself, including its code, design, and documentation, is owned by Visari Studio
          and protected under Australian copyright law.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>5. Acceptable Use</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>You agree not to:</p>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorised access to other users&apos; accounts</li>
          <li>Reverse engineer, decompile, or disassemble the Service</li>
          <li>Use automated systems to scrape or extract data from the Service</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>6. Limitation of Liability</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>
          The Service is provided &quot;as is&quot; without warranties of any kind, except as required by Australian Consumer Law.
          To the maximum extent permitted by law, Visari Studio is not liable for any indirect, incidental,
          or consequential damages arising from your use of the Service.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>7. Changes</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>
          We may update these Terms from time to time. Material changes will be communicated via email
          or an in-app notification at least 30 days before they take effect.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>8. Contact</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)' }}>
          Questions about these Terms? Contact us at{' '}
          <a href="mailto:legal@visaristudio.com">legal@visaristudio.com</a>.
        </p>
      </div>
    </div>
  )
}
