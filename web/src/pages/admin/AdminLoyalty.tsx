import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconMedal, IconReceipt, IconPercent } from './adminIcons'
import { EmptyState, Modal, Notice, Pill, SearchInput, SectionHead, Segmented, StatGrid, StatTile, Toolbar } from './adminUi'

interface TemplateRow {
  id: string
  label: string
  value: number
  is_active: boolean
}

interface VoucherRow {
  id: string
  code: string
  value: number
  source: string
  redeemed: boolean
  redeemed_at: string | null
  created_at: string
  customers: { full_name: string } | null
}

interface LoyaltySettings {
  is_enabled: boolean
  pesos_per_point: number
  points_per_voucher: number
}

const defaultSettings: LoyaltySettings = { is_enabled: true, pesos_per_point: 100, points_per_voucher: 100 }

const emptyTemplateForm = { label: '', value: '' }

// Matches the .limit() on the vouchers query below — the tiles and list only
// see this many of the most recent vouchers.
const VOUCHER_LIMIT = 50

// Purchase amount used in the "How it works" worked example.
const EXAMPLE_PURCHASE = 5000

type VoucherFilter = 'available' | 'used' | 'all'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

export default function AdminLoyalty() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<LoyaltySettings>(defaultSettings)
  const [settingsForm, setSettingsForm] = useState({ pesos_per_point: '100', points_per_voucher: '100' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [addingTemplate, setAddingTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [confirmingOff, setConfirmingOff] = useState(false)

  const [voucherFilter, setVoucherFilter] = useState<VoucherFilter>('available')
  const [voucherQuery, setVoucherQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    const [templatesRes, vouchersRes, settingsRes] = await Promise.all([
      supabase.from('voucher_templates').select('id, label, value, is_active').order('value'),
      supabase
        .from('vouchers')
        .select('id, code, value, source, redeemed, redeemed_at, created_at, customers(full_name)')
        .order('created_at', { ascending: false })
        .limit(VOUCHER_LIMIT),
      supabase.from('loyalty_settings').select('is_enabled, pesos_per_point, points_per_voucher').eq('id', true).maybeSingle(),
    ])
    if (templatesRes.error || vouchersRes.error) {
      setError((templatesRes.error ?? vouchersRes.error)?.message ?? 'Failed to load.')
      setLoading(false)
      return
    }
    if (settingsRes.data) {
      const loaded: LoyaltySettings = {
        is_enabled: settingsRes.data.is_enabled,
        pesos_per_point: Number(settingsRes.data.pesos_per_point),
        points_per_voucher: Number(settingsRes.data.points_per_voucher),
      }
      setSettings(loaded)
      setSettingsForm({ pesos_per_point: String(loaded.pesos_per_point), points_per_voucher: String(loaded.points_per_voucher) })
    }
    setTemplates((templatesRes.data ?? []) as TemplateRow[])
    setVouchers((vouchersRes.data ?? []) as unknown as VoucherRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const showFlash = (message: string) => {
    setFlash(message)
    window.setTimeout(() => setFlash((f) => (f === message ? null : f)), 4000)
  }

  const saveSettings = async (patch: Partial<LoyaltySettings>, successMessage: string) => {
    setSavingSettings(true)
    const { error: updateError } = await supabase.from('loyalty_settings').update(patch).eq('id', true)
    setSavingSettings(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setError(null)
    setSettings((s) => ({ ...s, ...patch }))
    showFlash(successMessage)
  }

  // ---- rate form: live values, validation, unsaved-changes ----
  const formPesos = Number(settingsForm.pesos_per_point)
  const formCostRaw = Number(settingsForm.points_per_voucher)
  const formCost = Math.floor(formCostRaw)
  const pesosValid = settingsForm.pesos_per_point.trim() !== '' && formPesos > 0
  const costValid = settingsForm.points_per_voucher.trim() !== '' && formCost > 0
  const ratesValid = pesosValid && costValid
  const ratesDirty = formPesos !== settings.pesos_per_point || formCost !== settings.points_per_voucher

  const saveRates = () => {
    const pesos = Number(settingsForm.pesos_per_point)
    const cost = Math.floor(Number(settingsForm.points_per_voucher))
    if (!(pesos > 0) || !(cost > 0)) {
      setError('Both values must be greater than 0.')
      return
    }
    setError(null)
    setSettingsForm({ pesos_per_point: String(pesos), points_per_voucher: String(cost) })
    saveSettings({ pesos_per_point: pesos, points_per_voucher: cost }, 'Saved — new rates apply to purchases from now on.')
  }

  const resetRates = () => {
    setSettingsForm({ pesos_per_point: String(settings.pesos_per_point), points_per_voucher: String(settings.points_per_voucher) })
  }

  // The worked example follows what's typed (if valid) so the owner sees the
  // effect before saving.
  const exPesos = pesosValid ? formPesos : settings.pesos_per_point
  const exCost = costValid ? formCost : settings.points_per_voucher
  const exPoints = Math.floor(EXAMPLE_PURCHASE / exPesos)
  const exSpendForVoucher = exCost * exPesos

  // ---- redemption options ----
  const activeTemplates = templates.filter((t) => t.is_active)
  const cheapestActive = activeTemplates.length ? Math.min(...activeTemplates.map((t) => Number(t.value))) : null

  const templateValue = Number(templateForm.value)
  const templateLabelOk = templateForm.label.trim() !== ''
  const templateValueOk = templateForm.value.trim() !== '' && templateValue > 0
  const templateValueProblem = templateForm.value.trim() !== '' && !templateValueOk ? 'Enter an amount greater than ₱0.' : null

  const closeTemplateModal = () => {
    setAddingTemplate(false)
    setTemplateForm(emptyTemplateForm)
  }

  const addTemplate = async () => {
    if (!templateForm.label.trim() || !templateForm.value) return
    setSavingTemplate(true)
    const { error: insertError } = await supabase.from('voucher_templates').insert({
      label: templateForm.label.trim(),
      value: Number(templateForm.value),
    })
    setSavingTemplate(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    const label = templateForm.label.trim()
    setTemplateForm(emptyTemplateForm)
    setAddingTemplate(false)
    showFlash(`Added “${label}” — customers can now redeem it.`)
    load()
  }

  const toggleTemplateActive = async (t: TemplateRow) => {
    const { error: updateError } = await supabase.from('voucher_templates').update({ is_active: !t.is_active }).eq('id', t.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    showFlash(t.is_active ? `“${t.label}” is now hidden from customers.` : `“${t.label}” is now shown to customers.`)
    load()
  }

  // ---- issued vouchers ----
  const voucherCounts = useMemo(() => {
    const c = { available: 0, availableValue: 0, used: 0, all: vouchers.length }
    for (const v of vouchers) {
      if (v.redeemed) c.used += 1
      else {
        c.available += 1
        c.availableValue += Number(v.value)
      }
    }
    return c
  }, [vouchers])

  const visibleVouchers = useMemo(() => {
    const q = voucherQuery.trim().toLowerCase()
    return vouchers.filter((v) => {
      if (voucherFilter === 'available' && v.redeemed) return false
      if (voucherFilter === 'used' && !v.redeemed) return false
      if (q && !`${v.code} ${v.customers?.full_name ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [vouchers, voucherFilter, voucherQuery])

  const hitLimit = vouchers.length >= VOUCHER_LIMIT
  const limitNote = hitLimit ? `of the latest ${VOUCHER_LIMIT}` : undefined

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{loyaltyStyles}</style>

      {error && !addingTemplate && (
        <Notice tone="alert" onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}
      {flash && (
        <Notice tone="ok" onDismiss={() => setFlash(null)}>
          {flash}
        </Notice>
      )}

      {/* ---- program status at a glance ---- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconMedal />}
          title="Loyalty Program"
          desc="Customers collect points when they buy, then trade the points for a discount voucher they can use in store or online."
        />

        <div className={`rk-loy-status ${settings.is_enabled ? 'rk-loy-status-on' : 'rk-loy-status-off'}`}>
          <div className="rk-loy-status-text">
            <div className="rk-loy-status-line">
              <span className="rk-loy-status-label">Program is</span>
              {loading ? <Pill>Loading…</Pill> : settings.is_enabled ? <Pill tone="ok">ON</Pill> : <Pill tone="alert">OFF</Pill>}
            </div>
            <p className="rk-loy-status-desc">
              {settings.is_enabled
                ? 'Customers are earning points on purchases and can redeem them for vouchers.'
                : 'Purchases earn no points and redeeming is paused. Customers keep their points and any vouchers they already have.'}
            </p>
          </div>
          <button
            type="button"
            className={`rk-ui-btn rk-ui-btn-lg ${settings.is_enabled ? 'rk-ui-btn-danger' : 'rk-ui-btn-primary'}`}
            disabled={savingSettings || loading}
            onClick={() => (settings.is_enabled ? setConfirmingOff(true) : saveSettings({ is_enabled: true }, 'Loyalty is ON — purchases earn points again.'))}
          >
            {savingSettings ? 'Saving…' : settings.is_enabled ? 'Turn loyalty off' : 'Turn loyalty on'}
          </button>
        </div>

        <StatGrid>
          <StatTile
            label="Redemption options"
            value={loading ? '—' : activeTemplates.length}
            sub={loading ? undefined : `shown to customers${templates.length > activeTemplates.length ? ` · ${templates.length - activeTemplates.length} hidden` : ''}`}
            tone={!loading && activeTemplates.length === 0 ? 'warn' : 'neutral'}
          />
          <StatTile
            label="Vouchers not used yet"
            value={loading ? '—' : voucherCounts.available}
            sub={loading ? undefined : <>worth <Money amount={voucherCounts.availableValue} /> in discounts{limitNote ? ` · ${limitNote}` : ''}</>}
            tone="ok"
            active={voucherFilter === 'available'}
            onClick={() => setVoucherFilter('available')}
          />
          <StatTile
            label="Vouchers used"
            value={loading ? '—' : voucherCounts.used}
            sub={loading ? undefined : `already spent at checkout${limitNote ? ` · ${limitNote}` : ''}`}
            active={voucherFilter === 'used'}
            onClick={() => setVoucherFilter('used')}
          />
          <StatTile
            label="Points for 1 voucher"
            value={loading ? '—' : settings.points_per_voucher.toLocaleString()}
            sub={loading ? undefined : <>1 point per <Money amount={settings.pesos_per_point} /> spent</>}
            tone="info"
          />
        </StatGrid>
      </div>

      {/* ---- how it works + rates ---- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconPercent />}
          title="How Points Work"
          desc="Set how fast customers earn points and how many points one voucher costs. The example updates as you type."
        />

        <ol className="rk-loy-steps">
          <li>
            <span className="rk-loy-step-num">1</span>
            <div>
              <div className="rk-loy-step-title">Customer buys</div>
              <div className="rk-loy-step-desc">
                A <Money amount={EXAMPLE_PURCHASE} /> pair earns <b>{plural(exPoints, 'point', 'points')}</b>
                {' '}(1 point for every <Money amount={exPesos} />).
              </div>
            </div>
          </li>
          <li>
            <span className="rk-loy-step-num">2</span>
            <div>
              <div className="rk-loy-step-title">Points add up</div>
              <div className="rk-loy-step-desc">
                <b>{plural(exCost, 'point', 'points')}</b> = 1 voucher. That's about <Money amount={exSpendForVoucher} /> of shopping.
              </div>
            </div>
          </li>
          <li>
            <span className="rk-loy-step-num">3</span>
            <div>
              <div className="rk-loy-step-title">Customer redeems</div>
              <div className="rk-loy-step-desc">
                They pick a voucher from the options below on their account page
                {cheapestActive !== null && exSpendForVoucher > 0 ? (
                  <>
                    {' '}— e.g. a <Money amount={cheapestActive} /> voucher is about{' '}
                    <b>{((cheapestActive / exSpendForVoucher) * 100).toFixed(1).replace(/\.0$/, '')}% back</b>.
                  </>
                ) : (
                  '.'
                )}
              </div>
            </div>
          </li>
        </ol>

        <div className="rk-loy-rates">
          <div className="rk-ui-form">
            <label className="rk-ui-field">
              <span>Pesos spent to earn 1 point (₱)</span>
              <input
                type="number"
                min={1}
                inputMode="decimal"
                disabled={loading}
                value={settingsForm.pesos_per_point}
                onChange={(e) => setSettingsForm((f) => ({ ...f, pesos_per_point: e.target.value }))}
              />
              {pesosValid ? (
                <span className="rk-ui-field-hint">Lower number = customers earn points faster.</span>
              ) : (
                <span className="rk-loy-problem">Enter an amount greater than 0.</span>
              )}
            </label>
            <label className="rk-ui-field">
              <span>Points needed for 1 voucher</span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                disabled={loading}
                value={settingsForm.points_per_voucher}
                onChange={(e) => setSettingsForm((f) => ({ ...f, points_per_voucher: e.target.value }))}
              />
              {!costValid ? (
                <span className="rk-loy-problem">Enter a whole number, 1 or more.</span>
              ) : formCost !== formCostRaw ? (
                <span className="rk-ui-field-hint">Points are whole numbers — this will be saved as {formCost}.</span>
              ) : (
                <span className="rk-ui-field-hint">Same cost for every redemption option.</span>
              )}
            </label>
          </div>

          <div className="rk-loy-rates-foot">
            <div className="rk-loy-rates-state">
              {ratesDirty ? <Pill tone="warn">Unsaved changes</Pill> : <Pill tone="ok">Saved</Pill>}
            </div>
            <div className="rk-loy-rates-actions">
              {ratesDirty && (
                <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={resetRates} disabled={savingSettings}>
                  Undo changes
                </button>
              )}
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg"
                onClick={saveRates}
                disabled={savingSettings || loading || !ratesDirty || !ratesValid}
              >
                {savingSettings ? 'Saving…' : 'Save rates'}
              </button>
            </div>
          </div>
        </div>

        <p className="rk-loy-note">
          These rates apply to every product that earns points. To give a product a fixed number of points, or to stop a product
          from earning points, open <b>Content → Products</b> and edit that product. Points already earned are not changed.
        </p>
      </div>

      {/* ---- redemption options ---- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconMedal />}
          title="Redemption Options"
          desc={<>The vouchers customers can choose on their account page. Each one costs <b>{plural(settings.points_per_voucher, 'point', 'points')}</b>.</>}
          actions={
            <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setAddingTemplate(true)}>
              + Add option
            </button>
          }
        />

        {!settings.is_enabled && !loading && (
          <Notice tone="info">The program is off, so customers can see their points but can't redeem until you turn it back on.</Notice>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : templates.length === 0 ? (
          <EmptyState
            title="No redemption options yet"
            hint="Customers can't trade their points until you add at least one, e.g. “₱100 off your next purchase”."
            action={
              <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setAddingTemplate(true)}>
                + Add your first option
              </button>
            }
          />
        ) : (
          <div className="rk-ui-list">
            {templates.map((t) => (
              <div key={t.id} className={`rk-ui-list-row ${t.is_active ? 'rk-ui-list-row-ok' : ''}`}>
                <div className="rk-loy-value"><Money amount={Number(t.value)} /></div>
                <div className="rk-ui-list-main">
                  <div className="rk-ui-list-title">{t.label}</div>
                  <div className="rk-ui-list-meta">
                    <Money amount={Number(t.value)} /> voucher · costs {plural(settings.points_per_voucher, 'point', 'points')}
                  </div>
                </div>
                <div className="rk-ui-list-side">
                  {t.is_active ? <Pill tone="ok">Shown to customers</Pill> : <Pill>Hidden</Pill>}
                  <button type="button" className="rk-ui-btn" onClick={() => toggleTemplateActive(t)}>
                    {t.is_active ? 'Hide' : 'Show again'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && templates.length > 0 && (
          <p className="rk-loy-note">Hiding an option only removes it from the list customers choose from. Vouchers already issued from it still work.</p>
        )}
      </div>

      {/* ---- issued vouchers ---- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconReceipt />}
          title="Issued Vouchers"
          desc={`Vouchers customers got from their points or that an admin gave them, newest first${hitLimit ? ` (showing the latest ${VOUCHER_LIMIT})` : ''}.`}
        />

        <Toolbar>
          <SearchInput value={voucherQuery} onChange={setVoucherQuery} placeholder="Search voucher code or customer name…" />
          <Segmented<VoucherFilter>
            label="Filter vouchers"
            value={voucherFilter}
            onChange={setVoucherFilter}
            options={[
              { value: 'available', label: 'Not used yet', count: voucherCounts.available },
              { value: 'used', label: 'Used', count: voucherCounts.used },
              { value: 'all', label: 'All', count: voucherCounts.all },
            ]}
          />
        </Toolbar>

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : visibleVouchers.length === 0 ? (
          vouchers.length === 0 ? (
            <EmptyState title="No vouchers issued yet" hint="When a customer redeems points, their voucher will show up here." />
          ) : voucherQuery.trim() ? (
            <EmptyState
              title="No vouchers match your search"
              hint="Check the spelling, or try the “All” filter."
              action={<button type="button" className="rk-ui-btn" onClick={() => setVoucherQuery('')}>Clear search</button>}
            />
          ) : (
            <EmptyState
              title={voucherFilter === 'available' ? 'No unused vouchers' : 'No used vouchers yet'}
              hint={voucherFilter === 'available' ? 'Every issued voucher has already been used.' : 'None of the issued vouchers have been used at checkout yet.'}
            />
          )
        ) : (
          <div className="rk-ui-list">
            {visibleVouchers.map((v) => (
              <div key={v.id} className={`rk-ui-list-row ${v.redeemed ? '' : 'rk-ui-list-row-ok'}`}>
                <div className="rk-loy-value"><Money amount={Number(v.value)} /></div>
                <div className="rk-ui-list-main">
                  <div className="rk-ui-list-title">
                    <span className="rk-loy-code">{v.code}</span>
                  </div>
                  <div className="rk-ui-list-meta">
                    {v.customers?.full_name ?? 'No customer name'} · Issued {fmtDate(v.created_at)}
                    {v.redeemed && v.redeemed_at ? ` · Used ${fmtDate(v.redeemed_at)}` : ''}
                  </div>
                </div>
                <div className="rk-ui-list-side">
                  {v.source === 'points_redemption' ? <Pill tone="info">From points</Pill> : <Pill>Given by admin</Pill>}
                  {v.redeemed ? <Pill>Used</Pill> : <Pill tone="ok">Not used yet</Pill>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- turn-off confirmation ---- */}
      {confirmingOff && (
        <Modal
          title="Turn loyalty off?"
          onClose={() => setConfirmingOff(false)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirmingOff(false)}>Keep it on</button>
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-danger rk-ui-btn-lg"
                disabled={savingSettings}
                onClick={async () => {
                  await saveSettings({ is_enabled: false }, 'Loyalty is OFF — purchases no longer earn points.')
                  setConfirmingOff(false)
                }}
              >
                {savingSettings ? 'Saving…' : 'Turn off'}
              </button>
            </>
          }
        >
          <ul className="rk-loy-bullets">
            <li>New purchases (in store and online) will <b>not earn points</b>.</li>
            <li>Customers <b>can't redeem</b> points for vouchers while it's off.</li>
            <li>Everyone <b>keeps their points</b> and any vouchers they already have.</li>
            <li>You can turn it back on any time.</li>
          </ul>
        </Modal>
      )}

      {/* ---- add redemption option ---- */}
      {addingTemplate && (
        <Modal
          title="Add redemption option"
          subtitle={`A voucher customers can get for ${plural(settings.points_per_voucher, 'point', 'points')}.`}
          onClose={closeTemplateModal}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={closeTemplateModal}>Cancel</button>
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg"
                disabled={savingTemplate || !templateLabelOk || !templateValueOk}
                onClick={addTemplate}
              >
                {savingTemplate ? 'Saving…' : 'Add option'}
              </button>
            </>
          }
        >
          {error && (
            <Notice tone="alert" onDismiss={() => setError(null)}>
              {error}
            </Notice>
          )}
          <div className="rk-ui-form">
            <label className="rk-ui-field rk-ui-field-full">
              <span>Name customers will see</span>
              <input
                autoFocus
                value={templateForm.label}
                onChange={(e) => setTemplateForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. ₱100 off your next purchase"
              />
              <span className="rk-ui-field-hint">Keep it short and say what they get.</span>
            </label>
            <label className="rk-ui-field">
              <span>Discount amount (₱)</span>
              <input
                type="number"
                min={1}
                inputMode="decimal"
                value={templateForm.value}
                onChange={(e) => setTemplateForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="100"
              />
              {templateValueProblem ? (
                <span className="rk-loy-problem">{templateValueProblem}</span>
              ) : (
                <span className="rk-ui-field-hint">Taken off the total when the voucher is used.</span>
              )}
            </label>
          </div>

          <div className="rk-loy-preview-label">Preview — how customers will see it</div>
          <div className="rk-loy-preview">
            <div className="rk-ui-list-main">
              <div className="rk-ui-list-title">{templateForm.label.trim() || 'Your option name'}</div>
              <div className="rk-ui-list-meta">
                {templateValueOk ? <Money amount={templateValue} /> : '₱—'} voucher · {settings.points_per_voucher.toLocaleString()} pts
              </div>
            </div>
            <span className="rk-ui-btn" aria-hidden="true">Redeem</span>
          </div>
          {templateValueOk && exSpendForVoucher > 0 && (
            <p className="rk-loy-note">
              At your current rates, a customer earns this after about <Money amount={settings.points_per_voucher * settings.pesos_per_point} /> of
              shopping — roughly {((templateValue / (settings.points_per_voucher * settings.pesos_per_point)) * 100).toFixed(1).replace(/\.0$/, '')}% back.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

const loyaltyStyles = `
  .rk-loy-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem 1.125rem;
    margin-bottom: 1.25rem;
    border: 1px solid var(--border);
    border-left: 4px solid var(--text-faint);
    border-radius: 0.875rem;
    background: var(--bg-secondary);
  }
  .rk-loy-status-on { border-left-color: #0ca30c; }
  .rk-loy-status-off { border-left-color: var(--accent-red); }
  .rk-loy-status-text { flex: 1; min-width: 14rem; }
  .rk-loy-status-line { display: flex; align-items: center; gap: 0.625rem; }
  .rk-loy-status-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.375rem;
    text-transform: uppercase;
    color: var(--text);
  }
  .rk-loy-status-line .rk-ui-pill { font-size: 0.8125rem; padding: 0.35rem 0.75rem; }
  .rk-loy-status-desc { margin: 0.375rem 0 0; font-size: 0.875rem; color: var(--text-muted); }

  .rk-loy-steps {
    list-style: none;
    margin: 0 0 1.25rem;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: 0.75rem;
  }
  .rk-loy-steps li {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.875rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 0.875rem;
  }
  .rk-loy-step-num {
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: var(--text);
    color: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 0.8125rem;
  }
  .rk-loy-step-title { font-weight: 800; font-size: 0.875rem; color: var(--text); }
  .rk-loy-step-desc { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.125rem; }
  .rk-loy-step-desc b { color: var(--text); }

  .rk-loy-rates {
    border: 1px solid var(--border);
    border-radius: 0.875rem;
    padding: 1rem;
  }
  .rk-loy-rates-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .rk-loy-rates-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .rk-loy-problem { font-size: 0.6875rem; font-weight: 700; color: var(--accent-red); }

  .rk-loy-note { font-size: 0.8125rem; color: var(--text-muted); margin: 0.875rem 0 0; }
  .rk-loy-note b { color: var(--text); }

  .rk-loy-value {
    flex-shrink: 0;
    min-width: 4.5rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--text);
  }
  .rk-loy-code { font-family: ui-monospace, monospace; font-size: 0.875rem; letter-spacing: 0.03em; }

  .rk-loy-bullets { margin: 0; padding-left: 1.125rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: var(--text-muted); }
  .rk-loy-bullets b { color: var(--text); }

  .rk-loy-preview-label {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 1.25rem 0 0.5rem;
  }
  .rk-loy-preview {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border: 1px dashed var(--border);
    border-radius: 0.75rem;
    background: var(--bg-secondary);
  }
  .rk-loy-preview .rk-ui-btn { pointer-events: none; }

  @media (max-width: 40rem) {
    .rk-loy-status > .rk-ui-btn { width: 100%; }
    .rk-loy-rates-actions { width: 100%; }
    .rk-loy-rates-actions .rk-ui-btn-primary { flex: 1; }
  }
`
