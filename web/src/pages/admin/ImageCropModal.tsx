import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ImageCropModalProps {
  file: File
  aspect: number // width / height
  onSave: (blob: Blob) => void
  onDiscard: () => void
}

const FRAME_W = 420

export default function ImageCropModal({ file, aspect, onSave, onDiscard }: ImageCropModalProps) {
  const frameW = FRAME_W
  const frameH = FRAME_W / aspect
  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [baseScale, setBaseScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onImgLoad = () => {
    const el = imgRef.current
    if (!el) return
    const w = el.naturalWidth
    const h = el.naturalHeight
    const scale = Math.max(frameW / w, frameH / h)
    setNaturalSize({ w, h })
    setBaseScale(scale)
    setZoom(1)
    setPos({ x: (frameW - w * scale) / 2, y: (frameH - h * scale) / 2 })
  }

  const clamp = (x: number, y: number, scale: number) => {
    const dispW = naturalSize.w * scale
    const dispH = naturalSize.h * scale
    const minX = Math.min(0, frameW - dispW)
    const minY = Math.min(0, frameH - dispH)
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) }
  }

  const setZoomClamped = (nextZoom: number) => {
    const z = Math.min(3, Math.max(1, nextZoom))
    const oldScale = baseScale * zoom
    const newScale = baseScale * z
    // keep the frame's center anchored to the same point in the image while zooming
    const centerImgX = (frameW / 2 - pos.x) / oldScale
    const centerImgY = (frameH / 2 - pos.y) / oldScale
    const nextX = frameW / 2 - centerImgX * newScale
    const nextY = frameH / 2 - centerImgY * newScale
    setZoom(z)
    setPos(clamp(nextX, nextY, newScale))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos(clamp(dragRef.current.origX + dx, dragRef.current.origY + dy, baseScale * zoom))
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const save = () => {
    const el = imgRef.current
    if (!el || naturalSize.w === 0) return
    setSaving(true)
    const scale = baseScale * zoom
    const sourceX = -pos.x / scale
    const sourceY = -pos.y / scale
    const sourceW = frameW / scale
    const sourceH = frameH / scale

    const outW = Math.round(frameW * 2)
    const outH = Math.round(frameH * 2)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setSaving(false)
      return
    }
    ctx.drawImage(el, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH)
    canvas.toBlob((blob) => {
      setSaving(false)
      if (blob) onSave(blob)
    }, 'image/jpeg', 0.92)
  }

  return createPortal(
    <div className="rk-crop-overlay">
      <style>{`
        .rk-crop-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .rk-crop-panel {
          background: var(--bg);
          border-radius: 1rem;
          padding: 1.25rem;
          max-width: 100%;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
        }
        .rk-crop-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 1.125rem;
          color: var(--text);
          margin: 0 0 0.25rem;
        }
        .rk-crop-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
        }
        .rk-crop-frame {
          position: relative;
          overflow: hidden;
          background: #111;
          border-radius: 0.625rem;
          touch-action: none;
          cursor: grab;
        }
        .rk-crop-frame:active {
          cursor: grabbing;
        }
        .rk-crop-img {
          position: absolute;
          top: 0;
          left: 0;
          transform-origin: top left;
          user-select: none;
          -webkit-user-drag: none;
          pointer-events: none;
        }
        .rk-crop-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .rk-crop-zoom {
          flex: 1;
          accent-color: var(--accent-red);
        }
        .rk-crop-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.625rem;
          margin-top: 1.25rem;
        }
        .rk-crop-discard {
          border: 1px solid var(--border);
          background: none;
          color: var(--text);
          border-radius: 999px;
          padding: 0.75rem 1.25rem;
          font-weight: 800;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
        }
      `}</style>
      <div className="rk-crop-panel">
        <h3 className="rk-crop-title">Adjust Image</h3>
        <p className="rk-crop-desc">Drag to reposition, use the slider to zoom, then save.</p>
        <div
          className="rk-crop-frame"
          style={{ width: frameW, height: frameH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              className="rk-crop-img"
              onLoad={onImgLoad}
              style={{
                width: naturalSize.w,
                height: naturalSize.h,
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${baseScale * zoom})`,
              }}
            />
          )}
        </div>
        <div className="rk-crop-controls">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zoom</span>
          <input
            className="rk-crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
          />
        </div>
        <div className="rk-crop-actions">
          <button type="button" className="rk-crop-discard" onClick={onDiscard} disabled={saving}>Discard</button>
          <button type="button" className="rk-admin-primary-btn" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
