import { useTheme } from '../theme/ThemeContext'
import type { ThemePreference } from '../theme/ThemeContext'
import { useShop } from '../context/ShopContext'

const options: { value: ThemePreference; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Stand-in for the real Settings screen — lets you confirm the auto day/night
// switch and manual override both work.
export default function ThemeToggle() {
  const { preference, setPreference, effectiveTheme } = useTheme()
  const { isCartOpen, isWishlistOpen } = useShop()
  const hidden = isCartOpen || isWishlistOpen

  return (
    <div className={`rk-theme-toggle ${hidden ? 'rk-theme-toggle-hidden' : ''}`}>
      <style>{`
        .rk-theme-toggle {
          position: fixed;
          bottom: calc(1rem + env(safe-area-inset-bottom));
          right: 1rem;
          z-index: 80;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.4rem 0.6rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .rk-theme-toggle-hidden {
          opacity: 0;
          transform: translateY(0.5rem);
          pointer-events: none;
        }
        .rk-theme-toggle-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          padding-left: 0.3rem;
          white-space: nowrap;
        }
        .rk-theme-toggle-btn {
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.3rem 0.6rem;
          border-radius: 999px;
          cursor: pointer;
        }
        .rk-theme-toggle-btn-active {
          background: var(--text);
          color: var(--bg);
        }
      `}</style>
      <span className="rk-theme-toggle-label">Theme ({effectiveTheme}):</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`rk-theme-toggle-btn ${preference === opt.value ? 'rk-theme-toggle-btn-active' : ''}`}
          onClick={() => setPreference(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
