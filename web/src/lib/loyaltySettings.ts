import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// loyalty_settings singleton (021_default_loyalty_earning.sql) — admin sets
// the on/off switch and rates in Admin → Loyalty. Falls back to the DB
// defaults if the row can't be read.
export interface LoyaltySettings {
  isEnabled: boolean
  pesosPerPoint: number
  pointsPerVoucher: number
}

export const defaultLoyaltySettings: LoyaltySettings = { isEnabled: true, pesosPerPoint: 100, pointsPerVoucher: 100 }

export async function fetchLoyaltySettings(): Promise<LoyaltySettings> {
  const { data, error } = await supabase
    .from('loyalty_settings')
    .select('is_enabled, pesos_per_point, points_per_voucher')
    .eq('id', true)
    .maybeSingle()
  if (error || !data) return defaultLoyaltySettings
  return {
    isEnabled: data.is_enabled,
    pesosPerPoint: Number(data.pesos_per_point),
    pointsPerVoucher: Number(data.points_per_voucher),
  }
}

export function useLoyaltySettings(): LoyaltySettings {
  const [settings, setSettings] = useState(defaultLoyaltySettings)
  useEffect(() => {
    let cancelled = false
    fetchLoyaltySettings().then((s) => {
      if (!cancelled) setSettings(s)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return settings
}
