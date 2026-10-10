# Análise de lacunas — Nexus Business Manager × PROMPT MESTRE DEFINITIVO

> Data: 2026-10-10. Método: leitura integral do PROMPT MESTRE (67 seções, 2.372 linhas) e
> verificação do código real por grep/leitura de arquivos, execução de typecheck, testes de
> API (vitest) e prova de navegador (`tools/shoot-tabs.cjs`). Nenhuma linha abaixo é
> presunção: ou tem evidência em arquivo, ou está marcado como não verificado.

## Como ler o status

- **PRONTO** — implementado, com rota/tela reais e validado por teste ou prova.
- **PARCIAL** — existe e funciona, mas não cobre tudo que a seção pede.
- **PENDENTE** — a seção exige e não há implementação.
- **N/A** — não aplicável ao escopo confirmado do produto (justificado na tabela).

## 1. Veredito por seção

| Seção | Tema | Status | Evidência / o que falta |
|---|---|---|---|
| 1–2 | Papel, missão, repositório de referência | PRONTO | Repo de referência confirmado vazio; reconstrução do zero (`docs/ANALISE.md`) |
| 3 | Análise técnica obrigatória | PRONTO | `docs/ANALISE.md` com fontes inspecionadas e evidências |
| 4 | Problemas a não reproduzir | PRONTO | `docs/adr/0001..0003`; contexto de empresa validado no backend |
| 5 | Resolução de conflitos análise × execução | PRONTO | Decisões registradas nos ADRs e no CHANGELOG |
| 6 | Tecnologias preservadas | PRONTO | Node+TS+Fastify 5+Zod+Prisma+MySQL; React+Vite+AdminLTE 4+Tailwind |
| 7 | Reconstrução independente | PRONTO | Código próprio, sem herança do produto antigo |
| 8 | Banco, migrations, integridade | PRONTO | MySQL `localhost:3306`, banco `nexusbusinessmanager`, migrations reprodutíveis, FKs e índices no schema |
| 9 | Arquitetura do sistema | PRONTO | Monorepo `apps/api` + `apps/web`, módulos por domínio |
| 10–16 | Identidade, logo, paleta, dark/light, animações | PRONTO | `docs/design/palette.md` (cores extraídas da logo), `ThemeContext`, `prefers-reduced-motion` |
| 17–21 | Landing pública, header, hambúrguer, rodapé, responsividade | PRONTO | `pages/Landing.tsx`, `AdminShell` com modo trilha e gaveta, prova `tools/verify-sidebar.cjs` (45 checagens) |
| 22 | KPI cards, tendências, indicadores | PRONTO | `.kpi`, contadores de status por página, distribuição `nx-distrib` |
| 23 | Dashboard empresarial | PRONTO | `/app` com Visão Geral / Metas & Indicadores / Alertas, dados agregados no servidor |
| 24 | Tabelas e listagens | PRONTO | `.table` padronizada, colunas com largura dedicada, scroll interno com cabeçalho fixo |
| 25 | Paginação global | PRONTO | `components/Pagination.tsx` + `usePaginacaoLocal`, 10/25/50/100, provada em todas as abas |
| 26 | **Summernote** | **PENDENTE** | Pacote ausente em `apps/web/package.json`; nenhum editor de texto rico. Campos de texto longo hoje são `<textarea>` |
| 27 | FullCalendar 6 | PRONTO | `@fullcalendar/*` 6.1.21 em `pages/Agenda.tsx`; recorrência real expandida no servidor (`agenda.service.ts:91-131`) |
| 28–29 | Toastr e SweetAlert2 centralizados | PRONTO | `lib/notify.ts`, `lib/confirm.ts`; zero chamadas a `alert/confirm/prompt` nativos (grep confirmado) |
| 30–32 | Páginas de erro, loading, estados | PRONTO | `pages/errors.tsx`, `components/StateView.tsx` (loading/erro/vazio), rotas protegidas |
| 33–36 | Autenticação, RBAC, multiempresa, auditoria | PRONTO | JWT + refresh, `lib/rbac.ts`, isolamento por `companyId` testado, trilha auditável com leitura humana (`lib/auditLabels.ts`) |
| 37 | Módulos do produto | PARCIAL | Existem Dashboard, Clientes, Fornecedores, Produtos/Estoque, Compras, Vendas, Financeiro, CRM, Agenda, Relatórios (API), Usuários, Empresas, Auditoria, Configurações. **Faltam**: Notificações, Backup, Manutenção, Supervisão, Sugestões, Planos, Assinaturas, Faturas. "Nexus AI" não é escopo confirmado (seção 37 proíbe módulo só para preencher menu) |
| 38 | Estoque | PRONTO | Entradas/saídas/ajustes transacionais, saldo, mínimo, histórico, integração com compras e vendas |
| 39 | Vendas | PRONTO | Itens, totais no servidor, baixa de estoque, cancelamento com estorno, testes dedicados |
| 40 | Compras | PRONTO | Pedido com itens, entrada de estoque ao receber, estorno vigiado, unicidade de movimentação |
| 41 | Financeiro | PRONTO | `Decimal(14,2)`, categorias, vencimentos, status, resumo mensal; sem aritmética de ponto flutuante no cálculo |
| 42 | CRM | PRONTO | Leads com responsável, estágio, valor, conversão em cliente, histórico de interações legível |
| 43 | **Relatórios e exportações** | **PARCIAL** | 8 rotas de relatório agregadas no servidor + exportação **só CSV** gerada no cliente (`lib/csv.ts`). **Faltam PDF e Excel** e uma tela própria de relatórios com período/filtros |
| 44 | **Notificações** | **PENDENTE** | Sem model, sem rota, sem sino no cabeçalho. Toastr é aviso temporário e não substitui (a própria seção 44 exige a distinção) |
| 45 | **Backup** | **PENDENTE** | Nenhuma rotina, tabela, permissão ou tela |
| 46 | **SaaS: planos, assinaturas, faturas** | **PENDENTE** | Nenhum model de plano/assinatura/fatura; sem limites por plano |
| 47 | Segurança do backend | PRONTO | `@fastify/helmet`, CORS restritivo, `@fastify/rate-limit`, Zod em toda entrada, erros centralizados sem stack trace, JWT com rotação de refresh |
| 48 | **Uploads e arquivos** | **PENDENTE** | Sem `@fastify/multipart`, sem validação de MIME/extensão/tamanho, sem política de acesso |
| 49–50 | Design system e componentes globais | PRONTO | Tokens em `styles/*`, `Modal`, `Tabs`, `Pagination`, `StateView`, KPI, badges, tabelas, formulários |
| 51 | Acessibilidade | PRONTO | `role="tablist"`, `aria-label`, foco visível, `aria-live` na paginação, contraste do tema escuro, movimento reduzido |
| 52 | **SEO e páginas públicas** | **PARCIAL** | Meta description + OpenGraph fixos em `index.html`. **Faltam** `robots.txt`, `sitemap.xml` e edição de SEO pelo admin |
| 53 | Performance | PRONTO | Paginação no servidor, consultas agregadas (groupBy), lazy loading das rotas administrativas |
| 54 | Estados e integração entre camadas | PRONTO | Loading/erro/vazio/sem-permissão em todas as telas; sem mock de produção |
| 55 | **Documentação e README** | **PARCIAL** | README com 6 telas reais, instalação, variáveis, módulos. **Falta** documentar os módulos novos e declarar limitações reais (Summernote, backup, SaaS) conforme forem concluídos |
| 56 | Testes | PARCIAL | 12 arquivos / 62 testes de API cobrindo auth, RBAC, multiempresa, CRUDs, paginação, agenda. **Faltam** testes dos módulos novos e testes de frontend |
| 57 | **CI/CD e qualidade** | **PENDENTE** | Sem `.github/workflows`, sem ESLint, sem Prettier. Typecheck/teste/build só rodam localmente |
| 58 | **UTF-8 sem BOM** | **PARCIAL** | `.editorconfig` correto e o gravador `tools/wf.cjs` remove BOM, mas não há **guarda automática** que impeça um arquivo com BOM de entrar |
| 59 | Git, commits e push | PARCIAL | Histórico de commits humanizados em pt-BR; remoto configurado, mas o lote atual ainda não foi enviado |
| 60–62 | Fases, validação por etapa, coerência design × função | PRONTO | Validação executada a cada etapa (typecheck + testes + prova de navegador + screenshots) |
| 63 | Contra duplicação | PRONTO | Componentes e serviços únicos (`Pagination`, `Tabs`, `Modal`, `auditLabels`) |
| 64 | Contra implementação falsa | PRONTO | Nenhuma tela sem função; integrações não configuradas devem ser declaradas como tal (vale para gateways) |
| 65 | Critérios de aceitação final | PARCIAL | Faltam Summernote, notificações, backup, SaaS, CI e exports PDF/Excel |
| 66 | **Relatório final** | **PENDENTE** | Ainda não emitido (17 itens exigidos) |
| 67 | Comando final de execução | EM CURSO | Este documento é o mapa para fechar o que falta |

## 2. Correção de uma afirmação anterior

Em resposta anterior afirmei que a **recorrência da Agenda não existia**. Isso está **errado**: o
enum `AgendaRecurrence` é usado de fato na expansão de eventos em
`apps/api/src/modules/agenda/agenda.service.ts:91-131` (diária/semanal/mensal até a data-limite),
com validação em `agenda.schemas.ts`, teste em `apps/api/test/agenda.test.ts:295-337` e formulário
"Repetir / até" em `apps/web/src/pages/Agenda.tsx:511-546`. O que falta é apenas a prova visual da
Agenda (`tools/shoot-agenda.cjs` já existe e precisa ser executado/atualizado).

## 3. Decisões de escopo (registradas pela regra da seção 5.5)

1. **Gateways de pagamento**: a seção 46 proíbe inventar integração de pagamento e simular cobrança.
   Entrega correta = cadastro de credenciais por empresa/ambiente com criptografia em repouso,
   teste de conexão real quando a chave existir, e estado explícito "não configurado" quando não
   existir. Nada de botão que finge pagar.
2. **Supervisão / Sugestões / Nexus AI**: sem definição funcional confirmada; criar tela seria
   violar a seção 37 ("não crie módulos somente para preencher menus") e a 64. Ficam fora até
   haver requisito real.
3. **Nexus AI**: idem — não há especificação de comportamento, então não é implementado como fachada.
4. **E-mail transacional**: envio real depende de SMTP configurado. O sistema deve guardar o template,
   renderizar com variáveis e registrar a tentativa; sem SMTP configurado, declara-se a dependência.

## 4. Ordem de execução restante

| # | Entrega | Seções | Fase |
|---|---|---|---|
| 1 | Notificações persistentes (modelos, API, sino, tela de preferências) | 44, 37 | 7 |
| 2 | Configurações da empresa + preferências do usuário | 37 | 7 |
| 3 | Backup administrativo com auditoria e retenção | 45 | 7 |
| 4 | Modo manutenção com mensagem e token de bypass | 37 | 7 |
| 5 | CMS da landing (cores, banners, FAQs, depoimentos, LGPD, WhatsApp) | 37, 52 | 7 |
| 6 | SEO público (robots, sitemap, metadados editáveis) | 52 | 7 |
| 7 | Templates de e-mail com variáveis + cron jobs com painel de status | 37 | 7 |
| 8 | Gateways (criptografia de credenciais, sandbox/produção, sem cobrança falsa) | 46, 64 | 7 |
| 9 | Upload seguro (multipart, MIME, tamanho, path traversal) + Summernote | 26, 48 | 6/7 |
| 10 | Planos, assinaturas, faturas e limites reais aplicados no backend | 46 | 8 |
| 11 | Relatórios: tela própria + exportação PDF e Excel | 43 | 6 |
| 12 | CI (typecheck, lint, testes, build), ESLint e guarda de BOM | 57, 58 | 9 |
| 13 | Prova da Agenda no navegador | 61 | 9 |
| 14 | README final, relatório final (16 itens) e push | 55, 59, 66 | 10 |
