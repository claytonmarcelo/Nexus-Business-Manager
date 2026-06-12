import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

interface ConfigManutencao {
  ativo: boolean
  mensagem: string
  previsaoRetorno: string | null
  ipsLiberados: string[]
  planoFundo: string
}

export function PaginaManutencao() {
  const [config, setConfig] = useState<ConfigManutencao>({
    ativo: true,
    mensagem: 'Sistema em manutenção. Voltaremos em breve!',
    previsaoRetorno: null,
    ipsLiberados: [],
    planoFundo: '',
  })
  const [tempoRestante, setTempoRestante] = useState('')
  const [ipPermitido, setIpPermitido] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    fetch('/api/maintenance')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data)
        const ipAtual = window.location.hostname
        const permitido = data.ipsLiberados?.includes(ipAtual) ||
          data.ipsLiberados?.includes('*')
        setIpPermitido(permitido)
      })
      .catch(() => setVerificando(false))
      .finally(() => setVerificando(false))
  }, [])

  useEffect(() => {
    if (!config.previsaoRetorno) return

    function atualizarTempo() {
      const agora = new Date().getTime()
      const alvo = new Date(config.previsaoRetorno!).getTime()
      const diff = alvo - agora

      if (diff <= 0) {
        setTempoRestante('Previsto para qualquer momento')
        return
      }

      const horas = Math.floor(diff / (1000 * 60 * 60))
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const segundos = Math.floor((diff % (1000 * 60)) / 1000)

      setTempoRestante(
        `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
      )
    }

    atualizarTempo()
    const intervalo = setInterval(atualizarTempo, 1000)
    return () => clearInterval(intervalo)
  }, [config.previsaoRetorno])

  if (verificando) return null

  if (ipPermitido) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: config.planoFundo || 'var(--nexus-bg)',
      }}>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-nexus-gold blur-3xl" />
        <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-nexus-rose blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg relative z-10"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <WrenchScrewdriverIcon className="w-20 h-20 mx-auto mb-6"
            style={{ color: 'var(--nexus-gold)' }} />
        </motion.div>

        <h1 className="text-3xl md:text-2xl font-bold mb-4"
          style={{ color: 'var(--nexus-text)' }}>
          Sistema em Manutenção
        </h1>

        <p className="text-base mb-6 leading-relaxed"
          style={{ color: 'var(--nexus-muted)' }}>
          {config.mensagem}
        </p>

        {config.previsaoRetorno && (
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ color: 'var(--nexus-muted)' }}>
              Tempo estimado para retorno
            </p>
            <div className="text-2xl md:text-2xl font-mono font-bold tracking-wider"
              style={{ color: 'var(--nexus-gold)' }}>
              {tempoRestante || '--:--:--'}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs"
          style={{ color: 'var(--nexus-muted)' }}>
          <span className="w-2 h-2 rounded-full bg-nexus-gold animate-pulse" />
          Estamos trabalhando para melhorar sua experiência
        </div>
      </motion.div>
    </div>
  )
}
