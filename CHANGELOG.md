# Changelog

Todas as alterações relevantes deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

Este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.3.0] - 2026-06-11

### Added

- FullCalendar 6 completo na pagina de Agenda: visoes mes/semana/dia/lista, arrastar e soltar, redimensionamento, locale pt-BR, modal CRUD, alteracao de status inline, filtro por cliente, tema escuro personalizado.
- Rotas de erro (403, 500, 404) e manutencao agora utilizam o Layout padrao com Sidebar + Navbar para usuarios autenticados.

### Changed

- Paginas admin com `min-h-screen` redundante corrigidas para usar apenas `bg-transparent`, eliminando scroll duplicado dentro do Layout.
- Pagina de Auditoria refatorada para seguir o padrao de design padronizado do sistema, utilizando variaveis CSS e componentes consistentes.

### Fixed

- Todas as paginas do painel administrativo agora seguem o padrao com sidebar e navbar fixa.
- Linting errors no backend: removidos imports nao utilizados e parametros nao utilizados renomeados com prefixo underscore.

## [1.2.0] - 2026-06-11

### Added

- Paginas de erro personalizadas (404, 403, 500) com animacoes e identidade visual.
- Pagina de manutencao com liberacao por IP, temporizador de retorno e configuracao de plano de fundo.
- Preloader animado com bolinhas pulsantes, ativavel/desativavel para admin e site.
- Sidebar estilo AdminLTE4: recolher/abrir com logo completo ou favicon, botoes de alternancia.
- Menu mobile deslizante da esquerda para direita com animacao spring (framer-motion).
- Navbar fixo com backdrop-filter: blur, busca, alternador de tema, calendario e notificacoes.
- Sistema de notificacoes audiovisual: sininho com animacao de balanco e som via Web Audio API.
- Central de notificacoes em dropdown com marcacao individual/todas como lidas.
- Componente UserDropdown: avatar, nome, role, links para perfil/configuracoes, alternador de tema, sair.
- Sistema de permissao modular (PermissaoGuard) com verificacao de cargos por hierarquia.
- Sistema de acesso supervisionado (backend) com aprovacao/rejeicao de acoes.
- Backend modulo maintenance com rotas GET/PUT para configuracao de manutencao.
- Backend modulo settings com sistema de chave-valor (system_settings).
- Backend modulo supervision com rotas de acoes pendentes/aprovacao/rejeicao.
- Migracao 021: tabelas system_settings, supervised_action_logs, modules, module_permissions.
- Integracao SweetAlert2 para toasts e confirmacoes em todo o sistema.
- CSS padronizado: .card-padrao, .input-padrao, .label-padrao, .select-padrao.
- Animacao do sininho @keyframes sacudir-sininho.
- Variavel CSS --nexus-header-bg para tema dark/light.

### Changed

- App.tsx: adicionadas rotas /403, /500, /maintenance, catch-all Error404.
- Layout: integrado Preloader, Sidebar com recolhimento, Header com notificacoes e perfil.
- Sidebar: reestruturada com submenus aninhados (Cadastros, Movimentacoes, Administracao, Comercial).
- Header: refeito com NotificacaoSininho, UserDropdown, alternador de tema, busca e calendario.
- index.css: adicionados estilos para sidebar recolhida, preloader, notificacoes, dropdowns.
- backend app.ts: registrados modulos maintenance, settings, supervision.

### Fixed

- Preloader removia classe .preloader-dot solta.
- Sidebar mobile nao tinha animacao suave.
- Notificacoes sem som e sem feedback visual.
- Ausencia de paginas de erro personalizadas.
- Sidebar sem suporte a recolhimento.
- Layout sem preloader configurable.
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
