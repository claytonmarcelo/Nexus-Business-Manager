import { useState, useEffect } from 'react'
import { ChevronUpIcon } from '@heroicons/react/24/outline'

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed right-6 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
      style={{
        background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))',
        color: '#000',
        bottom: '104px',
      }}
      title="Voltar ao topo"
    >
      <ChevronUpIcon className="w-4 h-4" />
    </button>
  )
}
