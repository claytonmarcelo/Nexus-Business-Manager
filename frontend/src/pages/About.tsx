export function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-blackCherry dark:text-brand-ivorySmoke mb-2">Sobre o Nexus Business Manager</h1>
        <p className="text-brand-graphiteWine/60 dark:text-brand-roseGold">Sistema ERP SaaS completo para gestao empresarial</p>
      </div>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">O que e</h2>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80 mb-4">
          O <strong>Nexus Business Manager</strong> e um sistema ERP (Enterprise Resource Planning) completo,
          desenvolvido em plataforma moderna com React, Node.js e TypeScript.
        </p>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          Ele unifica em um unico sistema todas as areas de gestao de uma empresa: CRM, Estoque,
          Compras, Vendas, Financeiro, Agendamentos, Relatorios e muito mais.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Objetivo</h2>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          Oferecer uma ferramenta profissional, gratuita e de codigo aberto que permita a
          pequenas e medias empresas centralizarem sua gestao sem depender de multiplas
          ferramentas pagas ou planilhas desconectadas.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Problemas que resolve</h2>
        <ul className="space-y-2 text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Dados espalhados em planilhas e sistemas diferentes</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Retrabalho ao inserir informacoes repetidas</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Dificuldade em gerar relatorios gerenciais</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Falta de controle de estoque em tempo real</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Dificuldade em acompanhar fluxo de caixa</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Ausencia de historico de auditoria</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Quem pode utilizar</h2>
        <ul className="space-y-2 text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Lojas de varejo e atacado</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Prestadores de servicos (oficinas, consultorios, escritorios)</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Pequenas industrias e distribuidoras</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Profissionais autonomos</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Escritorios de contabilidade</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Franquias e grupos empresariais (multiempresa)</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Beneficios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          <div className="p-4 rounded-lg bg-brand-ivorySmoke dark:bg-brand-blackCherry/50">
            <strong>Centralizacao:</strong> Todos os dados em um so lugar
          </div>
          <div className="p-4 rounded-lg bg-brand-ivorySmoke dark:bg-brand-blackCherry/50">
            <strong>Economia:</strong> Substitui multiplas ferramentas pagas
          </div>
          <div className="p-4 rounded-lg bg-brand-ivorySmoke dark:bg-brand-blackCherry/50">
            <strong>Escalabilidade:</strong> Arquitetura preparada para crescer
          </div>
          <div className="p-4 rounded-lg bg-brand-ivorySmoke dark:bg-brand-blackCherry/50">
            <strong>Multiempresa:</strong> Gerencie quantas empresas precisar
          </div>
          <div className="p-4 rounded-lg bg-brand-ivorySmoke dark:bg-brand-blackCherry/50">
            <strong>Codigo aberto:</strong> Liberdade para customizar e estender
          </div>
          <div className="p-4 rounded-lg bg-brand-ivorySmoke dark:bg-brand-blackCherry/50">
            <strong>Seguranca:</strong> Auditoria, permissoes e criptografia
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Estrutura SaaS</h2>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80 mb-4">
          O Nexus e projetado como um sistema SaaS (Software as a Service) multiusuario.
          Uma unica instalacao do sistema pode atender multiplas empresas simultaneamente,
          com isolamento completo de dados entre elas.
        </p>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80 mb-4">
          Cada empresa possui seu proprio ambiente com usuarios, clientes, produtos,
          vendas e financas separados. Nenhuma empresa tem acesso aos dados de outra.
        </p>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          Isso torna o Nexus ideal para:
          Franquias, grupos empresariais, prestadores de servico SaaS,
          e empresas que desejam separar unidades de negocio.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Multiempresa</h2>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80 mb-4">
          O suporte a multiplas empresas e nativo na arquitetura do sistema:
        </p>
        <ul className="space-y-2 text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Cada tabela possui uma coluna <code className="text-xs bg-brand-ivorySmoke dark:bg-brand-graphiteWine px-1 rounded">company_id</code></li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Todas as consultas incluem filtro por empresa</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> O token JWT contem o identificador da empresa</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Isolamento completo: empresas nao veem dados umas das outras</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Usuarios pertencem a uma unica empresa</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Seguranca</h2>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80 mb-4">
          O sistema implementa multiplas camadas de seguranca para proteger os dados:
        </p>
        <ul className="space-y-2 text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Autenticacao via JWT com tokens expiraveis</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Senhas armazenadas com bcrypt (hash seguro com salt)</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Rate limiting para prevenir ataques de forca bruta</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Helmet para headers HTTP de seguranca</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> CORS com controle de origens permitidas</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Validacao rigorosa de entrada com Zod</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Hierarquia de permissoes (admin, manager, operator, viewer)</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Isolamento multiempresa por company_id</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Auditoria de todas as acoes com IP e data</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Senhas unicas: nenhum usuario pode usar senha de outro</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Auditoria</h2>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80 mb-4">
          Todas as acoes realizadas no sistema sao registradas no modulo de auditoria:
        </p>
        <ul className="space-y-2 text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Criacao, alteracao e exclusao de registros</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Login e logout de usuarios</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Exportacao de relatorios</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Valores antigos e novos de cada alteracao</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Endereco IP do usuario</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Data e hora precisas de cada acao</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Escalabilidade</h2>
        <p className="text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80 mb-4">
          O Nexus foi construido com arquitetura modular e principios de escalabilidade:
        </p>
        <ul className="space-y-2 text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Modulos independentes e desacoplados</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Separação por dominio de negocio</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Preparado para implantacao SaaS</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Facil integracao com servicos externos</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> API REST documentada e consistente</li>
          <li className="flex gap-2"><span className="text-brand-roseGold mt-1">&#8226;</span> Testes automatizados garantindo qualidade</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Niveis de usuarios</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-brand-roseGold/30 dark:border-brand-roseGold/40">
            <h3 className="font-semibold text-brand-roseGold mb-2">Administrador</h3>
            <p className="text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">Controle total do sistema. Pode gerenciar usuarios, empresas, configuracoes e auditar todas as acoes.</p>
          </div>
          <div className="p-4 rounded-lg border border-brand-champagneGold/30 dark:border-brand-champagneGold/40">
            <h3 className="font-semibold text-brand-champagneGold mb-2">Gerente</h3>
            <p className="text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">Controle operacional. Pode gerenciar cadastros, operacoes e visualizar relatorios gerenciais.</p>
          </div>
          <div className="p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">Operador</h3>
            <p className="text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">Pode realizar cadastros e operacoes do dia a dia, como registrar vendas, compras e movimentacoes.</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-2">Visualizador</h3>
            <p className="text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">Acesso somente leitura. Pode consultar dados e gerar relatorios, mas nao pode criar ou alterar registros.</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-blackCherry dark:text-brand-ivorySmoke mb-4">Direitos e Deveres</h2>

        <h3 className="text-lg font-medium text-brand-blackCherry dark:text-brand-ivorySmoke mt-6 mb-3">Usuario</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Direitos</h4>
            <ul className="space-y-1 text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Utilizar recursos autorizados</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Atualizar o proprio perfil</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Consultar dados permitidos</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Solicitar suporte</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">Deveres</h4>
            <ul className="space-y-1 text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Nao compartilhar a senha</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Nao acessar dados indevidos</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Utilizar o sistema corretamente</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Manter dados atualizados</li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-medium text-brand-blackCherry dark:text-brand-ivorySmoke mt-6 mb-3">Administrador</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Direitos</h4>
            <ul className="space-y-1 text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Gerenciar usuarios</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Configurar a empresa</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Gerenciar permissoes</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Visualizar auditoria</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">Deveres</h4>
            <ul className="space-y-1 text-sm text-brand-graphiteWine/80 dark:text-brand-ivorySmoke/80">
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Garantir seguranca dos dados</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Gerenciar acessos corretamente</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Proteger dados da empresa</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Manter usuarios atualizados</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
