import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo'
import { useAdmin } from '../../context/AdminContext'

function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m2.5 6 8.7 6.4a1.7 1.7 0 0 0 2 0L22 6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12.5" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10v-6z" />
      <path d="m8.5 12 2.5 2.5 5-5" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.6 5.6 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.58-5.17 3.58-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.08.72-2.45 1.14-4.06 1.14-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

const capabilities = ['Live Sales Data', 'Inventory Control', 'Staff & Vendors']

export default function AdminLogin() {
  const { login, loginWithGoogle, isAdmin, checkingSession, rejectedReason, clearRejection } = useAdmin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!checkingSession && isAdmin) navigate('/admin/dashboard')
  }, [checkingSession, isAdmin, navigate])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (result.ok) {
      navigate('/admin/dashboard')
    } else {
      setError(result.error ?? 'Unable to sign in.')
    }
  }

  const submitGoogle = async () => {
    clearRejection()
    setError(null)
    const result = await loginWithGoogle()
    if (!result.ok) setError(result.error ?? 'Unable to sign in with Google.')
  }

  const shownError = error ?? rejectedReason

  return (
    <div className="rk-admin-login">
      <style>{`
        .rk-admin-login {
          min-height: 100vh;
          background: #000;
          display: flex;
          flex-direction: column;
        }

        .rk-admin-login-panel {
          position: relative;
          padding: 3rem 1.5rem 2.5rem;
          text-align: center;
          color: #fff;
          overflow: hidden;
          background: #000;
        }
        .rk-admin-login-panel-bg {
          position: absolute;
          inset: -4%;
          z-index: 1;
          background-image: url('/adminlogin.png');
          background-repeat: no-repeat;
          background-size: contain;
          background-position: center;
          background-color: #000;
          animation: rk-admin-login-kenburns 26s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes rk-admin-login-kenburns {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-0.6%, -0.8%); }
        }
        .rk-admin-login-panel-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            radial-gradient(60% 55% at 50% 100%, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.25) 55%, transparent 80%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.05) 40%, rgba(0, 0, 0, 0.75) 100%);
        }
        .rk-admin-login-panel-inner {
          position: relative;
          z-index: 3;
          animation: rk-admin-login-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes rk-admin-login-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rk-admin-login-logo-halo {
          width: 84px;
          height: 84px;
          margin: 0 auto 1.25rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(254, 0, 0, 0.22), transparent 72%);
          box-shadow: 0 0 44px rgba(254, 0, 0, 0.28);
        }
        .rk-admin-login-wordmark {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          font-size: 2rem;
          color: #fff;
          text-shadow: 0 0 32px rgba(254, 0, 0, 0.24);
        }
        .rk-admin-login-wordmark span {
          color: var(--accent-red);
        }
        .rk-admin-login-sub {
          margin-top: 0.375rem;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .rk-admin-login-tagline {
          margin: 1rem auto 0;
          max-width: 24rem;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .rk-admin-login-caps {
          margin: 1.5rem auto 0;
          max-width: 26rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
        }
        .rk-admin-login-cap {
          display: flex;
          align-items: center;
          gap: 0.4375rem;
          font-size: 0.6875rem;
          font-weight: 700;
          color: #fff;
          padding: 0.4375rem 0.8125rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(6px);
        }
        .rk-admin-login-cap svg {
          color: var(--accent-red);
          flex-shrink: 0;
        }

        .rk-admin-login-form-wrap {
          background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
          border-radius: 1.75rem 1.75rem 0 0;
          padding: 2.5rem 1.5rem 3rem;
          box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
          overflow: hidden;
        }
        .rk-admin-login-form-wrap::before {
          content: '';
          position: absolute;
          top: -140px;
          right: -140px;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 0, 0, 0.12), transparent 70%);
          pointer-events: none;
        }
        .rk-admin-login-form-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 22rem;
          margin: 0 auto;
          animation: rk-admin-login-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.08s;
        }
        .rk-admin-login-eyebrow {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--accent-red);
          margin: 0 0 0.5rem;
        }
        .rk-admin-login-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          font-size: 1.875rem;
          line-height: 1;
          color: #111;
          margin: 0;
        }
        .rk-admin-login-heading-rule {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--accent-red), #1a1a1a);
          margin: 0.875rem 0 1.5rem;
        }
        .rk-admin-login-field {
          margin-bottom: 1rem;
        }
        .rk-admin-login-input-wrap {
          position: relative;
        }
        .rk-admin-login-input-icon {
          position: absolute;
          top: 50%;
          left: 0.9375rem;
          transform: translateY(-50%);
          color: #aaa;
          display: flex;
          pointer-events: none;
          transition: color 0.2s ease;
        }
        .rk-admin-login-input-wrap:focus-within .rk-admin-login-input-icon {
          color: var(--accent-red);
        }
        .rk-admin-login-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border-radius: 0.875rem;
          border: 1.5px solid #e2e2e2;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          font-size: 0.9375rem;
          color: #111;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .rk-admin-login-input::placeholder {
          color: #b3b3b3;
        }
        .rk-admin-login-input:hover {
          border-color: #ccc;
        }
        .rk-admin-login-input:focus {
          outline: none;
          border-color: var(--accent-red);
          box-shadow: 0 0 0 4px rgba(254, 0, 0, 0.1);
        }
        .rk-admin-login-input-wrap .rk-admin-login-input {
          padding-right: 2.75rem;
        }
        .rk-admin-login-eye-btn {
          position: absolute;
          top: 50%;
          right: 0.75rem;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0.25rem;
          color: #999;
          cursor: pointer;
          display: flex;
          transition: color 0.15s ease;
        }
        .rk-admin-login-eye-btn:hover {
          color: #222;
        }
        .rk-admin-login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          border-radius: 0.625rem;
          font-size: 0.8125rem;
          font-weight: 600;
          margin: -0.25rem 0 1rem;
          color: #d61313;
          background: rgba(214, 19, 19, 0.06);
          border: 1px solid rgba(214, 19, 19, 0.15);
        }
        .rk-admin-login-error svg {
          flex-shrink: 0;
        }
        .rk-admin-login-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(120deg, var(--accent-red) 0%, #b30000 35%, #111 100%);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 1rem;
          font-weight: 900;
          font-size: 0.875rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(254, 0, 0, 0.22);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .rk-admin-login-submit svg {
          transition: transform 0.2s ease;
        }
        .rk-admin-login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 32px rgba(254, 0, 0, 0.32);
        }
        .rk-admin-login-submit:hover:not(:disabled) svg {
          transform: translateX(3px);
        }
        .rk-admin-login-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .rk-admin-login-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.375rem 0;
          color: #aaa;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .rk-admin-login-divider::before,
        .rk-admin-login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #ececec;
        }
        .rk-admin-login-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          background: #fff;
          color: #111;
          border: 1.5px solid #e5e5e5;
          border-radius: 999px;
          padding: 0.9rem;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
        }
        .rk-admin-login-google:hover {
          border-color: #ccc;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }
        .rk-admin-login-back {
          display: block;
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: #777;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s ease;
        }
        .rk-admin-login-back:hover {
          color: #111;
        }

        @media (min-width: 1024px) {
          .rk-admin-login {
            flex-direction: row;
            align-items: stretch;
          }
          .rk-admin-login-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3rem;
          }
          .rk-admin-login-form-wrap {
            width: 480px;
            flex: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3.5rem 3rem;
            border-radius: 0;
            box-shadow: -24px 0 60px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>

      <div className="rk-admin-login-panel">
        <div className="rk-admin-login-panel-bg" />
        <div className="rk-admin-login-panel-overlay" />
        <div className="rk-admin-login-panel-inner">
          <div className="rk-admin-login-logo-halo">
            <Logo size={64} ring ringColor="rgba(255, 255, 255, 0.18)" ringOffset={4} />
          </div>
          <div className="rk-admin-login-wordmark">RHAYZ<span>.</span></div>
          <div className="rk-admin-login-sub">Admin Console</div>
          <p className="rk-admin-login-tagline">Manage products, inventory, vendors, and staff — everything that runs the store, in one place.</p>
          <div className="rk-admin-login-caps">
            {capabilities.map((c) => (
              <div key={c} className="rk-admin-login-cap">
                <ShieldIcon /> {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rk-admin-login-form-wrap">
        <div className="rk-admin-login-form-content">
          <p className="rk-admin-login-eyebrow">Restricted Access</p>
          <h1 className="rk-admin-login-title">Admin Sign In</h1>
          <div className="rk-admin-login-heading-rule" />
          <form onSubmit={submit}>
            <div className="rk-admin-login-field">
              <div className="rk-admin-login-input-wrap">
                <span className="rk-admin-login-input-icon"><MailIcon /></span>
                <input
                  className="rk-admin-login-input"
                  type="email"
                  placeholder="Admin email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                    clearRejection()
                  }}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="rk-admin-login-field">
              <div className="rk-admin-login-input-wrap">
                <span className="rk-admin-login-input-icon"><LockIcon /></span>
                <input
                  className="rk-admin-login-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                    clearRejection()
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="rk-admin-login-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>
            {shownError && <p className="rk-admin-login-error"><AlertIcon />{shownError}</p>}
            <button type="submit" className="rk-admin-login-submit" disabled={submitting}>
              <span>{submitting ? 'Signing In…' : 'Access CMS'}</span>
              {!submitting && <ArrowIcon />}
            </button>
          </form>
          <div className="rk-admin-login-divider">Or</div>
          <button type="button" className="rk-admin-login-google" onClick={submitGoogle}>
            <GoogleIcon /> Continue with Google
          </button>
          <Link to="/" className="rk-admin-login-back">← Back to Store</Link>
        </div>
      </div>
    </div>
  )
}
