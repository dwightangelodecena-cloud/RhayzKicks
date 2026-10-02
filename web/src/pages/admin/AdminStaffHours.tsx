import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconClock } from './adminIcons'
import { EmptyState, Modal, Notice, Pill, SectionHead, Segmented, Toolbar } from './adminUi'

interface StaffRow {
  id: string
  full_name: string
  role: string
  is_active: boolean
}

interface ShiftRow {
  id: string
  staff_id: string
  staff_name: string
  clock_in: string
  clock_out: string | null
  duration_hours: number | null
  logged_by: string
  notes: string
}

type Range = 'week' | 'lastweek' | 'month' | 'recent'

// The "recent" view keeps the original latest-50 cap; the dated ranges are
// bounded by date, so they can show more.
const RECENT_LIMIT = 50
const RANGE_LIMIT = 500

function startOfWeekLocal() {
  const d = new Date()
  const day = d.getDay() // 0 = Sunday
  const diff = (day + 6) % 7 // days since Monday
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function rangeBounds(range: Range): { from: Date | null; to: Date | null } {
  const weekStart = startOfWeekLocal()
  if (range === 'week') return { from: weekStart, to: null }
  if (range === 'lastweek') {
    const from = new Date(weekStart)
    from.setDate(from.getDate() - 7)
    return { from, to: weekStart }
  }
  if (range === 'month') {
    const from = new Date()
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
    return { from, to: null }
  }
  return { from: null, to: null }
}

const rangeLabel: Record<Range, string> = {
  week: 'This week',
  lastweek: 'Last week',
  month: 'This month',
  recent: 'Latest shifts',
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 8.47 -> "8h 28m"; plain-language durations instead of decimal hours.
function fmtDuration(hours: number) {
  const totalMin = Math.max(0, Math.round(hours * 60))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

const emptyForm = { staff_id: '', clock_in: toLocalInputValue(new Date()), clock_out: '', notes: '' }

export default function AdminStaffHours({
  personFilter,
  onPersonFilterChange,
  roster,
  onChanged,
}: {
  // Controlled person filter (lets the Team view jump here for one person).
  personFilter?: string
  onPersonFilterChange?: (staffId: string) => void
  // Full roster incl. deactivated people, so their old shifts stay filterable.
  roster?: { id: string; full_name: string; is_active: boolean; role?: string }[]
  onChanged?: () => void
} = {}) {
  // Hours & shifts is for staff only — admins (owners) don't clock in, so
  // they're left out of the person list, totals and shift log.
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set())
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [openShifts, setOpenShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ShiftRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [range, setRange] = useState<Range>('week')
  const [localPerson, setLocalPerson] = useState('')
  const person = personFilter ?? localPerson
  const setPerson = (id: string) => (onPersonFilterChange ? onPersonFilterChange(id) : setLocalPerson(id))

  // Re-render every minute so "clocked in for 2h 10m" keeps counting.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { from, to } = rangeBounds(range)
    let shiftsQuery = supabase.from('staff_shifts_detail').select('*').order('clock_in', { ascending: false })
    if (person) shiftsQuery = shiftsQuery.eq('staff_id', person)
    if (from) shiftsQuery = shiftsQuery.gte('clock_in', from.toISOString())
    if (to) shiftsQuery = shiftsQuery.lt('clock_in', to.toISOString())
    shiftsQuery = shiftsQuery.limit(range === 'recent' ? RECENT_LIMIT : RANGE_LIMIT)

    const [staffRes, shiftsRes, openRes] = await Promise.all([
      supabase.from('staff').select('id, full_name, role, is_active').order('full_name'),
      shiftsQuery,
      // Anyone still on the clock, regardless of the date range picked.
      supabase.from('staff_shifts_detail').select('*').is('clock_out', null).order('clock_in', { ascending: false }),
    ])
    if (staffRes.error || shiftsRes.error || openRes.error) {
      setError((staffRes.error ?? shiftsRes.error ?? openRes.error)?.message ?? 'Failed to load.')
      setLoading(false)
      return
    }
    const everyone = (staffRes.data ?? []) as StaffRow[]
    const admins = new Set(everyone.filter((s) => s.role === 'admin').map((s) => s.id))
    setAdminIds(admins)
    setStaff(everyone.filter((s) => s.role !== 'admin' && s.is_active))
    setShifts(((shiftsRes.data ?? []) as ShiftRow[]).filter((s) => !admins.has(s.staff_id)))
    setOpenShifts(((openRes.data ?? []) as ShiftRow[]).filter((s) => !admins.has(s.staff_id)))
    setLoading(false)
  }, [range, person])

  useEffect(() => {
    load()
  }, [load])

  const afterChange = () => {
    load()
    onChanged?.()
  }

  const openAdd = () => {
    const preset = person && staff.some((s) => s.id === person) ? person : ''
    setForm({ ...emptyForm, staff_id: preset, clock_in: toLocalInputValue(new Date()) })
    setFormError(null)
    setAdding(true)
  }

  const addShift = async () => {
    if (!form.staff_id || !form.clock_in) {
      setFormError('Pick a person and a clock-in time.')
      return
    }
    if (form.clock_out && new Date(form.clock_out) <= new Date(form.clock_in)) {
      setFormError('Clock-out has to be after clock-in.')
      return
    }
    setSaving(true)
    setFormError(null)
    const { data: userData } = await supabase.auth.getUser()
    const loggedBy = userData.user?.id
    if (!loggedBy) {
      setSaving(false)
      setFormError('Your session expired — sign in again.')
      return
    }
    const { error: insertError } = await supabase.from('staff_shifts').insert({
      staff_id: form.staff_id,
      clock_in: new Date(form.clock_in).toISOString(),
      clock_out: form.clock_out ? new Date(form.clock_out).toISOString() : null,
      logged_by: loggedBy,
      notes: form.notes.trim(),
    })
    setSaving(false)
    if (insertError) {
      setFormError(insertError.message)
      return
    }
    const name = staff.find((s) => s.id === form.staff_id)?.full_name
    setNotice(name ? `Shift saved for ${name}.` : 'Shift saved.')
    setForm({ ...emptyForm, clock_in: toLocalInputValue(new Date()) })
    setAdding(false)
    afterChange()
  }

  const removeShift = async (id: string) => {
    const { error: deleteError } = await supabase.from('staff_shifts').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return false
    }
    afterChange()
    return true
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    setNotice(null)
    const ok = await removeShift(confirmDelete.id)
    setDeleting(false)
    if (ok) setNotice(`Deleted ${confirmDelete.staff_name}'s shift from ${fmtDay(confirmDelete.clock_in)}.`)
    setConfirmDelete(null)
  }

  // Names for the person filter + "logged by" — roster (incl. deactivated)
  // when the parent provides it, otherwise the active-staff list.
  const people = useMemo(
    () => (roster ?? staff).filter((p) => p.role !== 'admin' && !adminIds.has(p.id)),
    [roster, staff, adminIds],
  )
  const nameOf = (id: string) => people.find((p) => p.id === id)?.full_name

  // Per-person totals for the shifts currently shown.
  const totals = useMemo(() => {
    const map = new Map<string, { id: string; name: string; hours: number; shifts: number; open: boolean }>()
    for (const s of shifts) {
      const t = map.get(s.staff_id) ?? { id: s.staff_id, name: s.staff_name, hours: 0, shifts: 0, open: false }
      t.shifts += 1
      if (s.duration_hours != null) t.hours += s.duration_hours
      else t.open = true
      map.set(s.staff_id, t)
    }
    return [...map.values()].sort((a, b) => b.hours - a.hours)
  }, [shifts])
  const totalHours = totals.reduce((sum, t) => sum + t.hours, 0)

  // Shifts grouped by the day they started, newest first.
  const days = useMemo(() => {
    const groups: { key: string; label: string; rows: ShiftRow[]; hours: number }[] = []
    for (const s of shifts) {
      const key = new Date(s.clock_in).toDateString()
      let g = groups[groups.length - 1]
      if (!g || g.key !== key) {
        g = { key, label: fmtDay(s.clock_in), rows: [], hours: 0 }
        groups.push(g)
      }
      g.rows.push(s)
      if (s.duration_hours != null) g.hours += s.duration_hours
    }
    return groups
  }, [shifts])

  const visibleOpen = person ? openShifts.filter((s) => s.staff_id === person) : openShifts
  const hitLimit = shifts.length >= (range === 'recent' ? RECENT_LIMIT : RANGE_LIMIT)
  const personName = person ? nameOf(person) ?? shifts[0]?.staff_name ?? 'this person' : null
  const sinceMs = (iso: string) => now - new Date(iso).getTime()

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-team-filter-select {
          padding: 0.6rem 2rem 0.6rem 0.9rem;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg);
          color: var(--text);
          font: inherit;
          font-size: 0.8125rem;
          font-weight: 700;
          min-width: 12rem;
          max-width: 100%;
        }
        .rk-team-filter-select:focus {
          outline: none;
          border-color: var(--text-muted);
        }
        .rk-team-oncall {
          border: 1px solid rgba(12, 163, 12, 0.3);
          background: rgba(12, 163, 12, 0.06);
          border-radius: 0.875rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1.25rem;
        }
        .rk-team-oncall-title {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .rk-team-oncall-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.25rem;
          font-size: 0.8125rem;
          color: var(--text);
        }
        .rk-team-oncall-list span {
          color: var(--text-muted);
        }
        .rk-team-sub {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin: 0 0 0.625rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
        .rk-team-totals {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
          gap: 0.625rem;
          margin-bottom: 1.5rem;
        }
        .rk-team-total {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.125rem;
          text-align: left;
          font: inherit;
          color: var(--text);
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          cursor: pointer;
          min-width: 0;
        }
        .rk-team-total:hover {
          border-color: var(--text-muted);
        }
        .rk-team-total-on {
          box-shadow: 0 0 0 2px var(--text) inset;
        }
        .rk-team-total-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rk-team-total-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.375rem;
          line-height: 1.1;
        }
        .rk-team-total-meta {
          font-size: 0.6875rem;
          color: var(--text-faint);
        }
        .rk-team-day + .rk-team-day {
          margin-top: 1.25rem;
        }
        .rk-team-shift-time {
          font-variant-numeric: tabular-nums;
        }
        .rk-team-shift-dur {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.125rem;
          min-width: 4.5rem;
          text-align: right;
        }
        .rk-team-shift-note {
          font-style: italic;
        }
        .rk-team-hint {
          font-size: 0.75rem;
          color: var(--text-faint);
          margin: 0.75rem 0 0;
        }
        .rk-team-confirm-text {
          font-size: 0.875rem;
          color: var(--text);
          margin: 0;
          line-height: 1.55;
        }
        @media (max-width: 40rem) {
          .rk-team-shift-dur {
            text-align: left;
            min-width: 0;
          }
        }
      `}</style>

      <div className="rk-admin-card">
        <SectionHead
          icon={<IconClock />}
          title="Hours & shifts"
          desc="Clock-in and clock-out times for the team. Staff clock themselves in from their My Hours tab; you can also add a shift for someone who forgot."
          actions={
            <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={openAdd} disabled={staff.length === 0}>
              + Add a shift
            </button>
          }
        />

        {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}
        {notice && <Notice tone="ok" onDismiss={() => setNotice(null)}>{notice}</Notice>}
        {!loading && staff.length === 0 && (
          <Notice tone="info">No active team members yet — add someone under Team members before logging shifts.</Notice>
        )}

        <Toolbar>
          <select className="rk-team-filter-select" value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Show shifts for">
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.is_active ? '' : ' (deactivated)'}
              </option>
            ))}
          </select>
          <Segmented
            label="Date range"
            value={range}
            onChange={setRange}
            options={(['week', 'lastweek', 'month', 'recent'] as Range[]).map((r) => ({ value: r, label: rangeLabel[r] }))}
          />
          {person && (
            <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => setPerson('')}>
              Clear person
            </button>
          )}
        </Toolbar>

        {visibleOpen.length > 0 && (
          <div className="rk-team-oncall">
            <div className="rk-team-oncall-title">On the clock right now</div>
            <div className="rk-team-oncall-list">
              {visibleOpen.map((s) => (
                <div key={s.id}>
                  <b>{s.staff_name}</b> <span>since {fmtTime(s.clock_in)}{sameDay(s.clock_in, new Date(now).toISOString()) ? '' : `, ${fmtDay(s.clock_in)}`} · {fmtDuration(sinceMs(s.clock_in) / 3_600_000)} so far</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : shifts.length === 0 ? (
          <EmptyState
            title={person ? `No shifts for ${personName} — ${rangeLabel[range].toLowerCase()}` : `No shifts — ${rangeLabel[range].toLowerCase()}`}
            hint={range === 'recent' ? 'Shifts appear here once someone clocks in.' : 'Try a different date range.'}
          />
        ) : (
          <>
            <div className="rk-team-sub">
              <span>Total per person · {rangeLabel[range]}</span>
              <span>{fmtDuration(totalHours)} finished</span>
            </div>
            <div className="rk-team-totals">
              {totals.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`rk-team-total ${person === t.id ? 'rk-team-total-on' : ''}`}
                  onClick={() => setPerson(person === t.id ? '' : t.id)}
                  aria-pressed={person === t.id}
                  title={person === t.id ? 'Show everyone' : `Show only ${t.name}`}
                >
                  <span className="rk-team-total-name">{t.name}</span>
                  <span className="rk-team-total-value">{fmtDuration(t.hours)}</span>
                  <span className="rk-team-total-meta">
                    {t.shifts} {t.shifts === 1 ? 'shift' : 'shifts'}
                    {t.open ? ' · on the clock' : ''}
                  </span>
                </button>
              ))}
            </div>

            <div className="rk-team-sub">
              <span>Shift log</span>
            </div>
            {days.map((d) => (
              <section key={d.key} className="rk-team-day">
                <div className="rk-team-sub">
                  <span>{d.label}</span>
                  <span>{fmtDuration(d.hours)}</span>
                </div>
                <div className="rk-ui-list">
                  {d.rows.map((s) => {
                    const open = !s.clock_out
                    const loggedByOther = s.logged_by && s.logged_by !== s.staff_id
                    return (
                      <div key={s.id} className={`rk-ui-list-row ${open ? 'rk-ui-list-row-ok' : ''}`}>
                        <div className="rk-ui-list-main">
                          <div className="rk-ui-list-title">{s.staff_name}</div>
                          <div className="rk-ui-list-meta rk-team-shift-time">
                            In {fmtTime(s.clock_in)} →{' '}
                            {s.clock_out
                              ? `Out ${fmtTime(s.clock_out)}${sameDay(s.clock_in, s.clock_out) ? '' : ` (${fmtDay(s.clock_out)})`}`
                              : 'not clocked out yet'}
                            {loggedByOther && ` · added by ${nameOf(s.logged_by) ?? 'another team member'}`}
                          </div>
                          {s.notes && <div className="rk-ui-list-meta rk-team-shift-note">“{s.notes}”</div>}
                        </div>
                        <div className="rk-ui-list-side">
                          {open ? (
                            <Pill tone="ok">Still clocked in · {fmtDuration(sinceMs(s.clock_in) / 3_600_000)}</Pill>
                          ) : (
                            <span className="rk-team-shift-dur">{s.duration_hours != null ? fmtDuration(s.duration_hours) : '—'}</span>
                          )}
                          <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => setConfirmDelete(s)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
            {hitLimit && (
              <p className="rk-team-hint">
                Showing the latest {shifts.length} shifts only — pick a shorter date range or one person to see everything.
              </p>
            )}
          </>
        )}
      </div>

      {adding && (
        <Modal
          title="Add a shift"
          subtitle="For when someone forgot to clock in, or you're filling in the hours yourself."
          onClose={() => !saving && setAdding(false)}
          footer={
            <>
              <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => setAdding(false)} disabled={saving}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={addShift} disabled={saving}>
                {saving ? 'Saving…' : 'Save shift'}
              </button>
            </>
          }
        >
          {formError && <Notice tone="alert">{formError}</Notice>}
          <div className="rk-ui-form">
            <label className="rk-ui-field rk-ui-field-full">
              <span>Who worked?</span>
              <select value={form.staff_id} onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}>
                <option value="">Select a team member…</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </label>
            <label className="rk-ui-field">
              <span>Clocked in</span>
              <input type="datetime-local" value={form.clock_in} onChange={(e) => setForm((f) => ({ ...f, clock_in: e.target.value }))} />
            </label>
            <label className="rk-ui-field">
              <span>Clocked out (optional)</span>
              <input type="datetime-local" value={form.clock_out} onChange={(e) => setForm((f) => ({ ...f, clock_out: e.target.value }))} />
              <span className="rk-ui-field-hint">Leave empty if they're still working — it will show as “Still clocked in”.</span>
            </label>
            <label className="rk-ui-field rk-ui-field-full">
              <span>Note (optional)</span>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Forgot to clock in, covered afternoon shift" />
            </label>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Delete this shift?"
          onClose={() => !deleting && setConfirmDelete(null)}
          width={30}
          footer={
            <>
              <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-danger" onClick={confirmRemove} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, delete shift'}
              </button>
            </>
          }
        >
          <p className="rk-team-confirm-text">
            <b>{confirmDelete.staff_name}</b> · {fmtDay(confirmDelete.clock_in)}, {fmtTime(confirmDelete.clock_in)} →{' '}
            {confirmDelete.clock_out ? fmtTime(confirmDelete.clock_out) : 'still clocked in'}
            {confirmDelete.duration_hours != null ? ` (${fmtDuration(confirmDelete.duration_hours)})` : ''}
            <br />
            This removes it from their hours for good. It can't be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
