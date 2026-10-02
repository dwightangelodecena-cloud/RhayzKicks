import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

// "Part 2" of the storefront video ad. Part 1 plays in the corner popup
// (VideoAdPopup) for everyone; Part 2 is a thank-you for buyers: it pops up
// after a purchase (OrderSuccessPage) and stays watchable in
// Account → Rewards once the customer has bought something.
export const PART2_VIDEO_SRC = '/videos/rhayz-ad-part2.mp4'

function SoundButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="rk-part2-sound" onClick={onToggle} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>
      {muted ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
      )}
      {muted ? 'Sound on' : 'Mute'}
    </button>
  )
}

const part2Styles = `
  .rk-part2-backdrop {
    position: fixed;
    inset: 0;
    z-index: 260;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: rk-part2-fade 0.25s ease;
  }
  .rk-part2-modal {
    width: 100%;
    max-width: 44rem;
    background: #0b0b0b;
    color: #fff;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
    animation: rk-part2-pop 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  .rk-part2-video-wrap {
    position: relative;
    background: #000;
  }
  .rk-part2-video {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    background: #000;
  }
  .rk-part2-tag {
    position: absolute;
    top: 0.875rem;
    left: 0.875rem;
    background: var(--accent-red, #e4002b);
    color: #fff;
    font-size: 0.6875rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
  }
  .rk-part2-sound {
    position: absolute;
    bottom: 0.875rem;
    right: 0.875rem;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 999px;
    padding: 0.45rem 0.8rem;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 800;
    cursor: pointer;
  }
  .rk-part2-body {
    padding: 1.25rem 1.5rem 1.5rem;
  }
  .rk-part2-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.75rem;
    text-transform: uppercase;
    line-height: 1.05;
    margin: 0;
  }
  .rk-part2-text {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.55;
    margin: 0.5rem 0 1.25rem;
  }
  .rk-part2-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .rk-part2-btn {
    flex: 1;
    min-width: 9rem;
    text-align: center;
    text-decoration: none;
    border-radius: 999px;
    padding: 0.8rem 1.25rem;
    font: inherit;
    font-weight: 900;
    font-size: 0.8125rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: transparent;
    color: #fff;
  }
  .rk-part2-btn-primary {
    background: #fff;
    color: #0b0b0b;
    border-color: #fff;
  }
  @keyframes rk-part2-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rk-part2-pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: none; } }

  /* Account → Rewards card */
  .rk-part2-card {
    margin-top: 1.75rem;
    border-radius: 0.875rem;
    overflow: hidden;
    background: #0b0b0b;
    color: #fff;
  }
  .rk-part2-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.875rem 1.125rem;
  }
  .rk-part2-card-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.25rem;
    text-transform: uppercase;
  }
  .rk-part2-card-sub {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.65);
  }
  .rk-part2-locked {
    position: relative;
    aspect-ratio: 16 / 9;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    text-align: center;
    padding: 1.5rem;
    background:
      radial-gradient(circle at 50% 40%, rgba(228, 0, 43, 0.35), transparent 60%),
      repeating-linear-gradient(135deg, #111 0 12px, #151515 12px 24px);
  }
  .rk-part2-lock {
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rk-part2-locked strong {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.375rem;
    text-transform: uppercase;
  }
  .rk-part2-locked span {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    max-width: 22rem;
  }
  .rk-part2-locked a {
    margin-top: 0.5rem;
    display: inline-block;
    background: #fff;
    color: #0b0b0b;
    border-radius: 999px;
    padding: 0.65rem 1.25rem;
    font-weight: 900;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-decoration: none;
  }
`

// Popup shown right after a purchase.
export function Part2AdModal({ onClose }: { onClose: () => void }) {
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="rk-part2-backdrop" onClick={onClose}>
      <style>{part2Styles}</style>
      <div className="rk-part2-modal" role="dialog" aria-modal="true" aria-labelledby="rk-part2-title" onClick={(e) => e.stopPropagation()}>
        <div className="rk-part2-video-wrap">
          <video ref={videoRef} className="rk-part2-video" src={PART2_VIDEO_SRC} autoPlay muted={muted} playsInline controls={false} loop />
          <span className="rk-part2-tag">Part 2 · Unlocked</span>
          <SoundButton muted={muted} onToggle={() => setMuted((m) => !m)} />
        </div>
        <div className="rk-part2-body">
          <h2 className="rk-part2-title" id="rk-part2-title">Thanks for copping a pair!</h2>
          <p className="rk-part2-text">
            You’ve unlocked Part 2 of the Rhayz Kicks ad — a members-only exclusive. Watch it again anytime in My Account → Rewards.
          </p>
          <div className="rk-part2-actions">
            <button type="button" className="rk-part2-btn" onClick={onClose}>Close</button>
            <Link to="/account?tab=rewards" className="rk-part2-btn rk-part2-btn-primary" onClick={onClose}>View in my account</Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Card in Account → Rewards: the video once they've bought something,
// a locked teaser before that.
export function Part2AdCard({ unlocked }: { unlocked: boolean }) {
  const [muted, setMuted] = useState(true)
  return (
    <div className="rk-part2-card">
      <style>{part2Styles}</style>
      <div className="rk-part2-card-head">
        <div>
          <div className="rk-part2-card-title">Exclusive: Part 2</div>
          <div className="rk-part2-card-sub">{unlocked ? 'The members-only follow-up to our ad — yours to rewatch.' : 'Members who buy a pair unlock the second part of our ad.'}</div>
        </div>
      </div>
      {unlocked ? (
        <div className="rk-part2-video-wrap">
          <video className="rk-part2-video" src={PART2_VIDEO_SRC} muted={muted} playsInline controls preload="metadata" />
          <SoundButton muted={muted} onToggle={() => setMuted((m) => !m)} />
        </div>
      ) : (
        <div className="rk-part2-locked">
          <div className="rk-part2-lock">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <strong>Locked</strong>
          <span>Buy your first pair — online or in store — to unlock Part 2.</span>
          <Link to="/category/new-releases">Shop now</Link>
        </div>
      )}
    </div>
  )
}
