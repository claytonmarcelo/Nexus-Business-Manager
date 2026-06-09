# Changelog

Todas as alterações relevantes deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

Este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2026-06-09

### Added

- Area Comercial: pagina de Planos com upgrade/downgrade.
- Area Comercial: pagina Minha Assinatura com detalhes do plano.
- Area Comercial: pagina de Faturas com historico de pagamentos.
- Pagina de Status do Sistema com health check.
- Backend modulo subscription (rotas /api/subscription/*).
- Sidebar: icones para Planos, Assinatura e Status.

### Changed

- console.error substituido por showToast em 11 paginas (19 ocorrencias).
- Ortografia pt-BR corrigida em todas as paginas visiveis ao usuario.
- Sidebar: labels duplicadas removidas, acentos corrigidos.
- Backend .env.example: DB_PASSWORD corrigido para DB_PASS.
- CHANGELOG.md e docs/roadmap.md atualizados.

### Fixed

- Labels duplicadas na Sidebar (Importacao, Backup, Logs apareciam 2x).
- Acentos em Sugestoes, Notificacoes, Importacao, Usuarios, Configuracoes.
- Erro ortografico "Acai" → "Acao" na pagina de Logs.
- console.error silencioso substituido por Toast com feedback visual.

## [1.0.0] - 2026-06-06

### Added

- Sistema ERP Nexus Business Manager.
- Dashboard principal com métricas e indicadores.
- CRM de Clientes com cadastro e gestão.
- Controle de Estoque com alertas de baixo estoque.
- Financeiro com controle de entradas e saídas.
- Relatórios detalhados de vendas, estoque e financeiro.
- Sistema de autenticação JWT seguro.
- Controle de usuários com roles (admin, manager, operator, viewer).
- Auditoria de ações do sistema.
- Configurações do sistema.
- Nexus AI - Assistente inteligente integrado.
- Sistema de sugestões para melhorias.
- Agenda de compromissos.
- Sistema de notificações.
- Gestão de fornecedores.
- Gestão de produtos.
- Controle de compras.
- Controle de vendas.
- Tema claro oficial do sistema.
- Seletor de tema (Escuro, Claro, Automático).
- Sistema de avatares para usuários.
- Cache local para performance.
- Busca global no sistema.

### Changed

- Atualização de componentes para suportar temas claro e escuro.
- Melhoria na responsividade do sistema.

### Fixed

- Correções iniciais de estabilidade.
- Correção de conflitos de cores em modo claro.
- Ajuste de declarações TypeScript para módulos CSS.

### Security

- Proteções básicas de autenticação JWT.
- Validação de tipos de arquivos para upload de avatares.
- Limite de tamanho para uploads (5MB).
- Sanitização de inputs em formulários.
