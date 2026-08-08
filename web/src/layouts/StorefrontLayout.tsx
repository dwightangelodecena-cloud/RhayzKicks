import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ThemeToggle from '../components/ThemeToggle'
import WishlistDrawer from '../components/WishlistDrawer'
import CartDrawer from '../components/CartDrawer'

export default function StorefrontLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ThemeToggle />
      <WishlistDrawer />
      <CartDrawer />
    </>
  )
}
