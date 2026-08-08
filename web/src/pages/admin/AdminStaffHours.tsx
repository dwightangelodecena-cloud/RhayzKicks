import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconClock } from './adminIcons'

function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}

interface StaffRow {
  id: string
  full_name: string
}

interface ShiftRow {
  id: string
  staff_id: string
  staff_name: string
  clock_in: string
  clock_out: string | null
  duration_hours: number | null
  notes: string
}

function startOfWeekLocal() {
  const d = new Date()
  const day = d.getDay() // 0 = Sunday
  const diff = (day + 6) % 7 // days since Monday
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm = { staff_id: '', clock_in: toLocalInputValue(new Date()), clock_out: '', notes: '' }

export default function AdminStaffHours() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [staffRes, shiftsRes] = await Promise.all([
      supabase.from('staff').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase.from('staff_shifts_detail').select('*').order('clock_in', { ascending: false }).limit(50),
    ])
    if (staffRes.error || shiftsRes.error) {
      setError((staffRes.error ?? shiftsRes.error)?.message ?? 'Failed to load.')
      setLoading(false)
      return
    }
    setStaff((staffRes.data ?? []) as StaffRow[])
    setShifts((shiftsRes.data ?? []) as ShiftRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const addShift = async () => {
    if (!form.staff_id || !form.clock_in) return
    const { data: userData } = await supabase.auth.getUser()
    const loggedBy = userData.user?.id
    if (!loggedBy) return
    const { error: insertError } = await supabase.from('staff_shifts').insert({
      staff_id: form.staff_id,
      clock_in: new Date(form.clock_in).toISOString(),
      clock_out: form.clock_out ? new Date(form.clock_out).toISOString() : null,
      logged_by: loggedBy,
      notes: form.notes.trim(),
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setForm({ ...emptyForm, clock_in: toLocalInputValue(new Date()) })
    setAdding(false)
    load()
  }

  const removeShift = async (id: string) => {
    const { error: deleteError } = await supabase.from('staff_shifts').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    load()
  }

  const weekStart = startOfWeekLocal()
  const weekTotals = new Map<string, number>()
  for (const s of shifts) {
    if (new Date(s.clock_in) >= weekStart && s.duration_hours != null) {
      weekTotals.set(s.staff_name, (weekTotals.get(s.staff_name) ?? 0) + s.duration_hours)
    }
  }
  const weekSummary = [...weekTotals.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-hours-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
          margin-bottom: 1.5rem;
        }
        .rk-hours-summary-chip {
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          padding: 0.625rem 1rem;
        }
        .rk-hours-summary-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .rk-hours-summary-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.25rem;
          color: var(--text);
        }
        .rk-hours-active {
          color: #0ca30c;
          font-weight: 700;
        }
      `}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="rk-admin-card">
        <h2 className="rk-admin-card-title"><IconClock /> Hours This Week</h2>
        <p className="rk-admin-card-desc">Monday through today, from logged shifts.</p>
        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : weekSummary.length === 0 ? (
          <p className="rk-admin-empty">No completed shifts logged this week yet.</p>
        ) : (
          <div className="rk-hours-summary">
            {weekSummary.map(([name, hours]) => (
              <div key={name} className="rk-hours-summary-chip">
                <div className="rk-hours-summary-name">{name}</div>
                <div className="rk-hours-summary-value">{hours.toFixed(1)}h</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconClock /> Shift Log</h2>
            <p className="rk-admin-card-desc">Clock-in/out records for every staff member.</p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAdding((a) => !a)} disabled={staff.length === 0}>+ Log Shift</button>
        </div>

        {addingFormHint(staff.length)}

        {adding && (
          <div className="rk-admin-form-panel">
            <div className="rk-admin-form-grid">
              <label className="rk-field">
                <span className="rk-field-label">Staff</span>
                <select value={form.staff_id} onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}>
                  <option value="">Select staff…</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Clock in</span>
                <input type="datetime-local" value={form.clock_in} onChange={(e) => setForm((f) => ({ ...f, clock_in: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Clock out (optional)</span>
                <input type="datetime-local" value={form.clock_out} onChange={(e) => setForm((f) => ({ ...f, clock_out: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Notes (optional)</span>
                <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
              <div className="rk-admin-form-actions">
                <button className="rk-admin-add-btn" onClick={addShift}>Save Shift</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : shifts.length === 0 ? (
          <p className="rk-admin-empty">No shifts logged yet.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Hours</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <td>{s.staff_name}</td>
                    <td>{new Date(s.clock_in).toLocaleString()}</td>
                    <td>{s.clock_out ? new Date(s.clock_out).toLocaleString() : <span className="rk-hours-active">Active</span>}</td>
                    <td>{s.duration_hours != null ? `${s.duration_hours.toFixed(2)}h` : '—'}</td>
                    <td>{s.notes || '—'}</td>
                    <td>
                      <button className="rk-admin-icon-btn" onClick={() => removeShift(s.id)} aria-label="Delete"><TrashIcon /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function addingFormHint(staffCount: number) {
  if (staffCount > 0) return null
  return <p className="rk-admin-empty">No active staff found — add staff via the Supabase dashboard first.</p>
}
