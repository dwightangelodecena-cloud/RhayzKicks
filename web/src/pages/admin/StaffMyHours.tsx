import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconClock } from './adminIcons'

interface ShiftRow {
  id: string
  clock_in: string
  clock_out: string | null
  duration_hours: number | null
  notes: string
}

function startOfWeekLocal() {
  const d = new Date()
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function StaffMyHours() {
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [staffId, setStaffId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const id = userData.user?.id ?? null
    setStaffId(id)
    if (!id) {
      setLoading(false)
      return
    }
    const { data, error: loadError } = await supabase
      .from('staff_shifts')
      .select('id, clock_in, clock_out, duration_hours, notes')
      .eq('staff_id', id)
      .order('clock_in', { ascending: false })
      .limit(30)
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setShifts((data ?? []) as ShiftRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const activeShift = shifts.find((s) => s.clock_out === null) ?? null

  const clockIn = async () => {
    if (!staffId) return
    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase.from('staff_shifts').insert({
      staff_id: staffId,
      clock_in: new Date().toISOString(),
      logged_by: staffId,
    })
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    load()
  }

  const clockOut = async () => {
    if (!activeShift) return
    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('staff_shifts')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', activeShift.id)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  const weekStart = startOfWeekLocal()
  const weekHours = shifts
    .filter((s) => new Date(s.clock_in) >= weekStart && s.duration_hours != null)
    .reduce((sum, s) => sum + (s.duration_hours ?? 0), 0)

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-myhours-clock {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .rk-myhours-status {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-myhours-status-active {
          color: #0ca30c;
          font-weight: 700;
        }
        .rk-myhours-btn {
          border: none;
          border-radius: 999px;
          padding: 0.9rem 2rem;
          font-weight: 900;
          font-size: 0.875rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .rk-myhours-btn-in {
          background: var(--text);
          color: var(--bg);
        }
        .rk-myhours-btn-out {
          background: var(--accent-red);
          color: #fff;
        }
        .rk-myhours-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rk-myhours-week {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.75rem;
          color: var(--text);
        }
      `}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="rk-admin-card">
        <h2 className="rk-admin-card-title"><IconClock /> My Hours</h2>
        <p className="rk-admin-card-desc">Clock in when your shift starts, clock out when it ends.</p>
        <div className="rk-myhours-clock">
          <div>
            <div className="rk-myhours-status">
              {activeShift ? (
                <span className="rk-myhours-status-active">Clocked in since {new Date(activeShift.clock_in).toLocaleTimeString()}</span>
              ) : (
                'Not clocked in'
              )}
            </div>
            <div className="rk-myhours-week">{weekHours.toFixed(1)}h this week</div>
          </div>
          {activeShift ? (
            <button className="rk-myhours-btn rk-myhours-btn-out" onClick={clockOut} disabled={busy}>
              {busy ? 'Working…' : 'Clock Out'}
            </button>
          ) : (
            <button className="rk-myhours-btn rk-myhours-btn-in" onClick={clockIn} disabled={busy}>
              {busy ? 'Working…' : 'Clock In'}
            </button>
          )}
        </div>
      </div>

      <div className="rk-admin-card">
        <h2 className="rk-admin-card-title"><IconClock /> Recent Shifts</h2>
        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : shifts.length === 0 ? (
          <p className="rk-admin-empty">No shifts logged yet — clock in above to start.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr><th>Clock In</th><th>Clock Out</th><th>Hours</th></tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.clock_in).toLocaleString()}</td>
                    <td>{s.clock_out ? new Date(s.clock_out).toLocaleString() : <span className="rk-myhours-status-active">Active</span>}</td>
                    <td>{s.duration_hours != null ? `${s.duration_hours.toFixed(2)}h` : '—'}</td>
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
