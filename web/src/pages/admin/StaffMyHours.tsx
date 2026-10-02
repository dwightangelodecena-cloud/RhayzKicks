import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconClock } from './adminIcons'
import { EmptyState, Modal, Notice, Pill, SectionHead, StatGrid, StatTile } from './adminUi'

interface ShiftRow {
  id: string
  clock_in: string
  clock_out: string | null
  duration_hours: number | null
  notes: string
}

// How far back the page loads — enough for "this month" and the history list.
const HISTORY_DAYS = 62

function startOfDayLocal(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeekLocal() {
  const d = startOfDayLocal()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // back to Monday
  return d
}

function startOfMonthLocal() {
  const d = startOfDayLocal()
  d.setDate(1)
  return d
}

// 8.47 → "8h 28m"; under a minute → "< 1 min".
function fmtHours(hours: number) {
  const mins = Math.round(hours * 60)
  if (mins < 1) return hours > 0 ? '< 1 min' : '0h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
}

// Live timer: 2:05:09.
function fmtElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const fmtTime = (iso: string | Date) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
const fmtDay = (iso: string | Date) => new Date(iso).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

// Hours for a shift; an open shift counts up to "now".
function shiftHours(s: ShiftRow, now: number) {
  if (s.duration_hours != null) return s.duration_hours
  return (now - new Date(s.clock_in).getTime()) / 3_600_000
}

export default function StaffMyHours() {
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [staffId, setStaffId] = useState<string | null>(null)
  const [confirmOut, setConfirmOut] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = async () => {
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const id = userData.user?.id ?? null
    setStaffId(id)
    if (!id) {
      setLoading(false)
      return
    }
    const since = startOfDayLocal()
    since.setDate(since.getDate() - HISTORY_DAYS)
    const { data, error: loadError } = await supabase
      .from('staff_shifts')
      .select('id, clock_in, clock_out, duration_hours, notes')
      .eq('staff_id', id)
      .gte('clock_in', since.toISOString())
      .order('clock_in', { ascending: false })
      .limit(300)
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

  // Tick every second while on the clock (live timer), otherwise every 30s
  // (just keeps the clock display current).
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), activeShift ? 1000 : 30_000)
    return () => window.clearInterval(t)
  }, [activeShift])

  const clockIn = async () => {
    if (!staffId) return
    setBusy(true)
    setError(null)
    setNotice(null)
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
    setNotice(`You're clocked in as of ${fmtTime(new Date())}. Have a good shift!`)
    load()
  }

  const clockOut = async () => {
    if (!activeShift) return
    setBusy(true)
    setError(null)
    setNotice(null)
    const worked = shiftHours(activeShift, Date.now())
    const { error: updateError } = await supabase
      .from('staff_shifts')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', activeShift.id)
    setBusy(false)
    setConfirmOut(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNotice(`Clocked out. This shift: ${fmtHours(worked)}.`)
    load()
  }

  const stats = useMemo(() => {
    const today = startOfDayLocal().getTime()
    const week = startOfWeekLocal().getTime()
    const month = startOfMonthLocal().getTime()
    let todayH = 0
    let weekH = 0
    let monthH = 0
    let monthShifts = 0
    const weekDays = new Set<string>()
    for (const s of shifts) {
      const t = new Date(s.clock_in).getTime()
      const h = shiftHours(s, now)
      if (t >= today) todayH += h
      if (t >= week) {
        weekH += h
        weekDays.add(new Date(s.clock_in).toDateString())
      }
      if (t >= month) {
        monthH += h
        monthShifts += 1
      }
    }
    return { todayH, weekH, monthH, monthShifts, weekDays: weekDays.size }
  }, [shifts, now])

  // Monday → Sunday of this week, hours per day.
  const weekBars = useMemo(() => {
    const monday = startOfWeekLocal()
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return { key: d.toDateString(), label: d.toLocaleDateString('en-PH', { weekday: 'short' }), date: d, hours: 0 }
    })
    for (const s of shifts) {
      const day = days.find((d) => d.key === new Date(s.clock_in).toDateString())
      if (day) day.hours += shiftHours(s, now)
    }
    return days
  }, [shifts, now])
  const weekMax = Math.max(8, ...weekBars.map((d) => d.hours))
  const todayKey = new Date().toDateString()

  // History grouped by the day each shift started.
  const history = useMemo(() => {
    const groups: { key: string; label: string; rows: ShiftRow[]; hours: number }[] = []
    for (const s of shifts) {
      const key = new Date(s.clock_in).toDateString()
      let g = groups[groups.length - 1]
      if (!g || g.key !== key) {
        g = { key, label: key === todayKey ? 'Today' : fmtDay(s.clock_in), rows: [], hours: 0 }
        groups.push(g)
      }
      g.rows.push(s)
      g.hours += shiftHours(s, now)
    }
    return groups
  }, [shifts, now, todayKey])

  const elapsed = activeShift ? now - new Date(activeShift.clock_in).getTime() : 0
  const clockNow = new Date(now)

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-myh-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 1.5rem;
          align-items: center;
        }
        .rk-myh-clock {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 3rem;
          line-height: 1;
          color: var(--text);
          letter-spacing: 0.01em;
        }
        .rk-myh-date {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }
        .rk-myh-status {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }
        .rk-myh-status-text {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .rk-myh-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          min-width: 15rem;
        }
        .rk-myh-timer {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 2.5rem;
          line-height: 1;
          color: #0ca30c;
          font-variant-numeric: tabular-nums;
        }
        .rk-myh-timer-label {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .rk-myh-btn {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 1.1rem 2rem;
          font: inherit;
          font-weight: 900;
          font-size: 1rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.1s ease, filter 0.15s ease;
        }
        .rk-myh-btn:hover { filter: brightness(1.1); }
        .rk-myh-btn:active { transform: scale(0.98); }
        .rk-myh-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .rk-myh-btn-in { background: #0ca30c; color: #fff; box-shadow: 0 8px 24px rgba(12, 163, 12, 0.25); }
        .rk-myh-btn-out { background: var(--accent-red); color: #fff; box-shadow: 0 8px 24px rgba(254, 0, 0, 0.22); }
        .rk-myh-hint {
          font-size: 0.75rem;
          color: var(--text-faint);
          text-align: center;
        }
        .rk-myh-hero-active {
          border-color: rgba(12, 163, 12, 0.45);
          box-shadow: 0 0 0 1px rgba(12, 163, 12, 0.25) inset, var(--shadow-elevated);
        }
        @media (max-width: 40rem) {
          .rk-myh-hero { grid-template-columns: 1fr; }
          .rk-myh-action { min-width: 0; }
          .rk-myh-clock { font-size: 2.5rem; }
        }

        /* week strip */
        .rk-myh-week {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 0.5rem;
          align-items: end;
          height: 10rem;
        }
        .rk-myh-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          gap: 0.375rem;
          min-width: 0;
        }
        .rk-myh-day-val {
          font-size: 0.6875rem;
          font-weight: 800;
          color: var(--text);
          white-space: nowrap;
        }
        .rk-myh-day-bar {
          width: min(2.75rem, 80%);
          border-radius: 0.375rem 0.375rem 0.2rem 0.2rem;
          background: linear-gradient(180deg, var(--text-muted), var(--text-faint));
          min-height: 3px;
        }
        .rk-myh-day-empty { background: var(--border); }
        .rk-myh-day-today .rk-myh-day-bar:not(.rk-myh-day-empty) { background: linear-gradient(180deg, #2fd12f, #0ca30c); }
        .rk-myh-day-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .rk-myh-day-today .rk-myh-day-label { color: var(--text); }

        /* history */
        .rk-myh-group + .rk-myh-group { margin-top: 1rem; }
        .rk-myh-group-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin: 0 0 0.5rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .rk-myh-range {
          font-weight: 800;
          font-size: 0.9375rem;
          color: var(--text);
        }
        .rk-myh-arrow { color: var(--text-faint); margin: 0 0.375rem; }
        .rk-myh-dur {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.25rem;
          color: var(--text);
          min-width: 4.5rem;
          text-align: right;
        }
      `}</style>

      {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}
      {notice && <Notice tone="ok" onDismiss={() => setNotice(null)}>{notice}</Notice>}

      <div className={`rk-admin-card ${activeShift ? 'rk-myh-hero-active' : ''}`}>
        <div className="rk-myh-hero">
          <div>
            <div className="rk-myh-clock">{clockNow.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</div>
            <div className="rk-myh-date">{clockNow.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div className="rk-myh-status">
              {loading ? (
                <Pill>Checking…</Pill>
              ) : activeShift ? (
                <>
                  <Pill tone="ok">On the clock</Pill>
                  <span className="rk-myh-status-text">since {fmtTime(activeShift.clock_in)}{new Date(activeShift.clock_in).toDateString() !== todayKey ? ` on ${fmtDay(activeShift.clock_in)}` : ''}</span>
                </>
              ) : (
                <>
                  <Pill>Off the clock</Pill>
                  <span className="rk-myh-status-text">Press Clock in when your shift starts.</span>
                </>
              )}
            </div>
          </div>

          <div className="rk-myh-action">
            {activeShift && (
              <>
                <span className="rk-myh-timer-label">This shift so far</span>
                <span className="rk-myh-timer" aria-live="off">{fmtElapsed(elapsed)}</span>
              </>
            )}
            {activeShift ? (
              <button type="button" className="rk-myh-btn rk-myh-btn-out" onClick={() => setConfirmOut(true)} disabled={busy}>
                {busy ? 'Saving…' : 'Clock out'}
              </button>
            ) : (
              <button type="button" className="rk-myh-btn rk-myh-btn-in" onClick={clockIn} disabled={busy || loading || !staffId}>
                {busy ? 'Saving…' : 'Clock in'}
              </button>
            )}
            <span className="rk-myh-hint">
              {activeShift ? 'Clock out before you leave for the day.' : 'Your time is saved to the shop’s shift log.'}
            </span>
          </div>
        </div>
      </div>

      <StatGrid>
        <StatTile label="Today" value={fmtHours(stats.todayH)} sub={activeShift ? 'includes your current shift' : 'worked so far today'} tone={stats.todayH > 0 ? 'ok' : 'neutral'} />
        <StatTile label="This week" value={fmtHours(stats.weekH)} sub={`Mon – today · ${stats.weekDays} ${stats.weekDays === 1 ? 'day' : 'days'} worked`} />
        <StatTile label="This month" value={fmtHours(stats.monthH)} sub={`${stats.monthShifts} ${stats.monthShifts === 1 ? 'shift' : 'shifts'}`} />
        <StatTile label="Average shift" value={stats.monthShifts ? fmtHours(stats.monthH / stats.monthShifts) : '—'} sub="this month" />
      </StatGrid>

      <div className="rk-admin-card">
        <SectionHead icon={<IconClock />} title="This week" desc="Hours you worked each day, Monday to Sunday." />
        <div className="rk-myh-week" role="img" aria-label="Hours worked each day this week">
          {weekBars.map((d) => {
            const isToday = d.key === todayKey
            return (
              <div key={d.key} className={`rk-myh-day ${isToday ? 'rk-myh-day-today' : ''}`} title={`${fmtDay(d.date)}: ${fmtHours(d.hours)}`}>
                {d.hours > 0 && <span className="rk-myh-day-val">{fmtHours(d.hours)}</span>}
                <div
                  className={`rk-myh-day-bar ${d.hours > 0 ? '' : 'rk-myh-day-empty'}`}
                  style={d.hours > 0 ? { height: `max(${(d.hours / weekMax) * 100}%, 6px)` } : undefined}
                />
                <span className="rk-myh-day-label">{isToday ? 'Today' : d.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rk-admin-card">
        <SectionHead icon={<IconClock />} title="My shifts" desc={`Your clock-ins from the last ${HISTORY_DAYS} days, newest first.`} />
        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : history.length === 0 ? (
          <EmptyState title="No shifts yet" hint="Press Clock in above when your shift starts — it will show up here." />
        ) : (
          history.map((g) => (
            <div key={g.key} className="rk-myh-group">
              <div className="rk-myh-group-head">
                <span>{g.label}</span>
                <span>{fmtHours(g.hours)} total</span>
              </div>
              <div className="rk-ui-list">
                {g.rows.map((s) => {
                  const open = s.clock_out === null
                  const hours = shiftHours(s, now)
                  const endsOtherDay = s.clock_out && new Date(s.clock_out).toDateString() !== new Date(s.clock_in).toDateString()
                  return (
                    <div key={s.id} className={`rk-ui-list-row ${open ? 'rk-ui-list-row-ok' : ''}`}>
                      <div className="rk-ui-list-main">
                        <div className="rk-myh-range">
                          {fmtTime(s.clock_in)}
                          <span className="rk-myh-arrow">→</span>
                          {open ? 'now' : `${fmtTime(s.clock_out!)}${endsOtherDay ? ` (${fmtDay(s.clock_out!)})` : ''}`}
                        </div>
                        {s.notes && <div className="rk-ui-list-meta">{s.notes}</div>}
                      </div>
                      <div className="rk-ui-list-side">
                        {open && <Pill tone="ok">On the clock</Pill>}
                        {!open && hours < 1 / 60 && <Pill tone="warn">Very short</Pill>}
                        <span className="rk-myh-dur">{fmtHours(hours)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {confirmOut && activeShift && (
        <Modal
          title="Clock out now?"
          subtitle={`Started at ${fmtTime(activeShift.clock_in)}`}
          onClose={() => setConfirmOut(false)}
          width={26}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirmOut(false)} disabled={busy}>Keep working</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-danger rk-ui-btn-lg" onClick={clockOut} disabled={busy}>
                {busy ? 'Saving…' : 'Yes, clock out'}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text)' }}>
            This shift will be saved as <b>{fmtHours(shiftHours(activeShift, now))}</b> ({fmtTime(activeShift.clock_in)} → {fmtTime(clockNow)}).
          </p>
        </Modal>
      )}
    </div>
  )
}
