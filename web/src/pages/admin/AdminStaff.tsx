import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconUsers } from './adminIcons'
import { passwordRequirements, passwordMeetsRequirements } from '../../lib/passwordRules'
import type { StaffRole } from '../../types/database.types'

interface StaffRow {
  id: string
  full_name: string
  email: string
  phone: string
  role: StaffRole
  employee_id: string
  date_hired: string
  is_active: boolean
}

const roles: StaffRole[] = ['staff', 'admin']

type SignupMode = 'password' | 'existing'

const emptyForm = { email: '', password: '', full_name: '', phone: '', role: 'staff' as StaffRole, employee_id: '' }

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [selfId, setSelfId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)
  const [signupMode, setSignupMode] = useState<SignupMode>('password')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [staffRes, userRes] = await Promise.all([
      supabase.from('staff').select('*').order('full_name'),
      supabase.auth.getUser(),
    ])
    if (staffRes.error) {
      setError(staffRes.error.message)
      setLoading(false)
      return
    }
    setStaff((staffRes.data ?? []) as StaffRow[])
    setSelfId(userRes.data.user?.id ?? null)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const addStaffExisting = async () => {
    const { error: rpcError } = await supabase.rpc('create_staff_account', {
      p_email: form.email.trim(),
      p_full_name: form.full_name.trim(),
      p_phone: form.phone.trim(),
      p_role: form.role,
      p_employee_id: form.employee_id.trim(),
    })
    if (rpcError) throw new Error(rpcError.message)
  }

  const addStaffWithPassword = async () => {
    if (!passwordMeetsRequirements(form.password)) {
      throw new Error('Password does not meet the requirements below.')
    }
    const { data, error: invokeError } = await supabase.functions.invoke('create-staff-account', {
      body: {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        employee_id: form.employee_id.trim(),
      },
    })
    if (invokeError) {
      // FunctionsHttpError's .message is a generic "non-2xx status" string — the
      // actual reason (e.g. "Password must be at least 8 characters") is in the
      // response body the function returned.
      const context = (invokeError as { context?: Response }).context
      const bodyMessage = context ? await context.clone().json().then((b) => b?.error).catch(() => null) : null
      throw new Error(bodyMessage ?? invokeError.message)
    }
    if (data?.error) throw new Error(data.error)
  }

  const addStaff = async () => {
    if (!form.email.trim() || !form.full_name.trim()) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (signupMode === 'password') {
        await addStaffWithPassword()
      } else {
        await addStaffExisting()
      }
      setNotice(`${form.full_name} added to the staff roster.`)
      setForm(emptyForm)
      setAdding(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add staff.')
    } finally {
      setSaving(false)
    }
  }

  const setRole = async (id: string, role: StaffRole) => {
    const { error: updateError } = await supabase.from('staff').update({ role }).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  const toggleActive = async (row: StaffRow) => {
    const { error: updateError } = await supabase.from('staff').update({ is_active: !row.is_active }).eq('id', row.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-staff-mode-toggle {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.875rem;
          grid-column: 1 / -1;
        }
        .rk-staff-mode-btn {
          flex: 1;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text-muted);
          padding: 0.625rem 0.75rem;
          border-radius: 0.625rem;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .rk-staff-mode-btn-active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        .rk-staff-pw-reqs {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1rem;
          margin: -0.25rem 0 0.25rem;
        }
        .rk-staff-pw-req {
          font-size: 0.6875rem;
          color: var(--text-faint);
        }
        .rk-staff-pw-req-met {
          color: #0ca30c;
          font-weight: 700;
        }
        .rk-staff-you-tag {
          font-size: 0.625rem;
          font-weight: 800;
          color: var(--text-faint);
          margin-left: 0.375rem;
        }
      `}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}
      {notice && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: '#0ca30c', margin: 0 }}>{notice}</p>
        </div>
      )}

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconUsers /> Staff Roster</h2>
            <p className="rk-admin-card-desc">Set a password directly, or link someone who already signed up at <code>/staff/signup</code>.</p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAdding((a) => !a)}>+ Add Staff</button>
        </div>

        {adding && (
          <div className="rk-admin-form-panel">
            <div className="rk-admin-form-grid">
              <div className="rk-staff-mode-toggle">
                <button
                  type="button"
                  className={`rk-staff-mode-btn ${signupMode === 'password' ? 'rk-staff-mode-btn-active' : ''}`}
                  onClick={() => setSignupMode('password')}
                >
                  Set a password now
                </button>
                <button
                  type="button"
                  className={`rk-staff-mode-btn ${signupMode === 'existing' ? 'rk-staff-mode-btn-active' : ''}`}
                  onClick={() => setSignupMode('existing')}
                >
                  Already signed up
                </button>
              </div>

              <label className="rk-field">
                <span className="rk-field-label">Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>

              {signupMode === 'password' && (
                <label className="rk-field">
                  <span className="rk-field-label">Password</span>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
                </label>
              )}

              <label className="rk-field">
                <span className="rk-field-label">Full name</span>
                <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Phone</span>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Role</span>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Employee ID (optional)</span>
                <input value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} />
              </label>

              {signupMode === 'password' && (
                <div className="rk-staff-pw-reqs">
                  {passwordRequirements.map((req) => {
                    const met = req.test(form.password)
                    return (
                      <span key={req.label} className={`rk-staff-pw-req ${met ? 'rk-staff-pw-req-met' : ''}`}>
                        {met ? '✓' : '·'} {req.label}
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="rk-admin-form-actions">
                <button className="rk-admin-add-btn" onClick={addStaff} disabled={saving}>{saving ? 'Adding…' : 'Add to Roster'}</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="rk-admin-empty">No staff yet.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const isSelf = s.id === selfId
                  const onlyActiveAdmin = s.role === 'admin' && s.is_active && staff.filter((o) => o.role === 'admin' && o.is_active).length === 1
                  const lockRole = isSelf || onlyActiveAdmin
                  return (
                    <tr key={s.id}>
                      <td>{s.full_name}{isSelf && <span className="rk-staff-you-tag">YOU</span>}</td>
                      <td>{s.email}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.employee_id || '—'}</td>
                      <td>
                        <select
                          value={s.role}
                          onChange={(e) => setRole(s.id, e.target.value as StaffRole)}
                          disabled={lockRole}
                          title={lockRole ? "Can't change the only active admin's role" : undefined}
                        >
                          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className={`rk-admin-badge ${s.is_active ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}>
                          {s.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="rk-admin-icon-btn"
                          onClick={() => toggleActive(s)}
                          disabled={lockRole}
                          title={lockRole ? "Can't deactivate the only active admin" : undefined}
                        >
                          {s.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
