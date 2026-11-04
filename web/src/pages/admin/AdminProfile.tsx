import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconLock, IconUser } from './adminIcons'
import { Notice, Pill, SectionHead } from './adminUi'
import { passwordRequirements, passwordMeetsRequirements } from '../../lib/passwordRules'
import type { StaffRole } from '../../types/database.types'

interface ProfileRow {
  full_name: string
  email: string
  phone: string
  role: StaffRole
  employee_id: string
}

const emptyPasswordForm = { current: '', password: '', confirm: '' }

// The signed-in staff member's own account: who they are and a password
// change. Name/role edits stay on the Staff tab (staff_update is admin-only),
// so this page only reads the staff row.
export default function AdminProfile() {
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyPasswordForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      setEmail(user?.email ?? null)
      if (user) {
        const { data } = await supabase
          .from('staff')
          .select('full_name, email, phone, role, employee_id')
          .eq('id', user.id)
          .maybeSingle()
        setProfile((data as ProfileRow | null) ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!email) return setError('Could not read your account email. Try signing in again.')
    if (!form.current) return setError('Enter your current password.')
    if (!passwordMeetsRequirements(form.password)) return setError('New password does not meet the requirements below.')
    if (form.password !== form.confirm) return setError("New passwords don't match.")
    if (form.password === form.current) return setError('New password must be different from your current one.')

    setSaving(true)
    // Re-check the current password first, so someone using an unattended
    // signed-in screen can't quietly take over the account.
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: form.current })
    if (verifyError) {
      setSaving(false)
      return setError('Current password is incorrect.')
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: form.password })
    setSaving(false)
    if (updateError) return setError(updateError.message)
    setForm(emptyPasswordForm)
    setNotice('Password updated. Use your new password next time you sign in.')
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-prof-head {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .rk-prof-avatar {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-red), #7a0000);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.375rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        .rk-prof-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          text-transform: uppercase;
          color: var(--text);
          line-height: 1.1;
        }
        .rk-prof-email {
          font-size: 0.875rem;
          color: var(--text-muted);
          overflow-wrap: anywhere;
        }
        .rk-prof-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
          gap: 0.875rem;
          margin: 1.25rem 0 0;
        }
        .rk-prof-details dt {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .rk-prof-details dd {
          margin: 0.25rem 0 0;
          font-size: 0.9375rem;
          color: var(--text);
        }
        .rk-prof-note {
          font-size: 0.75rem;
          color: var(--text-faint);
          margin-top: 1rem;
        }
        .rk-prof-form {
          max-width: 32rem;
        }
        .rk-prof-pw-reqs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem 1rem;
        }
        .rk-prof-pw-req {
          font-size: 0.6875rem;
          color: var(--text-faint);
        }
        .rk-prof-pw-req-met {
          color: #0a8f0a;
          font-weight: 700;
        }
        [data-theme='dark'] .rk-prof-pw-req-met {
          color: #2fd12f;
        }
        .rk-prof-actions {
          margin-top: 1rem;
        }
      `}</style>

      <div className="rk-admin-card">
        <SectionHead icon={<IconUser />} title="My account" desc="The account you're signed in with." />
        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : (
          <>
            <div className="rk-prof-head">
              <div className="rk-prof-avatar" aria-hidden="true">
                {(profile?.full_name || email || 'A').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="rk-prof-name">{profile?.full_name || 'No name set'}</div>
                <div className="rk-prof-email">{email}</div>
              </div>
            </div>
            <dl className="rk-prof-details">
              <div>
                <dt>Role</dt>
                <dd>
                  <Pill tone={profile?.role === 'staff' ? 'neutral' : 'info'}>{profile?.role === 'developer' ? 'Developer' : profile?.role === 'admin' ? 'Admin' : 'Staff'}</Pill>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{profile?.phone || '—'}</dd>
              </div>
              <div>
                <dt>Employee ID</dt>
                <dd>{profile?.employee_id || '—'}</dd>
              </div>
            </dl>
            <p className="rk-prof-note">To change your name, phone or role, ask an admin to edit it on the Staff tab.</p>
          </>
        )}
      </div>

      <div className="rk-admin-card">
        <SectionHead icon={<IconLock />} title="Change password" desc="Enter your current password, then choose a new one." />
        {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}
        {notice && <Notice tone="ok" onDismiss={() => setNotice(null)}>{notice}</Notice>}
        <form className="rk-prof-form" onSubmit={changePassword}>
          <div className="rk-ui-form">
            <label className="rk-ui-field rk-ui-field-full">
              <span>Current password</span>
              <input
                type="password"
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                autoComplete="current-password"
              />
            </label>
            <label className="rk-ui-field rk-ui-field-full">
              <span>New password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
              <span className="rk-prof-pw-reqs">
                {passwordRequirements.map((req) => {
                  const met = req.test(form.password)
                  return (
                    <span key={req.label} className={`rk-prof-pw-req ${met ? 'rk-prof-pw-req-met' : ''}`}>
                      {met ? '✓' : '·'} {req.label}
                    </span>
                  )
                })}
              </span>
            </label>
            <label className="rk-ui-field rk-ui-field-full">
              <span>Confirm new password</span>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="rk-prof-actions">
            <button type="submit" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" disabled={saving}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
