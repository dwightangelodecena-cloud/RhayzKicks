import { useCallback, useEffect, useRef, useState } from 'react'

// Tracks whether an element has scrolled into the viewport at least once, to
// trigger a one-time entrance animation instead of re-firing on every scroll.
//
// Uses a callback ref (not a plain ref object) because several callers render
// `null` until their data has loaded — the target element doesn't exist on
// first mount, so an effect keyed on a static dependency array would run once
// against a null node and never re-run once the element actually appears.
// A callback ref re-fires whenever the node itself changes, which an effect
// can depend on directly.
//
// This is a progressive enhancement, never a visibility gate: if
// IntersectionObserver is unsupported, or its callback simply never fires
// (browser throttling in a backgrounded tab, some privacy extensions shim it
// away entirely), a fallback timer reveals the content anyway so it can never
// stay hidden waiting on an animation trigger that isn't coming.
const FALLBACK_DELAY_MS = 1200

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const [node, setNode] = useState<T | null>(null)
  const [isInView, setIsInView] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const ref = useCallback((el: T | null) => setNode(el), [])

  useEffect(() => {
    if (!node || isInView) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true)
      return
    }

    const reveal = () => setIsInView(true)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) reveal()
    }, { threshold: 0.15, ...optionsRef.current })
    observer.observe(node)
    const fallback = window.setTimeout(reveal, FALLBACK_DELAY_MS)

    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [node, isInView])

  return [ref, isInView] as const
}
