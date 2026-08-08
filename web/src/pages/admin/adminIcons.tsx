interface IconProps {
  size?: number
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconOverview({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

export function IconMegaphone({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3 11v2a2 2 0 0 0 2 2h1l3 5V9L6 4H5a2 2 0 0 0-2 2v2" />
      <path d="M9 4v16l8-4V8z" />
      <path d="M21 9v6" />
    </svg>
  )
}

export function IconBox({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  )
}

export function IconTags({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 2h6a2 2 0 0 1 2 2v6l-9 9-8-8 9-9z" />
      <circle cx="16" cy="7" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconTruck({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="1.5" y="7" width="12" height="10" rx="1" />
      <path d="M13.5 10h4l3.5 3.5V17h-7.5z" />
      <circle cx="6" cy="19" r="1.75" />
      <circle cx="17" cy="19" r="1.75" />
    </svg>
  )
}

export function IconClock({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

export function IconWallet({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M16 13.5h3v2.5h-3a1.25 1.25 0 0 1 0-2.5z" />
    </svg>
  )
}

export function IconTrendUp({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </svg>
  )
}

export function IconUsers({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.25 3.25 0 0 1 0 6.3" />
      <path d="M15 13.2a6.5 6.5 0 0 1 6.5 6.8h-3" />
    </svg>
  )
}

export function IconAlertTriangle({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M10.6 3.9 2.4 18a1.7 1.7 0 0 0 1.5 2.5h16.2a1.7 1.7 0 0 0 1.5-2.5L13.4 3.9a1.6 1.6 0 0 0-2.8 0z" />
      <line x1="12" y1="9.5" x2="12" y2="13.5" />
      <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
    </svg>
  )
}

export function IconPercent({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

export function IconPackageCheck({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
      <path d="M16.5 6.2 12 8.6 7.5 6.2" />
    </svg>
  )
}

export function IconReceipt({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M6 2.5h12v19l-2.5-1.5L13 21.5l-2.5-1.5L8 21.5 6 20z" />
      <line x1="8.5" y1="7" x2="15.5" y2="7" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
    </svg>
  )
}

export function IconChartBar({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3" height="8" rx="0.75" />
      <rect x="11" y="7" width="3" height="13" rx="0.75" />
      <rect x="16" y="14.5" width="3" height="5.5" rx="0.75" />
    </svg>
  )
}

export function IconMedal({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="14.5" r="6" />
      <path d="M9 3h6l-1.8 6.4L12 12l-1.2-2.6z" />
    </svg>
  )
}

export function IconStore({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3 9.5 4.5 4h15L21 9.5" />
      <path d="M3 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  )
}

export function IconLayers({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 2.5 21 7.5 12 12.5 3 7.5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16.5l9 5 9-5" />
    </svg>
  )
}

export function IconLogout({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function IconUndo({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

export function IconReset({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  )
}

export function IconSave({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M8 3v6h8V3" />
      <path d="M7 21v-7h10v7" />
    </svg>
  )
}

export function IconEye({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function IconRefresh({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

export function IconMonitor({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="2" y="4" width="20" height="13" rx="1.5" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  )
}

export function IconSmartphone({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  )
}
