# Rhayz Kicks Web — Compiled Source

All component source files in one place for review. Generated from `web/src/`.

## `src/App.tsx`

```tsx
import { ThemeProvider } from './theme/ThemeContext'
import Home from './pages/Home'
import './theme/theme.css'

function App() {
  return (
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  )
}

export default App
```

## `src/components/FeaturedCollections.css`

```css
.rk-fc-section {
  padding: 3rem 1rem;
}

.rk-fc-heading {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.26em;
  color: var(--text-faint);
  margin: 0 0 1.5rem;
}

.rk-collections-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.rk-collection-card {
  position: relative;
  min-height: 200px;
  border-radius: var(--radius-card);
  overflow: hidden;
  cursor: pointer;
}

.rk-collection-wide {
  grid-column: span 2;
  min-height: 420px;
}

.rk-collection-img {
  position: absolute;
  inset: 0;
}

.rk-collection-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), transparent 60%);
}

.rk-collection-overlay {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  padding: 1rem;
}

.rk-collection-wide .rk-collection-overlay {
  padding: 1.25rem;
}

.rk-collection-tag {
  color: rgba(255, 255, 255, 0.55);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 2px;
}

.rk-collection-wide .rk-collection-tag {
  font-size: 10px;
  margin-bottom: 4px;
}

.rk-collection-title {
  color: #ffffff;
  font-weight: 900;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.875rem;
  line-height: 1.2;
  margin: 0;
}

.rk-collection-wide .rk-collection-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.rk-collection-cta {
  padding: 0.5rem 1.25rem;
  background: #ffffff;
  color: #111111;
  font-size: 0.75rem;
  font-weight: 700;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.rk-collection-cta:hover {
  background: #f0f0f0;
}

@media (min-width: 768px) {
  .rk-fc-section {
    padding: 3rem 2rem;
  }

  .rk-collections-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .rk-collection-wide {
    grid-column: span 1;
    grid-row: span 2;
  }

  .rk-collection-title {
    font-size: 1rem;
  }
}
```

## `src/components/FeaturedCollections.tsx`

```tsx
import ImgSlot from './ImgSlot'
import { featuredCollections } from '../data/homeMock'
import './FeaturedCollections.css'

export default function FeaturedCollections() {
  return (
    <section className="rk-fc-section">
      <h2 className="rk-fc-heading">Featured Collections</h2>
      <div className="rk-collections-grid">
        {featuredCollections.map((c) => (
          <div key={c.id} className={`rk-collection-card ${c.wide ? 'rk-collection-wide' : ''}`}>
            <ImgSlot label={c.title} size={c.size} className="rk-collection-img" />
            <div className="rk-collection-gradient" />
            <div className="rk-collection-overlay">
              <p className="rk-collection-tag">{c.tag}</p>
              <h3 className="rk-collection-title">{c.title}</h3>
              {c.cta && <button className="rk-collection-cta">{c.cta}</button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

## `src/components/Footer.css`

```css
.rk-footer {
  background: var(--dark-surface);
  color: #ffffff;
  padding-bottom: env(safe-area-inset-bottom);
}

.rk-footer-inner {
  padding: 3rem 1.5rem;
}

.rk-footer-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.rk-footer-wordmark {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.04em;
  font-size: 1.5rem;
  color: #ffffff;
  line-height: 1;
}

.rk-footer-dot {
  color: var(--accent-red);
}

.rk-footer-tagline {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 4px 0 0;
}

.rk-footer-columns {
  display: none;
}

.rk-footer-col-title {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.26em;
  color: rgba(255, 255, 255, 0.3);
  margin: 0 0 1.25rem;
}

.rk-footer-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.rk-footer-links a,
.rk-footer-accordion-links a {
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  font-size: 0.875rem;
}

.rk-footer-links a:hover,
.rk-footer-accordion-links a:hover {
  color: #ffffff;
}

.rk-footer-accordion {
  margin-bottom: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.rk-footer-accordion-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.rk-footer-accordion-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.rk-footer-accordion-btn:hover {
  color: #ffffff;
}

.rk-footer-chevron-open {
  transform: rotate(90deg);
}

.rk-footer-accordion-btn svg {
  transition: transform 0.2s ease;
}

.rk-footer-accordion-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.rk-footer-accordion-links-open {
  max-height: 300px;
  padding-bottom: 1rem;
}

.rk-footer-accordion-links li {
  padding: 0.4rem 0;
}

.rk-footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rk-footer-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}

.rk-footer-location {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rk-footer-legal {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.rk-footer-legal a {
  color: rgba(255, 255, 255, 0.35);
  text-decoration: none;
  font-size: 11px;
}

.rk-footer-legal a:hover {
  color: #ffffff;
}

@media (min-width: 768px) {
  .rk-footer-inner {
    padding: 3rem 3rem;
  }

  .rk-footer-columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.5rem;
    margin-bottom: 3rem;
  }

  .rk-footer-accordion {
    display: none;
  }

  .rk-footer-bottom {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
```

## `src/components/Footer.tsx`

```tsx
import { useState } from 'react'
import Logo from './Logo'
import './Footer.css'

const footerColumns = [
  {
    title: 'Resources',
    links: ['Find a Store', 'Become a Member', 'Shoe Size Guide', 'Student Discounts', 'Site Feedback'],
  },
  {
    title: 'Help',
    links: ['Order Status', 'Delivery Info', 'Returns & Exchanges', 'Order History', 'Contact Us'],
  },
  {
    title: 'Company',
    links: ['About Rhayz Kicks', 'News & Press', 'Careers', 'Investors', 'Sustainability'],
  },
]

const legalLinks = ['Terms of Sale', 'Terms of Use', 'Privacy Policy', 'Cookie Settings']

export default function Footer() {
  const [openColumn, setOpenColumn] = useState<string | null>(null)

  return (
    <footer className="rk-footer">
      <div className="rk-footer-inner">
        <div className="rk-footer-brand">
          <Logo size={48} ring ringColor="rgba(255,255,255,0.2)" />
          <div>
            <div className="rk-footer-wordmark">RHAYZ<span className="rk-footer-dot">.</span></div>
            <p className="rk-footer-tagline">Footwear &amp; Apparel — Philippines</p>
          </div>
        </div>

        <div className="rk-footer-columns">
          {footerColumns.map((col) => (
            <div key={col.title} className="rk-footer-col">
              <h4 className="rk-footer-col-title">{col.title}</h4>
              <ul className="rk-footer-links">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rk-footer-accordion">
          {footerColumns.map((col) => (
            <div key={col.title} className="rk-footer-accordion-row">
              <button
                className="rk-footer-accordion-btn"
                onClick={() => setOpenColumn((c) => (c === col.title ? null : col.title))}
              >
                {col.title}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={openColumn === col.title ? 'rk-footer-chevron-open' : ''}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul className={`rk-footer-accordion-links ${openColumn === col.title ? 'rk-footer-accordion-links-open' : ''}`}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rk-footer-bottom">
          <div className="rk-footer-meta">
            <span className="rk-footer-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
              Philippines
            </span>
            <span>© 2025 Rhayz Kicks, Inc. All Rights Reserved</span>
          </div>
          <div className="rk-footer-legal">
            {legalLinks.map((link) => (
              <a key={link} href="#">{link}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
```

## `src/components/Header.css`

```css
.rk-header-sticky {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
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

.rk-utility-links a {
  color: inherit;
  text-decoration: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
}

.rk-utility-links a:hover {
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
  padding: 0.75rem 1.25rem;
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
  font-size: 1.125rem;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.rk-wordmark::after {
  content: '.';
  color: var(--accent-red);
}

.rk-brand-sub {
  font-size: 9px;
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
  color: var(--text);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  white-space: nowrap;
}

.rk-nav-links a:hover {
  background: var(--bg-secondary);
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
  transition: max-height 0.3s ease;
}

.rk-mobile-menu-open {
  max-height: 500px;
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
```

## `src/components/Header.tsx`

```tsx
import { useEffect, useState } from 'react'
import Logo from './Logo'
import './Header.css'

const tickerMessages = [
  'New Members Enjoy 15% Off On The Rhayz Kicks App. Join Free Today →',
  'Free Standard Delivery & 30-Day Free Returns on All Orders →',
  'Exclusive Early Access For Members. Sign Up & Shop First →',
]

const navLinks = ['New Releases', 'Footwear', 'Apparel', 'Accessories', 'Sale', 'Collections']

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

interface HeaderProps {
  cartCount: number
}

export default function Header({ cartCount }: HeaderProps) {
  const [tickerIndex, setTickerIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((i) => (i + 1) % tickerMessages.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rk-header-sticky">
      <div className="rk-announcement">
        <span key={tickerIndex} className="rk-announcement-text">
          {tickerMessages[tickerIndex]}
        </span>
      </div>

      <div className="rk-utility-bar">
        <div className="rk-utility-inner">
          <div className="rk-utility-brand">
            <Logo size={28} ring ringOffset={1} />
            <span className="rk-utility-brand-text">Rhayz Kicks Official</span>
          </div>
          <nav className="rk-utility-links">
            <a href="#store" className="rk-utility-md-only">Find a Store</a>
            <span className="rk-utility-sep rk-utility-md-only">|</span>
            <a href="#help" className="rk-utility-md-only">Help</a>
            <span className="rk-utility-sep rk-utility-md-only">|</span>
            <a href="#join">Join Us</a>
            <span className="rk-utility-sep">|</span>
            <a href="#signin">Sign In</a>
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

          <a href="#home" className="rk-brand">
            <Logo size={44} ring />
            <span className="rk-brand-text">
              <span className="rk-wordmark">RHAYZ</span>
              <span className="rk-brand-sub">Footwear &amp; Apparel</span>
            </span>
          </a>

          <nav className="rk-nav-links rk-lg-only">
            {navLinks.map((link) => (
              <a key={link} href="#" className={link === 'Sale' ? 'rk-nav-sale' : ''}>
                {link}
              </a>
            ))}
          </nav>

          <div className="rk-nav-actions">
            <div className="rk-search rk-md-only">
              <SearchIcon />
              <input type="text" placeholder="Search products..." aria-label="Search products" />
            </div>
            <button className="rk-icon-btn" aria-label="Wishlist">
              <HeartIcon />
            </button>
            <button className="rk-icon-btn rk-bag-btn" aria-label="Shopping Bag">
              <BagIcon />
              {cartCount > 0 && <span className="rk-bag-count">{cartCount}</span>}
            </button>
          </div>
        </div>

        <div className={`rk-mobile-menu ${menuOpen ? 'rk-mobile-menu-open' : ''}`}>
          <div className="rk-mobile-menu-inner">
            <div className="rk-search rk-mobile-search">
              <SearchIcon />
              <input type="text" placeholder="Search products..." aria-label="Search products" />
            </div>
            <nav className="rk-mobile-links">
              {navLinks.map((link) => (
                <a key={link} href="#" className={link === 'Sale' ? 'rk-nav-sale' : ''}>
                  {link}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>
    </div>
  )
}
```

## `src/components/HeroCarousel.css`

```css
.rk-hero {
  position: relative;
  overflow: hidden;
  height: clamp(500px, 72vh, 820px);
}

.rk-hero-bg {
  position: absolute;
  inset: 0;
}

.rk-hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.35), transparent);
}

.rk-hero-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 2rem 4rem;
  max-width: 36rem;
}

.rk-hero-eyebrow {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  margin: 0 0 1rem;
  color: rgba(255, 255, 255, 0.65);
}

.rk-hero-headline {
  font-size: clamp(3rem, 9vw, 7.5rem);
  line-height: 0.88;
  margin: 0 0 1.25rem;
  display: flex;
  flex-direction: column;
  color: #ffffff;
}

.rk-hero-subtext {
  font-size: 0.875rem;
  margin: 0 0 2rem;
  max-width: 24rem;
  font-weight: 500;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.78);
}

.rk-hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.rk-hero-btn-primary {
  background: #ffffff;
  color: #111111;
}

.rk-hero-btn-primary:hover {
  background: #f0f0f0;
}

.rk-hero-btn-outline {
  background: transparent;
  border: 2px solid #ffffff;
  color: #ffffff;
}

.rk-hero-btn-outline:hover {
  background: rgba(255, 255, 255, 0.12);
}

.rk-hero-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #111111;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.rk-hero-arrow:hover {
  background: #ffffff;
}

.rk-hero-arrow-left {
  left: 1rem;
}

.rk-hero-arrow-right {
  right: 1rem;
}

.rk-hero-dots {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rk-hero-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
}

.rk-hero-dot:hover {
  background: rgba(255, 255, 255, 0.65);
}

.rk-hero-dot-active {
  width: 24px;
  background: #ffffff;
}

@media (min-width: 768px) {
  .rk-hero-content {
    padding: 0 5rem 4rem;
  }

  .rk-hero-subtext {
    font-size: 1rem;
  }
}
```

## `src/components/HeroCarousel.tsx`

```tsx
import { useEffect, useState } from 'react'
import ImgSlot from './ImgSlot'
import { heroSlides } from '../data/homeMock'
import './HeroCarousel.css'

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % heroSlides.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const slide = heroSlides[index]
  const prev = () => setIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)
  const next = () => setIndex((i) => (i + 1) % heroSlides.length)

  return (
    <section className="rk-hero">
      <div className="rk-hero-bg">
        <ImgSlot label={`Hero Image ${index + 1} of ${heroSlides.length}`} size="Recommended: 1440 × 820 px" />
      </div>
      <div className="rk-hero-gradient" />

      <div className="rk-hero-content">
        <p className="rk-hero-eyebrow">{slide.eyebrow}</p>
        <h1 className="rk-heading rk-hero-headline">
          {slide.headline.map((line) => (
            <span key={line} className="rk-hero-line">{line}</span>
          ))}
        </h1>
        <p className="rk-hero-subtext">{slide.subtext}</p>
        <div className="rk-hero-ctas">
          <button className="rk-btn rk-hero-btn-primary">{slide.primaryCta}</button>
          {slide.secondaryCta && (
            <button className="rk-btn rk-hero-btn-outline">{slide.secondaryCta}</button>
          )}
        </div>
      </div>

      <button className="rk-hero-arrow rk-hero-arrow-left" onClick={prev} aria-label="Previous slide">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button className="rk-hero-arrow rk-hero-arrow-right" onClick={next} aria-label="Next slide">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>

      <div className="rk-hero-dots">
        {heroSlides.map((s, i) => (
          <button
            key={s.eyebrow}
            className={`rk-hero-dot ${i === index ? 'rk-hero-dot-active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
```

## `src/components/ImgSlot.css`

```css
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
```

## `src/components/ImgSlot.tsx`

```tsx
import './ImgSlot.css'

interface ImgSlotProps {
  label: string
  size: string
  dark?: boolean
  aspect?: string // e.g. "4 / 3"
  className?: string
}

// Drop-in placeholder for a real product/marketing photo.
// Swap the container's content for an <img> once real assets exist.
export default function ImgSlot({ label, size, dark, aspect, className }: ImgSlotProps) {
  return (
    <div
      className={`img-slot ${dark ? 'img-slot-dark' : ''} ${className ?? ''}`}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
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
```

## `src/components/Logo.tsx`

```tsx
interface LogoProps {
  size?: number
  className?: string
  ring?: boolean
  ringColor?: string
  ringOffset?: number
}

export default function Logo({ size = 28, className, ring, ringColor = 'var(--text)', ringOffset = 0 }: LogoProps) {
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
```

## `src/components/MemberCTA.css`

```css
.rk-member-cta {
  padding: 4rem 1rem;
  text-align: center;
}

.rk-member-logo {
  margin: 0 auto 1.25rem;
  display: block;
}

.rk-member-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  color: var(--text);
  font-size: 2.25rem;
  line-height: 1;
  margin: 0 0 1rem;
}

.rk-member-subtext {
  color: var(--text-muted);
  max-width: 28rem;
  margin: 0 auto 2rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

.rk-member-ctas {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.rk-member-btn-primary,
.rk-member-btn-outline {
  padding: 0.875rem 2.5rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
}

.rk-member-btn-primary {
  background: var(--text);
  color: var(--bg);
  border: none;
}

.rk-member-btn-primary:hover {
  opacity: 0.85;
}

.rk-member-btn-outline {
  background: transparent;
  border: 1px solid var(--chip-border);
  color: var(--text);
}

.rk-member-btn-outline:hover {
  border-color: var(--text);
}

@media (min-width: 640px) {
  .rk-member-ctas {
    flex-direction: row;
  }
}

@media (min-width: 768px) {
  .rk-member-cta {
    padding: 4rem 2rem;
  }

  .rk-member-title {
    font-size: 3.75rem;
  }

  .rk-member-subtext {
    font-size: 1rem;
  }
}
```

## `src/components/MemberCTA.tsx`

```tsx
import Logo from './Logo'
import './MemberCTA.css'

export default function MemberCTA() {
  return (
    <section className="rk-member-cta">
      <Logo size={56} ring className="rk-member-logo" />
      <h2 className="rk-member-title">Become A Member</h2>
      <p className="rk-member-subtext">
        Enjoy free delivery, member-only products, exclusive discounts, and priority access to
        every new Rhayz Kicks drop.
      </p>
      <div className="rk-member-ctas">
        <button className="rk-member-btn-primary">Join Free Today</button>
        <button className="rk-member-btn-outline">Learn More</button>
      </div>
    </section>
  )
}
```

## `src/components/PromoBanner.css`

```css
.rk-promo {
  position: relative;
  margin: 0 1rem 3rem;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--dark-surface);
}

.rk-promo-bg {
  position: absolute;
  inset: 0;
  opacity: 0.14;
}

.rk-promo-content {
  position: relative;
  padding: 3.5rem 2rem;
  text-align: center;
}

.rk-promo-logo {
  margin: 0 auto 1.25rem;
  display: block;
}

.rk-promo-label {
  color: var(--accent-red);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  margin: 0 0 0.75rem;
}

.rk-promo-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  color: #ffffff;
  font-size: clamp(2.5rem, 7vw, 5rem);
  line-height: 1;
  margin: 0 0 1rem;
}

.rk-promo-subtext {
  color: rgba(255, 255, 255, 0.55);
  max-width: 28rem;
  margin: 0 auto 2rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

.rk-promo-ctas {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.rk-promo-btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2.25rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

.rk-promo-btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
}

@media (min-width: 640px) {
  .rk-promo-ctas {
    flex-direction: row;
  }
}

@media (min-width: 768px) {
  .rk-promo {
    margin: 0 2rem 3rem;
  }

  .rk-promo-content {
    padding: 3.5rem 4rem;
  }
}
```

## `src/components/PromoBanner.tsx`

```tsx
import ImgSlot from './ImgSlot'
import Logo from './Logo'
import './PromoBanner.css'

export default function PromoBanner() {
  return (
    <section className="rk-promo">
      <div className="rk-promo-bg">
        <ImgSlot label="Promo Background" size="1200 × 500 px" />
      </div>
      <div className="rk-promo-content">
        <Logo size={48} ring ringColor="var(--accent-red)" ringOffset={2} className="rk-promo-logo" />
        <p className="rk-promo-label">Members Only</p>
        <h2 className="rk-promo-headline">
          LIMITED DROPS
          <br />
          EVERY WEEK
        </h2>
        <p className="rk-promo-subtext">
          Get early access to the most anticipated releases. Join Rhayz Kicks Members and never miss
          a drop again.
        </p>
        <div className="rk-promo-ctas">
          <button className="rk-btn rk-hero-btn-primary">Join Free</button>
          <button className="rk-promo-btn-outline">Notify Me</button>
        </div>
      </div>
    </section>
  )
}
```

## `src/components/ShopByActivity.css`

```css
.rk-activity-section {
  padding: 3rem 1rem;
}

.rk-activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.rk-activity-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  color: var(--text);
  font-size: 1.5rem;
  margin: 0;
}

.rk-activity-nav {
  display: flex;
  gap: 0.5rem;
}

.rk-activity-nav button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--chip-border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rk-activity-nav button:hover {
  border-color: var(--text);
}

.rk-activity-scroller {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 0.5rem;
}

.rk-activity-card {
  scroll-snap-align: start;
  flex: 0 0 192px;
  text-decoration: none;
  color: var(--text);
}

.rk-activity-img-wrap {
  position: relative;
  height: 224px;
  border-radius: var(--radius-card);
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.rk-activity-hover {
  position: absolute;
  inset: 0;
  background: rgba(17, 17, 17, 0);
  transition: background-color 0.3s ease;
}

.rk-activity-card:hover .rk-activity-hover {
  background: rgba(17, 17, 17, 0.1);
}

.rk-activity-label {
  font-size: 0.875rem;
  font-weight: 700;
}

.rk-activity-card:hover .rk-activity-label {
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (min-width: 768px) {
  .rk-activity-section {
    padding: 3rem 2rem;
  }

  .rk-activity-title {
    font-size: 2.25rem;
  }

  .rk-activity-card {
    flex-basis: 224px;
  }
}
```

## `src/components/ShopByActivity.tsx`

```tsx
import { useRef } from 'react'
import ImgSlot from './ImgSlot'
import { activities } from '../data/homeMock'
import './ShopByActivity.css'

export default function ShopByActivity() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollBy = (amount: number) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="rk-activity-section">
      <div className="rk-activity-header">
        <h2 className="rk-activity-title">Shop By Activity</h2>
        <div className="rk-activity-nav">
          <button onClick={() => scrollBy(-300)} aria-label="Scroll left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={() => scrollBy(300)} aria-label="Scroll right">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
      <div className="rk-activity-scroller" ref={scrollerRef}>
        {activities.map((activity) => (
          <a key={activity} href="#" className="rk-activity-card">
            <div className="rk-activity-img-wrap">
              <ImgSlot label={activity} size="400 × 500 px" />
              <div className="rk-activity-hover" />
            </div>
            <span className="rk-activity-label">{activity}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
```

## `src/components/SignatureSilhouettes.css`

```css
.rk-sil-section {
  padding: 3rem 1rem;
  background: var(--bg-secondary);
}

.rk-sil-header {
  margin-bottom: 2rem;
}

.rk-sil-eyebrow {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.26em;
  color: var(--text-faint);
  margin: 0 0 0.5rem;
}

.rk-sil-heading {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  color: var(--text);
  font-size: 1.875rem;
  margin: 0 0 1.5rem;
}

.rk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.rk-chip {
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--chip-border);
}

.rk-chip:hover {
  border-color: var(--text);
}

.rk-chip-active {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
  transform: scale(1.05);
}

.rk-chip-active:hover {
  border-color: var(--text);
}

.rk-product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.rk-product-card {
  background: var(--bg);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.rk-product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.rk-product-media {
  position: relative;
  padding-bottom: 75%;
  background: var(--placeholder-bg);
}

.rk-product-media .img-slot {
  position: absolute;
  inset: 0;
}

.rk-product-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  padding: 2px 10px;
  background: var(--text);
  color: var(--bg);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 999px;
}

.rk-quick-add-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.rk-product-card:hover .rk-quick-add-bar {
  opacity: 1;
  transform: translateY(0);
}

.rk-quick-add-btn {
  width: 100%;
  padding: 0.5rem;
  background: #111111;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.rk-quick-add-btn:hover {
  background: #333333;
}

.rk-product-info {
  padding: 1rem;
}

.rk-product-name {
  display: block;
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--text);
}

.rk-product-price {
  display: block;
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-top: 2px;
}

.rk-view-all {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
}

.rk-view-all-btn {
  padding: 0.875rem 2.5rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.875rem;
  background: transparent;
  border: 1px solid var(--chip-border);
  color: var(--text);
  cursor: pointer;
}

.rk-view-all-btn:hover {
  border-color: var(--text);
}

@media (min-width: 640px) {
  .rk-product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) {
  .rk-sil-section {
    padding: 3rem 2rem;
  }

  .rk-sil-heading {
    font-size: 3rem;
  }
}

@media (min-width: 1024px) {
  .rk-product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

## `src/components/SignatureSilhouettes.tsx`

```tsx
import { useState } from 'react'
import ImgSlot from './ImgSlot'
import { filterChips, formatPeso, products } from '../data/homeMock'
import './SignatureSilhouettes.css'

export default function SignatureSilhouettes() {
  const [activeFilter, setActiveFilter] = useState('All')

  const visible = activeFilter === 'All' ? products : products.filter((p) => p.category === activeFilter)

  return (
    <section className="rk-sil-section">
      <div className="rk-sil-header">
        <p className="rk-sil-eyebrow">Spotlight</p>
        <h2 className="rk-sil-heading">Signature Silhouettes</h2>
        <div className="rk-chips">
          {filterChips.map((chip) => (
            <button
              key={chip}
              className={`rk-chip ${activeFilter === chip ? 'rk-chip-active' : ''}`}
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="rk-product-grid">
        {visible.map((product) => (
          <div key={product.id} className="rk-product-card">
            <div className="rk-product-media">
              {product.badge && <span className="rk-product-badge">{product.badge}</span>}
              <ImgSlot label={product.name} size="400 × 300 px" />
              <div className="rk-quick-add-bar">
                <button className="rk-quick-add-btn">+ Quick Add</button>
              </div>
            </div>
            <div className="rk-product-info">
              <span className="rk-product-name">{product.name}</span>
              <span className="rk-product-price">{formatPeso(product.price)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rk-view-all">
        <button className="rk-view-all-btn">View All Footwear</button>
      </div>
    </section>
  )
}
```

## `src/components/ThemeToggle.css`

```css
.rk-theme-toggle {
  position: fixed;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  right: 1rem;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.4rem 0.6rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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
```

## `src/components/ThemeToggle.tsx`

```tsx
import { useTheme } from '../theme/ThemeContext'
import type { ThemePreference } from '../theme/ThemeContext'
import './ThemeToggle.css'

const options: { value: ThemePreference; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Stand-in for the real Settings screen — lets you confirm the auto day/night
// switch and manual override both work.
export default function ThemeToggle() {
  const { preference, setPreference, effectiveTheme } = useTheme()

  return (
    <div className="rk-theme-toggle">
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
```

## `src/data/homeMock.ts`

```ts
// Placeholder catalog data for the homepage until real `items`/`inventory` rows exist in Supabase.
// Hero slide copy is pulled directly from the Figma Make source, not invented.

export const heroSlides = [
  {
    eyebrow: 'NEW DROP',
    headline: ['OWN THE', 'STREETS'],
    subtext: 'Exclusive seasonal releases. Member access only.',
    primaryCta: 'Shop Now',
    secondaryCta: 'Explore Collection',
  },
  {
    eyebrow: 'STEP BOLDLY',
    headline: ['BUILT FOR', 'EVERY MOVE'],
    subtext: 'Performance engineered for the relentless.',
    primaryCta: 'Shop Footwear',
    secondaryCta: null,
  },
  {
    eyebrow: 'LIMITED EDITION',
    headline: ['DOMINATE', 'IN STYLE'],
    subtext: 'The latest drops from our signature series.',
    primaryCta: 'View Collection',
    secondaryCta: 'Notify Me',
  },
]

export const featuredCollections = [
  { id: 'signature', tag: 'Elevated essentials', title: 'The Signature Series', size: '600 × 750 px', wide: true, cta: 'Shop Now' },
  { id: 'urban', tag: 'Express your style', title: 'Urban Essentials', size: '600 × 400 px' },
  { id: 'performance', tag: 'Built to move', title: 'Performance Line', size: '600 × 400 px' },
  { id: 'heritage', tag: 'Limited release', title: 'Street Heritage Pack', size: '600 × 400 px' },
  { id: 'aero', tag: 'Stay cool, move fast', title: 'Aero Comfort Edit', size: '600 × 400 px' },
]

export const activities = [
  'Running',
  'Training',
  'Basketball',
  'Lifestyle',
  'Outdoor',
  'Yoga',
  'Streetwear',
  'Skateboarding',
]

export const filterChips = ['All', 'Running', 'Lifestyle', 'Basketball', 'Training', 'Limited']

export interface MockProduct {
  id: string
  name: string
  price: number
  badge?: 'Just In' | 'New' | 'Trending'
  category: string
}

export const products: MockProduct[] = [
  { id: 'retro-high-top', name: 'Retro High-Top', price: 6095, badge: 'Just In', category: 'Lifestyle' },
  { id: 'court-classic', name: 'Court Classic', price: 5895, category: 'Basketball' },
  { id: 'street-flex-low', name: 'Street Flex Low', price: 5295, category: 'Lifestyle' },
  { id: 'runner-pro-plus', name: 'Runner Pro Plus', price: 7195, badge: 'New', category: 'Running' },
  { id: 'trail-blazer-42', name: 'Trail Blazer 42', price: 6495, category: 'Training' },
  { id: 'urban-stepper', name: 'Urban Stepper', price: 5695, badge: 'Trending', category: 'Lifestyle' },
  { id: 'heritage-95', name: 'Heritage 95', price: 8195, category: 'Running' },
  { id: 'cloud-racer', name: 'Cloud Racer', price: 5995, category: 'Running' },
]

export function formatPeso(amount: number) {
  return `₱${amount.toLocaleString('en-PH')}`
}
```

## `src/supabase.ts`

```ts
import { createClient } from "@supabase/supabase-js";

// Values come from your Supabase project (Project Settings > API Keys).
// Copy .env.example to .env.local and fill these in — never commit real values.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
```

## `src/index.css`

```css
#root {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

a {
  color: inherit;
}
```

## `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## `src/pages/Home.tsx`

```tsx
import Header from '../components/Header'
import HeroCarousel from '../components/HeroCarousel'
import FeaturedCollections from '../components/FeaturedCollections'
import PromoBanner from '../components/PromoBanner'
import ShopByActivity from '../components/ShopByActivity'
import SignatureSilhouettes from '../components/SignatureSilhouettes'
import MemberCTA from '../components/MemberCTA'
import Footer from '../components/Footer'
import ThemeToggle from '../components/ThemeToggle'

export default function Home() {
  return (
    <>
      <Header cartCount={3} />
      <main>
        <HeroCarousel />
        <FeaturedCollections />
        <PromoBanner />
        <ShopByActivity />
        <SignatureSilhouettes />
        <MemberCTA />
      </main>
      <Footer />
      <ThemeToggle />
    </>
  )
}
```

## `src/theme/ThemeContext.tsx`

```tsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemePreference = 'default' | 'light' | 'dark'
export type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'rk-theme-preference'
const DAY_START_HOUR = 6 // 6:00 AM
const DAY_END_HOUR = 18 // 6:00 PM

function computeTimeBasedTheme(): EffectiveTheme {
  const hour = new Date().getHours()
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'light' : 'dark'
}

function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme {
  if (preference === 'default') return computeTimeBasedTheme()
  return preference
}

interface ThemeContextValue {
  preference: ThemePreference
  effectiveTheme: EffectiveTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'default' ? stored : 'default'
  })

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    resolveEffectiveTheme(preference),
  )

  useEffect(() => {
    setEffectiveTheme(resolveEffectiveTheme(preference))

    if (preference !== 'default') return

    // Re-check every minute so "Default" flips automatically at the day/night boundary
    // while the app stays open, without needing a refresh.
    const interval = setInterval(() => {
      setEffectiveTheme(resolveEffectiveTheme('default'))
    }, 60_000)

    return () => clearInterval(interval)
  }, [preference])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [effectiveTheme])

  const setPreference = (next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next)
    setPreferenceState(next)
  }

  const value = useMemo(
    () => ({ preference, effectiveTheme, setPreference }),
    [preference, effectiveTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
```

## `src/theme/theme.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

/* Color values below are pulled directly from the generated Figma Make source
   for this design (not estimated) — keep in sync if the Figma file changes. */
:root,
[data-theme='light'] {
  --bg: #ffffff;
  --bg-secondary: #f5f5f5;
  --text: #111111;
  --text-muted: #888888;
  --text-faint: #aaaaaa;
  --border: #ebebeb;
  --chip-border: #e0e0e0;

  --placeholder-bg: #e8e8e8;
  --placeholder-border: #c0c0c0;
  --placeholder-icon: #b0b0b0;
  --placeholder-label: #b8b8b8;
  --placeholder-size: #cccccc;

  --accent-red: #fe0000;
  --radius-card: 1rem;

  /* Sections that are always dark (hero overlay, promo banner, footer) regardless of site theme */
  --dark-surface: #111111;
  --dark-surface-text: #ffffff;
}

[data-theme='dark'] {
  --bg: #0a0a0a;
  --bg-secondary: #161616;
  --text: #ffffff;
  --text-muted: #9a9a9a;
  --text-faint: #7a7a7a;
  --border: #262626;
  --chip-border: #333333;

  --placeholder-bg: #262626;
  --placeholder-border: #3d3d3d;
  --placeholder-icon: #555555;
  --placeholder-label: #6a6a6a;
  --placeholder-size: #4d4d4d;

  --accent-red: #fe0000;
  --radius-card: 1rem;

  --dark-surface: #000000;
  --dark-surface-text: #ffffff;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.rk-heading {
  font-family: 'Barlow Condensed', 'Inter', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.025em;
  line-height: 0.9;
}

.rk-eyebrow {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.rk-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2.25rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.15s ease, background-color 0.15s ease;
  white-space: nowrap;
}

.rk-btn:hover {
  transform: scale(1.05);
}

.rk-btn:active {
  transform: scale(0.95);
}

.rk-logo-img {
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
```

## `src/types/database.types.ts`

```ts
// Plain TS mirrors of the RHAYZKICKS Supabase (Postgres) schema.
// Mirrors supabase/SCHEMA.md — keep in sync when the schema changes.
// Consumed by the React web app; the Flutter app gets an equivalent set of Dart models
// in Rhayzkicks Mobile/lib/models/database_models.dart.

export type StaffRole = "staff" | "admin";
export type PaymentMethod = "cash" | "card" | "gcash" | "other";
export type SaleStatus = "completed" | "refunded" | "voided";
export type StockMovementType = "restock" | "sale" | "return" | "adjustment" | "damaged";
export type Gender = "men" | "women" | "unisex" | "kids";

export interface Staff {
  id: string; // == Supabase Auth user id
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  employeeId: string;
  dateHired: string; // date, "YYYY-MM-DD"
  isActive: boolean;
  createdAt: string; // timestamptz, ISO 8601
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  zipCode: string;
  loyaltyPoints: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  name: string;
  brand: string;
  category: string;
  gender: Gender;
  description: string;
  basePrice: number;
  costPrice: number;
  imageUrls: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemVariant {
  id: string;
  itemId: string;
  size: string;
  color: string;
  sku: string;
  priceOverride: number | null;
  isActive: boolean;
}

export interface InventoryRecord {
  sku: string;
  quantityOnHand: number;
  reorderLevel: number;
  isLowStock: boolean; // generated column
  lastRestockedAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

// Row shape of the inventory_detail view (inventory joined with item/variant names)
export interface InventoryDetail extends InventoryRecord {
  itemId: string;
  variantId: string;
  itemName: string;
  brand: string;
  size: string;
  color: string;
}

export interface StockMovement {
  id: string;
  sku: string;
  type: StockMovementType;
  quantityChange: number;
  quantityAfter: number;
  reason: string | null;
  saleId: string | null;
  staffId: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  orderNumber: string;
  customerId: string | null;
  staffId: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  createdAt: string;
}

// Row shape of the sales_detail view (sales joined with customer/staff names)
export interface SaleDetail extends Sale {
  customerName: string | null;
  staffName: string;
}

export interface SoldItem {
  id: string;
  saleId: string;
  itemId: string;
  variantId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number; // generated column
}

// Row shape of the sold_items_detail view
export interface SoldItemDetail extends SoldItem {
  saleDate: string;
  itemName: string;
  size: string;
  color: string;
}

// Params for the create_sale() RPC (see supabase/SCHEMA.md)
export interface CreateSaleLineItem {
  item_id: string;
  variant_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleParams {
  p_staff_id: string;
  p_customer_id: string | null;
  p_payment_method: PaymentMethod;
  p_discount: number;
  p_tax: number;
  p_line_items: CreateSaleLineItem[];
}
```

