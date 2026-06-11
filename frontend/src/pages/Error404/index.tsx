import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Error404() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--nexus-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-8xl md:text-9xl font-bold mb-4"
          style={{ color: 'var(--nexus-gold)' }}>
          404
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-bold mb-3"
          style={{ color: 'var(--nexus-text)' }}>
          Página não encontrada
        </h1>

        <p className="mb-8 text-sm md:text-base"
          style={{ color: 'var(--nexus-muted)' }}>
          A página que você procura não existe, foi removida ou está temporariamente indisponível.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="btn-primary px-6 py-3 rounded-lg text-sm font-semibold"
          >
            Ir para Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary px-6 py-3 rounded-lg text-sm font-semibold"
          >
            Voltar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
