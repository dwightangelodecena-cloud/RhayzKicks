import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHero from '../components/PageHero'
import ProductCard from '../components/ProductCard'
import { getNavCategories, getProductsForCategorySlug, type NavCategory, type Product } from '../lib/storeData'

const sortOptions = ['Featured', 'Price: Low to High', 'Price: High to Low'] as const
const genderChips = ['All', 'Men', 'Women', 'Unisex', 'Kids'] as const

export default function CategoryPage() {
  const { slug } = useParams()
  const [navCategory, setNavCategory] = useState<NavCategory | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [genderChip, setGenderChip] = useState<(typeof genderChips)[number]>('All')
  const [sort, setSort] = useState<(typeof sortOptions)[number]>('Featured')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setGenderChip('All')

    Promise.all([
      getNavCategories(),
      getProductsForCategorySlug(slug),
    ]).then(([categories, items]) => {
      if (cancelled) return
      const match = categories.find((c) => c.slug === slug) ?? null
      if (!match && slug !== 'new-releases') {
        setNotFound(true)
        setLoading(false)
        return
      }
      setNavCategory(match)
      setProducts(items)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setNotFound(true)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [slug])

  const filtered = useMemo(() => {
    let list = genderChip === 'All' ? products : products.filter((p) => p.gender === genderChip.toLowerCase())
    if (sort === 'Price: Low to High') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'Price: High to Low') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [products, genderChip, sort])

  if (notFound) {
    return (
      <div className="rk-category-empty" style={{ padding: '4rem 1.5rem' }}>
        This category doesn't exist yet — an admin can add it from the Content tab.
      </div>
    )
  }

  const label = slug === 'new-releases' ? 'New Releases' : (navCategory?.label ?? slug ?? '')

  return (
    <div>
      <style>{`
        .rk-category-body {
          padding: 1.5rem 1.25rem 3rem;
        }
        .rk-category-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .rk-chip-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .rk-chip {
          padding: 0.5rem 1rem;
          border-radius: 999px;
          border: 1px solid var(--chip-border);
          background: var(--bg);
          color: var(--text);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
        }
        .rk-chip-active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        .rk-category-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-left: auto;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-sort-select {
          border: 1px solid var(--chip-border);
          border-radius: 999px;
          padding: 0.5rem 1rem;
          background: var(--bg);
          color: var(--text);
          font-size: 0.8125rem;
          font-weight: 600;
        }
        .rk-category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem 1rem;
        }
        .rk-category-empty {
          padding: 3rem 0;
          text-align: center;
          color: var(--text-muted);
        }
        @media (min-width: 640px) {
          .rk-category-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .rk-category-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .rk-category-body {
            padding: 2rem 3rem 4rem;
          }
        }
      `}</style>
      <PageHero title={label} />
      <div className="rk-category-body">
        <div className="rk-category-toolbar">
          <div className="rk-chip-row">
            {genderChips.map((c) => (
              <button key={c} className={`rk-chip ${genderChip === c ? 'rk-chip-active' : ''}`} onClick={() => setGenderChip(c)}>{c}</button>
            ))}
          </div>
          <div className="rk-category-meta">
            <span>{loading ? '…' : `${filtered.length} items`}</span>
            <select className="rk-sort-select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              {sortOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="rk-category-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rk-category-empty">No products match this filter.</div>
        ) : (
          <div className="rk-category-grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
