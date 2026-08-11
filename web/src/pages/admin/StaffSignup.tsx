import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import { supabase } from '../../supabase'
import { passwordRequirements, passwordMeetsRequirements } from '../../lib/passwordRules'

function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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

export default function StaffSignup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!passwordMeetsRequirements(password)) {
      setError('Password does not meet the requirements below.')
      return
    }
    setSubmitting(true)
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="rk-staff-signup">
      <style>{`
        .rk-staff-signup {
          min-height: 100vh;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
        }
        .rk-staff-signup-card {
          width: 100%;
          max-width: 24rem;
          background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
          border-radius: 1.5rem;
          padding: 2.25rem 1.75rem;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
        }
        .rk-staff-signup-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 1.25rem;
        }
        .rk-staff-signup-eyebrow {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--accent-red);
          margin: 0 0 0.5rem;
          text-align: center;
        }
        .rk-staff-signup-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          font-size: 1.625rem;
          line-height: 1;
          color: #111;
          margin: 0 0 0.5rem;
          text-align: center;
        }
        .rk-staff-signup-blurb {
          font-size: 0.8125rem;
          color: #777;
          text-align: center;
          margin: 0 0 1.5rem;
          line-height: 1.5;
        }
        .rk-staff-signup-field {
          margin-bottom: 1rem;
        }
        .rk-staff-signup-input-wrap {
          position: relative;
        }
        .rk-staff-signup-input-icon {
          position: absolute;
          top: 50%;
          left: 0.9375rem;
          transform: translateY(-50%);
          color: #aaa;
          display: flex;
          pointer-events: none;
        }
        .rk-staff-signup-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border-radius: 0.875rem;
          border: 1.5px solid #e2e2e2;
          background: #fff;
          font-size: 0.9375rem;
          color: #111;
        }
        .rk-staff-signup-input:focus {
          outline: none;
          border-color: var(--accent-red);
          box-shadow: 0 0 0 4px rgba(254, 0, 0, 0.1);
        }
        .rk-staff-signup-reqs {
          margin: 0 0 1.25rem;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .rk-staff-signup-req {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #999;
        }
        .rk-staff-signup-req-met {
          color: #0ca30c;
        }
        .rk-staff-signup-req-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #e2e2e2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rk-staff-signup-req-dot-met {
          background: #0ca30c;
        }
        .rk-staff-signup-error {
          padding: 0.625rem 0.875rem;
          border-radius: 0.625rem;
          font-size: 0.8125rem;
          font-weight: 600;
          margin: 0 0 1rem;
          color: #d61313;
          background: rgba(214, 19, 19, 0.06);
          border: 1px solid rgba(214, 19, 19, 0.15);
        }
        .rk-staff-signup-submit {
          width: 100%;
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
        }
        .rk-staff-signup-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rk-staff-signup-back {
          display: block;
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.8125rem;
          color: #777;
          text-decoration: underline;
        }
        .rk-staff-signup-done-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(12, 163, 12, 0.12);
          color: #0ca30c;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }
      `}</style>

      <div className="rk-staff-signup-card">
        <div className="rk-staff-signup-logo">
          <Logo size={48} />
        </div>

        {done ? (
          <>
            <div className="rk-staff-signup-done-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 className="rk-staff-signup-title">Account Created</h1>
            <p className="rk-staff-signup-blurb">
              Check your email to confirm your address. Once confirmed, let your manager know so they can
              add you to the staff roster — you won't be able to sign in until they do.
            </p>
            <Link to="/admin" className="rk-staff-signup-back">← Back to Sign In</Link>
          </>
        ) : (
          <>
            <p className="rk-staff-signup-eyebrow">New Hire</p>
            <h1 className="rk-staff-signup-title">Create Your Login</h1>
            <p className="rk-staff-signup-blurb">
              This creates your account credentials only. Ask an admin to add you to the staff roster
              afterward — you won't have dashboard access until they do.
            </p>
            <form onSubmit={submit}>
              <div className="rk-staff-signup-field">
                <div className="rk-staff-signup-input-wrap">
                  <span className="rk-staff-signup-input-icon"><MailIcon /></span>
                  <input
                    className="rk-staff-signup-input"
                    type="email"
                    placeholder="Work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="rk-staff-signup-field">
                <div className="rk-staff-signup-input-wrap">
                  <span className="rk-staff-signup-input-icon"><LockIcon /></span>
                  <input
                    className="rk-staff-signup-input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <ul className="rk-staff-signup-reqs">
                {passwordRequirements.map((req) => {
                  const met = req.test(password)
                  return (
                    <li key={req.label} className={`rk-staff-signup-req ${met ? 'rk-staff-signup-req-met' : ''}`}>
                      <span className={`rk-staff-signup-req-dot ${met ? 'rk-staff-signup-req-dot-met' : ''}`}>
                        {met && <CheckIcon />}
                      </span>
                      {req.label}
                    </li>
                  )
                })}
              </ul>
              {error && <p className="rk-staff-signup-error">{error}</p>}
              <button type="submit" className="rk-staff-signup-submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Account'}
              </button>
            </form>
            <Link to="/admin" className="rk-staff-signup-back">← Back to Sign In</Link>
          </>
        )}
      </div>
    </div>
  )
}
