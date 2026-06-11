import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'

interface ConfigPreloader {
  ativo: boolean
  adminAtivo: boolean
  siteAtivo: boolean
}

export function Preloader() {
  const { isAuthenticated, loading } = useAuth()
  const [visivel, setVisivel] = useState(true)
  const [config, setConfig] = useState<ConfigPreloader>({
    ativo: true, adminAtivo: true, siteAtivo: true,
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem('@nexus:preloader')
      if (stored) setConfig(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (loading) return
    const deveMostrar = config.ativo && (
      (isAuthenticated && config.adminAtivo) ||
      (!isAuthenticated && config.siteAtivo)
    )
    if (!deveMostrar) {
      setVisivel(false)
      return
    }
    const timer = setTimeout(() => setVisivel(false), 800)
    return () => clearTimeout(timer)
  }, [loading, isAuthenticated, config])

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'var(--nexus-bg)' }}
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <img
                src="/logo.png"
                alt="Nexus Business Manager"
                className="h-12 md:h-16"
              />
            </motion.div>

            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -8, 0],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: i === 1
                      ? 'var(--nexus-gold)'
                      : 'var(--nexus-rose)',
                  }}
                />
              ))}
            </div>

            <p className="text-xs font-medium tracking-wider uppercase mt-2"
              style={{ color: 'var(--nexus-muted)' }}>
              Carregando...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
