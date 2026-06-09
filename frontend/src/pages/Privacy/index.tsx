import { motion } from 'framer-motion';

export function Privacy() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
    >
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--nexus-text)' }}>Politica de Privacidade</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--nexus-muted-2)' }}>Ultima atualizacao: Junho de 2026</p>

      <div className="space-y-6 text-sm" style={{ color: 'var(--nexus-muted)' }}>
        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>1. Dados Coletados</h2>
          <p>Coletamos as seguintes informacoes para funcionamento do sistema:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Nome, email e dados de contato fornecidos no cadastro</li>
            <li>Dados operacionais inseridos pelo usuario (clientes, produtos, vendas etc.)</li>
            <li>Informacoes de uso e interacao com o sistema</li>
            <li>Endereco IP e dados de sessao para auditoria</li>
          </ul>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>2. Uso dos Dados</h2>
          <p>Utilizamos seus dados para:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Operar e manter o sistema</li>
            <li>Fornecer suporte tecnico</li>
            <li>Melhorar a experiencia do usuario</li>
            <li>Garantir a seguranca e auditoria do sistema</li>
            <li>Cumprir obrigacoes legais</li>
          </ul>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>3. Compartilhamento</h2>
          <p>Nao compartilhamos seus dados com terceiros, exceto quando exigido por lei ou com seu consentimento explicito.</p>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>4. Armazenamento</h2>
          <p>Seus dados sao armazenados em servidores seguros com criptografia em repouso e em transito. Mantemos backups regulares para garantir a integridade dos dados.</p>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>5. Seus Direitos (LGPD)</h2>
          <p>Conforme a Lei Geral de Protecao de Dados (LGPD), voce tem direito a:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Solicitar a exclusao de dados</li>
            <li>Revogar consentimento a qualquer momento</li>
            <li>Exportar seus dados em formato estruturado</li>
          </ul>
        </section>

        <section className="nexus-card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>6. Contato</h2>
          <p>Para questoes relacionadas a privacidade e dados, entre em contato pelo email de suporte ou atraves da pagina de contato do sistema.</p>
        </section>
      </div>
    </motion.div>
  );
}
