import { Link, Navigate, useParams } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { infoPages } from '../data/infoPages'

// Footer info pages (/info/:slug) — content lives in data/infoPages.ts.
export default function InfoPage() {
  const { slug = '' } = useParams()
  const page = infoPages[slug]
  if (!page) return <Navigate to="/" replace />

  return (
    <div>
      <PageHero eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle} />
      <div className="rk-info-body">
        <style>{`
          .rk-info-body {
            max-width: 46rem;
            margin: 0 auto;
            padding: 2.5rem 1.25rem 4rem;
            color: var(--text);
          }
          .rk-info-section + .rk-info-section {
            margin-top: 2rem;
          }
          .rk-info-heading {
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 900;
            font-size: 1.375rem;
            text-transform: uppercase;
            letter-spacing: 0.01em;
            margin: 0 0 0.75rem;
          }
          .rk-info-body p,
          .rk-info-body li {
            font-size: 0.9375rem;
            line-height: 1.7;
            color: var(--text-muted);
          }
          .rk-info-body p {
            margin: 0 0 0.75rem;
          }
          .rk-info-body ul {
            margin: 0;
            padding-left: 1.25rem;
          }
          .rk-info-body li + li {
            margin-top: 0.35rem;
          }
          .rk-info-table-wrap {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
          }
          .rk-info-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
          }
          .rk-info-table th,
          .rk-info-table td {
            padding: 0.65rem 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
            white-space: nowrap;
          }
          .rk-info-table th {
            font-size: 0.6875rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
            background: var(--bg-secondary);
          }
          .rk-info-table tr:last-child td {
            border-bottom: none;
          }
          .rk-info-links {
            display: flex;
            flex-wrap: wrap;
            gap: 0.625rem;
            margin-top: 2.5rem;
          }
          .rk-info-link {
            display: inline-block;
            padding: 0.75rem 1.25rem;
            border-radius: 999px;
            font-weight: 800;
            font-size: 0.8125rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            text-decoration: none;
            border: 1px solid var(--border);
            color: var(--text);
          }
          .rk-info-link:first-child {
            background: var(--text);
            color: var(--bg);
            border-color: var(--text);
          }
          .rk-info-back {
            display: inline-block;
            margin-top: 2rem;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.8125rem;
            letter-spacing: 0.04em;
            color: var(--text);
            border-bottom: 2px solid var(--accent-red);
            padding-bottom: 2px;
          }
        `}</style>

        {page.sections.map((section, i) => (
          <section key={i} className="rk-info-section">
            {section.heading && <h2 className="rk-info-heading">{section.heading}</h2>}
            {section.body?.map((p, j) => <p key={j}>{p}</p>)}
            {section.bullets && (
              <ul>
                {section.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            )}
            {section.table && (
              <div className="rk-info-table-wrap">
                <table className="rk-info-table">
                  <thead>
                    <tr>{section.table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, j) => (
                      <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        {page.links && (
          <div className="rk-info-links">
            {page.links.map((l) =>
              l.to.startsWith('mailto:') ? (
                <a key={l.label} href={l.to} className="rk-info-link">{l.label}</a>
              ) : (
                <Link key={l.label} to={l.to} className="rk-info-link">{l.label}</Link>
              ),
            )}
          </div>
        )}

        <div>
          <Link to="/" className="rk-info-back">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
