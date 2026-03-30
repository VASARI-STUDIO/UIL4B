export default function Privacy() {
  return (
    <div className="sec on">
      <div className="sec-h">
        <h1>Privacy Policy</h1>
        <p>Last updated: March 2026</p>
      </div>

      <div className="card" style={{ maxWidth: 720, lineHeight: 1.8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>1. About This Policy</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>
          Visari Studio (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your personal information in accordance with the
          Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). This policy explains how we collect,
          use, disclose, and protect your personal information.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>2. Information We Collect (APP 3)</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>We only collect information reasonably necessary for our services:</p>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          <li>Account information: email address, display name, profile photo (if using Google sign-in)</li>
          <li>Usage preferences: theme settings, saved palettes, tint configurations, prompts</li>
          <li>We do NOT collect: payment card details (handled by Stripe), location data, device identifiers, or tracking cookies</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>3. How We Use Your Information (APP 6)</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>Your information is used solely to:</p>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          <li>Provide and maintain your account and toolkit features</li>
          <li>Sync your design configurations across devices</li>
          <li>Send essential service notifications (account security, policy changes)</li>
          <li>We will NEVER sell your data to third parties or use it for advertising</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>4. Data Storage & Security (APP 8 & 11)</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>
          Your data is stored in Google Cloud Firestore in the <strong>australia-southeast1 (Sydney)</strong> region.
          Authentication is handled by Firebase Authentication. We implement:
        </p>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          <li>Encryption at rest and in transit (TLS 1.3)</li>
          <li>Firestore Security Rules for access control</li>
          <li>Regular security audits of our Firebase configuration</li>
          <li>No cross-border data transfer without equivalent privacy protections</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>5. Your Rights (APP 12 & 13)</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>You have the right to:</p>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          <li><strong>Access</strong> your personal information at any time via Settings</li>
          <li><strong>Correct</strong> your personal information by updating your profile</li>
          <li><strong>Export</strong> all your data as a JSON file via Settings &gt; Export My Data</li>
          <li><strong>Delete</strong> your account and all associated data via Settings &gt; Delete Account</li>
          <li><strong>Withdraw consent</strong> by signing out and deleting your account</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>6. Third-Party Services</h3>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          <li><strong>Firebase/Google Cloud</strong> — Authentication and database (Sydney region)</li>
          <li><strong>Google Fonts</strong> — Font loading (no personal data sent)</li>
          <li><strong>Iconify</strong> — Icon search API (no personal data sent)</li>
          <li><strong>Stripe</strong> — Payment processing (PCI DSS compliant, Australian entity)</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>7. Contact</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>
          For privacy inquiries, data access requests, or complaints, contact us at:{' '}
          <a href="mailto:privacy@visaristudio.com">privacy@visaristudio.com</a>
        </p>
        <p style={{ fontSize: 14, color: 'var(--t1)' }}>
          If you are not satisfied with our response, you may lodge a complaint with the{' '}
          Office of the Australian Information Commissioner (OAIC) at{' '}
          <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
        </p>
      </div>
    </div>
  )
}
