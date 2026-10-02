import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import AdminStaff from './AdminStaff'
import AdminStaffHours from './AdminStaffHours'
import { Segmented, StatGrid, StatTile } from './adminUi'
import { adminCardStyles } from './adminCardStyles'
import { IconClock, IconUsers } from './adminIcons'
import type { StaffRole } from '../../types/database.types'

type View = 'team' | 'hours'

interface RosterRow {
  id: string
  full_name: string
  role: StaffRole
  is_active: boolean
}

interface SummaryShift {
  staff_id: string
  staff_name: string
  clock_in: string
  clock_out: string | null
  duration_hours: number | null
}

// Monday 00:00 local time — same definition the Hours view uses for "this week".
function startOfWeekLocal() {
  const d = new Date()
  const diff = (d.getDay() + 6) % 7 // days since Monday
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Staff + Staff Hours in one admin tab: who's on the team, and the time they
// have logged. The header tiles summarize both; each view below is its own
// component and tells us when it changes something so the tiles stay current.
export default function AdminTeam() {
  const [view, setView] = useState<View>('team')
  // Person filter for the Hours view, lifted here so "Hours" on a team row can
  // jump straight to that person's shifts.
  const [hoursPerson, setHoursPerson] = useState('')

  const [roster, setRoster] = useState<RosterRow[] | null>(null)
  const [summaryShifts, setSummaryShifts] = useState<SummaryShift[] | null>(null)

  const loadSummary = useCallback(async () => {
    const weekStart = startOfWeekLocal().toISOString()
    const [rosterRes, shiftsRes] = await Promise.all([
      supabase.from('staff').select('id, full_name, role, is_active').order('full_name'),
      // Only what the tiles need: anything still open, plus this week's shifts.
      supabase
        .from('staff_shifts_detail')
        .select('staff_id, staff_name, clock_in, clock_out, duration_hours')
        .or(`clock_out.is.null,clock_in.gte.${weekStart}`),
    ])
    // Tiles are a convenience — if either read fails, the views below show the error.
    if (!rosterRes.error) setRoster((rosterRes.data ?? []) as RosterRow[])
    if (!shiftsRes.error) setSummaryShifts((shiftsRes.data ?? []) as SummaryShift[])
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const active = roster?.filter((r) => r.is_active) ?? []
  const admins = active.filter((r) => r.role === 'admin').length
  const inactive = (roster?.length ?? 0) - active.length

  // Hour tiles count staff only — admins aren't on the hours sheet.
  const adminIds = new Set((roster ?? []).filter((r) => r.role === 'admin').map((r) => r.id))
  const staffShifts = (summaryShifts ?? []).filter((s) => !adminIds.has(s.staff_id))
  const weekStart = startOfWeekLocal()
  const openShifts = staffShifts.filter((s) => !s.clock_out)
  const clockedInNames = [...new Set(openShifts.map((s) => s.staff_name))]
  const weekHours = staffShifts.reduce(
    (sum, s) => (new Date(s.clock_in) >= weekStart && s.duration_hours != null ? sum + s.duration_hours : sum),
    0,
  )
  const weekPeople = new Set(staffShifts.filter((s) => new Date(s.clock_in) >= weekStart).map((s) => s.staff_id)).size

  const dash = '—'
  const showHoursFor = (staffId: string) => {
    setHoursPerson(staffId)
    setView('hours')
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-team-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }
        .rk-team-head-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0.3rem 0 0;
          max-width: 40rem;
        }
        .rk-team-names {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .rk-team-switch .rk-ui-stats {
          margin-bottom: 0;
        }
      `}</style>

      <div className="rk-admin-card">
        <div className="rk-team-head">
          <div>
            <h2 className="rk-admin-card-title"><IconUsers /> Staff</h2>
            <p className="rk-team-head-desc">
              Your team and the hours they work. Use <b>Team members</b> to add people or change what they can access, and{' '}
              <b>Hours &amp; shifts</b> to see who clocked in and for how long.
            </p>
          </div>
          <Segmented
            label="Staff section"
            value={view}
            onChange={setView}
            options={[
              { value: 'team', label: 'Team members', count: roster ? active.length : undefined },
              { value: 'hours', label: 'Hours & shifts' },
            ]}
          />
        </div>

        <div className="rk-team-switch">
          <StatGrid>
            <StatTile
              label="Active team"
              icon={<IconUsers size={16} />}
              value={roster ? active.length : dash}
              sub={roster ? (inactive > 0 ? `${inactive} deactivated` : 'everyone can sign in') : 'loading…'}
              onClick={() => setView('team')}
              active={view === 'team'}
            />
            <StatTile
              label="Admins / Staff"
              tone="info"
              value={roster ? `${admins} / ${active.length - admins}` : dash}
              sub="admins see every tab"
              onClick={() => setView('team')}
            />
            <StatTile
              label="Clocked in now"
              tone={openShifts.length > 0 ? 'ok' : 'neutral'}
              icon={<IconClock size={16} />}
              value={summaryShifts ? clockedInNames.length : dash}
              sub={
                summaryShifts ? (
                  <span className="rk-team-names" title={clockedInNames.join(', ')}>
                    {clockedInNames.length > 0 ? clockedInNames.join(', ') : 'nobody right now'}
                  </span>
                ) : (
                  'loading…'
                )
              }
              onClick={() => showHoursFor('')}
              active={view === 'hours'}
            />
            <StatTile
              label="Hours this week"
              value={summaryShifts ? `${weekHours.toFixed(1)}h` : dash}
              sub={summaryShifts ? `finished shifts since Monday · ${weekPeople} ${weekPeople === 1 ? 'person' : 'people'}` : 'loading…'}
              onClick={() => showHoursFor('')}
            />
          </StatGrid>
        </div>
      </div>

      {view === 'team' ? (
        <AdminStaff onChanged={loadSummary} onViewHours={showHoursFor} />
      ) : (
        <AdminStaffHours personFilter={hoursPerson} onPersonFilterChange={setHoursPerson} roster={roster ?? undefined} onChanged={loadSummary} />
      )}
    </div>
  )
}
