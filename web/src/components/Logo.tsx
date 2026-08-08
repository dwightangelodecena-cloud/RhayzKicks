interface LogoProps {
  size?: number
  className?: string
  ring?: boolean
  ringColor?: string
  ringOffset?: number
}

export default function Logo({ size = 40, className, ring, ringColor = 'var(--text)', ringOffset = 0 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Rhayz Kicks"
      width={size}
      height={size}
      className={`rk-logo-img ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        outline: ring ? `2px solid ${ringColor}` : undefined,
        outlineOffset: ring ? ringOffset : undefined,
      }}
    />
  )
}
