import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImgSlot from './ImgSlot'
import { getHeroSlides, type HeroSlide } from '../lib/storeData'

export default function HeroCarousel() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    getHeroSlides().then(setSlides).catch(() => setSlides([]))
  }, [])

  useEffect(() => {
    if (slides.length < 2) return
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [slides.length])

  if (slides.length === 0) return null

  const slide = slides[index]
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length)
  const next = () => setIndex((i) => (i + 1) % slides.length)

  return (
    <section className="rk-hero">
      <style>{`
        .rk-hero {
          position: relative;
          overflow: hidden;
          height: clamp(500px, 40.94vw, 820px);
        }
        .rk-hero-bg {
          position: absolute;
          inset: 0;
        }
        .rk-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
          transition: background-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
        }
        .rk-hero-arrow:hover {
          background: #ffffff;
          transform: translateY(-50%) scale(1.08);
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
          transition: width var(--duration-base) var(--ease-out), background-color var(--duration-base) var(--ease-out);
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
      `}</style>
      <div className="rk-hero-bg">
        {slide.imageUrl ? (
          <img key={slide.id} src={slide.imageUrl} alt="" className="rk-hero-img rk-animate-fade-in" />
        ) : (
          <ImgSlot label={`Hero Image ${index + 1} of ${slides.length}`} size="Recommended: 1440 × 820 px" />
        )}
      </div>
      <div className="rk-hero-gradient" />

      <div className="rk-hero-content" key={slide.id}>
        <p className="rk-hero-eyebrow rk-animate-fade-up" style={{ animationDelay: '0ms' }}>{slide.eyebrow}</p>
        <h1 className="rk-heading rk-hero-headline rk-animate-fade-up" style={{ animationDelay: '80ms' }}>
          {slide.headline.split('\n').map((line) => (
            <span key={line} className="rk-hero-line">{line}</span>
          ))}
        </h1>
        <p className="rk-hero-subtext rk-animate-fade-up" style={{ animationDelay: '160ms' }}>{slide.subtext}</p>
        <div className="rk-hero-ctas rk-animate-fade-up" style={{ animationDelay: '240ms' }}>
          {slide.primaryCtaLabel && (
            <button className="rk-btn rk-hero-btn-primary" onClick={() => navigate(slide.primaryCtaLink)}>{slide.primaryCtaLabel}</button>
          )}
          {slide.secondaryCtaLabel && (
            <button className="rk-btn rk-hero-btn-outline" onClick={() => navigate(slide.secondaryCtaLink ?? '/')}>{slide.secondaryCtaLabel}</button>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button className="rk-hero-arrow rk-hero-arrow-left" onClick={prev} aria-label="Previous slide">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="rk-hero-arrow rk-hero-arrow-right" onClick={next} aria-label="Next slide">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>

          <div className="rk-hero-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                className={`rk-hero-dot ${i === index ? 'rk-hero-dot-active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
