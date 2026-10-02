import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconUsers } from './adminIcons'
import { EmptyState, Modal, Notice, Pill, SearchInput, SectionHead, Segmented, Toolbar } from './adminUi'
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

type Filter = 'all' | 'admin' | 'staff' | 'inactive'

// What each role can open in the admin area, in plain words (mirrors the tab
// list in AdminDashboard).
const roleInfo: Record<StaffRole, { label: string; desc: string }> = {
  admin: { label: 'Admin', desc: 'Every tab — products, content, vendors, loyalty, the team and reports.' },
  staff: { label: 'Staff', desc: 'Day-to-day work only — Sales, Inventory, Delivery and their own clock-in.' },
}

const roles: StaffRole[] = ['staff', 'admin']

const emptyForm = { email: '', password: '', full_name: '', phone: '', role: 'staff' as StaffRole, employee_id: '' }

// A role change or (de)activation waiting for the admin to confirm.
type Pending = { kind: 'role'; row: StaffRow; role: StaffRole } | { kind: 'active'; row: StaffRow }

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminStaff({ onChanged, onViewHours }: { onChanged?: () => void; onViewHours?: (staffId: string) => void } = {}) {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [selfId, setSelfId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [pending, setPending] = useState<Pending | null>(null)
  const [applying, setApplying] = useState(false)

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

  const afterChange = () => {
    load()
    onChanged?.()
  }

  const addStaff = async () => {
    if (!form.email.trim() || !form.full_name.trim()) {
      setFormError('Full name and email are required.')
      return
    }
    if (!passwordMeetsRequirements(form.password)) {
      setFormError('Password does not meet the requirements below.')
      return
    }
    setSaving(true)
    setFormError(null)
    setNotice(null)
    try {
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
        // response body the function returned. Not every invoke error carries a
        // real Response here (e.g. a network-level FunctionsFetchError doesn't),
        // so guard for a `.json` method rather than assuming — and skip `.clone()`
        // since the body is only read once.
        const context = (invokeError as { context?: Response }).context
        const bodyMessage =
          context && typeof context.json === 'function' ? await context.json().then((b) => b?.error).catch(() => null) : null
        throw new Error(bodyMessage ?? invokeError.message)
      }
      if (data?.error) throw new Error(data.error)

      setNotice(`${form.full_name.trim()} was added. They can sign in now with ${form.email.trim()} and the password you set.`)
      setForm(emptyForm)
      setAdding(false)
      afterChange()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add staff.')
    } finally {
      setSaving(false)
    }
  }

  const setRole = async (id: string, role: StaffRole) => {
    const { error: updateError } = await supabase.from('staff').update({ role }).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return false
    }
    afterChange()
    return true
  }

  const toggleActive = async (row: StaffRow) => {
    const { error: updateError } = await supabase.from('staff').update({ is_active: !row.is_active }).eq('id', row.id)
    if (updateError) {
      setError(updateError.message)
      return false
    }
    afterChange()
    return true
  }

  const confirmPending = async () => {
    if (!pending) return
    setApplying(true)
    setError(null)
    setNotice(null)
    const ok = pending.kind === 'role' ? await setRole(pending.row.id, pending.role) : await toggleActive(pending.row)
    setApplying(false)
    if (ok) {
      const name = pending.row.full_name
      setNotice(
        pending.kind === 'role'
          ? `${name} is now ${pending.role === 'admin' ? 'an Admin' : 'Staff'}.`
          : pending.row.is_active
            ? `${name} was deactivated and can no longer open the admin area.`
            : `${name} was reactivated and can sign in again.`,
      )
    }
    setPending(null)
  }

  const activeAdmins = staff.filter((o) => o.role === 'admin' && o.is_active).length

  const counts = useMemo(
    () => ({
      all: staff.length,
      admin: staff.filter((s) => s.is_active && s.role === 'admin').length,
      staff: staff.filter((s) => s.is_active && s.role === 'staff').length,
      inactive: staff.filter((s) => !s.is_active).length,
    }),
    [staff],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return staff.filter((s) => {
      if (filter === 'admin' && !(s.is_active && s.role === 'admin')) return false
      if (filter === 'staff' && !(s.is_active && s.role === 'staff')) return false
      if (filter === 'inactive' && s.is_active) return false
      if (!q) return true
      return [s.full_name, s.email, s.phone, s.employee_id].some((v) => (v ?? '').toLowerCase().includes(q))
    })
  }, [staff, query, filter])

  const closeAdd = () => {
    if (saving) return
    setAdding(false)
    setFormError(null)
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-team-avatar {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.125rem;
          text-transform: uppercase;
          background: var(--bg-secondary);
          color: var(--text);
          border: 1px solid var(--border);
        }
        .rk-team-avatar-admin {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        .rk-team-row-off .rk-team-avatar,
        .rk-team-row-off .rk-ui-list-main {
          opacity: 0.6;
        }
        .rk-team-you {
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--bg);
          background: var(--text-muted);
          border-radius: 999px;
          padding: 0.1rem 0.45rem;
          margin-left: 0.5rem;
          vertical-align: middle;
        }
        .rk-team-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.125rem 0.75rem;
          overflow-wrap: anywhere;
        }
        .rk-team-lock {
          font-size: 0.6875rem;
          color: var(--text-faint);
          margin-top: 0.25rem;
        }
        .rk-team-pills {
          display: flex;
          gap: 0.375rem;
          flex-wrap: wrap;
        }
        .rk-team-actions {
          display: flex;
          gap: 0.375rem;
          flex-wrap: wrap;
        }
        .rk-team-legend {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
          gap: 0.5rem 1rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: -0.25rem 0 1rem;
        }
        .rk-team-legend b {
          color: var(--text);
        }
        .rk-team-pw-reqs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem 1rem;
        }
        .rk-team-pw-req {
          font-size: 0.6875rem;
          color: var(--text-faint);
        }
        .rk-team-pw-req-met {
          color: #0a8f0a;
          font-weight: 700;
        }
        [data-theme='dark'] .rk-team-pw-req-met {
          color: #2fd12f;
        }
        .rk-team-role-choice {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
          gap: 0.5rem;
        }
        .rk-team-role-option {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          text-align: left;
          font: inherit;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.625rem;
          padding: 0.625rem 0.75rem;
          cursor: pointer;
        }
        .rk-team-role-option:hover {
          border-color: var(--text-muted);
        }
        .rk-team-role-option-on {
          border-color: var(--text);
          box-shadow: 0 0 0 1px var(--text) inset;
        }
        .rk-team-role-option b {
          font-size: 0.8125rem;
        }
        .rk-team-role-option span {
          font-size: 0.6875rem;
          color: var(--text-muted);
        }
        .rk-team-howto {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
          line-height: 1.5;
        }
        .rk-team-confirm-text {
          font-size: 0.875rem;
          color: var(--text);
          margin: 0;
          line-height: 1.55;
        }
      `}</style>

      <div className="rk-admin-card">
        <SectionHead
          icon={<IconUsers />}
          title="Team members"
          desc="Everyone who can sign in to this admin area. Admins can open every tab; Staff only see the day-to-day tabs."
          actions={
            <button
              type="button"
              className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg"
              onClick={() => {
                setFormError(null)
                setAdding(true)
              }}
            >
              + Add team member
            </button>
          }
        />

        {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}
        {notice && <Notice tone="ok" onDismiss={() => setNotice(null)}>{notice}</Notice>}

        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email, phone or employee ID…" />
          <Segmented
            label="Filter team members"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Everyone', count: counts.all },
              { value: 'admin', label: 'Admins', count: counts.admin },
              { value: 'staff', label: 'Staff', count: counts.staff },
              { value: 'inactive', label: 'Deactivated', count: counts.inactive },
            ]}
          />
        </Toolbar>

        <div className="rk-team-legend">
          {roles
            .slice()
            .reverse()
            .map((r) => (
              <span key={r}>
                <b>{roleInfo[r].label}:</b> {roleInfo[r].desc}
              </span>
            ))}
        </div>

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : staff.length === 0 ? (
          <EmptyState
            title="No team members yet"
            hint="Add the people who will ring up sales or manage the shop."
            action={<button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setAdding(true)}>+ Add team member</button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState title="Nobody matches" hint="Try “Everyone” or clear the search." />
        ) : (
          <div className="rk-ui-list">
            {visible.map((s) => {
              const isSelf = s.id === selfId
              const onlyActiveAdmin = s.role === 'admin' && s.is_active && activeAdmins === 1
              const lockRole = isSelf || onlyActiveAdmin
              const lockReason = isSelf
                ? 'This is you — another admin has to change your role or deactivate you.'
                : onlyActiveAdmin
                  ? 'Only active admin — make someone else an admin first.'
                  : null
              const hired = fmtDate(s.date_hired)
              const otherRole: StaffRole = s.role === 'admin' ? 'staff' : 'admin'
              return (
                <div
                  key={s.id}
                  className={`rk-ui-list-row ${s.is_active ? '' : 'rk-team-row-off'}`}
                >
                  <div className={`rk-team-avatar ${s.role === 'admin' ? 'rk-team-avatar-admin' : ''}`} aria-hidden="true">
                    {(s.full_name || s.email || '?').trim().charAt(0)}
                  </div>
                  <div className="rk-ui-list-main">
                    <div className="rk-ui-list-title">
                      {s.full_name || 'Unnamed'}
                      {isSelf && <span className="rk-team-you">YOU</span>}
                    </div>
                    <div className="rk-ui-list-meta rk-team-meta">
                      <span>{s.email}</span>
                      {s.phone && <span>{s.phone}</span>}
                      {s.employee_id && <span>ID {s.employee_id}</span>}
                      {hired && <span>Joined {hired}</span>}
                    </div>
                    {lockReason && <div className="rk-team-lock">{lockReason}</div>}
                  </div>
                  <div className="rk-ui-list-side">
                    <div className="rk-team-pills">
                      <Pill tone={s.role === 'admin' ? 'info' : 'neutral'}>{roleInfo[s.role].label}</Pill>
                      <Pill tone={s.is_active ? 'ok' : 'alert'}>{s.is_active ? 'Active' : 'Deactivated'}</Pill>
                    </div>
                    <div className="rk-team-actions">
                      {onViewHours && s.role !== 'admin' && (
                        <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => onViewHours(s.id)}>
                          View hours
                        </button>
                      )}
                      <button
                        type="button"
                        className="rk-ui-btn"
                        onClick={() => setPending({ kind: 'role', row: s, role: otherRole })}
                        disabled={lockRole}
                        title={lockReason ?? undefined}
                      >
                        {otherRole === 'admin' ? 'Make admin' : 'Make staff'}
                      </button>
                      <button
                        type="button"
                        className={`rk-ui-btn ${s.is_active ? 'rk-ui-btn-danger' : ''}`}
                        onClick={() => setPending({ kind: 'active', row: s })}
                        disabled={lockRole}
                        title={lockReason ?? undefined}
                      >
                        {s.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {adding && (
        <Modal
          title="Add team member"
          subtitle="Creates their sign-in and adds them to the team in one step."
          onClose={closeAdd}
          width={40}
          footer={
            <>
              <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={closeAdd} disabled={saving}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={addStaff} disabled={saving}>
                {saving ? 'Adding…' : 'Add team member'}
              </button>
            </>
          }
        >
          <p className="rk-team-howto">
            Choose a password for them now. Their account is ready immediately — no confirmation email is sent — so share the email and
            password with them in person, and they can sign in right away.
          </p>
          {formError && <Notice tone="alert">{formError}</Notice>}
          <div className="rk-ui-form">
            <label className="rk-ui-field">
              <span>Full name</span>
              <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} autoFocus />
            </label>
            <label className="rk-ui-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoComplete="off" />
              <span className="rk-ui-field-hint">They sign in with this.</span>
            </label>
            <label className="rk-ui-field rk-ui-field-full">
              <span>Password</span>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
              <span className="rk-team-pw-reqs">
                {passwordRequirements.map((req) => {
                  const met = req.test(form.password)
                  return (
                    <span key={req.label} className={`rk-team-pw-req ${met ? 'rk-team-pw-req-met' : ''}`}>
                      {met ? '✓' : '·'} {req.label}
                    </span>
                  )
                })}
              </span>
            </label>
            <label className="rk-ui-field">
              <span>Phone (optional)</span>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <label className="rk-ui-field">
              <span>Employee ID (optional)</span>
              <input value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} />
            </label>
            <div className="rk-ui-field rk-ui-field-full">
              <span>What can they access?</span>
              <div className="rk-team-role-choice" role="radiogroup" aria-label="Role">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={form.role === r}
                    className={`rk-team-role-option ${form.role === r ? 'rk-team-role-option-on' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                  >
                    <b>{roleInfo[r].label}</b>
                    <span>{roleInfo[r].desc}</span>
                  </button>
                ))}
              </div>
              <span className="rk-ui-field-hint">You can change this later.</span>
            </div>
          </div>
        </Modal>
      )}

      {pending && (
        <Modal
          title={
            pending.kind === 'role'
              ? `Make ${pending.row.full_name} ${pending.role === 'admin' ? 'an admin' : 'staff'}?`
              : `${pending.row.is_active ? 'Deactivate' : 'Reactivate'} ${pending.row.full_name}?`
          }
          onClose={() => !applying && setPending(null)}
          width={30}
          footer={
            <>
              <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => setPending(null)} disabled={applying}>Cancel</button>
              <button
                type="button"
                className={`rk-ui-btn ${pending.kind === 'active' && pending.row.is_active ? 'rk-ui-btn-danger' : 'rk-ui-btn-primary'}`}
                onClick={confirmPending}
                disabled={applying}
              >
                {applying
                  ? 'Saving…'
                  : pending.kind === 'role'
                    ? `Yes, make ${pending.role === 'admin' ? 'admin' : 'staff'}`
                    : pending.row.is_active
                      ? 'Yes, deactivate'
                      : 'Yes, reactivate'}
              </button>
            </>
          }
        >
          <p className="rk-team-confirm-text">
            {pending.kind === 'role'
              ? pending.role === 'admin'
                ? 'They will be able to open every tab, including products, content, vendors, loyalty, reports and this Staff tab.'
                : 'They will only see Sales, Inventory, Delivery and their own clock-in. They lose access to every other tab.'
              : pending.row.is_active
                ? 'They will no longer be able to open the admin area. Their past sales and shifts are kept, and you can reactivate them at any time.'
                : 'They will be able to sign in to the admin area again with their existing email and password.'}
          </p>
        </Modal>
      )}
    </div>
  )
}
