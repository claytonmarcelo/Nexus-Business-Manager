import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function Error500() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--nexus-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <ExclamationTriangleIcon className="w-24 h-24 mx-auto mb-4"
          style={{ color: 'var(--nexus-danger)' }} />

        <h1 className="text-2xl md:text-3xl font-bold mb-3"
          style={{ color: 'var(--nexus-text)' }}>
          Erro Interno do Servidor
        </h1>

        <p className="text-sm md:text-base mb-2"
          style={{ color: 'var(--nexus-muted)' }}>
          Ocorreu um erro inesperado. Nossa equipe foi notificada.
        </p>
        <p className="text-xs mb-8"
          style={{ color: 'var(--nexus-muted)' }}>
          Tente novamente em alguns instantes. Se o problema persistir, contate o suporte.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="btn-primary px-6 py-3 rounded-lg text-sm font-semibold"
          >
            Ir para Dashboard
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary px-6 py-3 rounded-lg text-sm font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      </motion.div>
    </div>
  )
}
