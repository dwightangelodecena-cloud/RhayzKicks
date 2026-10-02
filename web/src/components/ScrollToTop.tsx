import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router keeps the scroll position between routes, so a footer link
// would open the next page already scrolled to the bottom. Jump to the top on
// every navigation — or to the #anchor when there is one (e.g. /help#contact).
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!hash) return
    // Give the target page a moment to render (and its images to settle the
    // layout) before jumping to the anchor.
    const id = window.setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
    }, 100)
    return () => window.clearTimeout(id)
  }, [pathname, search, hash])

  return null
}
