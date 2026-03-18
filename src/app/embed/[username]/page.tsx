'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface CreatorData {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  profileUrl: string;
}

/**
 * Embeddable creator profile card.
 * Rendered in iframes on external sites.
 * Minimal CSS — no Next.js nav, no auth.
 */
export default function EmbedPage() {
  const params = useParams();
  const username = params.username as string;
  const [data, setData] = useState<CreatorData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/embed/${username}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true));
  }, [username]);

  if (error) {
    return (
      <div style={styles.card}>
        <p style={styles.errorText}>Creator not found</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.card}>
        <div style={styles.loading} />
      </div>
    );
  }

  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: 'transparent', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <a href={data.profileUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
          <div style={styles.card}>
            <div style={styles.header}>
              {data.avatarUrl ? (
                <img src={data.avatarUrl} alt="" style={styles.avatar} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {(data.displayName || data.username || '?')[0].toUpperCase()}
                </div>
              )}
              <div style={styles.info}>
                <div style={styles.nameRow}>
                  <span style={styles.name}>{data.displayName || data.username}</span>
                  {data.isVerified && <span style={styles.verified}>✓</span>}
                </div>
                <span style={styles.username}>@{data.username}</span>
              </div>
            </div>
            {data.bio && (
              <p style={styles.bio}>{data.bio.length > 100 ? data.bio.slice(0, 100) + '...' : data.bio}</p>
            )}
            <div style={styles.cta}>
              <span style={styles.ctaText}>View Profile on Digis</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17l10-10M7 7h10v10"/>
              </svg>
            </div>
          </div>
        </a>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  link: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
  },
  card: {
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    border: '1px solid rgba(34, 211, 238, 0.2)',
    borderRadius: 16,
    padding: 16,
    maxWidth: 340,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    cursor: 'pointer',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '2px solid rgba(34, 211, 238, 0.4)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: 18,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontWeight: 600,
    color: 'white',
    fontSize: 15,
  },
  verified: {
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: 700,
  },
  liveBadge: {
    background: '#ef4444',
    color: 'white',
    fontSize: 9,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  username: {
    color: '#94a3b8',
    fontSize: 13,
  },
  bio: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: '1.4',
    margin: '8px 0',
  },
  cta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 0 2px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: 8,
    color: '#22d3ee',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: 600,
  },
  loading: {
    width: 24,
    height: 24,
    border: '2px solid rgba(34, 211, 238, 0.3)',
    borderTop: '2px solid #22d3ee',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '20px auto',
  },
  errorText: {
    color: '#94a3b8',
    textAlign: 'center' as const,
    padding: '20px 0',
    fontSize: 14,
  },
};
