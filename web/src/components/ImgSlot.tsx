interface ImgSlotProps {
  label: string
  size: string
  dark?: boolean
  aspect?: string // e.g. "4 / 3"
  className?: string
  src?: string | null // real image URL from admin content — falls back to the placeholder when empty
}

// Drop-in placeholder for a real product/marketing photo, or the photo itself
// once an admin has set one via the CMS (pass `src`).
export default function ImgSlot({ label, size, dark, aspect, className, src }: ImgSlotProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`img-slot-photo ${className ?? ''}`}
        style={aspect ? { aspectRatio: aspect } : undefined}
      />
    )
  }

  return (
    <div
      className={`img-slot ${dark ? 'img-slot-dark' : ''} ${className ?? ''}`}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      <style>{`
        .img-slot-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .img-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          height: 100%;
          background: var(--placeholder-bg);
          border: 1px dashed var(--placeholder-border);
          color: var(--placeholder-icon);
        }
        .img-slot-dark {
          background: var(--placeholder-bg);
          border-color: var(--placeholder-border);
          color: var(--placeholder-icon);
        }
        .img-slot-icon {
          width: 30px;
          height: 30px;
        }
        .img-slot-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-align: center;
          padding: 0 0.75rem;
          line-height: 1.2;
          color: var(--placeholder-label);
        }
        .img-slot-size {
          font-size: 8px;
          font-weight: 500;
          color: var(--placeholder-size);
        }
      `}</style>
      <svg className="img-slot-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M21 15l-5-5-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="img-slot-label">{label}</span>
      <span className="img-slot-size">{size}</span>
    </div>
  )
}
