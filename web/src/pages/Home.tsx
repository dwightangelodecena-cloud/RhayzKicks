import HeroCarousel from '../components/HeroCarousel'
import FeaturedCollections from '../components/FeaturedCollections'
import PromoBanner from '../components/PromoBanner'
import ShopByActivity from '../components/ShopByActivity'
import SignatureSilhouettes from '../components/SignatureSilhouettes'
import MemberCTA from '../components/MemberCTA'

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <FeaturedCollections />
      <PromoBanner />
      <ShopByActivity />
      <SignatureSilhouettes />
      <MemberCTA />
    </>
  )
}
