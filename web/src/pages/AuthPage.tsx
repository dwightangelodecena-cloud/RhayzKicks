import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { supabase } from '../supabase'
import { isCallerAdmin } from '../context/AdminContext'
import { passwordRequirements, passwordMeetsRequirements } from '../lib/passwordRules'

const perks = ['Free Shipping', 'Early Access', 'Member Discounts', 'Exclusive Drops']

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  )
}

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

function UserIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
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

function SuccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12.5 2.5 2.5 5-5" />
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

interface PasswordFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
}

function PasswordField({ id, label, placeholder, value, onChange, autoComplete }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="rk-auth-field">
      <label className="rk-auth-label" htmlFor={id}>{label}</label>
      <div className="rk-auth-password-wrap">
        <span className="rk-auth-input-icon"><LockIcon /></span>
        <input
          className="rk-auth-input rk-auth-input-has-icon"
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="rk-auth-eye-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon off={visible} />
        </button>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isJoin = location.pathname === '/join'
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const requirementChecks = passwordRequirements.map((r) => ({ ...r, met: r.test(password) }))
  const passwordValid = passwordMeetsRequirements(password)
  const metCount = requirementChecks.filter((r) => r.met).length
  const strengthMeta = [
    { label: 'Too weak', color: '#d61313' },
    { label: 'Weak', color: '#e2712b' },
    { label: 'Good', color: '#d6b60f' },
    { label: 'Strong', color: '#1a9c4a' },
  ][metCount]

  const joinDisabled =
    submitting || !fullName || !email || !passwordValid || password !== confirmPassword || !agreed
  const signInDisabled = submitting || !email || !password

  const resetFeedback = () => {
    setError(null)
    setSuccess(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    resetFeedback()

    if (isJoin) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      setSubmitting(false)
      if (signUpError) {
        setError(signUpError.message)
        return
      }
      setSuccess('Account created! Check your email to confirm, then sign in.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setSubmitting(false)
      setError('Incorrect email or password.')
      return
    }
    const admin = await isCallerAdmin()
    setSubmitting(false)
    navigate(admin ? '/admin/dashboard' : returnTo, { replace: true })
  }

  const continueWithGoogle = async () => {
    resetFeedback()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <div className="rk-auth">
      <style>{`
        .rk-auth {
          min-height: calc(100vh - 1px);
          background: #000;
          display: flex;
          flex-direction: column;
        }
        .rk-auth-panel {
          position: relative;
          padding: 3.5rem 1.5rem 2.75rem;
          text-align: center;
          color: #fff;
          overflow: hidden;
          background: #000;
        }
        .rk-auth-panel-bg {
          position: absolute;
          inset: -4%;
          z-index: 1;
          background-image: url('/login.png');
          background-size: cover;
          background-position: center;
          animation: rk-auth-kenburns 24s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes rk-auth-kenburns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1%, -1.2%); }
        }
        .rk-auth-panel-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            radial-gradient(55% 50% at 50% 48%, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.35) 55%, transparent 80%),
            radial-gradient(60% 55% at 50% 0%, rgba(254, 0, 0, 0.22), transparent 70%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.2) 45%, rgba(0, 0, 0, 0.55) 100%);
        }
        .rk-auth-panel-inner {
          position: relative;
          z-index: 3;
          animation: rk-auth-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes rk-auth-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rk-auth-logo-halo {
          width: 104px;
          height: 104px;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(254, 0, 0, 0.22), transparent 72%);
          box-shadow: 0 0 50px rgba(254, 0, 0, 0.3);
        }
        .rk-auth-wordmark {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          font-size: 2.25rem;
          color: #fff;
          text-shadow: 0 0 32px rgba(254, 0, 0, 0.28);
        }
        .rk-auth-wordmark span {
          color: var(--accent-red);
        }
        .rk-auth-tagline {
          margin: 1rem auto 0;
          max-width: 25rem;
          color: rgba(255, 255, 255, 0.58);
          font-size: 0.9375rem;
          line-height: 1.6;
        }
        .rk-auth-perks {
          margin: 2rem auto 0;
          max-width: 26rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.625rem;
        }
        .rk-auth-perk {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          padding: 0.5rem 0.9375rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(6px);
        }
        .rk-auth-perk-check {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-red), #a30000);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rk-auth-form-wrap {
          background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
          border-radius: 1.75rem 1.75rem 0 0;
          padding: 2.5rem 1.5rem 3rem;
          box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
          overflow: hidden;
          animation: rk-auth-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.08s;
        }
        .rk-auth-form-wrap::before {
          content: '';
          position: absolute;
          top: -140px;
          right: -140px;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 0, 0, 0.13), transparent 70%);
          pointer-events: none;
        }
        .rk-auth-form-blob-2 {
          position: absolute;
          bottom: -160px;
          left: -160px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(17, 17, 17, 0.06), transparent 70%);
          pointer-events: none;
        }
        .rk-auth-form-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 18px 18px;
          -webkit-mask-image: linear-gradient(180deg, black, transparent 55%);
          mask-image: linear-gradient(180deg, black, transparent 55%);
          pointer-events: none;
        }
        .rk-auth-form-content {
          position: relative;
          z-index: 1;
        }
        .rk-auth-eyebrow {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--accent-red);
          margin: 0 0 0.625rem;
        }
        .rk-auth-heading {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          font-size: 2.25rem;
          line-height: 1;
          color: #111;
          margin: 0;
        }
        .rk-auth-heading-rule {
          width: 48px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--accent-red), #1a1a1a);
          margin: 0.9rem 0 1.75rem;
        }
        .rk-auth-tabs {
          position: relative;
          display: flex;
          background: #f1f1f1;
          border-radius: 999px;
          padding: 0.3rem;
          margin-bottom: 2rem;
        }
        .rk-auth-tab-indicator {
          position: absolute;
          top: 0.3rem;
          bottom: 0.3rem;
          left: 0.3rem;
          width: calc(50% - 0.3rem);
          border-radius: 999px;
          background: linear-gradient(135deg, var(--accent-red), #1a1a1a 75%);
          box-shadow: 0 6px 16px rgba(254, 0, 0, 0.28);
          transition: transform 0.32s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .rk-auth-tab {
          position: relative;
          z-index: 1;
          flex: 1;
          border: none;
          background: none;
          padding: 0.8rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          color: #777;
          transition: color 0.25s ease;
        }
        .rk-auth-tab-active {
          color: #fff;
        }
        .rk-auth-field {
          margin-bottom: 1.125rem;
        }
        .rk-auth-label {
          display: block;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #777;
          margin-bottom: 0.5rem;
        }
        .rk-auth-input {
          width: 100%;
          padding: 0.9375rem 1rem;
          border-radius: 0.875rem;
          border: 1.5px solid #e2e2e2;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          font-size: 0.9375rem;
          color: #111;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .rk-auth-input::placeholder {
          color: #b3b3b3;
        }
        .rk-auth-input:hover {
          border-color: #ccc;
        }
        .rk-auth-input:focus {
          outline: none;
          border-color: var(--accent-red);
          box-shadow: 0 0 0 4px rgba(254, 0, 0, 0.1);
        }
        .rk-auth-password-wrap {
          position: relative;
        }
        .rk-auth-password-wrap .rk-auth-input {
          padding-right: 2.75rem;
        }
        .rk-auth-eye-btn {
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
        .rk-auth-eye-btn:hover {
          color: #222;
        }
        .rk-auth-input-wrap {
          position: relative;
        }
        .rk-auth-input-icon {
          position: absolute;
          top: 50%;
          left: 0.9375rem;
          transform: translateY(-50%);
          color: #aaa;
          display: flex;
          pointer-events: none;
          transition: color 0.2s ease;
        }
        .rk-auth-input-wrap:focus-within .rk-auth-input-icon,
        .rk-auth-password-wrap:focus-within .rk-auth-input-icon {
          color: var(--accent-red);
        }
        .rk-auth-input-has-icon {
          padding-left: 2.75rem;
        }
        .rk-auth-strength {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-top: 0.625rem;
        }
        .rk-auth-strength-track {
          flex: 1;
          height: 5px;
          border-radius: 999px;
          background: #eee;
          overflow: hidden;
        }
        .rk-auth-strength-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.25s ease, background-color 0.25s ease;
        }
        .rk-auth-strength-label {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: color 0.25s ease;
        }
        .rk-auth-requirements {
          list-style: none;
          margin: 0.75rem 0 1.25rem;
          padding: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem 0.75rem;
        }
        .rk-auth-requirement {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #999;
          transition: color 0.2s ease;
        }
        .rk-auth-requirement-met {
          color: #1a9c4a;
        }
        .rk-auth-requirement-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .rk-auth-requirement-met .rk-auth-requirement-dot {
          background: #1a9c4a;
          border-color: #1a9c4a;
        }
        .rk-auth-agree {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: #666;
          margin-bottom: 1.25rem;
          line-height: 1.4;
        }
        .rk-auth-agree input[type='checkbox'] {
          margin-top: 2px;
          width: 17px;
          height: 17px;
          accent-color: var(--accent-red);
          flex-shrink: 0;
          cursor: pointer;
        }
        .rk-auth-agree a {
          color: #111;
          font-weight: 700;
        }
        .rk-auth-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(120deg, var(--accent-red) 0%, #b30000 35%, #111 100%);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 1.05rem;
          font-weight: 900;
          font-size: 0.875rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(254, 0, 0, 0.22);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .rk-auth-submit svg {
          transition: transform 0.2s ease;
        }
        .rk-auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 32px rgba(254, 0, 0, 0.32);
        }
        .rk-auth-submit:hover:not(:disabled) svg {
          transform: translateX(3px);
        }
        .rk-auth-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .rk-auth-submit:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }
        .rk-auth-divider {
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
        .rk-auth-divider::before,
        .rk-auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #ececec;
        }
        .rk-auth-google {
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
        .rk-auth-google:hover {
          border-color: #ccc;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }
        .rk-auth-error,
        .rk-auth-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          border-radius: 0.625rem;
          font-size: 0.8125rem;
          font-weight: 600;
          margin: -0.25rem 0 1rem;
        }
        .rk-auth-error {
          color: #d61313;
          background: rgba(214, 19, 19, 0.06);
          border: 1px solid rgba(214, 19, 19, 0.15);
        }
        .rk-auth-success {
          color: #1a9c4a;
          background: rgba(26, 156, 74, 0.07);
          border: 1px solid rgba(26, 156, 74, 0.18);
        }
        .rk-auth-error svg,
        .rk-auth-success svg {
          flex-shrink: 0;
        }
        .rk-auth-forgot {
          display: block;
          text-align: center;
          margin-top: 1.125rem;
          font-size: 0.8125rem;
          color: #777;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s ease;
        }
        .rk-auth-forgot:hover {
          color: #111;
        }
        .rk-auth-back {
          display: block;
          text-align: center;
          margin-top: 1.75rem;
          font-size: 0.875rem;
          color: #777;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s ease;
        }
        .rk-auth-back:hover {
          color: #111;
        }
        @media (min-width: 1024px) {
          .rk-auth {
            flex-direction: row;
            align-items: stretch;
          }
          .rk-auth-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3rem;
          }
          .rk-auth-form-wrap {
            width: 520px;
            flex: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3.5rem 3.25rem 3rem;
            border-radius: 0;
            box-shadow: -24px 0 60px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>

      <div className="rk-auth-panel">
        <div className="rk-auth-panel-bg" />
        <div className="rk-auth-panel-overlay" />
        <div className="rk-auth-panel-inner">
          <div className="rk-auth-logo-halo">
            <Logo size={80} ring ringColor="rgba(255, 255, 255, 0.18)" ringOffset={4} />
          </div>
          <div className="rk-auth-wordmark">RHAYZ<span>.</span></div>
          <p className="rk-auth-tagline">
            {isJoin
              ? 'Join thousands of members enjoying exclusive drops, free shipping, and early access to every new release.'
              : 'Welcome back. Sign in to access your orders, wishlist, and exclusive member benefits.'}
          </p>
          <div className="rk-auth-perks">
            {perks.map((perk) => (
              <div key={perk} className="rk-auth-perk">
                <span className="rk-auth-perk-check"><CheckIcon /></span>
                {perk}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rk-auth-form-wrap">
        <div className="rk-auth-form-blob-2" />
        <div className="rk-auth-form-content">
        <p className="rk-auth-eyebrow">Member Access</p>
        <h1 className="rk-auth-heading">{isJoin ? 'Create Your Account' : 'Welcome Back'}</h1>
        <div className="rk-auth-heading-rule" />
        <div className="rk-auth-tabs">
          <span className="rk-auth-tab-indicator" style={{ transform: isJoin ? 'translateX(100%)' : 'translateX(0%)' }} />
          <button className={`rk-auth-tab ${!isJoin ? 'rk-auth-tab-active' : ''}`} onClick={() => { navigate('/signin', { state: location.state }); resetFeedback() }}>Sign In</button>
          <button className={`rk-auth-tab ${isJoin ? 'rk-auth-tab-active' : ''}`} onClick={() => { navigate('/join', { state: location.state }); resetFeedback() }}>Join Us</button>
        </div>

        <form onSubmit={submit}>
          {isJoin && (
            <div className="rk-auth-field">
              <label className="rk-auth-label" htmlFor="fullName">Full Name</label>
              <div className="rk-auth-input-wrap">
                <span className="rk-auth-input-icon"><UserIcon /></span>
                <input className="rk-auth-input rk-auth-input-has-icon" id="fullName" type="text" placeholder="Maria Santos" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            </div>
          )}
          <div className="rk-auth-field">
            <label className="rk-auth-label" htmlFor="email">Email Address</label>
            <div className="rk-auth-input-wrap">
              <span className="rk-auth-input-icon"><MailIcon /></span>
              <input className="rk-auth-input rk-auth-input-has-icon" id="email" type="email" placeholder="maria@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
          <PasswordField
            id="password"
            label="Password"
            placeholder={isJoin ? 'At least 8 characters' : 'Your password'}
            value={password}
            onChange={setPassword}
            autoComplete={isJoin ? 'new-password' : 'current-password'}
          />
          {isJoin && password.length > 0 && (
            <div className="rk-auth-strength">
              <div className="rk-auth-strength-track">
                <div className="rk-auth-strength-fill" style={{ width: `${(metCount / passwordRequirements.length) * 100}%`, background: strengthMeta.color }} />
              </div>
              <span className="rk-auth-strength-label" style={{ color: strengthMeta.color }}>{strengthMeta.label}</span>
            </div>
          )}
          {isJoin && (
            <ul className="rk-auth-requirements">
              {requirementChecks.map((r) => (
                <li key={r.label} className={`rk-auth-requirement ${r.met ? 'rk-auth-requirement-met' : ''}`}>
                  <span className="rk-auth-requirement-dot">{r.met && <CheckIcon />}</span>
                  {r.label}
                </li>
              ))}
            </ul>
          )}
          {isJoin && (
            <PasswordField
              id="confirmPassword"
              label="Confirm Password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          )}
          {isJoin && confirmPassword.length > 0 && confirmPassword !== password && (
            <p className="rk-auth-error"><AlertIcon />Passwords don't match.</p>
          )}

          {isJoin ? (
            <label className="rk-auth-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I agree to the <a href="#terms">Terms of Use</a> and <a href="#privacy">Privacy Policy</a>.</span>
            </label>
          ) : null}

          {error && <p className="rk-auth-error"><AlertIcon />{error}</p>}
          {success && <p className="rk-auth-success"><SuccessIcon />{success}</p>}

          <button type="submit" className="rk-auth-submit" disabled={isJoin ? joinDisabled : signInDisabled}>
            <span>{submitting ? 'Please Wait…' : isJoin ? 'Create Account' : 'Sign In'}</span>
            {!submitting && <ArrowIcon />}
          </button>
          {!isJoin && <Link to="#forgot" className="rk-auth-forgot">Forgot your password?</Link>}
        </form>

        <div className="rk-auth-divider">Or</div>
        <button type="button" className="rk-auth-google" onClick={continueWithGoogle}>
          <GoogleIcon /> Continue with Google
        </button>

        <Link to="/" className="rk-auth-back">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
