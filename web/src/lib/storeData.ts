// Live Supabase-backed replacement for the old data/catalog.ts + data/homeMock.ts
// mocks. Every function here reads public, active/visible rows only — RLS
// (see supabase/006_storefront_content.sql) enforces that server-side too.
import { supabase } from '../supabase'

export type Gender = 'men' | 'women' | 'unisex' | 'kids'

export interface Product {
  id: string
  name: string
  brand: string
  price: number
  category: string
  gender: Gender
  imageUrl: string | null
  isNew: boolean
  description: string
}

export interface ProductVariant {
  id: string
  size: string
  color: string
  sku: string
  quantityOnHand: number
}

export interface ProductDetail extends Product {
  variants: ProductVariant[]
  galleryByColor: Record<string, string[]>
  swatchByColor: Record<string, string>
}

export interface NavCategory {
  slug: string
  label: string
  imageUrl: string | null
}

export interface Announcement {
  id: string
  message: string
}

export interface HeroSlide {
  id: string
  eyebrow: string
  headline: string
  subtext: string
  imageUrl: string | null
  primaryCtaLabel: string
  primaryCtaLink: string
  secondaryCtaLabel: string | null
  secondaryCtaLink: string | null
}

export interface Collection {
  id: string
  slug: string
  tag: string
  title: string
  description: string
  imageUrl: string | null
  ctaLabel: string
  size: 'regular' | 'wide'
}

const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

interface ItemRow {
  id: string
  name: string
  brand: string
  category: string
  gender: Gender
  base_price: number
  image_urls: string[] | null
  description: string
  created_at: string
}

const ITEM_COLUMNS = 'id, name, brand, category, gender, base_price, image_urls, description, created_at'

function toProduct(row: ItemRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    price: Number(row.base_price),
    category: row.category,
    gender: row.gender,
    imageUrl: row.image_urls?.[0] ?? null,
    isNew: Date.now() - new Date(row.created_at).getTime() < NEW_WINDOW_MS,
    description: row.description,
  }
}

export async function getActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ItemRow[]).map(toProduct)
}

export async function getProductsForCategorySlug(slug: string): Promise<Product[]> {
  let query = supabase.from('items').select(ITEM_COLUMNS).eq('is_active', true)
  if (slug === 'new-releases') {
    query = query.gte('created_at', new Date(Date.now() - NEW_WINDOW_MS).toISOString())
  } else {
    query = query.eq('category', slug)
  }
  const { data, error } = await query.order('sort_order', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ItemRow[]).map(toProduct)
}

export async function getRecommendedProducts(product: Product, limit = 4): Promise<Product[]> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .eq('is_active', true)
    .eq('category', product.category)
    .neq('id', product.id)
    .order('sort_order', { ascending: true })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as ItemRow[]).map(toProduct)
}

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const { data: itemRow, error: itemError } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()
  if (itemError) throw itemError
  if (!itemRow) return null

  const { data: variantRows, error: variantError } = await supabase
    .from('item_variants')
    .select('id, size, color, sku')
    .eq('item_id', id)
    .eq('is_active', true)
  if (variantError) throw variantError

  const skus = (variantRows ?? []).map((v) => v.sku)
  const inventoryBySku = new Map<string, number>()
  if (skus.length > 0) {
    const { data: inventoryRows, error: inventoryError } = await supabase
      .from('inventory')
      .select('sku, quantity_on_hand')
      .in('sku', skus)
    if (inventoryError) throw inventoryError
    for (const row of inventoryRows ?? []) inventoryBySku.set(row.sku, row.quantity_on_hand)
  }

  // item_images/item_colorways only exist once 007_product_gallery.sql and
  // 008_item_colorways.sql have been run — tolerate their absence (no
  // per-colorway gallery/swatch, falls back to the card image) instead of
  // failing the whole product page.
  const [galleryRes, colorwaysRes] = await Promise.all([
    supabase.from('item_images').select('color, image_url').eq('item_id', id).order('sort_order', { ascending: true }),
    supabase.from('item_colorways').select('color, swatch_url').eq('item_id', id).order('sort_order', { ascending: true }),
  ])

  const galleryByColor: Record<string, string[]> = {}
  if (!galleryRes.error) {
    for (const row of galleryRes.data ?? []) {
      ;(galleryByColor[row.color] ??= []).push(row.image_url)
    }
  }

  const swatchByColor: Record<string, string> = {}
  if (!colorwaysRes.error) {
    for (const row of colorwaysRes.data ?? []) {
      if (row.swatch_url) swatchByColor[row.color] = row.swatch_url
    }
  }

  return {
    ...toProduct(itemRow as ItemRow),
    variants: (variantRows ?? []).map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      sku: v.sku,
      quantityOnHand: inventoryBySku.get(v.sku) ?? 0,
    })),
    galleryByColor,
    swatchByColor,
  }
}

export async function getNavCategories(): Promise<NavCategory[]> {
  const { data, error } = await supabase
    .from('nav_categories')
    .select('slug, label, image_url')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({ slug: row.slug, label: row.label, imageUrl: row.image_url || null }))
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, message')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from('hero_slides')
    .select('id, eyebrow, headline, subtext, image_url, primary_cta_label, primary_cta_link, secondary_cta_label, secondary_cta_link')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    eyebrow: row.eyebrow,
    headline: row.headline,
    subtext: row.subtext,
    imageUrl: row.image_url || null,
    primaryCtaLabel: row.primary_cta_label,
    primaryCtaLink: row.primary_cta_link,
    secondaryCtaLabel: row.secondary_cta_label,
    secondaryCtaLink: row.secondary_cta_link,
  }))
}

export async function getCollections(opts: { homeOnly?: boolean } = {}): Promise<Collection[]> {
  let query = supabase
    .from('collections')
    .select('id, slug, tag, title, description, image_url, cta_label, size')
    .eq('is_active', true)
  if (opts.homeOnly) query = query.eq('show_on_home', true)
  const { data, error } = await query.order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    tag: row.tag,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url || null,
    ctaLabel: row.cta_label,
    size: row.size as 'regular' | 'wide',
  }))
}

// Bullet copy isn't in the schema (no per-item marketing copy field) — grouped
// by the closest broad category so product pages still show something useful.
const footwearCategories = new Set(['running', 'basketball', 'lifestyle', 'training', 'limited'])

export function detailBulletsForCategory(category: string): string[] {
  if (category === 'apparel') {
    return [
      'Soft, breathable fabric blend for everyday wear',
      'Relaxed fit designed to layer easily',
      'Reinforced seams for lasting durability',
      'Machine washable, colorfast print',
    ]
  }
  if (category === 'accessories') {
    return [
      'Built with durable, weather-resistant materials',
      'Compact design for everyday carry',
      'Reinforced stitching for lasting use',
      'Adjustable fit for all-day comfort',
    ]
  }
  if (footwearCategories.has(category)) {
    return [
      'Breathable mesh and synthetic upper for all-day comfort',
      'Cushioned midsole absorbs impact with every step',
      'Durable rubber outsole built for reliable traction',
      'Reinforced heel counter for a secure, locked-in fit',
    ]
  }
  return [
    'Crafted with quality materials for everyday performance',
    'Designed to hold up to daily wear',
  ]
}
