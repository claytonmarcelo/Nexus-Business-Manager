import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'

export function Error403() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--nexus-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ShieldExclamationIcon className="w-24 h-24 mx-auto mb-4"
            style={{ color: 'var(--nexus-rose)' }} />
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-bold mb-3"
          style={{ color: 'var(--nexus-text)' }}>
          Acesso Negado
        </h1>

        <p className="text-sm md:text-base mb-2"
          style={{ color: 'var(--nexus-muted)' }}>
          Você não tem permissão para acessar esta página.
        </p>
        <p className="text-xs mb-8"
          style={{ color: 'var(--nexus-muted)' }}>
          Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
        </p>

        <Link
          to="/dashboard"
          className="btn-primary px-6 py-3 rounded-lg text-sm font-semibold"
        >
          Voltar para Dashboard
        </Link>
      </motion.div>
    </div>
  )
}
