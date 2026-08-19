import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthContext'
import { getProductsByIds, type Product } from '../lib/storeData'

export interface CartLine {
  id: string
  product: Product
  qty: number
  size?: string
  colorway?: string
  variantId: string
}

export interface CartVariant {
  size?: string
  colorway?: string
}

function matchesLine(line: CartLine, productId: string, variant?: CartVariant) {
  return line.product.id === productId && line.size === variant?.size && line.colorway === variant?.colorway
}

interface ShopContextValue {
  cart: CartLine[]
  wishlist: Product[]
  cartCount: number
  cartSubtotal: number
  addToCart: (variantId: string) => void
  removeFromCart: (id: string, variant?: CartVariant) => void
  setQty: (id: string, qty: number, variant?: CartVariant) => void
  clearCart: () => void
  toggleWishlist: (product: Product) => void
  isWishlisted: (id: string) => boolean
  isCartOpen: boolean
  isWishlistOpen: boolean
  openCart: () => void
  openWishlist: () => void
  closeDrawers: () => void
}

const ShopContext = createContext<ShopContextValue | null>(null)

interface CartItemRow {
  id: string
  variant_id: string
  quantity: number
}

interface VariantRow {
  id: string
  item_id: string
  size: string
  color: string
}

async function loadCart(customerId: string): Promise<CartLine[]> {
  const { data: rows, error } = await supabase
    .from('cart_items')
    .select('id, variant_id, quantity')
    .eq('customer_id', customerId)
  if (error) throw error
  const cartRows = (rows ?? []) as CartItemRow[]
  if (cartRows.length === 0) return []

  const variantIds = cartRows.map((r) => r.variant_id)
  const { data: variantRows, error: variantError } = await supabase
    .from('item_variants')
    .select('id, item_id, size, color')
    .in('id', variantIds)
  if (variantError) throw variantError

  const variantById = new Map(((variantRows ?? []) as VariantRow[]).map((v) => [v.id, v]))
  const itemIds = Array.from(new Set(Array.from(variantById.values()).map((v) => v.item_id)))
  const products = await getProductsByIds(itemIds)
  const productById = new Map(products.map((p) => [p.id, p]))

  const lines: CartLine[] = []
  for (const row of cartRows) {
    const variant = variantById.get(row.variant_id)
    const product = variant && productById.get(variant.item_id)
    if (!variant || !product) continue
    lines.push({ id: row.id, product, qty: row.quantity, size: variant.size, colorway: variant.color, variantId: variant.id })
  }
  return lines
}

async function loadWishlist(customerId: string): Promise<Product[]> {
  const { data: rows, error } = await supabase.from('wishlist_items').select('item_id').eq('customer_id', customerId)
  if (error) throw error
  const itemIds = (rows ?? []).map((r) => r.item_id as string)
  return getProductsByIds(itemIds)
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth()
  const [cart, setCart] = useState<CartLine[]>([])
  const [wishlist, setWishlist] = useState<Product[]>([])
  const [isCartOpen, setCartOpen] = useState(false)
  const [isWishlistOpen, setWishlistOpen] = useState(false)

  const refreshCart = useCallback(async (customerId: string) => {
    try {
      setCart(await loadCart(customerId))
    } catch {
      setCart([])
    }
  }, [])

  const refreshWishlist = useCallback(async (customerId: string) => {
    try {
      setWishlist(await loadWishlist(customerId))
    } catch {
      setWishlist([])
    }
  }, [])

  useEffect(() => {
    if (!customer) {
      setCart([])
      setWishlist([])
      return
    }
    refreshCart(customer.id)
    refreshWishlist(customer.id)

    const channel = supabase
      .channel(`shop-${customer.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `customer_id=eq.${customer.id}` },
        () => refreshCart(customer.id),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishlist_items', filter: `customer_id=eq.${customer.id}` },
        () => refreshWishlist(customer.id),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [customer, refreshCart, refreshWishlist])

  const addToCart = (variantId: string) => {
    if (!customer) return
    const customerId = customer.id
    const existing = cart.find((l) => l.variantId === variantId)
    const write = existing
      ? supabase.from('cart_items').update({ quantity: existing.qty + 1 }).eq('id', existing.id)
      : supabase.from('cart_items').insert({ customer_id: customerId, variant_id: variantId, quantity: 1 })
    write.then(() => refreshCart(customerId))
  }

  const removeFromCart = (id: string, variant?: CartVariant) => {
    if (!customer) return
    const customerId = customer.id
    const line = cart.find((l) => matchesLine(l, id, variant))
    if (!line) return
    supabase
      .from('cart_items')
      .delete()
      .eq('id', line.id)
      .then(() => refreshCart(customerId))
  }

  const setQty = (id: string, qty: number, variant?: CartVariant) => {
    if (qty <= 0) {
      removeFromCart(id, variant)
      return
    }
    if (!customer) return
    const customerId = customer.id
    const line = cart.find((l) => matchesLine(l, id, variant))
    if (!line) return
    supabase
      .from('cart_items')
      .update({ quantity: qty })
      .eq('id', line.id)
      .then(() => refreshCart(customerId))
  }

  const clearCart = () => {
    if (!customer) return
    const customerId = customer.id
    supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', customerId)
      .then(() => refreshCart(customerId))
  }

  const toggleWishlist = (product: Product) => {
    if (!customer) return
    const customerId = customer.id
    const already = wishlist.some((p) => p.id === product.id)
    const write = already
      ? supabase.from('wishlist_items').delete().eq('customer_id', customerId).eq('item_id', product.id)
      : supabase.from('wishlist_items').insert({ customer_id: customerId, item_id: product.id })
    write.then(() => refreshWishlist(customerId))
  }

  const isWishlisted = (id: string) => wishlist.some((p) => p.id === id)

  const cartCount = useMemo(() => cart.reduce((sum, l) => sum + l.qty, 0), [cart])
  const cartSubtotal = useMemo(() => cart.reduce((sum, l) => sum + l.qty * l.product.price, 0), [cart])

  const openCart = () => {
    setWishlistOpen(false)
    setCartOpen(true)
  }
  const openWishlist = () => {
    setCartOpen(false)
    setWishlistOpen(true)
  }
  const closeDrawers = () => {
    setCartOpen(false)
    setWishlistOpen(false)
  }

  const value: ShopContextValue = {
    cart,
    wishlist,
    cartCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    toggleWishlist,
    isWishlisted,
    isCartOpen,
    isWishlistOpen,
    openCart,
    openWishlist,
    closeDrawers,
  }

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within a ShopProvider')
  return ctx
}
