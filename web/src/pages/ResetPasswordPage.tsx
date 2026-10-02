import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { supabase } from '../supabase'
import { isCallerStaff } from '../context/AdminContext'
import { passwordRequirements, passwordMeetsRequirements } from '../lib/passwordRules'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

// Landing page for the "reset your password" email (AuthPage → Forgot your
// password? → resetPasswordForEmail with redirectTo /reset-password).
// supabase-js reads the recovery token from the link and signs the person in
// for this one purpose; here they pick a new password with updateUser().
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let settled = false
    const ready = () => {
      settled = true
      setStatus('ready')
    }
    // The link carries an error (expired / already used) in the URL hash or query.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '') + '&' + window.location.search.replace(/^\?/, ''))
    if (params.get('error') || params.get('error_code')) {
      setStatus('invalid')
      return
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) ready()
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) ready()
    })
    // Give supabase-js a moment to exchange the token from the link.
    const t = window.setTimeout(() => {
      if (!settled) setStatus('invalid')
    }, 6000)
    return () => {
      sub.subscription.unsubscribe()
      window.clearTimeout(t)
    }
  }, [])

  const checks = passwordRequirements.map((r) => ({ ...r, met: r.test(password) }))
  const valid = passwordMeetsRequirements(password)
  const canSave = valid && password === confirm && !saving

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setSaving(false)
      setError(updateError.message)
      return
    }
    const staff = await isCallerStaff()
    setSaving(false)
    setStatus('done')
    window.setTimeout(() => navigate(staff ? '/admin/dashboard' : '/account', { replace: true }), 1800)
  }

  return (
    <div>
      <PageHero eyebrow="Account" title="Choose a New Password" />
      <div className="rk-reset-body">
        <style>{`
          .rk-reset-body {
            max-width: 26rem;
            margin: 0 auto;
            padding: 2rem 1.25rem 4rem;
          }
          .rk-reset-note {
            font-size: 0.9375rem;
            color: var(--text-muted);
            line-height: 1.6;
            text-align: center;
          }
          .rk-reset-field {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
            margin-bottom: 1rem;
          }
          .rk-reset-field span {
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--text-muted);
          }
          .rk-reset-field input {
            box-sizing: border-box;
            width: 100%;
            padding: 0.8rem 1rem;
            border: 1px solid var(--border);
            border-radius: 0.625rem;
            background: var(--bg);
            color: var(--text);
            font: inherit;
            font-size: 0.9375rem;
          }
          .rk-reset-field input:focus {
            outline: none;
            border-color: var(--text-muted);
          }
          .rk-reset-rules {
            list-style: none;
            padding: 0;
            margin: -0.25rem 0 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.8125rem;
            color: var(--text-muted);
          }
          .rk-reset-rules li::before {
            content: '○';
            margin-right: 0.5rem;
          }
          .rk-reset-rule-met {
            color: #0ca30c !important;
          }
          .rk-reset-rule-met::before {
            content: '✓' !important;
          }
          .rk-reset-show {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8125rem;
            color: var(--text-muted);
            margin-bottom: 1.25rem;
            cursor: pointer;
          }
          .rk-reset-btn {
            width: 100%;
            border: none;
            border-radius: 999px;
            padding: 1rem;
            background: var(--text);
            color: var(--bg);
            font-weight: 900;
            font-size: 0.875rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            cursor: pointer;
          }
          .rk-reset-btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }
          .rk-reset-error {
            color: var(--accent-red);
            font-size: 0.8125rem;
            font-weight: 600;
            margin: 0 0 1rem;
          }
          .rk-reset-ok {
            color: #0ca30c;
            font-weight: 800;
          }
          .rk-reset-link {
            display: inline-block;
            margin-top: 1.25rem;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.8125rem;
            letter-spacing: 0.04em;
            color: var(--text);
            border-bottom: 2px solid var(--accent-red);
            padding-bottom: 2px;
          }
        `}</style>

        {status === 'checking' && <p className="rk-reset-note">Checking your reset link…</p>}

        {status === 'invalid' && (
          <div style={{ textAlign: 'center' }}>
            <p className="rk-reset-note">
              This reset link is invalid or has expired. Links work once and only for a limited time — request a new one from the sign-in page.
            </p>
            <Link to="/signin" className="rk-reset-link">Request a new link</Link>
          </div>
        )}

        {status === 'done' && (
          <p className="rk-reset-note">
            <span className="rk-reset-ok">Password updated.</span> You’re signed in — taking you to your account…
          </p>
        )}

        {status === 'ready' && (
          <form onSubmit={save}>
            <p className="rk-reset-note" style={{ marginTop: 0, marginBottom: '1.5rem' }}>Pick a new password for your Rhayz Kicks account.</p>
            <label className="rk-reset-field">
              <span>New password</span>
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
            </label>
            <ul className="rk-reset-rules">
              {checks.map((r) => (
                <li key={r.label} className={r.met ? 'rk-reset-rule-met' : ''}>{r.label}</li>
              ))}
            </ul>
            <label className="rk-reset-field">
              <span>Confirm new password</span>
              <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            {confirm.length > 0 && confirm !== password && <p className="rk-reset-error">Passwords don’t match.</p>}
            <label className="rk-reset-show">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
            </label>
            {error && <p className="rk-reset-error">{error}</p>}
            <button type="submit" className="rk-reset-btn" disabled={!canSave}>{saving ? 'Saving…' : 'Save New Password'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
