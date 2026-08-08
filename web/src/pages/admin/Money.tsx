import { formatPeso } from '../../data/catalog'

// Barlow Condensed (and some fallback stacks) don't carry a ₱ glyph, so the
// browser silently substitutes a mismatched weight/width for just that one
// character inside bold display numbers. Rendering the sign in its own span
// with a system font stack keeps it legible everywhere, at any size/weight.
export function formatCompactPeso(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`
  return `₱${Math.round(n)}`
}

export function Money({ amount, compact = false }: { amount: number; compact?: boolean }) {
  const formatted = compact ? formatCompactPeso(amount) : formatPeso(Math.round(amount))
  return (
    <>
      <span className="rk-peso">₱</span>
      {formatted.slice(1)}
    </>
  )
}
