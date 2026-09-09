import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { formatPeso } from '../data/catalog'
import { getActiveProducts, getAnnouncements, getNavCategories, type Announcement, type NavCategory, type Product } from '../lib/storeData'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
    </svg>
  )
}

function SearchResults({ query, products, onNavigate }: { query: string; products: Product[]; onNavigate: () => void }) {
  const results = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
  if (!query) return null
  return (
    <div className="rk-search-results">
      <style>{`
        .rk-search-results {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          right: 0;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          box-shadow: var(--shadow-elevated);
          overflow: hidden;
          z-index: 10;
        }
        .rk-search-results a {
          display: flex;
          justify-content: space-between;
          padding: 0.625rem 1rem;
          color: var(--text);
          text-decoration: none;
          font-size: 0.8125rem;
        }
        .rk-search-results a:hover {
          background: var(--bg-secondary);
        }
        .rk-search-empty {
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
      `}</style>
      {results.length === 0 ? (
        <div className="rk-search-empty">No products found for "{query}"</div>
      ) : (
        results.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} onClick={onNavigate}>
            <span>{p.name}</span>
            <span>{formatPeso(p.price)}</span>
          </Link>
        ))
      )}
    </div>
  )
}

export default function Header() {
  const [tickerIndex, setTickerIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [navCategories, setNavCategories] = useState<NavCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { cartCount, openCart, openWishlist } = useShop()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    getAnnouncements().then(setAnnouncements).catch(() => setAnnouncements([]))
    getNavCategories().then(setNavCategories).catch(() => setNavCategories([]))
    getActiveProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  useEffect(() => {
    if (announcements.length === 0) return
    const interval = setInterval(() => {
      setTickerIndex((i) => (i + 1) % announcements.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [announcements.length])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const closeSearch = () => {
    setSearchFocused(false)
    setQuery('')
  }

  const navLinks = [
    ...navCategories.map((c) => ({ label: c.label, to: `/category/${c.slug}` })),
    { label: 'Collections', to: '/collections' },
  ]

  return (
    <div className={`rk-header-sticky ${scrolled ? 'rk-header-scrolled' : ''}`}>
      <style>{`
        .rk-header-sticky {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--bg);
          padding-top: env(safe-area-inset-top);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0);
          transition: box-shadow var(--duration-base) var(--ease-out);
        }
        .rk-header-scrolled {
          box-shadow: var(--shadow-elevated);
        }
        .rk-announcement {
          background: var(--bg-secondary);
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 0 1.5rem;
        }
        .rk-announcement-text {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--text);
          animation: rk-fade-in 0.5s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        @keyframes rk-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rk-utility-bar {
          background: var(--bg);
          border-bottom: 1px solid var(--border);
        }
        .rk-utility-inner {
          padding: 0.5rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .rk-utility-brand {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .rk-utility-brand-text {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text);
        }
        .rk-utility-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .rk-utility-links a,
        .rk-utility-links button {
          color: inherit;
          text-decoration: none;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          transition: color 0.15s ease;
          background: none;
          border: none;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 600;
        }
        .rk-utility-links a:hover,
        .rk-utility-links button:hover {
          color: var(--text);
        }
        .rk-utility-sep {
          color: var(--chip-border);
        }
        .rk-main-nav {
          background: var(--bg);
          border-bottom: 1px solid var(--border);
        }
        .rk-main-nav-inner {
          padding: 1.125rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .rk-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: var(--text);
        }
        .rk-brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }
        .rk-wordmark {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.375rem;
          letter-spacing: -0.04em;
          text-transform: uppercase;
        }
        .rk-wordmark::after {
          content: '.';
          color: var(--accent-red);
        }
        .rk-brand-sub {
          font-size: 10px;
          letter-spacing: 0.18em;
          color: var(--text-faint);
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 2px;
        }
        .rk-nav-links {
          display: flex;
          align-items: center;
          gap: 0.125rem;
          margin-left: 0.75rem;
          flex: 1;
        }
        .rk-nav-links a {
          position: relative;
          color: var(--text);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.5rem 0.875rem;
          border-radius: 999px;
          white-space: nowrap;
          transition: background-color var(--duration-fast) var(--ease-out);
        }
        .rk-nav-links a:hover {
          background: var(--bg-secondary);
        }
        .rk-nav-links a::after {
          content: '';
          position: absolute;
          left: 0.875rem;
          right: 0.875rem;
          bottom: 0.3rem;
          height: 2px;
          border-radius: 999px;
          background: var(--accent-red);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform var(--duration-base) var(--ease-out);
        }
        .rk-nav-links a:hover::after {
          transform: scaleX(1);
        }
        .rk-nav-sale {
          color: var(--accent-red) !important;
        }
        .rk-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-left: auto;
        }
        .rk-search-wrap {
          position: relative;
        }
        .rk-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-secondary);
          border-radius: 999px;
          padding: 0.625rem 1rem;
          color: var(--text-muted);
        }
        .rk-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.875rem;
          color: var(--text);
          width: 7rem;
        }
        .rk-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text);
          display: flex;
          align-items: center;
          padding: 0.625rem;
          border-radius: 999px;
          transition: background-color 0.15s ease;
        }
        .rk-icon-btn:hover {
          background: var(--bg-secondary);
        }
        .rk-bag-btn {
          position: relative;
        }
        .rk-bag-count {
          position: absolute;
          top: -1px;
          right: -1px;
          background: var(--text);
          color: var(--bg);
          font-size: 9px;
          font-weight: 900;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rk-hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 20px;
          height: 14px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.625rem;
          border-radius: 999px;
          box-sizing: content-box;
        }
        .rk-hamburger:hover {
          background: var(--bg-secondary);
        }
        .rk-hamburger span {
          width: 20px;
          height: 2px;
          border-radius: 999px;
          background: var(--text);
        }
        .rk-mobile-menu {
          overflow: hidden;
          max-height: 0;
          transition: max-height var(--duration-slow) var(--ease-out);
        }
        .rk-mobile-menu-open {
          max-height: 600px;
        }
        .rk-mobile-menu-inner {
          border-top: 1px solid var(--border);
          background: var(--bg);
          padding: 1rem 1.25rem 1.25rem;
        }
        .rk-mobile-search {
          width: 100%;
          margin-bottom: 0.5rem;
        }
        .rk-mobile-links {
          display: flex;
          flex-direction: column;
        }
        .rk-mobile-links a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--text);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 700;
          padding: 0.875rem 0;
          border-bottom: 1px solid var(--bg-secondary);
        }
        .rk-mobile-links a svg {
          color: var(--chip-border);
        }
        .rk-mobile-admin {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: none;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        /* Breakpoints match the source design: sm=640, md=768, lg=1024 */
        @media (max-width: 639px) {
          .rk-brand-text {
            display: none;
          }
        }
        @media (max-width: 767px) {
          .rk-md-only {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .rk-lg-only {
            display: none !important;
          }
          .rk-hamburger {
            display: flex;
          }
        }
        @media (min-width: 1024px) {
          .rk-mobile-menu {
            display: none;
          }
        }
      `}</style>

      {announcements.length > 0 && (
        <div className="rk-announcement">
          <span key={tickerIndex} className="rk-announcement-text">
            {announcements[tickerIndex % announcements.length]?.message}
          </span>
        </div>
      )}

      <div className="rk-utility-bar">
        <div className="rk-utility-inner">
          <div className="rk-utility-brand">
            <span className="rk-utility-brand-text">Rhayz Kicks Official</span>
          </div>
          <nav className="rk-utility-links">
            <Link to="/help" className="rk-utility-md-only">Help</Link>
            <span className="rk-utility-sep rk-utility-md-only">|</span>
            {isAuthenticated ? (
              <>
                <Link to="/account" className="rk-utility-md-only">
                  Hi, {(user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] || user?.email || 'Member'}
                </Link>
                <span className="rk-utility-sep rk-utility-md-only">|</span>
                <button type="button" onClick={() => supabase.auth.signOut()}>Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/join">Join Us</Link>
                <span className="rk-utility-sep">|</span>
                <Link to="/signin">Sign In</Link>
              </>
            )}
          </nav>
        </div>
      </div>

      <header className="rk-main-nav">
        <div className="rk-main-nav-inner">
          <button
            className="rk-hamburger"
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link to="/" className="rk-brand">
            <Logo size={72} ring />
            <span className="rk-brand-text">
              <span className="rk-wordmark">RHAYZ</span>
              <span className="rk-brand-sub">Footwear &amp; Apparel</span>
            </span>
          </Link>

          <nav className="rk-nav-links rk-lg-only">
            {navLinks.map((link) => (
              <Link key={link.label} to={link.to} className={link.label === 'Sale' ? 'rk-nav-sale' : ''}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="rk-nav-actions">
            <div className="rk-search-wrap rk-md-only" ref={searchWrapRef}>
              <div className="rk-search">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search products..."
                  aria-label="Search products"
                  value={query}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {searchFocused && <SearchResults query={query} products={products} onNavigate={closeSearch} />}
            </div>
            <button className="rk-icon-btn" aria-label="Wishlist" onClick={openWishlist}>
              <HeartIcon />
            </button>
            <button className="rk-icon-btn rk-bag-btn" aria-label="Shopping Bag" onClick={openCart}>
              <BagIcon />
              {cartCount > 0 && <span className="rk-bag-count">{cartCount}</span>}
            </button>
            <button className="rk-icon-btn" aria-label="Admin" onClick={() => navigate('/admin')}>
              <ShieldIcon />
            </button>
          </div>
        </div>

        <div className={`rk-mobile-menu ${menuOpen ? 'rk-mobile-menu-open' : ''}`}>
          <div className="rk-mobile-menu-inner">
            <div className="rk-search rk-mobile-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search products..."
                aria-label="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <nav className="rk-mobile-links">
              {navLinks.map((link) => (
                <Link key={link.label} to={link.to} className={link.label === 'Sale' ? 'rk-nav-sale' : ''} onClick={() => setMenuOpen(false)}>
                  {link.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              ))}
            </nav>
            <button
              className="rk-mobile-admin"
              onClick={() => {
                setMenuOpen(false)
                navigate('/admin')
              }}
            >
              <ShieldIcon /> Admin CMS
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}
