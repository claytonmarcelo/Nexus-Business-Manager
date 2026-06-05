export function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-nexus-text mb-2">Sobre o Nexus Business Manager</h1>
        <p className="text-nexus-textSecondary">Sistema ERP SaaS completo para gestão empresarial</p>
      </div>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">O que é</h2>
        <p className="text-nexus-textSecondary mb-4">
          O <strong>Nexus Business Manager</strong> é um sistema ERP (Enterprise Resource Planning) completo,
          desenvolvido em plataforma moderna com React, Node.js e TypeScript.
        </p>
        <p className="text-nexus-textSecondary">
          Ele unifica em um único sistema todas as áreas de gestão de uma empresa: CRM, Estoque,
          Compras, Vendas, Financeiro, Agendamentos, Relatórios e muito mais.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Objetivo</h2>
        <p className="text-nexus-textSecondary">
          Oferecer uma ferramenta profissional, gratuita e de código aberto que permita a
          pequenas e médias empresas centralizarem sua gestão sem depender de múltiplas
          ferramentas pagas ou planilhas desconectadas.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Problemas que resolve</h2>
        <ul className="space-y-2 text-nexus-textSecondary">
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Dados espalhados em planilhas e sistemas diferentes</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Retrabalho ao inserir informações repetidas</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Dificuldade em gerar relatórios gerenciais</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Falta de controle de estoque em tempo real</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Dificuldade em acompanhar fluxo de caixa</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Ausência de histórico de auditoria</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Quem pode utilizar</h2>
        <ul className="space-y-2 text-nexus-textSecondary">
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Lojas de varejo e atacado</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Prestadores de serviços (oficinas, consultórios, escritórios)</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Pequenas indústrias e distribuidoras</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Profissionais autônomos</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Escritórios de contabilidade</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Franquias e grupos empresariais (multiempresa)</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Benefícios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-nexus-textSecondary">
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Centralização:</strong> Todos os dados em um só lugar
          </div>
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Economia:</strong> Substitui múltiplas ferramentas pagas
          </div>
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Escalabilidade:</strong> Arquitetura preparada para crescer
          </div>
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Multiempresa:</strong> Gerencie quantas empresas precisar
          </div>
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Código aberto:</strong> Liberdade para customizar e estender
          </div>
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Segurança:</strong> Auditoria, permissões e criptografia
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Estrutura SaaS</h2>
        <p className="text-nexus-textSecondary mb-4">
          O Nexus é projetado como um sistema SaaS (Software as a Service) multiusuário.
          Uma única instalação do sistema pode atender múltiplas empresas simultaneamente,
          com isolamento completo de dados entre elas.
        </p>
        <p className="text-nexus-textSecondary mb-4">
          Cada empresa possui seu próprio ambiente com usuários, clientes, produtos,
          vendas e finanças separados. Nenhuma empresa tem acesso aos dados de outra.
        </p>
        <p className="text-nexus-textSecondary">
          Isso torna o Nexus ideal para:
          Franquias, grupos empresariais, prestadores de serviço SaaS,
          e empresas que desejam separar unidades de negócio.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Multiempresa</h2>
        <p className="text-nexus-textSecondary mb-4">
          O suporte a múltiplas empresas é nativo na arquitetura do sistema:
        </p>
        <ul className="space-y-2 text-nexus-textSecondary">
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Cada tabela possui uma coluna <code className="text-xs bg-nexus-graphite px-1 rounded">company_id</code></li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Todas as consultas incluem filtro por empresa</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> O token JWT contém o identificador da empresa</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Isolamento completo: empresas não veem dados umas das outras</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Usuários pertencem a uma única empresa</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Segurança</h2>
        <p className="text-nexus-textSecondary mb-4">
          O sistema implementa múltiplas camadas de segurança para proteger os dados:
        </p>
        <ul className="space-y-2 text-nexus-textSecondary">
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Autenticação via JWT com tokens expiráveis</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Senhas armazenadas com bcrypt (hash seguro com salt)</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Rate limiting para prevenir ataques de força bruta</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Helmet para headers HTTP de segurança</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> CORS com controle de origens permitidas</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Validação rigorosa de entrada com Zod</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Hierarquia de permissões (admin, manager, operator, viewer)</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Isolamento multiempresa por company_id</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Auditoria de todas as ações com IP e data</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Senhas únicas: nenhum usuário pode usar senha de outro</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Auditoria</h2>
        <p className="text-nexus-textSecondary mb-4">
          Todas as ações realizadas no sistema são registradas no módulo de auditoria:
        </p>
        <ul className="space-y-2 text-nexus-textSecondary">
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Criação, alteração e exclusão de registros</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Login e logout de usuários</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Exportação de relatórios</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Valores antigos e novos de cada alteração</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Endereço IP do usuário</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Data e hora precisas de cada ação</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Escalabilidade</h2>
        <p className="text-nexus-textSecondary mb-4">
          O Nexus foi construído com arquitetura modular e princípios de escalabilidade:
        </p>
        <ul className="space-y-2 text-nexus-textSecondary">
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Módulos independentes e desacoplados</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Separação por domínio de negócio</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Preparado para implantação SaaS</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Fácil integração com serviços externos</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> API REST documentada e consistente</li>
          <li className="flex gap-2"><span className="text-nexus-teal mt-1">&#8226;</span> Testes automatizados garantindo qualidade</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Níveis de usuários</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-nexus-teal">
            <h3 className="font-semibold text-nexus-teal mb-2">Administrador</h3>
            <p className="text-sm text-nexus-textSecondary">Controle total do sistema. Pode gerenciar usuários, empresas, configurações e auditar todas as ações.</p>
          </div>
          <div className="p-4 rounded-lg border border-nexus-teal">
            <h3 className="font-semibold text-nexus-teal mb-2">Gerente</h3>
            <p className="text-sm text-nexus-textSecondary">Controle operacional. Pode gerenciar cadastros, operações e visualizar relatórios gerenciais.</p>
          </div>
          <div className="p-4 rounded-lg border border-nexus-teal">
            <h3 className="font-semibold text-nexus-teal mb-2">Operador</h3>
            <p className="text-sm text-nexus-textSecondary">Pode realizar cadastros e operações do dia a dia, como registrar vendas, compras e movimentações.</p>
          </div>
          <div className="p-4 rounded-lg border border-nexus-border">
            <h3 className="font-semibold text-nexus-text mb-2">Visualizador</h3>
            <p className="text-sm text-nexus-textSecondary">Acesso somente leitura. Pode consultar dados e gerar relatórios, mas não pode criar ou alterar registros.</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Direitos e Deveres</h2>

        <h3 className="text-lg font-medium text-nexus-text mt-6 mb-3">Usuário</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-nexus-graphite border border-nexus-teal">
            <h4 className="font-semibold text-nexus-teal mb-2">Direitos</h4>
            <ul className="space-y-1 text-sm text-nexus-textSecondary">
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Utilizar recursos autorizados</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Atualizar o próprio perfil</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Consultar dados permitidos</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Solicitar suporte</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-nexus-graphite border border-red-400">
            <h4 className="font-semibold text-red-400 mb-2">Deveres</h4>
            <ul className="space-y-1 text-sm text-nexus-textSecondary">
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Não compartilhar a senha</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Não acessar dados indevidos</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Utilizar o sistema corretamente</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Manter dados atualizados</li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-medium text-nexus-text mt-6 mb-3">Administrador</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-nexus-graphite border border-nexus-teal">
            <h4 className="font-semibold text-nexus-teal mb-2">Direitos</h4>
            <ul className="space-y-1 text-sm text-nexus-textSecondary">
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Gerenciar usuários</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Configurar a empresa</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Gerenciar permissões</li>
              <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Visualizar auditoria</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-nexus-graphite border border-red-400">
            <h4 className="font-semibold text-red-400 mb-2">Deveres</h4>
            <ul className="space-y-1 text-sm text-nexus-textSecondary">
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Garantir segurança dos dados</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Gerenciar acessos corretamente</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Proteger dados da empresa</li>
              <li className="flex gap-2"><span className="text-red-500">&#8226;</span> Manter usuários atualizados</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Tecnologias</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-nexus-textSecondary">
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Frontend:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• React 18</li>
              <li>• TypeScript</li>
              <li>• Tailwind CSS</li>
              <li>• Vite</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Backend:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Node.js</li>
              <li>• Express</li>
              <li>• Prisma ORM</li>
              <li>• PostgreSQL</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-nexus-softGray">
            <strong>Segurança:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• JWT</li>
              <li>• bcrypt</li>
              <li>• Helmet</li>
              <li>• Zod</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-nexus-text mb-4">Finalidade do Projeto</h2>
        <p className="text-nexus-textSecondary mb-4">
          O Nexus Business Manager foi criado como um projeto de código aberto com a missão de democratizar
          o acesso a ferramentas profissionais de gestão empresarial.
        </p>
        <p className="text-nexus-textSecondary mb-4">
          Muitas pequenas e médias empresas não conseguem investir em sistemas ERP comerciais que custam
          milhares de reais por mês. Ao mesmo tempo, gerenciar uma empresa com planilhas dispersas e
          ferramentas desconectadas gera ineficiência e perda de oportunidades.
        </p>
        <p className="text-nexus-textSecondary">
          Este projeto oferece uma alternativa completa, profissional e gratuita, permitindo que
          qualquer empresa, independente do seu tamanho, tenha acesso a uma gestão integrada e eficiente.
        </p>
      </section>
    </div>
  );
}
