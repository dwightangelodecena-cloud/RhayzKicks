import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { fetchLoyaltySettings, defaultLoyaltySettings } from '../lib/loyaltySettings'
import type { LoyaltySettings } from '../lib/loyaltySettings'

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface TemplateRow {
  id: string
  label: string
  value: number
}

interface VoucherRow {
  id: string
  code: string
  value: number
  redeemed: boolean
  created_at: string
}

// Account → Rewards: points balance, redemption options (voucher_templates
// the admin curates in Admin → Loyalty), and the customer's own vouchers.
// Redeeming goes through the redeem_points RPC, which checks the balance,
// the on/off switch, and deducts points server-side.
export default function RewardsPanel() {
  const { customer, refreshCustomer } = useAuth()
  const [settings, setSettings] = useState<LoyaltySettings>(defaultLoyaltySettings)
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const customerId = customer?.id ?? null
  const points = customer?.loyaltyPoints ?? 0

  const load = useCallback(async () => {
    if (!customerId) return
    const [s, templatesRes, vouchersRes] = await Promise.all([
      fetchLoyaltySettings(),
      supabase.from('voucher_templates').select('id, label, value').eq('is_active', true).order('value'),
      supabase
        .from('vouchers')
        .select('id, code, value, redeemed, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
    ])
    setSettings(s)
    setTemplates((templatesRes.data ?? []).map((t) => ({ ...t, value: Number(t.value) })) as TemplateRow[])
    setVouchers((vouchersRes.data ?? []).map((v) => ({ ...v, value: Number(v.value) })) as VoucherRow[])
    setLoading(false)
  }, [customerId])

  useEffect(() => {
    load()
  }, [load])

  const redeem = async (template: TemplateRow) => {
    if (!customerId) return
    setRedeemingId(template.id)
    setError(null)
    setMessage(null)
    const { error: rpcError } = await supabase.rpc('redeem_points', { p_customer_id: customerId, p_template_id: template.id })
    setRedeemingId(null)
    setConfirmId(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage(`Redeemed! Your "${template.label}" voucher is below — pick it at online checkout or show the code in store.`)
    await Promise.all([refreshCustomer(), load()])
  }

  const cost = settings.pointsPerVoucher
  const canRedeem = settings.isEnabled && points >= cost
  const activeVouchers = vouchers.filter((v) => !v.redeemed)
  const usedVouchers = vouchers.filter((v) => v.redeemed)

  return (
    <div className="rk-rewards">
      <style>{`
        .rk-rewards-progress {
          margin: 1.25rem 0 0;
        }
        .rk-rewards-progress-bar {
          height: 8px;
          border-radius: 999px;
          background: var(--border);
          overflow: hidden;
        }
        .rk-rewards-progress-fill {
          height: 100%;
          background: #f5b400;
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .rk-rewards-progress-text {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-top: 0.4rem;
        }
        .rk-rewards-section-title {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin: 1.75rem 0 0.75rem;
        }
        .rk-rewards-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .rk-rewards-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          flex-wrap: wrap;
        }
        .rk-rewards-row-title {
          font-weight: 700;
          color: var(--text);
        }
        .rk-rewards-row-sub {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-rewards-actions {
          display: flex;
          gap: 0.4rem;
        }
        .rk-rewards-btn {
          border: 1px solid var(--text);
          background: var(--text);
          color: var(--bg);
          font-weight: 800;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0.55rem 1rem;
          border-radius: 999px;
          cursor: pointer;
        }
        .rk-rewards-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .rk-rewards-btn-ghost {
          background: transparent;
          color: var(--text);
          border-color: var(--border);
        }
        .rk-rewards-code {
          font-family: ui-monospace, monospace;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.05em;
          color: var(--text);
        }
        .rk-rewards-used {
          opacity: 0.55;
        }
        .rk-rewards-note {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-rewards-error {
          color: var(--accent-red);
        }
        .rk-rewards-ok {
          color: #0ca30c;
        }
      `}</style>

      {settings.isEnabled ? (
        <div className="rk-rewards-progress">
          <div className="rk-rewards-progress-bar">
            <div className="rk-rewards-progress-fill" style={{ width: `${Math.min(100, (points / cost) * 100)}%` }} />
          </div>
          <div className="rk-rewards-progress-text">
            {points >= cost
              ? `You have enough points to redeem a voucher (${cost} pts each).`
              : `${cost - points} more points to your next voucher. You earn 1 point for every ${formatPeso(settings.pesosPerPoint)} spent.`}
          </div>
        </div>
      ) : (
        <p className="rk-rewards-note" style={{ marginTop: '1rem' }}>
          The loyalty program is paused right now — purchases aren't earning points and redeeming is unavailable. Your points and vouchers are safe.
        </p>
      )}

      {message && <p className="rk-rewards-note rk-rewards-ok" style={{ marginTop: '1rem' }}>{message}</p>}
      {error && <p className="rk-rewards-note rk-rewards-error" style={{ marginTop: '1rem' }}>{error}</p>}

      {settings.isEnabled && (
        <>
          <div className="rk-rewards-section-title">Redeem Points</div>
          {loading ? (
            <p className="rk-rewards-note">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="rk-rewards-note">No rewards available right now — check back soon.</p>
          ) : (
            <div className="rk-rewards-list">
              {templates.map((t) => (
                <div key={t.id} className="rk-rewards-row">
                  <div>
                    <div className="rk-rewards-row-title">{t.label}</div>
                    <div className="rk-rewards-row-sub">{formatPeso(t.value)} voucher · {cost} pts</div>
                  </div>
                  {confirmId === t.id ? (
                    <div className="rk-rewards-actions">
                      <button className="rk-rewards-btn rk-rewards-btn-ghost" onClick={() => setConfirmId(null)} disabled={redeemingId === t.id}>Cancel</button>
                      <button className="rk-rewards-btn" onClick={() => redeem(t)} disabled={redeemingId === t.id}>
                        {redeemingId === t.id ? 'Redeeming…' : `Use ${cost} pts`}
                      </button>
                    </div>
                  ) : (
                    <button className="rk-rewards-btn" disabled={!canRedeem} onClick={() => setConfirmId(t.id)}>Redeem</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="rk-rewards-section-title">My Vouchers</div>
      {activeVouchers.length === 0 && usedVouchers.length === 0 ? (
        <p className="rk-rewards-note">No vouchers yet.</p>
      ) : (
        <div className="rk-rewards-list">
          {activeVouchers.map((v) => (
            <div key={v.id} className="rk-rewards-row">
              <div>
                <div className="rk-rewards-code">{v.code}</div>
                <div className="rk-rewards-row-sub">{formatPeso(v.value)} off · pick it at online checkout or show the code in store</div>
              </div>
              <span className="rk-rewards-row-sub rk-rewards-ok">Available</span>
            </div>
          ))}
          {usedVouchers.map((v) => (
            <div key={v.id} className="rk-rewards-row rk-rewards-used">
              <div>
                <div className="rk-rewards-code">{v.code}</div>
                <div className="rk-rewards-row-sub">{formatPeso(v.value)} off</div>
              </div>
              <span className="rk-rewards-row-sub">Used</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
