import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Product } from '../lib/storeData'

const CART_KEY = 'rk-cart'
const WISHLIST_KEY = 'rk-wishlist'

export interface CartLine {
  product: Product
  qty: number
  size?: string
  colorway?: string
}

export interface CartVariant {
  size?: string
  colorway?: string
}

function sameLine(line: CartLine, product: Product, variant?: CartVariant) {
  return line.product.id === product.id && line.size === variant?.size && line.colorway === variant?.colorway
}

interface ShopContextValue {
  cart: CartLine[]
  wishlist: Product[]
  cartCount: number
  cartSubtotal: number
  addToCart: (product: Product, variant?: CartVariant) => void
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

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const ShopContext = createContext<ShopContextValue | null>(null)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => loadJSON(CART_KEY, []))
  const [wishlist, setWishlist] = useState<Product[]>(() => loadJSON(WISHLIST_KEY, []))
  const [isCartOpen, setCartOpen] = useState(false)
  const [isWishlistOpen, setWishlistOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  const addToCart = (product: Product, variant?: CartVariant) => {
    setCart((lines) => {
      const existing = lines.find((l) => sameLine(l, product, variant))
      if (existing) {
        return lines.map((l) => (sameLine(l, product, variant) ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...lines, { product, qty: 1, size: variant?.size, colorway: variant?.colorway }]
    })
  }

  const removeFromCart = (id: string, variant?: CartVariant) => {
    setCart((lines) => lines.filter((l) => !(l.product.id === id && l.size === variant?.size && l.colorway === variant?.colorway)))
  }

  const setQty = (id: string, qty: number, variant?: CartVariant) => {
    if (qty <= 0) {
      removeFromCart(id, variant)
      return
    }
    setCart((lines) =>
      lines.map((l) => (l.product.id === id && l.size === variant?.size && l.colorway === variant?.colorway ? { ...l, qty } : l)),
    )
  }

  const clearCart = () => setCart([])

  const toggleWishlist = (product: Product) => {
    setWishlist((items) =>
      items.some((p) => p.id === product.id) ? items.filter((p) => p.id !== product.id) : [...items, product],
    )
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
