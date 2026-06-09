import { motion } from 'framer-motion';

export function Terms() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
    >
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--nexus-text)' }}>Termos de Uso</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--nexus-muted-2)' }}>Ultima atualizacao: Junho de 2026</p>

      <div className="space-y-6 text-sm" style={{ color: 'var(--nexus-muted)' }}>
        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>1. Aceitacao dos Termos</h2>
          <p>Ao utilizar o Nexus Business Manager, voce concorda com estes termos de uso. Se nao concordar, nao utilize o sistema.</p>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>2. Uso do Sistema</h2>
          <p>O Nexus Business Manager e um software de codigo aberto fornecido "como esta". O usuario e responsavel por:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Manter a confidencialidade de suas credenciais de acesso</li>
            <li>Utilizar o sistema de acordo com as leis aplicaveis</li>
            <li>Nao realizar acoes que possam comprometer a seguranca do sistema</li>
            <li>Responsabilizar-se pelos dados inseridos no sistema</li>
          </ul>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>3. Contas e Seguranca</h2>
          <p>Voce e responsavel por manter a seguranca de sua conta e senha. O Nexus nao se responsabiliza por acessos nao autorizados decorrentes de negligencia do usuario.</p>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>4. Privacidade e Dados</h2>
          <p>Respeitamos sua privacidade. Os dados inseridos no sistema sao de propriedade da sua empresa. Nao compartilhamos ou vendemos informacoes de usuarios.</p>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>5. Limitacao de Responsabilidade</h2>
          <p>O Nexus Business Manager e fornecido gratuitamente e nao oferece garantias explicitas ou implicitas. Nao nos responsabilizamos por danos diretos ou indiretos decorrentes do uso do sistema.</p>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>6. Alteracoes nos Termos</h2>
          <p>Estes termos podem ser atualizados periodicamente. Recomendamos revisa-los regularmente. O uso continuado do sistema apos alteracoes constitui aceitacao dos novos termos.</p>
        </section>
      </div>
    </motion.div>
  );
}
