import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemePreference = 'default' | 'light' | 'dark'
export type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'rk-theme-preference'
const DAY_START_HOUR = 6 // 6:00 AM
const DAY_END_HOUR = 18 // 6:00 PM

function computeTimeBasedTheme(): EffectiveTheme {
  const hour = new Date().getHours()
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'light' : 'dark'
}

function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme {
  if (preference === 'default') return computeTimeBasedTheme()
  return preference
}

interface ThemeContextValue {
  preference: ThemePreference
  effectiveTheme: EffectiveTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'default' ? stored : 'default'
  })

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    resolveEffectiveTheme(preference),
  )

  useEffect(() => {
    setEffectiveTheme(resolveEffectiveTheme(preference))

    if (preference !== 'default') return

    // Re-check every minute so "Default" flips automatically at the day/night boundary
    // while the app stays open, without needing a refresh.
    const interval = setInterval(() => {
      setEffectiveTheme(resolveEffectiveTheme('default'))
    }, 60_000)

    return () => clearInterval(interval)
  }, [preference])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [effectiveTheme])

  const setPreference = (next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next)
    setPreferenceState(next)
  }

  const value = useMemo(
    () => ({ preference, effectiveTheme, setPreference }),
    [preference, effectiveTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
