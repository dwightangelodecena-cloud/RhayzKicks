import { useTheme } from '../theme/ThemeContext'
import { useShop } from '../context/ShopContext'

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

// Sits bottom-left so it never collides with the video ad popup, which
// docks bottom-right. Shows the theme you'd switch *to*: a moon while it's
// light, a sun while it's dark.
export default function ThemeToggle() {
  const { setPreference, effectiveTheme } = useTheme()
  const { isCartOpen, isWishlistOpen } = useShop()
  const hidden = isCartOpen || isWishlistOpen
  const isDark = effectiveTheme === 'dark'

  return (
    <button
      type="button"
      className={`rk-theme-toggle ${hidden ? 'rk-theme-toggle-hidden' : ''}`}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <style>{`
        .rk-theme-toggle {
          position: fixed;
          bottom: calc(1rem + env(safe-area-inset-bottom));
          left: 1rem;
          z-index: 80;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 50%;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .rk-theme-toggle:hover {
          transform: scale(1.06);
        }
        .rk-theme-toggle-hidden {
          opacity: 0;
          transform: translateY(0.5rem);
          pointer-events: none;
        }
      `}</style>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
