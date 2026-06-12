import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'uil4b'
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null
    if (serviceAccount) {
      initializeApp({ credential: cert(serviceAccount), projectId })
    } else {
      initializeApp({ projectId })
    }
  } catch {
    initializeApp({ projectId })
  }
}

const db = getFirestore()

const VALID_TYPES = ['bug', 'feature', 'general', 'help']
const VALID_SOURCES = ['feedback-form', 'inline', 'email']

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, subject, message, email, source } = req.body || {}

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message must be under 5000 characters' })
  }
  if (subject && subject.length > 200) {
    return res.status(400).json({ error: 'Subject must be under 200 characters' })
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  const safeType = VALID_TYPES.includes(type) ? type : 'general'
  const safeSource = VALID_SOURCES.includes(source) ? source : 'feedback-form'

  const entry = {
    type: safeType,
    subject: (subject || '').trim().slice(0, 200) || `[${safeType}] Submission`,
    message: message.trim().slice(0, 5000),
    email: (email || '').trim().slice(0, 254),
    source: safeSource,
    status: 'new',
    adminNotes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    await db.collection('feedback').add(entry)
  } catch (err) {
    console.error('Firestore write failed:', err.message)
  }

  // Append to a Google Sheet via an Apps Script web app (optional).
  // Set GOOGLE_SHEETS_WEBHOOK_URL in Vercel to enable. See docs/google-sheets-setup.md.
  const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (sheetsWebhook) {
    try {
      await fetch(sheetsWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '',
          createdAt: entry.createdAt,
          type: entry.type,
          status: entry.status,
          subject: entry.subject,
          message: entry.message,
          email: entry.email,
          source: entry.source,
        }),
      })
    } catch (err) {
      console.error('Google Sheets append failed:', err.message)
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL

  if (resendKey && notifyEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'UIL4B <onboarding@resend.dev>',
          to: [notifyEmail],
          subject: `[UIL4B ${entry.type}] ${entry.subject}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <div style="background:#f8f8f6;border:1px solid #e5e5e0;border-radius:12px;padding:24px;margin-bottom:16px">
                <div style="display:flex;gap:8px;margin-bottom:12px">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:4px;background:#eef;color:#55e">${escHtml(entry.type)}</span>
                  <span style="font-size:11px;color:#888">${escHtml(entry.source)}</span>
                </div>
                <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">${escHtml(entry.subject)}</h2>
                <p style="font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap">${escHtml(entry.message)}</p>
                ${entry.email ? `<p style="font-size:12px;color:#666;margin-top:12px">From: <strong>${escHtml(entry.email)}</strong></p>` : ''}
              </div>
              <p style="font-size:11px;color:#aaa;text-align:center">UIL4B Support · ${new Date().toISOString().slice(0, 16)}</p>
            </div>
          `,
        }),
      })
    } catch (err) {
      console.error('Email send failed:', err.message)
    }
  }

  return res.status(200).json({ ok: true })
}
