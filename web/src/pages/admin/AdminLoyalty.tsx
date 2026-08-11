import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconMedal, IconReceipt } from './adminIcons'

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

const emptyTemplateForm = { label: '', value: '' }

export default function AdminLoyalty() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addingTemplate, setAddingTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm)

  const [showRedeemed, setShowRedeemed] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [templatesRes, vouchersRes] = await Promise.all([
      supabase.from('voucher_templates').select('id, label, value, is_active').order('value'),
      supabase
        .from('vouchers')
        .select('id, code, value, source, redeemed, redeemed_at, created_at, customers(full_name)')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (templatesRes.error || vouchersRes.error) {
      setError((templatesRes.error ?? vouchersRes.error)?.message ?? 'Failed to load.')
      setLoading(false)
      return
    }
    setTemplates((templatesRes.data ?? []) as TemplateRow[])
    setVouchers((vouchersRes.data ?? []) as unknown as VoucherRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const addTemplate = async () => {
    if (!templateForm.label.trim() || !templateForm.value) return
    const { error: insertError } = await supabase.from('voucher_templates').insert({
      label: templateForm.label.trim(),
      value: Number(templateForm.value),
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setTemplateForm(emptyTemplateForm)
    setAddingTemplate(false)
    load()
  }

  const toggleTemplateActive = async (t: TemplateRow) => {
    const { error: updateError } = await supabase.from('voucher_templates').update({ is_active: !t.is_active }).eq('id', t.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  const visibleVouchers = vouchers.filter((v) => showRedeemed || !v.redeemed)

  return (
    <div>
      <style>{adminCardStyles}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconMedal /> Redemption Options</h2>
            <p className="rk-admin-card-desc">What a customer can redeem for 100 loyalty points — shown on their account.</p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAddingTemplate((a) => !a)}>+ Add Option</button>
        </div>

        {addingTemplate && (
          <div className="rk-admin-form-panel">
            <div className="rk-admin-form-grid">
              <label className="rk-field">
                <span className="rk-field-label">Label</span>
                <input value={templateForm.label} onChange={(e) => setTemplateForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. ₱50 off your next purchase" />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Value (₱)</span>
                <input type="number" value={templateForm.value} onChange={(e) => setTemplateForm((f) => ({ ...f, value: e.target.value }))} />
              </label>
              <div className="rk-admin-form-actions">
                <button className="rk-admin-add-btn" onClick={addTemplate}>Save Option</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="rk-admin-empty">No redemption options yet.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr><th>Label</th><th>Value</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td>{t.label}</td>
                    <td><Money amount={t.value} /></td>
                    <td>
                      <span className={`rk-admin-badge ${t.is_active ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}>
                        {t.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <button className="rk-admin-icon-btn" onClick={() => toggleTemplateActive(t)}>
                        {t.is_active ? 'Hide' : 'Unhide'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconReceipt /> Issued Vouchers</h2>
            <p className="rk-admin-card-desc">Redeemed points and admin-granted vouchers, most recent first.</p>
          </div>
          <label className="rk-inv-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={showRedeemed} onChange={(e) => setShowRedeemed(e.target.checked)} />
            Show redeemed
          </label>
        </div>

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : visibleVouchers.length === 0 ? (
          <p className="rk-admin-empty">No vouchers to show.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr><th>Code</th><th>Customer</th><th>Value</th><th>Source</th><th>Status</th><th>Issued</th></tr>
              </thead>
              <tbody>
                {visibleVouchers.map((v) => (
                  <tr key={v.id}>
                    <td>{v.code}</td>
                    <td>{v.customers?.full_name ?? '—'}</td>
                    <td><Money amount={v.value} /></td>
                    <td>{v.source === 'points_redemption' ? 'Points redemption' : 'Admin grant'}</td>
                    <td>
                      <span className={`rk-admin-badge ${v.redeemed ? 'rk-admin-badge-off' : 'rk-admin-badge-ok'}`}>
                        {v.redeemed ? 'Redeemed' : 'Active'}
                      </span>
                    </td>
                    <td>{new Date(v.created_at).toLocaleDateString()}</td>
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
