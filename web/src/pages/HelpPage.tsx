import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { faqTabs } from '../data/helpFaq'

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  )
}

export default function HelpPage() {
  const [tabIndex, setTabIndex] = useState(0)
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)
  const tab = faqTabs[tabIndex]

  return (
    <div>
      <style>{`
        .rk-help-body {
          padding: 1.5rem 1.25rem 3rem;
        }
        .rk-help-search {
          margin-top: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.875rem 1.25rem;
          max-width: 32rem;
          color: var(--text-muted);
        }
        .rk-help-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.875rem;
          color: var(--text);
          width: 100%;
        }
        .rk-help-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin: 2rem 0 1.5rem;
        }
        .rk-help-tab {
          padding: 0.625rem 1.125rem;
          border-radius: 999px;
          border: 1px solid var(--chip-border);
          background: var(--bg);
          color: var(--text);
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
        }
        .rk-help-tab-active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        .rk-faq-list {
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          overflow: hidden;
        }
        .rk-faq-row {
          border-bottom: 1px solid var(--border);
        }
        .rk-faq-row:last-child {
          border-bottom: none;
        }
        .rk-faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.125rem 1.25rem;
          background: none;
          border: none;
          text-align: left;
          font-weight: 700;
          font-size: 0.9375rem;
          color: var(--text);
          cursor: pointer;
        }
        .rk-faq-question svg {
          flex-shrink: 0;
          color: var(--text-faint);
          transition: transform 0.2s ease;
        }
        .rk-faq-question-open svg {
          transform: rotate(90deg);
        }
        .rk-faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .rk-faq-answer-open {
          max-height: 200px;
        }
        .rk-faq-answer p {
          margin: 0 1.25rem 1.125rem;
        }
        .rk-help-contact {
          margin-top: 2rem;
          background: var(--dark-surface);
          color: var(--dark-surface-text);
          border-radius: var(--radius-card);
          padding: 2rem 1.5rem;
        }
        .rk-help-contact-title {
          font-size: 1.5rem;
        }
        .rk-help-contact-sub {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          margin: 0.5rem 0 1.5rem;
        }
        .rk-help-contact-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        .rk-help-contact-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 0.75rem;
          padding: 1rem;
        }
        .rk-help-contact-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rk-help-contact-label {
          font-weight: 700;
          font-size: 0.875rem;
        }
        .rk-help-contact-value {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .rk-help-back {
          display: inline-block;
          margin-top: 2rem;
          color: var(--text-muted);
          font-size: 0.875rem;
          text-decoration: underline;
        }
        @media (min-width: 768px) {
          .rk-help-contact-cards {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
      <PageHero
        eyebrow="Support"
        title="Help Center"
        subtitle="Find answers to frequently asked questions or reach out to our team."
      />
      <div className="rk-help-body">
        <div className="rk-help-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input type="text" placeholder="Search help articles..." aria-label="Search help articles" />
        </div>

        <div className="rk-help-tabs">
          {faqTabs.map((t, i) => (
            <button
              key={t.label}
              className={`rk-help-tab ${i === tabIndex ? 'rk-help-tab-active' : ''}`}
              onClick={() => {
                setTabIndex(i)
                setOpenQuestion(null)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rk-faq-list">
          {tab.items.map((item) => {
            const open = openQuestion === item.question
            return (
              <div key={item.question} className="rk-faq-row">
                <button
                  className={`rk-faq-question ${open ? 'rk-faq-question-open' : ''}`}
                  onClick={() => setOpenQuestion(open ? null : item.question)}
                >
                  {item.question}
                  <ChevronIcon />
                </button>
                <div className={`rk-faq-answer ${open ? 'rk-faq-answer-open' : ''}`}>
                  <p>{item.answer}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rk-help-contact">
          <h2 className="rk-help-contact-title rk-heading">Still Need Help?</h2>
          <p className="rk-help-contact-sub">Our support team is available 7 days a week, 9AM–9PM PHT.</p>
          <div className="rk-help-contact-cards">
            <div className="rk-help-contact-card">
              <div className="rk-help-contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              </div>
              <div>
                <div className="rk-help-contact-label">Live Chat</div>
                <div className="rk-help-contact-value">Chat with us now</div>
              </div>
            </div>
            <div className="rk-help-contact-card">
              <div className="rk-help-contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
              </div>
              <div>
                <div className="rk-help-contact-label">Email Us</div>
                <div className="rk-help-contact-value">support@rhayzkicks.ph</div>
              </div>
            </div>
            <div className="rk-help-contact-card">
              <div className="rk-help-contact-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </div>
              <div>
                <div className="rk-help-contact-label">Call Us</div>
                <div className="rk-help-contact-value">+63 2 8888 0000</div>
              </div>
            </div>
          </div>
        </div>

        <Link to="/" className="rk-help-back">← Back to Home</Link>
      </div>
    </div>
  )
}
