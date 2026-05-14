import { useI18n } from '../contexts/I18nContext'

const LINKS = [
  {
    id: 'github',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
    titleKey: 'community.github',
    descKey: 'community.githubDesc',
    url: 'https://github.com/vasari-studio/web-design-toolkit',
  },
  {
    id: 'discussions',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    titleKey: 'community.discussions',
    descKey: 'community.discussionsDesc',
    url: 'https://github.com/vasari-studio/web-design-toolkit/discussions',
  },
  {
    id: 'issues',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    titleKey: 'community.reportIssue',
    descKey: 'community.reportIssueDesc',
    url: 'https://github.com/vasari-studio/web-design-toolkit/issues/new',
  },
]

export default function Community() {
  const { t } = useI18n()
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('community.title')}</h1>
        <p>{t('community.subtitle')}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {LINKS.map(link => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24, textDecoration: 'none', color: 'inherit', transition: 'all .22s' }}
          >
            <div style={{ color: 'var(--accent)' }}>{link.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t(link.titleKey)}</div>
              <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>{t(link.descKey)}</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, marginTop: 'auto' }}>
              {t('community.visitLink')} →
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
