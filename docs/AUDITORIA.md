# AUDITORIA — Preparação para uso comercial (Fase 0)

Data: 2026-10-11 · Escopo: código real do repositório, working tree de 11/10-11 · Método: leitura de
todos os 63 arquivos TS de `apps/api/src` (246 operações Prisma + 3 `$queryRaw`), das 16 rotas de
módulo, do schema Prisma, do seed, da suíte de testes, do `apps/web` e da raiz do repositório; checagens
diretas de codificação (`BOM/CRLF`), `npm audit` e `git ls-files`. **Nenhum arquivo de código foi
alterado nesta fase.** Cada achado tem severidade — **CRÍTICO / ALTO / MÉDIO / BAIXO** — e localização `arquivo:linha`.

> Regra de ouro da Fase 0 aplicada: nada aqui vem do README. Onde o README diz algo, o código foi aberto
> e conferido; onde o prompt externo de auditoria afirma algo sobre o projeto, a afirmação foi testada
> contra o repositório (seção H) — e a maioria não se sustenta: o brief descreve outro software.

---

## Sumário de severidades

| Severidade | Qtd | Onde bate |
|---|---|---|
| CRÍTICO | 4 (+1 de processo) | escalada de privilégio por papel ×2, escrita cross-tenant, corrida de estoque; + suíte de testes gravando no banco de dev |
| ALTO | 14 | escopo global do CMS/cron, seed com senha fixa, token de reset exposto fora de produção, financeiro solto das vendas, float em dinheiro, npm audit, ausência de CI/cobertura, lote sem commit, bundle sem split |
| MÉDIO | 12 | rate-limit local, trustProxy, reuso de refresh, datas UTC×local, deletes sem guarda, relatórios carregando tabelas inteiras |
| BAIXO | 12 | enumeração por tempo, PII na auditoria, dependências mortas, documentação desatualizada, TOCTOU com UUID |

---

## A. Mapa real dos módulos (código × README)

Backend Fastify 5 + Prisma 6 + MySQL, monorepo npm workspaces (`apps/api`, `apps/web`) — **não** o
`backend/` com `mysql2` descrito no brief externo. 16 módulos registrados em `src/app.ts:90-105`:
auth, companies, users, audit, clients, products, sales, purchases, finance, crm, agenda, reports,
notifications, cms, cron, health. `PaymentGateway` e `EmailTemplate` existem **só como tabela** (sem
service nem rota) — o README diz isso.

Verificações numéricas do README contra o código:

| Claim do README | Veredito | Evidência |
|---|---|---|
| 27 models, 15 enums | CONFIRMADO | `grep -c '^model ' schema.prisma` = 27; `^enum ` = 15 |
| 12 migrations | CONFIRMADO | `apps/api/prisma/migrations/` (não 24 SQL em `backend/`) |
| Clientes 5 / Vendas 4 / Financeiro 9 / CMS 14 rotas | CONFIRMADO | contagem de registradoras nos `*.routes.ts` |
| Auth "8 rotas" | DIVERGÊNCIA MENOR | `auth.routes.ts` tem 10 registradoras; metodologia de contagem |
| 16 arquivos · 113 testes | CONFIRMADO **no working tree** | HEAD rastreado tem 15/102 — o lote cron está sem commit (ver G3) |
| Exportação CSV | CONFIRMADO, com nuance | gerada no navegador (`apps/web/src/lib/csv.ts`, botões em Vendas/Financeiro/Clientes/Compras); não é endpoint da API |
| "Sem Dockerfile nem pipeline" | CONFIRMADO | não existe `.github/`, nem Docker, nem CI de nenhuma espécie |

---

## B. Isolamento multiempresa

O esqueleto é honesto: `company-context.ts:14-31` resolve a empresa do token e **revalida o vínculo
`CompanyUser` no banco a cada requisição**; todas as listagens/leituras de tenant filtram por `companyId`
(0 exceções em ~249 operações revisadas); `switchCompany` exige o vínculo (`auth.service.ts:150-163`);
IDs vindos da requisição (`clientId`, `productId`, `saleId`, `leadId`…) são pré-checados com
`findFirst { id, companyId }` (`sales.service.ts:70-77`, `purchases.service.ts:117-123`,
`finance.service.ts:111-125`, `agenda.service.ts:211-220`). As `$queryRaw` existentes são parametrizadas
e filtram empresa (`products.service.ts:100-104, 221-224`).

Onde o isolamento falha é na **escrita autorizada por papel**, não no filtro de leitura:

- **[CRÍTICO] `users.routes.ts:37-43` + `users.service.ts:53-55` — ADMIN cria OWNER.**
  `POST /users` exige só `user:write` (papel ADMIN possui — `rbac.ts:11`) e grava `role: input.role` sem
  qualquer guarda; `addMemberSchema` aceita o enum completo, inclusive `OWNER`
  (`users.schemas.ts:11-16`). Um ADMIN adiciona a si mesmo (ou a um laranja) como OWNER da empresa e
  herda `*` — incluindo o caminho para o alcance global do CMS (ver B-B). O PATCH de papel tem a guarda
  ("Apenas o proprietário transfere propriedade", `users.routes.ts:51`); o POST não tem nenhuma.
- **[CRÍTICO] `users.routes.ts:45-52` + `users.service.ts:61-76` — ADMIN rebaixa o OWNER existente.**
  A guarda só cobre o **novo** valor `OWNER` e o e-mail do super admin
  (`SUPER_ADMIN_EMAIL`, `users.service.ts:68-70`). Nada impede `PATCH /users/:dono/role {role:"STAFF"}`
  feito por um ADMIN: o proprietário perde a empresa para quem deveria servir.
- **[CRÍTICO] `notifications.routes.ts:59` + `notifications.schemas.ts:24-26` — varredura cross-tenant.**
  `POST /notifications/scan` aceita `companyId` livre no corpo
  (`varreduraEmpresa(q.companyId ?? ctx.companyId)`) sem verificar que o caller tem vínculo com essa
  empresa. Qualquer OWNER/ADMIN varre e grava avisos de contas vencidas na empresa de terceiro.
- **[ALTO] O CMS da vitrine é global com chave por papel de qualquer tenant.**
  `LandingConfig`/`LandingItem`/`LegalDocument` não têm `companyId` (por design: a vitrine é uma só), mas
  o guard é `content:write` = **OWNER de qualquer empresa** (`rbac.ts:9`), e o auto-cadastro
  (`auth.service.ts:203-231`) torna todo cadastrado OWNER da própria empresa. Consequência comercial:
  qualquer usuário que crie uma conta pode reescrever a página pública da plataforma, os textos legais e
  fechar a plataforma inteira em modo manutenção. É o mesmo balcão que deveria ser só do super admin.
- **[ALTO] `cron.routes.ts:21-54` — jobs de sistema manipulados por qualquer ADMIN.**
  `settings:write` é de OWNER **e ADMIN** de qualquer empresa; com ele se pausa/reativa a varredura de
  todos os tenants e se dispara `varreduraGlobal`, cuja resposta traz contagem agregada da plataforma
  ("N avisos em M empresas", `cron.handlers.ts:37`).
- **[MÉDIO] `users.service.ts:120-125` — revogar sessão vaza entre empresas.**
  O `findFirst` da sessão exige vínculo do alvo com **qualquer** empresa em comum com o caller; o update
  final é por `{ id: sessionId }` puro. Compartilhando uma empresa, um ADMIN derruba sessões do usuário
  nas outras empresas dele.
- **[MÉDIO] Agregações de sistema expostas a requisitante de tenant** — `varreduraGlobal`
  (`notifications.service.ts:242-247`) e os handlers cron iteram todas as empresas: correto como job,
  errado como rota chamada por inquilino (mesmo achado do item anterior, raiz diferente).
- **[BAIXO] TOCTOU generalizado**: `update`/`delete` por `{ id }` puro após um `findFirst { id, companyId }`
  (`clients.service.ts:46-47`, `finance.service.ts:167,176-178`, `crm.service.ts:123,151`,
  `agenda.service.ts:275-295` …). Sem exploração prática com UUID, mas `updateMany({ where: { id, companyId } })`
  fecharia a classe inteira por construção.
- **[BAIXO] `audit.routes.ts:28`**: `AuditLog.companyId` é nullable e falhas de login globais gravam sem
  empresa — ficam invisíveis para qualquer tenant (consequência do modelo, não bug).

Super admin: implementado **sem flag no token** — e-mail fixo (`passwordPolicy.ts:9`) + upsert como OWNER
em toda empresa no seed (`seed.ts:44-52`) e em todo `POST /companies` (`companies.service.ts:36-43`).
Funciona, mas é um caso especial espalhado em 3 lugares; a Fase 1 pede a separação explícita
plataforma × empresa (ver recomendação R1).

---

## C. Endpoints sem autenticação ou sem checagem de permissão

Não há hook global de auth — a proteção é `preHandler: [app.authenticate]` rota a rota
(`plugins/auth.ts:19-32`). Todas as rotas de negócio conferidas têm authenticate; a maioria tem
`assertPermission`. Lista completa do que dispensa login:

| Rota | Onde | Julgamento |
|---|---|---|
| GET /api/health | health.routes.ts:5 | legítimo; expõe `db: up/down` [BAIXO] |
| GET /api/public/landing · /api/public/legal/:kind | cms.routes.ts:41,43 | legítimo (só devolve publicado) |
| POST /api/public/bypass | cms.routes.ts:52-61 | oráculo sim/não, 30/min, token 9 bytes ~2^72, `timingSafe` — aceitável |
| POST /api/auth/login · register · forgot · reset · refresh · logout | auth.routes.ts:18-49 | legítimos, com rate-limit próprio |

Autenticadas sem `assertPermission` (propositais e corretos): bootstrap `POST /companies`, listagem das
próprias empresas, `settings/opcoes` (listas estáticas), `/auth/me`, `/change-password`,
`/switch-company`, notificações em escopo `userId+cid`, `GET /reports/overview` (filtrado bloco a bloco
por `can()`). Risco de processo: **[MÉDIO] rota nova esquecida fica aberta por default** — só um gate
estrutural (hook global com allowlist, como o de manutenção já faz) elimina essa classe.

---

## D. Valores padrão inseguros e segredos

- **[ALTO] `auth.service.ts:255` + `auth.routes.ts:35` — token de reset no HTTP fora de produção.**
  `return isProd ? { ok: true } : { ok: true, devToken: token }` e a rota monta
  "Código gerado (modo desenvolvimento): <token>" na resposta. Em produção o gate desliga, mas qualquer
  instância de homologação/dev exposta permite resetar a senha de **qualquer** conta — inclusive a do
  super admin, que não tem exceção no fluxo de recuperação. Verificado por leitura direta do código.
- **[ALTO] `seed.ts:22-23` — conta de desenvolvimento com senha hardcoded e OWNER**, criada
  incondicionalmente (sem gate de `NODE_ENV`). Rodar o seed num ambiente comercial entrega uma porta
  aberta documentada no próprio repositório. (O admin global, este sim, exige `SEED_ADMIN_PASSWORD` e o
  seed falha cedo sem ele — `seed.ts:14-19`. Correto.)
- **[BAIXO] `seed.ts:73` imprime a senha do admin no console** — vaza para log de CI quando houver pipeline.
- **[MÉDIO] Rate-limit in-memory** (`security.ts:19-23`, sem `store`): multi-processo/multi-instância
  multiplica os limites e a proteção de login não é compartilhada. O brief pede Redis — não há Redis.
- **[MÉDIO] `trustProxy` não configurado** (`app.ts:27`): atrás de proxy reverso, `req.ip` vira o IP do
  proxy — rate-limit vira global e o IP da auditoria/bypass de manutenção mente.
- **[MÉDIO] Sem detecção de reuso de refresh rotacionado** (`auth.service.ts:119-121`): token roubado e
  rotacionado rende só 401 para o ladrão; a família não é revogada (roubo passa despercebido).
- **[MÉDIO] `forgotPassword` revoga todas as sessões do usuário** (`auth.service.ts:253`) sem prova de
  posse — DoS de logout remoto contra qualquer e-mail conhecido (limitado a 5/min por IP).
- **[BAIXO] Enumeração de usuário por tempo** (login sem bcrypt quando o e-mail não existe,
  `auth.service.ts:84-98`); **[BAIXO] política de senha fraca por padrão** (8+ com 1 maiúscula e 1
  especial, `passwordPolicy.ts:11-18` — é a regra de acesso DEFINIDA pelo dono do produto, não mudar sem
  ordem); sem bloqueio por tentativas falhas além do rate-limit; **[BAIXO] CSP só em produção**
  (`security.ts:8-11`); body limit = default 1 MB do Fastify (não configurado).
- **[ALTO] `npm audit`: 13 vulnerabilidades (4 críticas, 4 altas, 5 moderadas)** — diretas:
  `@fastify/jwt <=9.1.0` (crítica, com `fast-jwt` transitiva), `vitest`/`vite` (dev-only), `prisma`
  (alta), `react-router-dom` (moderada). Sem fix automático indolor (`fixAvailable` não reportado).
- Positivo verificado: **nenhum segredo hardcoded em código rastreado**; `.env` ignorado; `CREDENCIAIS.md`
  e `tools/senha-admin.local.cjs` fora do git (confirmado por `git ls-files`/`git check-ignore`); JWT
  secrets sem default — a app não sobe sem segredo (`env.ts:10-11`); logs não gravam senha/token
  (únicos `log.*`: boot/shutdown e jobs); bcrypt rounds=12; refresh opaco persistido como HMAC.

---

## E. Integridade de negócio (transações, estoque, dinheiro, datas)

As 10 chamadas `prisma.$transaction` existentes: `users:41`, `companies:30`, `sales:96,149`,
`purchases:133,172`, `auth:215,273,362`, `products:187`. O problema não é a ausência da transação — é o
padrão **read-modify-write fora/unlockado dentro dela**:

- **[CRÍTICO] Estoque: corrida de oversell em venda.** `sales.service.ts:75-115` (criação): produtos
  lidos fora da tx (linha 75), validação de saldo (88-94) e gravação de **valor absoluto** derivado da
  leitura (`stockQuantity: Number(prod.stockQuantity) - i.quantity`, linha 115). `:149-173` (confirmação):
  a venda é lida fora da tx (143) e o status **não é reconfereado com lock dentro dela** — dois "confirmar"
  simultâneos passam os dois e baixam estoque duas vezes. Não existe `FOR UPDATE`, `updateMany` condicional
  por `stockQuantity >=`, nem decremento atômico em lugar algum do repo (grep confirmado). Os testes de
  venda/compra provam o fluxo **sequencial** (`app.inject`); concorrência nunca foi exercida.
- **[ALTO] Mesma classe em movimentação manual** (`products.service.ts:173-191` — guarda de saldo antes
  da tx, `newStock` calculado de leitura velha) **e em recebimento/estorno de compra**
  (`purchases.service.ts:116-196`), incluindo `costPrice` gravado por último-escritor-vence.
- **[ALTO] Venda não conversa com financeiro.** Nenhum caminho de venda/compra cria lançamento de contas a
  receber/pagar (grep: `financeEntry` só é tocado por finance/reports/notifications/cron). Confirmar venda
  não gera receita a receber; cancelar não reverte nada. Não é corrida — é feature ausente (Fase 3 do
  plano; o financeiro hoje é 100% manual e pode divergir silenciosamente).
- **[ALTO] Dinheiro em `Number()` no JS.** O schema é limpo (tudo `Decimal`, zero `Float` em valores —
  conferido campo a campo), mas a aritmética converte: `sales.schemas.ts:12-13`/`finance.schemas.ts:26`
  coagem a float; `sales.service.ts:82-83` e `purchases.service.ts:128-129` arredondam linha a linha em
  float; `finance.service.ts:197-203` faz saldo como subtração de floats; o pior está em
  `reports.service.ts:13-20,534,669-675` — acumulação float **antes** do arredondamento único final, que
  pode fechar centavos diferente do `_sum` SQL do resumo. Parcelamento não existe (ausência confirmada).
- **[MÉDIO] Meia-noite UTC × local convivendo.** `FinanceEntry.dueDate` é `@db.Date`; relatórios usam
  início de dia UTC (`reports.service.ts:34-38`), a varredura de avisos e o cron usam local
  (`notifications.service.ts:210-211`, `cron.handlers.ts:92-93`). Em UTC-3, um lançamento pode estar vencido
  para o sino e não estar para o relatório. `Company.timezone` existe mas nunca é consultado.
- **[MÉDIO] `finance.service.ts:72` exclui categoria com histórico** — `onDelete: SetNull` silencia a
  categoria de lançamentos passados. Cadastros-core (cliente/fornecedor/produto) são soft-delete corretos.
- **[MÉDIO] Relatórios carregam tabelas inteiras em JS** (`reports.service.ts:296,479,485,623`) — é o
  design documentado de agregação no servidor, mas é o risco de memória/latência que cresce com o cliente.
- **[MÉDIO] Duas duplas de escrita sem tx nenhuma**: criar produto + movimento inicial
  (`products.service.ts:127-132`) e conversão de lead em cliente (`crm.service.ts:144-151`) — crash no meio
  órfã registro.
- **[MÉDIO] Estoque negativo não é barrado no banco**: as guardas são JS fora da unidade atômica
  (`sales.service.ts:90,154`, `products.service.ts:180`, `purchases.service.ts:190`), sem `CHECK` no MySQL
  e sem política configurável por empresa (`Company` não tem campo de política de estoque).
- **[BAIXO] `products.service.ts:100-105` — filtro de estoque baixo com `LIMIT 500`** silencioso: do
  produto 501 em diante ele para de listar. **[BAIXO] recorrência de agenda cruza DST** (aritmética local,
  `agenda.service.ts:91-107` — latente sem DST no Brasil hoje). **[BAIXO] cron é wall-clock local por
  decisão documentada** — frágil se o servidor mudar de fuso.
- Positivo: paginação no servidor com teto de 100 em todas as listas de rota
  (`lib/pagination.ts:4-8`); fan-out de notificação deliberadamente fora da tx de negócio com o motivo
  escrito no código (`notifications.service.ts:20-21,110-117`).

---

## F. Cobertura de testes real

- A suíte é honesta e ativa: **16 arquivos, 113 casos** (contagem por `it()`; um dos agentes contou 114
  por incluir um `test()` de alias — mesma coisa), **zero `.skip/.only/.todo`**. Roda contra MySQL real.
- **[ALTO] Cobertura nunca foi medida**: `@vitest/coverage-v8` não está instalado, `vitest.config.ts` não
  define thresholds, nenhum script roda coverage. A meta de 70% do brief parte do zero conhecido? Não se
  sabe. É "cobertura real não medida".
- **[ALTO] Buracos de integração**: `users` (criar membro, permissions, sessions/revoke — só cai de
  raspão em settings.test.ts), `reports` (7 dos 8 endpoints nunca chamados), `audit` (filtros/paginação),
  `companies` (sem arquivo próprio), `health` (uma asserção incidental). Frontend: **zero testes** — nem
  vitest configurado em `apps/web`.
- **[CRÍTICO de processo] Os testes só rodam no MySQL do dev**: `helpers.ts` grava e apaga dados no mesmo
  banco da aplicação (`DATABASE_URL` do `.env` aponta para `nexusbusinessmanager`), com pool `singleFork`
  serial declarado no config. Sem container/serviço isolado, a suíte não é portável nem CI-ready.
- **[ALTO] Nenhuma CI existe** (não há `.github/`, nem `.gitlab-ci.yml`, nem qualquer `.yml` de pipeline):
  build, typecheck, testes e audit dependem de disciplina manual. As 33 provas puppeteer em `tools/` são
  ricas (ex.: `verify-rotinas.cjs` 37 checagens, `verify-cms.cjs` 115) mas exigem servidores de dev
  ligados, Chrome em caminho Windows fixo e conta admin real — não substituem pipeline.
- **[ALTO] `tools/patch-schema-*.cjs`**: quatro scripts que mutavam `schema.prisma` in-place na gênese do
  projeto — risco histórico de divergência schema×migration; devem ser arquivados com nota.

---

## G. Arquivos soltos e inconsistências do repositório

1. Raiz **limpa**: sem `.py`, sem `estrutura.txt`, sem `README.en.backup.md`, sem `mobile/`; o
   `package-lock.json` da raiz é o lockfile legítimo dos workspaces. Nenhum `*.log/*.tmp/.DS_Store/dist/`
   rastreado (322 arquivos no git).
2. **[BAIXO] `docs/ANALISE-LACUNAS.md` desatualizado** (datado 10/10): linha 44 marca Notificações como
   PENDENTE quando o módulo está completo; linha 56 fala em 12 arquivos/62 testes contra os 16/113 reais.
3. **[ALTO] Lote "rotinas agendadas" inteiro fora do git** (consequência da regra do dono do projeto de
   commitar ao final): `src/modules/cron/`, `cron.test.ts`, `pages/Rotinas.tsx`, `lib/cronApi.ts`,
   `tools/verify-rotinas.cjs`, 6 prints e mais 17 arquivos modificados estão só no working tree. O HEAD
   commitado **não builda o seed atual** (seed.ts importa `cron.handlers`). Entre agora e o commit final,
   qualquer perda de disco perde a etapa inteira.
4. **[BAIXO] Dependências mortas confirmadas no código**: `jquery`, `sweetalert2` e `@types/jquery` sem
   um único import em `src/` (o README já admite); `admin-lte` usado só pelo CSS.
5. **[ALTO] Bundle**: zero `React.lazy`, zero `manualChunks`; chunk único de **858 kB JS** (+387 kB CSS) —
   o "1,6 MB" do brief não é verificável, mas o alerta do Vite (>500 kB) é real e FullCalendar é o maior
   contribuinte. Code-splitting por rota é ganho fácil.
6. Codificação: **0 BOM, 0 CRLF** nos 219 textos rastreados; `.editorconfig` e `.gitattributes` (eol=lf)
   já existem — a regra 9 do brief está satisfeita hoje. Nota: `core.autocrlf=true` no git local do dev é
   atenuado pelo `.gitattributes`, não é risco ativo.

---

## H. Premissas do prompt externo × este repositório

O brief de auditoria descreve outro software. Conferidas uma a uma:

| Premissa do brief | Veredito |
|---|---|
| mysql2 com SQL direto; Prisma só na auth | **FALSO** — Prisma é a camada única (ADR-0001); `mysql2` não existe no repo; 2 `$queryRaw` pontuais e documentadas |
| 24 migrations SQL em `backend/database/migrations/` | **FALSO** — 12 migrations Prisma em `apps/api/prisma/migrations/`; não existe `backend/` |
| pasta `mobile/` citada | **FALSO** — não existe nem é mencionada |
| demo `admin@nexusdemo.com / 123456` | **FALSO** — nenhuma dessas strings no código; as contas reais estão no item D (e sim, `admin@nexus.local/Nexus@2026` é um problema análogo, este real) |
| `.py`/`estrutura.txt`/lockfile órfão na raiz | **FALSO** — raiz limpa (seção G) |
| CI em `.github/workflows/` | **FALSO** — não existe CI (F) |
| Tailwind + Recharts | **PARCIAL** — Tailwind 4 real; Recharts não existe (FullCalendar + KPIs próprios) |
| bundle ~1,6 MB | **NÃO VERIFICÁVEL** — medido: 858 kB JS + 387 kB CSS |
| licença MIT | **FALSO** — `UNLICENSED` (`package.json:6`); para comercializar, a decisão de licenciamento está aberta (R9) |

Consequência prática: as Fases 1-10 do brief **continuam válidas como plano** (isolamento, segurança,
transações, SaaS, fiscal, LGPD, testes, infra, frontend, docs), mas cada correção tem de mirar o código
deste repo — os `arquivo:linha` deste relatório são o ponto de partida, não os do brief.

---

## I. Recomendações por fase (o que a auditoria implica)

- **R1 (Fase 1 — isolamento)**: criar camada única de autorização — `updateMany/deleteMany` com
  `{ id, companyId }` por construção; fechar os três CRÍTICOS (guarda de papel em `addMember`/`updateRole`
  espelhando a do PATCH; `companyId` do scan sempre do contexto); separar super admin de verdade (flag no
  token ou tabela própria, em vez de e-mail comparado em 3 lugares); mover CMS/cron para permissões de
  **plataforma**; teste automatizado de intrusão A×B em todos os endpoints, travando o CI.
- **R2 (Fase 2 — segurança)**: `devToken` só com flag explícita `AUTH_EXPOSE_RESET_TOKEN=1` e nunca por
  ambiente; gate de `NODE_ENV` no seed da conta dev (ou removê-la e gerar credencial efêmera para os
  testes); proteção do super admin no fluxo de recuperação; store compartilhada de rate-limit (Redis) e
  `trustProxy` antes de qualquer multi-instância; atualizar `@fastify/jwt`/`vitest`/`vite`/`prisma` e
  re-rodar audit; body limit explícito; detecção de reuso de refresh.
- **R3 (Fase 3 — integridade)**: decremento atômico condicional (`updateMany where stockQuantity >= q`
  com contagem de linhas afetadas, ou `FOR UPDATE` dentro da tx) em venda/confirmar/cancelar/estorno/
  movimento/recebimento; revalidar status da venda dentro da tx; link venda↔financeiro com parcelamento
  (feature nova, decisão de layout de contas); `Decimal` até o fim do cálculo (arithmetic em centavos
  inteiros ou lib decimal) nos relatórios; política de estoque por empresa; meia-noite única (fuso da
  empresa) para vencimentos.
- **R4 (Fases 4-6 — SaaS/fiscal/LGPD)**: nada existe; `PaymentGateway`/`EmailTemplate` são tabelas
  mudas. Decisões do dono antes de código: provedor (Asaas/MP/Stripe), API fiscal (Focus NFe/eNotas/
  PlugNotas), SMTP. O produto tem a regra registrada de **não inventar integração sem credencial**.
- **R5 (Fase 7 — qualidade)**: container MySQL no CI (GitHub Actions cobrindo build+typecheck+test+audit),
  `@vitest/coverage-v8` com threshold progressivo até 70%, testes dos buracos de `users/reports/audit`,
  code-splitting por rota no web (lazy nas rotas pesadas: Agenda/FullCalendar primeiro).
- **R6 (Fase 8 — infra)**: Dockerfile multi-stage + compose com MySQL e Redis; health/ready separados
  (o `/health` atual cai junto com o banco porque `estadoManutencao()` roda antes do allowlist sem
  try/catch — `plugins/maintenance.ts:22-25`); logs JSON com requestId; backup com restauração testada.
- **R7 (Fase 9 — front)**: além do split, tratamento global de sessão expirada já existe (refresh com
  rotação); falta E2E de verdade (Playwright) — as provas puppeteer atuais são ricas mas acopladas ao
  disco do dev.
- **R8 (Fase 10 — docs)**: atualizar `ANALISE-LACUNAS.md` ou arquivá-lo; arquivar `patch-schema-*.cjs`;
  OpenAPI gerado das schemas Zod/Fastify; guia de deploy/backup; remover jquery/sweetalert2.
- **R9 (decisão pendente do dono)**: licença comercial (UNLICENSED atual protege o código, mas não define
  o contrato de assinatura), provedores, e **quando** o lote sem commit entra no git.

---

*Relatório produzido na Fase 0 sem alterar código. Aprovado pelo dono com instrução de executar
todas as fases sem nova escolha de opções.*

## Adenda da execução — Fase 1 (isolamento) encerrada

- Os três CRÍTICOS da seção B estão fechados: ADMIN criar OWNER, ADMIN rebaixar OWNER e varredura
  cross-tenant do sino. Somou-se ainda o encerramento de sessão de terceiro pela rota de tenant.
- O administrador da plataforma passou a ser uma coluna (`users.platform_role`), não um e-mail no
  código; CMS e `/ops/jobs` exigem esse alcance, conferido no banco a cada request (R1 completo).
- **Achado ao vivo, não previsto no relatório**: o banco de desenvolvimento inteiro era **MyISAM**
  (padrão do WAMP no `my.ini`), com os 41 foreign keys do schema existindo no papel e valendo zero,
  ~22 mil linhas órfãs e transações sem atomicidade. Reparado por `tools/para-innodb.cjs`
  (InnoDB + FKs + limpeza conforme a semântica de cada constraint) e pelo `my.ini` com InnoDB. A
  corrida de oversell da Fase 3 agora tem onde existir — sem InnoDB não havia transação de fato.
- Suíte verde com FKs valendo (16 arquivos, 113 testes), typecheck e build limpos, provas de
  navegador rerodadas (CMS 115, rotinas 37, notificações 85, configurações 108).
- **Camada de escrita por construção (sub-fase 1c)**: todos os `update`/`delete` dos serviços de
  tenant agora filtram pelo `companyId` dentro do próprio `where` (notificação amarra `userId` +
  `companyId`; papel de membro e sessão fazem o mesmo pela linha própria). A proteção antes só
  existia na leitura de confirmação logo acima de cada escrita — um chamamento futuro sem essa
  leitura atravessava empresas. O P2025 do Prisma virou 404 no handler central. Auth (conta da
  própria pessoa) e CMS/Rotinas (plataforma, `assertPlatformAdmin`) ficaram fora por desenho.
  Suíte 16/113 verde com a camada ativa; prova de notificações 85/85 rerodada. Falta agora a
  varredura sistemática de intrusão A×B por endpoint (sub-fase 1d).
- **Intrusão A×B automatizada (sub-fase 1d)**: `apps/api/test/intrusao.test.ts` — duas empresas
  reais, um OWNER cria a documentação viva pela API e o OWNER da outra empresa ataca todas as
  rotas de escrita/leitura por id com payloads válidos. Resultados esperados e provados: 404 em
  toda linha de terceiro, 403 ao tentar derrubar sessão alheia pela rota da própria empresa, 400
  em referências cruzadas (categoria/produto/fornecedor de A num cadastro de B) e o scan de
  avisos de B não gera nada na empresa de A mesmo pedindo o `companyId` dela no corpo. A última
  checagem confere linha por linha no banco que nenhuma linha de A foi tocada. Com a Fase 1,
  todos os CRÍTICOS e ALTOS de isolamento da seção B estão fechados e blindados por teste.
  Suíte agora em 17 arquivos e 127 testes verdes.

## Adenda da execução — Fase 2 (segurança de produção) encerrada — 2026-10-11

- **devToken (ALTO)**: o código de recuperação só sai pela resposta com
  `AUTH_EXPOSE_RESET_TOKEN=1` escrito no `.env` — o `NODE_ENV` perdeu o poder de abrir a porta.
  A suíte prova a ausência do campo e a existência do token no banco (hash).
- **Seed (ALTO + BAIXO)**: a conta `admin@nexus.local` não nasce mais em produção sem
  `SEED_DEV_ACCOUNT=1`, e o log final parou de imprimir a senha do administrador — hoje ele
  nomeia as contas e diz se a dev foi criada, sem valor secreto.
- **Recuperação × administrador da plataforma (MÉDIO)**: `forgotPassword` para um
  `SUPER_ADMIN` não gera token nem revoga sessões — devolve o mesmo 200 genérico e grava
  `auth.forgot_password_bloqueado` na auditoria. `resetPassword` recusa token de SUPER_ADMIN
  mesmo forjado direto no banco (cinto extra para código antigo).
- **Reuso de refresh (MÉDIO)**: nova coluna `refresh_tokens.used_at` (migration
  `20261011200000_add_refresh_used_at`, reversível). Reapresentar um token já rotacionado
  derruba **todas** as sessões vivas daquela pessoa e grava `auth.refresh_reuse`; revogação
  por decisão (logout, admin, troca/recuperação de senha) marca só `revokedAt` e continua
  sem reação em cadeia — logout de uma aba não derruba a outra.
- **trustProxy e body limit (MÉDIO)**: `TRUST_PROXY` (default 0) e `BODY_LIMIT_BYTES`
  (default 1 MiB) declarados no `env.ts` e aplicados na subida do Fastify. Sem proxy
  declarado, header forjado não engana rate-limit, auditoria nem o pulso da manutenção.
- **Gate estrutural**: `plugins/gate.ts` — gancho `onRoute` que derruba a subida se qualquer
  rota nascer sem `app.authenticate` no preHandler e sem o carimbo `config.public = true`.
  A superfície aberta do projeto passou a ser exatamente 10 rotas carimbadas (6 de auth,
  3 da vitrine, 1 health); o preflight `OPTIONS` do CORS é rota de framework e não pede
  carimbo. Testado nos dois sentidos, incluindo o boot real.
- **Dependências (ALTO, 13 vulnerabilidades)**: `@fastify/jwt` 9→10.2.4 (crítica),
  `vitest` 2→5 (crítica do tinypool; configurada `fileParallelism: false` + folga do
  rate-limit global no ambiente de teste — o limitador por rota continua nos valores reais),
  `vite` 5.4→7.3 com `@vitejs/plugin-react` 5 (alta; escolhido 7 em vez do 8.3.4 mais novo
  porque o range vulnerável vai até 6.4.2 e o peer do `@tailwindcss/vite` pede casamento
  conservador), `react-router-dom` 6→7.18.4 (moderada) e `npm audit fix` no resto.
  **Restam 3 ALTAS**: a cadeia `prisma`/`@prisma/config` → `deepmerge-ts`, que só tem correção
  no Prisma 8 (ainda RC) e vive no CLI de desenvolvimento — nada dela entra no runtime da API.

**Pendências declaradas desta fase:**
- Store compartilhado de rate-limit em Redis (parte do R2): levado de propósito para a
  Fase 8, é onde o Docker/compose apresenta o Redis ao stack; em instância única — como o
  projeto roda hoje — o contador em memória é exato. Comentado em `plugins/security.ts`.
- Migração para Prisma 8 estável fecha os 3 altos restantes (revalidar schema + suíte na volta).

Validação da fase: typecheck da API limpo; suíte 18 arquivos / 135 testes verdes duas rodadas
seguidas (novo `test/seguranca.test.ts` com 8; `auth-flows` reescrito sem o devToken); typecheck
e build do web OK contra Vite 7 + RR 7; provas de navegador rerodadas contra o servidor com gate:
configurações 108/108, CMS 115/115, notificações 85/85, rotinas 37/37.

## Adenda da execução — Fase 3 em andamento — sub-fase 3a (estoque atômico) encerrada — 2026-10-11

A sub-fase 3a fecha o CRÍTICO de oversell e os ALTO de escrita absoluta de estoque/custo da seção E.
- `lib/stock.ts` (novo): baixarEstoque é `UPDATE ... WHERE stock >= q` na transação, count 0 → 400 com saldo re-lido; subirEstoque é `increment`, com custo da última compra no mesmo update; `trackStock` no where mantém o combinado de produto sem rastreamento.
- `permitirNegativo` já existe como parâmetro do helper — a política por empresa (Company) chega na sub-fase 3b e só liga esse fio.
- Vendas e compras: status reivindicado dentro da transação (`updateMany where status = lido`); confirmação, cancelamento e estorno não correm mais dois vezes no mesmo documento.
- `moveStock`/estoque inicial em transação; ADJUST continua absoluto por decisão declarada (inventário é declaração, não cálculo).
- CRM: lead→cliente (WON) agora numa `$transaction` única — dupla sem tx da seção E encerrada.
- Achado novo durante os testes de corrida: deadlock InnoDB P2034 (FK do item segura lock S no produto; decremento pede X) virava 500 em clique duplo. `lib/tx.ts` re-tenta até 3× com recuo progressivo; a vencida recebe o 400 honesto.
- `test/oversell.test.ts`: 5 cenários de concorrência real (mesma venda 2×, duas vendas pelo mesmo saldo, compra recebida 2×, OUT manual duplo, receber×cancelar) — saldo final sempre coerente com o status, nunca negativo.

Pendências declaradas da Fase 3: 3b política de estoque por empresa (UI + campo), 3c meia-noite no fuso da empresa, 3d dinheiro em Decimal/centavos nos relatórios, 3e vínculo venda↔financeiro com parcelamento.

Validação da sub-fase: typecheck da API limpo; suíte 19 arquivos / 140 testes verdes (5 novos). Backend-only — nenhuma tela alterada, provas de navegador não afetadas.

## Adenda da execução — Fase 3 em andamento — sub-fase 3b (política de estoque por empresa) encerrada — 2026-10-11

A sub-fase 3b transforma o `permitirNegativo` que a 3a deixou como parâmetro morto em decisão da empresa, guardada no cadastro dela e escrita na tela de Configurações.
- Coluna `companies.allow_negative_stock` (`BOOLEAN NOT NULL DEFAULT false`, migration `20261011210000_add_company_allow_negative_stock`, reversível) — o default preserva exatamente o comportamento da 3a, nenhuma empresa acordou com o estoque destrancado.
- `permiteEstoqueNegativo(companyId)` em `lib/stock.ts` é a fonte única: lida uma vez antes de abrir a transação, nunca por item.
- A chave liga só as três portas de saída (`baixarEstoque`): confirmar venda, estorno de compra recebida-cancelada e OUT manual. `subirEstoque` e ADJUST continuam fora — política de saldo não é política de entrada.
- No `createSale`, ligado o permissivo, o pré-check em JS é pulado de propósito: com saldo negativo autorizado ele seria uma porta falsa. Desligado, continua dando o nome do produto na cara antes de a transação começar.
- Count-0 do `baixarEstoque` passou a diferenciar "não pertence à empresa" de "não controla estoque" — com a política ligada, produto sem rastreamento ainda não aceita OUT.
- Escrita parcial de Configurações ganhou o primeiro booleano do pipeline (`companies.schemas.ts`, `mudancas` widening para `string | number | boolean | null`); sem chave extra de validação, sem campo novo fora da guarda.
- Painel: bloco "Política de estoque" na aba Empresa com a peça `CampoLigado` e gravação própria, como os outros cinco; `settingsApi.ts` espelha o campo nos dois sentidos.
- Achado da prova: o `toastr` do botão desligar no componente tinha redação antiga enquanto a prova esperava a nova — divergência escrita à mão entre tela e prova, descoberta com diagnóstico em navegador real e normalizada nos dois lados.

Pendências declaradas da Fase 3: 3c meia-noite no fuso da empresa, 3d dinheiro em Decimal/centavos nos relatórios, 3e vínculo venda↔financeiro com parcelamento.

Validação da sub-fase: typecheck da API limpo; typecheck e build do painel limpos; suíte 20 arquivos / 145 testes verdes (novos `test/estoque-politica.test.ts` com 5); prova de navegador de Configurações 115 checagens / 0 falhas, com o switch provado nos dois sentidos e as capturas da aba Empresa renovadas.
