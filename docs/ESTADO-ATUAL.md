# Estado atual do Nexus Business Manager

Documento gerado por medição, não por memória. Cada número abaixo vem de um
comando executado nesta rodada (2026-10-12), listado na seção "Como este arquivo
foi medido" ao final. O que não pôde ser medido está marcado como
`NÃO VERIFICADO`. Este arquivo é o retrato honesto do repositório no commit
atual e o primeiro texto que um revisor externo deve ler.

Nesta rodada (2026-10-13, F3.2 Parte 1 — Ordens de Serviço) as seções 1, 3, 4, 5, 6, 7, 8, 9 e 10
e o bloco "Como este arquivo foi medido" foram re-medidos porque o módulo mudou rotas, tabelas, telas e
contagem de testes — e porque três linhas daquela passada já não descreviam mais o repositório (P1, P2 e D1). O resto do arquivo continua
a medição de 2026-10-12, e a passada completa está marcada para a F9.

Na rodada seguinte (2026-10-13, F3.2 Parte 2 — Cobranças manuais e catálogo de gateways) as mesmas seções
foram medidas de novo, porque o módulo trouxe uma tabela, dois enums, oito rotas, uma tela, a 17ª linha do
menu e 39 casos de teste novos (24 na API, 15 no web), mais a prova de navegador
`tools/verify-cobrancas.cjs` com 137 verificações. Três linhas que aquela passada deixou desatualizadas foram corrigidas aqui, e não
em silêncio: o fecho da Parte 1 (item 10), a divergência D2 do `react-router-dom` e a pendência P12, que a
própria Parte 2 encerrou.

Na rodada de agora (2026-10-13, tarefa T3 — F4: autenticação reforçada, decisões D1, D2 e D3) as seções 1, 4,
5, 6, 7, 8, 9, 10, 11 e 12 foram medidas de novo, e os números antigos estavam todos velhos ao mesmo tempo:
as rotas eram 120 e são **129**, os arquivos de teste da API eram 37 e são **46**, os casos eram 350 e são
**434**, as tabelas eram 32 e são **35**, as migrations eram 20 e são **22**, os elementos de rota do painel
eram 26 e são **27**. Parte dessa diferença não veio da F4: as tarefas T1 (banco de prova separado, decisão
D6) e T2 (N32 e P11, decisões D4 e D5) já estão publicadas — `origin/main` aponta para `6f97067`, igual ao
`HEAD` medido com `git rev-parse` —, e nenhuma das duas tinha re-medido este arquivo, o que é exatamente a
falha que a regra "quem mexer reatualiza" existe para evitar. A passada completa do resto do arquivo
continua marcada para a F9.

---

## 1. Resumo executivo

1. O produto é um ERP SaaS multiempresa que funciona de ponta a ponta no ambiente
   local: 129 rotas de API sobre Fastify 5 + Prisma 6 + MySQL 8.4.7, painel React com
   27 elementos de rota (17 telas atrás do menu) e uma vitrine pública montada pelo banco.
2. Funciona e tem teste automatizado: autenticação com verificação de e-mail, segundo
   fator TOTP e bloqueio por conta, recuperação e renovação de sessão, RBAC com
   hierarquia de papéis, isolamento multiempresa, clientes,
   produtos e estoque, vendas com parcelas, compras e fornecedores, financeiro,
   CRM, agenda, ordens de serviço com o estoque baixando na conclusão, cobranças
   manuais com o recebimento registrado por pessoa e uma única receita no caixa,
   relatórios agregados, notificações, auditoria, rotinas agendadas,
   CMS da vitrine, documentos legais e modo manutenção.
3. A suíte inteira passa nesta rodada: 47 arquivos / 437 casos na API e 18 arquivos
   / 140 casos no web, com o banco MySQL de prova da decisão D6 (sem mock).
4. É parcial por escolha, não por esquecimento: os relatórios agregados têm teste
   de acesso e de dinheiro, mas nem cada um dos oito tem asserção de valor
   própria. Saiu dessa lista o tema do painel: desde a T4.3 o `<html>` carrega as
   duas chaves — a nossa e a `data-bs-theme` que o AdminLTE 4 lê — escritas pela
   mesma porta, com decisão em `docs/adr/0016`.
5. Não existe: cobrança automática por gateway com credencial real, assinatura SaaS,
   nota fiscal, upload real de arquivo (a logo é só uma URL), backup e restauração —
   e nem fila de saída de e-mail: a entrega que a F4 montou é síncrona dentro da
   request, registrado como N58. Saiu da lista nesta rodada o item que abria a frase
   anterior: **envio de e-mail por SMTP existe** (porta `MailerPort`, adaptador nodemailer,
   console no desenvolvimento e fake na prova — decisão D1). Falta só a credencial do
   provedor, que é a decisão G1 do dono. A ordem de serviço saiu da lista na F3.2 Parte 1;
   a cobrança saiu na Parte 2, porque o carnê hoje emite, registra o recebimento, cancela
   e imprime. Nada disso tem botão morto na interface — o que não tem integração
   aparece na tela marcado como indisponível, com o motivo escrito.
6. Uma tabela existe só no schema: `email_templates`. `payment_gateways` passou a
   ter serviço, duas rotas e aba no carnê — gravando só a configuração do MANUAL,
   com as três colunas de credencial nulas por construção e fora da resposta.
7. Segurança: nenhuma rota nasce aberta (gate estrutural derruba o boot), e as
   **129** rotas estão particionadas por teste em 13 públicas, 2 de etapa de login e 114
   autenticadas, sem nenhuma sem cadeado (`isolamento-rotas.test.ts`). Desde a F4 a
   autenticação tem três camadas novas: o link de verificação do cadastro atrás de
   `REQUIRE_EMAIL_VERIFICATION` (D2, ligada em produção), o segundo fator TOTP com o
   segredo cifrado em AES-256-GCM e códigos de recuperação de uso único (D3, obrigatório
   para papel de plataforma e OWNER em produção), e o bloqueio de cinco falhas em quinze
   minutos chaveado no endereço, fora da tabela `users`, com hash de isca para a resposta
   não denunciar quem existe. A senha do administrador continua fora de arquivo
   rastreado: o valor mora só em `tools/senha-admin.local.cjs` e no `apps/api/.env`
   (chave `SEED_ADMIN_PASSWORD`), os dois ignorados pelo git — medido com
   `git check-ignore -v`.
8. Risco conhecido e **decidido** pelo dono: uma captura rastreada mostra a
   senha de desenvolvimento nos pixels (`docs/screenshots/02-login.png`,
   `docs/AUDITORIA.md` N1). A decisão de 2026-10-12 (item 1 do PROMPT MESTRE) é
   que a conta é fictícia: não se rotaciona senha, não se reescreve histórico. O
   N1 deixou de travar o push e passou a risco aceito e registrado.
9. Cobertura re-medida na árvore final da T4: API com **87,79%** de instruções
   (3.274/3.729), 76,01% de ramificações, 87,30% de funções e 90,62% de linhas, com os
   mesmos **três** arquivos em 0% da F4 (`cron.runner.ts`, `lib/mail/smtp.ts` e
   `lib/mail/console.ts` — a suíte de API não pode tocar em transporte real, e o
   agendador só roda com o servidor de produção). No web, com o universo documentado
   (`--coverage.include="src/**"`, menos `src/test/**`), **38,19%** de instruções,
   33,11% de ramificações, 30,67% de funções e 41,03% de linhas, e **27** arquivos em
   0% (eram 38): as duas telas que a F4 estreou saíram do zero — `VerificarEmail.tsx`
   em 97,22% e `SegundoFatorPanel.tsx` em 96,15%, com `lib/verificacao.ts` e
   `lib/segundoFator.ts` em 100% (era o achado N62, agora fechado).
10. Estado da branch medido no encerramento da T4: `origin/main` em `55bbb50` e `HEAD`
    em `68f0d0d`, descendente direto — dois commits publicados por dentro desta rodada
    (T4.1 e T4.2) antes dos dois que fecham a T4. O fechamento é a suíte verde no banco
    de prova (47 arquivos / 437 casos na API, 18 / 140 no web), o portão de build e
    commits em lotes — implementação e documentação separados — com push em avanço
    direto, sem force, e a prova `git ls-remote origin HEAD` igual a `git rev-parse HEAD`
    colada no relatório da tarefa. Falta o portão que a regra de acesso do dono cobra:
    com o `npm run dev` de volta no banco de desenvolvimento a conta raiz entra — HTTP 200
    na API com `accessToken` e `refreshToken` (nenhum valor impresso), 37 empresas na
    sessão e **6 verificações / 0 falhas** no navegador. Quando isso não acontece, a
    primeira suspeita é a porta 3001, não a senha: o roteiro está na seção 12 e o
    conserto definitivo abre a T5 (N65).

---

## 2. Stack e versões reais

Lidas dos `package.json` do monorepo neste momento (`npm ls` não é fonte aqui; a
fonte é o arquivo e o `node --version` executado agora).

| Camada | O que está no package.json | Versão instalada / executada |
| --- | --- | --- |
| Runtime | `engines.node` | `>=20` declarado; Node v24.18.0 executando |
| Gerenciador | — | npm 11.16.0 |
| API | `fastify` | ^5.1.0 |
| API | `@prisma/client`, `prisma` | ^6.1.0 |
| API | `zod` | ^3.23.8 |
| API | `@fastify/jwt` | ^10.2.4 |
| API | `@fastify/helmet` | ^13.0.0 |
| API | `@fastify/cors` | ^10.0.1 |
| API | `@fastify/rate-limit` | ^10.1.1 |
| API | `bcryptjs` | ^2.4.3 |
| API | `dotenv` | ^16.4.5 |
| API | `typescript` | ^5.6.3 |
| API | `vitest`, `@vitest/coverage-v8` | ^5.0.3 |
| API | `tsx` | ^4.19.2 |
| Banco | MySQL do WAMP | 8.4.7, schema `nexusbusinessmanager` (desenvolvimento) e `nexusbusinessmanager_teste` (prova) |
| Web | `react`, `react-dom` | ^18.3.1 |
| Web | `vite` | ^7.3.7 |
| Web | `react-router-dom` | ^7.18.4 |
| Web | `admin-lte` | ^4.10.0 |
| Web | `tailwindcss`, `@tailwindcss/vite` | ^4.3.3 |
| Web | `@fullcalendar/*` | 6.1.21 (fixa, sem range) |
| Web | `axios` | ^1.7.7 |
| Web | `jquery` | ^3.7.1 |
| Web | `sweetalert2` | ^11.26.0 |
| Web | `toastr` | ^2.1.4 |
| Web | `jsdom`, `@testing-library/react` | ^27.4.0 / ^16.3.3 |
| Raiz | `puppeteer-core` | ^25.13.0 (provas de navegador em `tools/`) |

A raiz expõe as portas de script: `typecheck`, `build`, `test`, `test:api`,
`test:web`, `test:coverage`, `db:migrate`, `db:seed`. Não há script de lint nem
de format, e não há ESLint nem Prettier instalado em nenhum dos dois workspaces
— "código padronizado" aqui é convenção de arquivo, não ferramenta.

---

## 3. Estrutura de pastas

Nível 3, sem `node_modules`, `dist` nem `coverage`.

```
nexusbusinessmanager/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── migrations/        (20 migrations + migration_lock.toml)
│   │   │   ├── schema.prisma      (31 models, 21 enums)
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── config/            (env.ts, producao.ts)
│   │   │   ├── lib/               (18 arquivos: audit, auth, brFields,
│   │   │   │                       company-context, errors, installments,
│   │   │   │                       money, pagination, password,
│   │   │   │                       passwordPolicy, pix, platform, prisma,
│   │   │   │                       rbac, stock, time, tokens, tx)
│   │   │   ├── modules/           (19 módulos: auth, companies, users, audit,
│   │   │   │                       clients, products, sales, purchases,
│   │   │   │                       finance, charges, gateways, crm, agenda,
│   │   │   │                       reports, notifications, cms, cron, health,
│   │   │   │                       service-orders)
│   │   │   ├── plugins/           (auth, gate, maintenance, security)
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   └── test/                  (47 arquivos .test.ts + helpers.ts)
│   └── web/
│       ├── public/
│       └── src/
│           ├── components/        (13 na raiz + 5 cms/, 12 landing/, 3 layout/,
│           │                       3 settings/ — 36 arquivos)
│           ├── context/           (AuthContext, ThemeContext)
│           ├── lib/               (27 módulos: api, auditLabels, brand,
│           │                       cmsApi, confirm, cronApi, csv, destino, format,
│           │                       landingApi, landingEstilo, landingTypes,
│           │                       lembranca, masks, metricaVitrine, money,
│           │                       notificationsApi, notify, papeis,
│           │                       registro-erros, segundoFator, settingsApi,
│           │                       statusServico, tokenStore, uiCopy, validators,
│           │                       verificacao)
│           ├── pages/             (24 arquivos)
│           ├── styles/            (7 arquivos CSS, 3.594 linhas no total)
│           └── test/              (20 arquivos: 18 testes + 2 fábricas;
│                                   o jsdom vem do vitest.config, não de setup.ts)
├── assets/brand/logo/
├── docs/
│   ├── adr/                       (16 ADRs)
│   ├── decisoes/                  (G1–G6 + G8, em 7 arquivos)
│   ├── design/palette.md
│   ├── screenshots/               (116 capturas)
│   ├── ANALISE.md, ANALISE-LACUNAS.md, AUDITORIA.md, PRODUCAO.md,
│   │   STATUS-AJUSTES.md
│   └── ESTADO-ATUAL.md            (este arquivo)
├── tools/                         (48 arquivos versionados nesta rodada: 19 verify-*,
│                                   11 shoot-* + shoot.cjs, 4 patch-*, 4 audit-*,
│                                   dev.cjs, servidor-de-prova.cjs,
│                                   preparar-banco-de-prova.cjs, banco-de-prova.cjs,
│                                   conta-de-captura.cjs, senha-admin.cjs,
│                                   para-innodb.cjs, wf.cjs, make-favicon.ps1)
├── README.md, CHANGELOG.md, CREDENCIAIS.md
└── package.json, package-lock.json, .gitignore, .gitattributes, .editorconfig
```

Arquivos da árvore versionada nesta rodada, medidos com
`git ls-files --cached --others --exclude-standard` — ou seja, o que está no commit de
agora mais os arquivos novos deste módulo, que ainda não aparecem no `git ls-files` puro:
**506**. Código: 93 arquivos `.ts` em `apps/api/src` e 112 `.ts`/`.tsx` em `apps/web/src`.
Não há `.github/` — ou seja, **nenhum CI versionado** (a pastinha é trabalho da T7/F8).

---

## 4. Rotas da API

Fonte: leitura estática dos 19 arquivos `*.routes.ts`, conferida contra o servidor em
execução e contra a regra 4 de `apps/api/test/isolamento-rotas.test.ts`, que exige que a
contagem medida pelo gancho `onRoute` do Fastify bata com a contagem declarada nos
arquivos de rota. Não existe `tools/inventario-rotas.cjs` no repositório: a medição da
passada anterior foi feita com um script de momento, fora do versionamento, e esta linha
foi corrigida para apontar no comando que qualquer um repete.

| Recorte | Quantidade |
| --- | --- |
| Rotas declaradas | **129** |
| Públicas de propósito (`config.public`) | 13 |
| De etapa (decorador `app.authenticateSegundoFator`, sem sessão) | 2 |
| Da plataforma (`assertPlatformAdmin`) | 15 |
| De empresa, com `app.authenticate` + permissão RBAC | 91 |
| De conta (falam com a pessoa, não com uma empresa do contexto) | 8 |
| Registradas sem gate | **0** |

As cinco linhas acima da contagem são a partição da regra 6 de `isolamento-rotas.test.ts`, medida nesta
rodada com a mesma régua do teste: as quatro novas públicas e as duas de etapa entraram na F4 (D2 e D3), e as
quatro rotas de segundo fator do caminho da conta entraram em "de conta" — 13 + 2 + 15 + 91 + 8 = 129.

Prova de que nenhuma delas nasceu aberta, executada nesta rodada: a regra 8 de `isolamento-rotas.test.ts`
varre as **116** rotas não públicas sem token (129 menos as 13 públicas) e exige 401 em todas, com o modo de
manutenção conferido antes de medir. A amostra manual contra o servidor de dev — `/api/health` 200,
`/api/leads` 401, `/api/clients` 401 e mais catorze caminhos — foi medida na passada da F3.2 Parte 2 e continua
válida como retrato; o que prova o gate hoje é a varredura, não a lista.

Por módulo: agenda 7 · audit 2 · auth 19 · charges 6 · clients 5 · cms 14 ·
companies 5 · crm 6 · cron 3 · finance 9 · gateways 2 · health 1 ·
notifications 7 · products 11 · purchases 8 · reports 8 · sales 4 ·
service-orders 6 · users 6 — somando 129. As nove rotas novas de `auth` são as três públicas da verificação e
do desafio (`/verify-email`, `/resend-verification`, `/2fa/challenge`), as duas de etapa (`/2fa/setup`,
`/2fa/activate`) e as quatro do caminho da conta (`/2fa/status`, `/2fa/preparar`, `/2fa/ativar`,
`/2fa/desativar`). O `/register` não é novo e não mudou de caminho: o que mudou nele foi a resposta, quando a
flag de verificação está ligada.

A lista completa, rota por rota:

| Método | Caminho | Módulo | Exigência |
| --- | --- | --- | --- |
| GET | /api/agenda/events | agenda | agenda:read |
| GET | /api/agenda/summary | agenda | agenda:read |
| POST | /api/agenda/events | agenda | agenda:write |
| GET | /api/agenda/events/:id | agenda | agenda:read |
| PATCH | /api/agenda/events/:id | agenda | agenda:write |
| PATCH | /api/agenda/events/:id/status | agenda | agenda:write |
| DELETE | /api/agenda/events/:id | agenda | agenda:write |
| GET | /api/audit | audit | audit:read |
| GET | /api/audit/plataforma | audit | plataforma |
| POST | /api/auth/login | auth | pública |
| POST | /api/auth/register | auth | pública |
| POST | /api/auth/verify-email | auth | pública |
| POST | /api/auth/resend-verification | auth | pública |
| POST | /api/auth/2fa/challenge | auth | pública (token no corpo, 5/min) |
| POST | /api/auth/2fa/setup | auth | token de etapa |
| POST | /api/auth/2fa/activate | auth | token de etapa |
| GET | /api/auth/2fa/status | auth | autenticada |
| POST | /api/auth/2fa/preparar | auth | autenticada |
| POST | /api/auth/2fa/ativar | auth | autenticada |
| POST | /api/auth/2fa/desativar | auth | autenticada |
| POST | /api/auth/forgot-password | auth | pública |
| POST | /api/auth/reset-password | auth | pública |
| POST | /api/auth/refresh | auth | pública |
| POST | /api/auth/logout | auth | pública |
| GET | /api/auth/me | auth | autenticada |
| PATCH | /api/auth/me | auth | autenticada |
| POST | /api/auth/change-password | auth | autenticada |
| POST | /api/auth/switch-company | auth | autenticada |
| GET | /api/charges | charges | charge:read |
| GET | /api/charges/summary | charges | charge:read |
| GET | /api/charges/:id | charges | charge:read |
| POST | /api/charges | charges | charge:write |
| POST | /api/charges/:id/pay | charges | charge:write |
| POST | /api/charges/:id/cancel | charges | charge:write |
| GET | /api/clients | clients | client:read |
| POST | /api/clients | clients | client:write |
| GET | /api/clients/:id | clients | client:read |
| PATCH | /api/clients/:id | clients | client:write |
| DELETE | /api/clients/:id | clients | client:write |
| GET | /api/public/landing | cms | pública |
| GET | /api/public/legal/:kind | cms | pública |
| POST | /api/public/bypass | cms | pública |
| GET | /api/cms/config | cms | plataforma |
| PATCH | /api/cms/config | cms | plataforma |
| GET | /api/cms/seo/score | cms | plataforma |
| POST | /api/cms/maintenance/token | cms | plataforma |
| GET | /api/cms/items | cms | plataforma |
| POST | /api/cms/items | cms | plataforma |
| PATCH | /api/cms/items/:id | cms | plataforma |
| DELETE | /api/cms/items/:id | cms | plataforma |
| GET | /api/cms/legal | cms | plataforma |
| PUT | /api/cms/legal/:kind | cms | plataforma |
| GET | /api/cms/kinds | cms | plataforma |
| POST | /api/companies | companies | autenticada |
| GET | /api/companies | companies | autenticada |
| GET | /api/companies/current | companies | company:read |
| PATCH | /api/companies/current | companies | settings:write |
| GET | /api/companies/settings/opcoes | companies | autenticada |
| GET | /api/leads/pipeline | crm | crm:read |
| GET | /api/leads | crm | crm:read |
| POST | /api/leads | crm | crm:write |
| GET | /api/leads/:id | crm | crm:read |
| PATCH | /api/leads/:id | crm | crm:write |
| PATCH | /api/leads/:id/status | crm | crm:write |
| GET | /api/ops/jobs | cron | plataforma |
| PATCH | /api/ops/jobs/:slug | cron | plataforma |
| POST | /api/ops/jobs/:slug/run | cron | plataforma |
| GET | /api/finance/categories | finance | finance:read |
| POST | /api/finance/categories | finance | finance:write |
| DELETE | /api/finance/categories/:id | finance | finance:write |
| GET | /api/finance/summary | finance | finance:read |
| GET | /api/finance/entries | finance | finance:read |
| POST | /api/finance/entries | finance | finance:write |
| GET | /api/finance/entries/:id | finance | finance:read |
| PATCH | /api/finance/entries/:id | finance | finance:write |
| PATCH | /api/finance/entries/:id/status | finance | finance:write |
| GET | /api/gateways | gateways | settings:read |
| PUT | /api/gateways/:provider | gateways | settings:write |
| GET | /api/health | health | pública |
| GET | /api/notifications | notifications | autenticada |
| GET | /api/notifications/count | notifications | autenticada |
| PATCH | /api/notifications/:id/read | notifications | autenticada |
| POST | /api/notifications/read-all | notifications | autenticada |
| GET | /api/notifications/preferences | notifications | autenticada |
| PUT | /api/notifications/preferences | notifications | autenticada |
| POST | /api/notifications/scan | notifications | settings:write |
| GET | /api/product-categories | products | product:read |
| POST | /api/product-categories | products | product:write |
| PATCH | /api/product-categories/:id | products | product:write |
| GET | /api/products | products | product:read |
| GET | /api/products/stock-summary | products | product:read |
| POST | /api/products | products | product:write |
| GET | /api/products/:id | products | product:read |
| PATCH | /api/products/:id | products | product:write |
| DELETE | /api/products/:id | products | product:write |
| POST | /api/products/:id/movements | products | product:write |
| GET | /api/products/:id/movements | products | product:read |
| GET | /api/suppliers | purchases | supplier:read |
| POST | /api/suppliers | purchases | supplier:write |
| PATCH | /api/suppliers/:id | purchases | supplier:write |
| DELETE | /api/suppliers/:id | purchases | supplier:write |
| GET | /api/purchases | purchases | purchase:read |
| POST | /api/purchases | purchases | purchase:write |
| GET | /api/purchases/:id | purchases | purchase:read |
| PATCH | /api/purchases/:id/status | purchases | purchase:write |
| GET | /api/reports/overview | reports | autenticada |
| GET | /api/reports/clients | reports | client:read |
| GET | /api/reports/products | reports | product:read |
| GET | /api/reports/movements | reports | product:read |
| GET | /api/reports/sales | reports | sale:read |
| GET | /api/reports/purchases | reports | purchase:read |
| GET | /api/reports/finance | reports | finance:read |
| GET | /api/reports/crm | reports | crm:read |
| GET | /api/sales | sales | sale:read |
| POST | /api/sales | sales | sale:write |
| GET | /api/sales/:id | sales | sale:read |
| PATCH | /api/sales/:id/status | sales | sale:write |
| GET | /api/service-orders | service-orders | service_order:read |
| GET | /api/service-orders/summary | service-orders | service_order:read |
| GET | /api/service-orders/:id | service-orders | service_order:read |
| POST | /api/service-orders | service-orders | service_order:write |
| PATCH | /api/service-orders/:id | service-orders | sessão + alcance do atendente |
| POST | /api/service-orders/:id/status | service-orders | sessão + alcance do atendente |
| GET | /api/users | users | user:read |
| GET | /api/users/permissions | users | user:read |
| GET | /api/users/sessions | users | user:read |
| DELETE | /api/users/sessions/:sessionId | users | user:write |
| POST | /api/users | users | user:write |
| PATCH | /api/users/:userId/role | users | user:write |

Como ler a coluna "Exigência": `pública` é a rota com `config.public = true` no
registro; `plataforma` exige a conta global da plataforma
(`assertPlatformAdmin`), não o papel da empresa; o resto carrega
`preHandler: [app.authenticate]` e depois `assertPermission` com o recurso e a
ação. A coluna "autenticada" significa sessão obrigatória sem permissão de
recurso específica (conta própria, notificações da pessoa, empresas do usuário). As
duas rotas de ordem de serviço que não mostram permissão na tabela são as duas que
abrem exceção de propósito: `PATCH /service-orders/:id` e
`POST /service-orders/:id/status` deixam o `STAFF` passar sem `service_order:write`
e apertam o alcance dentro do serviço — ele só mexe na ordem atribuída a ele, só no
andamento, e nunca cancela. Medido na prova de navegador: 403 nas duas portas de
escrita para o atendente sem vínculo com a ordem.

O `registerAuthGate` (`apps/api/src/plugins/gate.ts`) é um hook `onRoute`
registrado antes da primeira rota: se alguém registrar uma rota sem
`app.authenticate` no `preHandler` e sem `config.public = true`, a aplicação não
sobe — o erro cita método e caminho. Isso é o que sustenta o "0 sem gate" acima,
inclusive para rotas futuras.

---

## 5. Tabelas do banco

`schema.prisma` tem **34 models**, **21 enums**, e o banco físico tem **35 tabelas** nos dois bancos (os 34
mais `_prisma_migrations`), medido por `SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA =
DATABASE()` contra as duas URLs do `apps/api/.env` nesta rodada — desenvolvimento e prova com a mesma
contagem. O que a migration da F4 acrescentou: três colunas em `users` (`email_verified_at`,
`totp_secret_ciphertext`, `totp_enabled_at`) e três tabelas novas — `email_verification_tokens`,
`recovery_codes` e `login_attempts`, esta última sem chave estrangeira de propósito (existe linha para
endereço que não é de ninguém; ver `src/lib/tentativas.ts`). As três só recebem escrita pelo caminho de
autenticação, e desde a T1 a suíte inteira e as provas de navegador escrevem no banco de prova.
Há **22 migrations** versionadas, de `20261010154418_init_foundation` a
`20261013040000_reforco_de_autenticacao` — as cinco últimas são aditivas: a coluna `scope` da auditoria (F2),
as três tabelas do atendimento (F3.2 Parte 1), o carnê (F3.2 Parte 2), a empresa lembrada do vínculo (T2/D5)
e o reforço de autenticação (T3). A cadeia completa continua sem reerguer um MySQL vazio (N54), e é a
primeira das 22 a ser julgada na T7.

Classificação por uso real no código da API (contagem de chamadas
`prisma.<modelo>` / `tx.<modelo>` nos 93 arquivos `.ts` de `src`):

| Tabela | Status | Evidência |
| --- | --- | --- |
| User, Company, CompanyUser, RefreshToken, PasswordResetToken, AuditLog | Em uso | auth, sessões, RBAC, auditoria |
| Client, Product, ProductCategory, StockMovement, Sale, SaleItem, Supplier, Purchase, PurchaseItem | Em uso | cadastros e operações |
| FinanceCategory, FinanceEntry, Charge | Em uso | financeiro, carnê da venda e a receita única da cobrança |
| Lead, AgendaEvent | Em uso | CRM e agenda |
| Notification, NotificationPreference | Em uso | sino, `/api/notifications` |
| LandingConfig, LandingItem, LegalDocument | Em uso | vitrine e textos legais |
| CronJob | Em uso | `/api/ops/jobs` e o relógio |
| ServiceOrder, ServiceOrderItem, ServiceOrderHistory | Em uso | `/api/service-orders`, a baixa de estoque na conclusão e a linha do tempo |
| EmailVerificationToken, RecoveryCode, LoginAttempt | Em uso (F4) | `verificacao.service.ts`, `segundo-fator.service.ts` e `lib/tentativas.ts`; as três são lidas e gastas no fluxo de entrada |
| **EmailTemplate** | **Sem uso** | só schema + migration; nenhum delegate, nenhuma rota, nenhuma tela. A F4 entregou os textos de e-mail em código (`src/lib/mail/mensagens.ts`), não nesta tabela — a lacuna continua, e agora tem nome no §9 |
| PaymentGateway | Em uso | `gateways.service.ts` lê e grava só a configuração do MANUAL; as três colunas de credencial ficam nulas e não aparecem na resposta |

Ressalva honesta sobre a medição: `PurchaseItem` tem o delegate gravado por
escrita aninhada (`items: { create: itens }` em
`apps/api/src/modules/purchases/purchases.service.ts:168`), então um grep por
`prisma.purchaseItem` devolve zero e ainda assim a tabela é usada. `SaleItem`
mistura os dois caminhos. É por isso que a classificação acima foi conferida
linha a linha em vez de sair direto do contador.

---

## 6. Módulos

Cinco estados possíveis: **Implementado e testado**, **Implementado sem teste**,
**Parcial**, **Só tabela**, **Não iniciado**. Evidência é arquivo, não adjetivo.

| Módulo | Estado | Evidência |
| --- | --- | --- |
| Autenticação, cadastro, recuperação | Implementado e testado | 19 rotas; `auth.test.ts`, `auth-flows.test.ts`, `seguranca.test.ts`, `recuperacao-por-email.test.ts` (6), `verificacao-de-email.test.ts` (11); prova `tools/verify-logout.cjs` |
| Entrega de e-mail (SMTP, verificação, 2FA) | Implementado e testado, com o provedor por decidir | `src/lib/mail/` (porta + SMTP + console + caixa de memória), três chamadores reais; `recuperacao-por-email.test.ts` e `verificacao-de-email.test.ts` leem a caixa de teste e provam que o código nunca volta no HTTP. Adaptador de fornecedor nenhum: D1, `docs/decisoes/G1-envio-de-email.md` |
| Segundo fator (TOTP) e bloqueio por conta | Implementado e testado | `segundo-fator.test.ts` (16), `bloqueio-de-conta.test.ts` (8), `criptografia.test.ts` (8 — o envelope AES-256-GCM do segredo); rotas de etapa com decorador próprio; tela em quatro passos com prova `apps/web/src/test/login-com-segundo-fator.test.tsx` (4) |
| Sessões e revogação | Implementado e testado | `sessoes-empresa.test.ts`; refresh com empresa lembrada; 8 casos em `sessoes-empresa.test.ts`; corrida de duas abas e a guarda da linhagem em `corrida-de-abas.test.ts` (8) |
| Papéis, permissões e hierarquia | Implementado e testado | `lib/rbac.ts`; `rbac.test.ts`, `rbac-hierarquia.test.ts`; aba Permissões |
| Multiempresa (isolamento e troca) | Implementado e testado | `multiempresa.test.ts`, `intrusao.test.ts` (varredura rota a rota), `desativacao-acesso.test.ts` |
| Empresa (cadastro, moeda/fuso/idioma, meta) | Implementado e testado | 5 rotas; `settings.test.ts` |
| Clientes | Implementado e testado | 5 rotas; `clients.test.ts`, `pagination.test.ts` |
| Produtos, categorias e estoque | Implementado e testado | 11 rotas; `products.test.ts`, `estoque-politica.test.ts`, `oversell.test.ts` |
| Vendas (pedido, itens, baixa, parcelas) | Implementado e testado | 4 rotas; `sales.test.ts`, `parcelamento.test.ts` |
| Fornecedores e compras | Implementado e testado | 8 rotas; `purchases.test.ts` |
| Financeiro (lançamentos, resumo, carnê) | Implementado e testado | 9 rotas; `finance.test.ts`, `dinheiro-decimal.test.ts` |
| CRM (leads e funil) | Implementado e testado | 6 rotas; `crm.test.ts` |
| Agenda (janela, recorrência, FullCalendar) | Implementado e testado | 7 rotas; `agenda.test.ts`; fuso em `fuso-dia.test.ts` |
| Ordens de serviço (atendimento, peças, baixa de estoque) | Implementado e testado | 6 rotas; `ordens-de-servico.test.ts` (35 casos) e `ordens-de-servico.test.tsx` (10); prova `tools/verify-ordens-de-servico.cjs` (103); decisão em `docs/adr/0008-ordem-de-servico-baixa-estoque-na-conclusao.md` |
| Relatórios agregados | **Parcial** | 8 rotas existem e respondem; asserções de valor cobrem overview, financeiro e dinheiro; os seis demais relatórios só têm teste de acesso/intrusão |
| Notificações e preferências | Implementado e testado | 7 rotas; `notifications.test.ts` |
| Auditoria | Implementado e testado | 2 rotas de leitura (empresa e plataforma); gravação exercitada em 31 dos 46 arquivos de teste (`grep -l "audit\|AuditLog"` em `apps/api/test/*.test.ts`) |
| Rotinas agendadas (cron) | Implementado e testado | 3 rotas de plataforma; `cron.test.ts`; prova `tools/verify-rotinas.cjs` |
| CMS da vitrine | Implementado e testado | 14 rotas; `cms.test.ts`; provas `tools/verify-cms.cjs` e `tools/verify-landing-cms.cjs` |
| Documentos legais | Implementado e testado | `cms.test.ts` (11 casos, incluindo textos legais) e `settings.test.ts` (21 casos) |
| Modo manutenção | Implementado e testado | `plugins/maintenance.ts`, bypass público com rate-limit próprio |
| Painel/Dashboard | Implementado e testado pela API | `/api/reports/overview` + meta de receita; tela `Dashboard.tsx` |
| Cobranças manuais e catálogo de gateways | Implementado e testado | 6 rotas de cobrança + 2 de gateway; `cobrancas.test.ts` (24 casos) e `cobrancas.test.tsx` (15); prova `tools/verify-cobrancas.cjs` (137); decisão em `docs/adr/0009-cobranca-manual-receita-unica-e-vencida-lida.md`. Os três provedores de mercado param no catálogo com `available: false` e o motivo por escrito — nenhuma chamada de saída |
| Modelos de e-mail | **Só tabela** | `email_templates` no schema; sem delegate, sem rota, sem tela. A F4 criou a **entrega** (`src/lib/mail/`) com os textos em código, não na tabela — os templates do sino e do relatório diário continuam dependendo do provedor que o dono escolher (G1) |
| Upload de arquivo (logo, anexos) | **Não iniciado** | nenhum parser `multipart` na API; `logoUrl` é `VarChar(255)` de URL |
| SaaS: planos, assinaturas, faturas | **Não iniciado** | sem tabela, sem rota |
| Backup e restauração | **Não iniciado** | sem código |
| CI / quality gate | **Não iniciado** | não existe `.github/` nem script de lint |

---

## 7. Frontend

`apps/web/src/App.tsx` declara **27 elementos de rota** React — **26 com caminho** (`grep -c 'path=' App.tsx`)
mais o `index` do painel, que não tem caminho. A fonte é a contagem linha a linha, não
`grep -c "<Route"`, que devolve 28 porque também encaixa a tag `<Routes>`:

- públicas: `/` (vitrine montada pelo conteúdo do banco), `/login`, `/cadastro`,
  `/recuperar-senha`, **`/verificar-e-mail`** (a rota do link da D2, nova nesta rodada), `/legal/:slug`,
  `/403`, `/401`;
- protegidas por `ProtectedRoute` sob `/app`: `index` (Dashboard), clientes,
  produtos, vendas, ordens-de-servico, compras, financeiro, cobrancas, crm, agenda,
  usuarios, auditoria, configuracoes, cms, notificacoes, rotinas,
  auditoria-plataforma — 17 telas atrás do menu;
- catch-all `*` com página de erro.

O `/login` deixou de ser um formulário de dois campos e passou a ser **quatro passos
na mesma caixa** (`credenciais | codigo | configurar | codigos`): a senha abre o painel
quando não há segundo fator; quando há, abre a etapa de código com um `challengeToken`
que não é sessão; quando a conta é obrigada a ligar o fator (papel de plataforma ou
OWNER em produção), aparece a tela de configuração, que mostra a chave uma única vez e
pede o código de ativação; e o quarto passo são os dez códigos de recuperação impressos
uma vez. Nada de token de etapa é guardado antes de a etapa terminar, e o passo final só
grava sessão depois do código. A quem é obrigado a ligar, o botão "Voltar para a senha"
limpa tudo o que a etapa produziu — medido em
`apps/web/src/test/login-com-segundo-fator.test.tsx` (4 casos, com a trilha do
`from` externo `//dominio.com/painel` provando que o destino continua sendo desta casa).
A gestão do fator no painel é a tela `components/settings/SegundoFatorPanel.tsx`, dentro
da aba Segurança de `/app/configuracoes`.

São **24 arquivos** em `pages/` e **36 arquivos** de componente (13 na raiz de
`components/`, 5 em `components/cms/`, 12 em `components/landing/` — onze `.tsx` mais
`copy.ts` —, 3 em `components/layout/`, 3 em `components/settings/`, entrando
`ErrorBoundary.tsx` da T4.4 e `SegundoFatorPanel.tsx` da F4), mais `context/AuthContext` e
`context/ThemeContext`, e **27 módulos** em `lib/` — entraram `segundoFator.ts`, `destino.ts`,
`verificacao.ts` e, nesta rodada, `registro-erros.ts` com o `lembranca.ts` que a F4 reescreveu.
Há **20 arquivos** em `src/test/` (18 de casos e os dois helpers `fabrica-api.ts` e
`fabrica-landing.ts`).

Componentes globais de uso transversal: `ProtectedRoute`, `AdminShell`,
`NotificationBell`, `Tabs`, `Pagination`, `Modal`, `ConfirmationModal`,
`StateView`, `PageLoader`, `PasswordInput`, `Logo`, `ThemeToggle`, `ErrorPage`,
`ErrorBoundary` e a biblioteca de campos `Fields.tsx`.

O que é apenas visual hoje: (a) a aba Modelos de e-mail não existe
como funcionalidade, e na aba Gateways os três provedores de mercado aparecem
marcados como indisponíveis, com o motivo — o que aparece na tela é o que a API
realmente devolve.

Desde a F3.1 não existe linha de menu apenas visual: o tipo `NavItem` exige
`to: string`, então linha sem rota não compila. A barra está com 17 itens em
6 camadas, todos link de página que existe — o 16º entrou na F3.2 Parte 1, com a tela
`OrdensDeServico.tsx`, e o 17º na Parte 2, com `Cobrancas.tsx` —, e quem garante isso é
`apps/web/src/test/menu-sem-pagina-vazia.test.tsx` (6 casos: destino obrigatório,
vocabulário "em breve" extinto do arquivo, cada destino com `<Route>` e arquivo de
página com título e sem copy de obra, CSS sem o estado apagado, barra montada só com
`<a>` com href e o filtro de camada vazia ainda no lugar) mais as 103 checagens de
`tools/verify-sidebar.cjs`, que clica as dezessete linhas uma por uma — reexecutado nesta
rodada com a linha nova: **104 checagens, 0 falhas** (eram 103 com dezesseis).

Bundle medido no `npm run build` desta rodada (T4/F5), refeito no portão de encerramento: o
JavaScript saiu de **um** chunk para **37 pedaços**. O `index` pesa **354,85 kB** (gzip 121,62 kB),
o maior pedaço de rota é o da Agenda, **286,34 kB** (gzip 83,52 kB — é o FullCalendar, que só desce
quando alguém abre `/app/agenda`), e os outros 35 pedaços — telas e módulos compartilhados —
ficaram entre **0,32 kB** e **29,94 kB** cada um. O aviso `Some chunks are larger than 500 kB`
**não apareceu mais** — a última vez que ele esteve no build foi a F4, com 961,19 kB / 282,12 kB
num arquivo só (D8 cumprida, com a medição antes/depois em
`docs/adr/0014-code-splitting-por-rota.md`). O CSS continua **um arquivo único**,
`index.css` **398,54 kB** (gzip 61,29 kB) contra 396,43 kB (gzip 60,78 kB) da F4: cresceram 2,11 kB
com o piso de alvo de toque, a tela de erro e o painel de segundo fator, e dividir o stylesheet por
rota fica declarado como dívida na mesma ADR. A prova do lado do navegador é
`tools/verify-code-splitting.cjs` (**44 verificações, 0 falhas**), que abre `/app/dashboard` e confere
pela lista de rede que nenhum pedaço da Agenda nem o do CMS desceram junto.

Para referência, a maior tela do painel continua `Cobrancas.tsx`, com **52.735 bytes** de fonte —
e é ela, não a F4, que pesa no pedaço que sobrou para o `index` quando a rota é a primeira da aba.

Acessibilidade deixou de ser adjetivo na T4.9: `tools/verify-acessibilidade.cjs` percorre **22 telas**
no navegador real e imprime **22 verificações, 0 falhas** sobre **649 controles lidos** — rótulo
acessível em todo controle (0 sustentados só por `placeholder` ou `title`), anel de foco visível nas
**68** paradas de `Tab`, alvo de toque, navegação por teclado (menu com `Enter`, gaveta com `Escape`,
abas, diálogo) e `prefers-reduced-motion` nos dois sentidos (com `reduce`, **0** elementos girando ou
transicionando na vitrine e **0** no painel). O piso do alvo de toque é duplo, e a razão está em
`docs/adr/0015-alvo-de-toque-44-24-e-agenda-em-lista-no-celular.md`: **44x44 px** (WCAG 2.5.5, AAA)
onde o dedo mora — janela estreita ou `pointer: coarse` — e **24x24 px** (2.5.8, AA) na mesa, com a
exceção de equivalência conferida no elemento, não declarada: a Agenda abre em `listMonth` no celular
porque é a lista que tem linha de 144x44 px, e a grade do mês só passa na régua enquanto essa lista
existir. Medido: **0** controles principais abaixo de 44 px em 360 px e **0** abaixo de 24 px em
1440 px. A régua também não mede vazio — a prova cria um compromisso próprio pelo contrato público da
Agenda, mede com ele na tela e apaga no `finally`, imprimindo a contagem antes e depois. Ficou de fora,
declarado: zoom de 200%, leitor de tela e o contraste dos estados desabilitados. O contraste do resto
tem instrumento próprio: `tools/audit-contraste-painel.cjs` percorre as 17 telas do painel nos dois temas
e nas duas janelas (68 combinações), resolve o fundo realmente composto por trás de cada texto no
navegador, e fechou esta árvore com **2.862 textos medidos, 0 abaixo do alvo** (4,5:1; 3:1 para texto
grande), **14** isentos por componente inativo pela própria WCAG 1.4.3 — e cada linha da saída imprime
`atributos dark/dark ok` ou `light/light ok`, que é a dupla chave do N7 conferida na tela, não no fonte.

O que a T4.5 acrescentou ao mesmo capítulo é a fumaça: `npm run verify` (`tools/verify-fumaca.cjs`)
atravessa **63 páginas** no navegador — a vitrine e o `/login` sem sessão, as **14 telas** que a barra
lateral devolve para a conta de prova (lidas da própria tela, depois de entrar pela tela de entrada), as
**4 páginas de erro** (`/401`, `/403`, `/500` e o catch-all por caminho inexistente) em 360, 1024 e
1440 px, mais as **3 telas privativas da plataforma** (editor do CMS, rotinas e trilha da plataforma),
que só aparecem na janela larga e com o administrador da plataforma. Cada página é conferida por HTTP,
conteúdo montado e console limpo, e a corrida fecha com **0 problemas**. É ela, e não a memória, que diz
se uma tela mudou de mãos com a última refatoração.

---

## 8. Testes

Medidos no portão de fechamento desta tarefa (`npm test`, exit 0, saída real colada no
relatório da rodada), com o banco de prova da decisão D6 ativo (a suíte da API não usa mock): zero
falha e zero skip nas duas pontas. As durações variam corrida a corrida, e as duas corridas desta
rodada estão guardadas em arquivo: o portão mediu **337,87 s** (API) e **16,49 s** (web), e a mesma
suíte com o contador de cobertura ligado levou **487,10 s** na API; no web a corrida com o contador
ligado fechou em 20,28 s sem os globais de medição e voltou a dar 18 arquivos / 140 casos com eles.
Na passada anterior (F4) o portão tinha dado 415,87 s e 10,84 s. O que sustenta o conteúdo da tabela
é o contador de arquivos e casos, que não muda entre corridas.

| Suíte | Arquivos | Casos | Resultado | Duração |
| --- | --- | --- | --- | --- |
| API (`vitest`, forks, serial) | 47 | 437 | 47 passed (47) · 437 passed (437) | 337,87 s |
| Web (jsdom + Testing Library) | 18 | 140 | 18 passed (18) · 140 passed (140) | 16,49 s |

Na API são **10 arquivos e 87 casos a mais** que a medição da F3.2 Parte 2 (37 / 350). Os dois
primeiros entraram na T1 e na T2 e nunca tinham sido contados aqui
(`banco-de-teste-separado.test.ts`, `empresa-lembrada.test.ts`); os sete que a T3 estrearam são
`bloqueio-de-conta.test.ts`, `corrida-de-abas.test.ts`, `criptografia.test.ts`,
`guardas-herdadas.test.ts`, `recuperacao-por-email.test.ts`, `segundo-fator.test.ts` (16 casos) e
`verificacao-de-email.test.ts`; e o décimo é desta rodada — `zero-placeholder.test.ts` (3 casos),
que varre o fonte do front e da API procurando porta que devolve `null` de propósito, "em breve" e
copy de obra. Além deles, `isolamento-rotas.test.ts`, `seguranca.test.ts` e
`validador-de-producao.test.ts` ganharam casos, e a soma dos dez arquivos novos com os três
reatualizados fecha os 87 — a repartição exata arquivo por arquivo não foi medida nesta passada, e o
que está garantido aqui é o total do portão (437, todos verdes). No web são **6 arquivos e 53 casos a
mais** (12 / 87 na F4): estrearam `resposta-atrasada.test.tsx` (5), `privacidade-do-login.test.tsx` (15),
`tema-sincronizado.test.tsx` (6), `limite-de-erro.test.tsx` (9), `verificar-e-mail.test.tsx` (8) e
`segundo-fator-conta.test.tsx` (9) — 52 casos contabilizados pelo próprio relatório —, e o caso que
falta para fechar os 53 é o oitavo de `fim-de-sessao.test.tsx`, que a T4 acrescentou ao arquivo que
já existia.

Cobertura real, medida agora com o mesmo comando de medição das duas pontas:

```
API:  npm run test:coverage --workspace @nexus/api
Web:  npm run test --workspace @nexus/web -- --coverage \
        --coverage.include="src/**" --coverage.exclude="src/test/**"
```

| Suíte | Stmts | Branch | Funcs | Lines | Base medida |
| --- | --- | --- | --- | --- | --- |
| API | **87,79%** | 76,01% | 87,30% | **90,62%** | re-medida na T4 com `npm run test:coverage --workspace @nexus/api` (exit 0, 487,10 s): os mesmos quatro percentuais e o mesmo `lcov.info` da F4 — 3.006/3.317 linhas, 1.889/2.485 ramificações, 674/772 funções em 92 arquivos sob `src`; as instruções ficam em 3.274/3.729 como na passada. A cobertura da API não se moveu porque o arquivo novo da rodada (`zero-placeholder.test.ts`) lê fonte, não executa `src`; **3** arquivos seguem com zero alcance |
| Web | **38,19%** | 33,11% | 30,67% | **41,03%** | corrida desta rodada com os mesmos globais da passada (`--coverage.include="src/**"`, `exclude="src/test/**"`, 18 arquivos / 140 casos verdes): as bases contadas arquivo por arquivo em `apps/web/coverage/coverage-final.json` são 1.845/4.831 instruções, 1.287/3.886 ramificações e 466/1.519 funções; **100** entradas no JSON, das quais 9 sem nenhuma instrução mensurável (os sete `.css`, `logo.png` e `vite-env.d.ts`), restando **91** arquivos de código — e **27** deles em 0%, contra 38 da passada. A alta de +8,52 pontos de instrução é a T4: saíram do zero `VerificarEmail.tsx` (97,22%), `SegundoFatorPanel.tsx` (96,15%), `ErrorBoundary.tsx` (100%), `lib/verificacao.ts` e `lib/segundoFator.ts` (100% nos dois) |

O que **não** está coberto, dito sem rodeios:

- **API:** **três** arquivos estão em **0%**, e não mais um. O de sempre:
  `src/modules/cron/cron.runner.ts` (0 de 32 linhas) — os casos de `cron.test.ts` exercitam o matcher, o
  serviço e as rotas, mas o laço que dispara a rotina no processo do servidor não roda em teste. Os outros
  dois entraram com a F4 e são os dois transportes que a suíte nunca toca de propósito:
  `src/lib/mail/smtp.ts` (0 de 8 linhas) e `src/lib/mail/console.ts` (0 de 4) — o `vitest.config.ts` fixa
  `MAIL_TRANSPORT=memory` para nenhuma prova bater em caixa postal, então quem é medido é o adaptador fake
  (12/12 linhas), as mensagens (13/13), a porta (4/4) e o `index.ts` que escolhe o transporte (8/11); o
  SMTP real só é validado no `config/producao.ts` (91/91 linhas) pela régua das variáveis, nunca por
  conexão. O resto do oco relevante é relatório e ambiente:
  `reports.service.ts` **50,41%** de instruções (114/212 linhas) e `reports.routes.ts` **70,9%** de
  instruções (31/47 linhas) — dos oito relatórios, só `overview`, `finance` e o caminho do dinheiro têm asserção de valor;
  `config/env.ts` **57,14%** (8/14 linhas) porque as validações exclusivas de produção não disparam na suíte
  (ficaram em `validador-de-producao.test.ts`, que chama o validador direto). Depois vêm
  `companies.service.ts` 38/54 linhas, `finance.service.ts` 54/72, `products.service.ts` 68/83,
  `audit.routes.ts` 31/36, `lib/audit.ts` 8/9 e `app.ts` 42/50 (o handler de erro tem ramos que só
  acontecem em produção). Os módulos das duas partes da F3.2 não são ocos. Ordens de serviço:
  `service-orders.routes.ts` fecha em **100%** e `service-orders.service.ts` em **93,8%** de instruções
  (174/179 linhas); as cinco linhas fora do alcance dele são medidas uma por uma — o retry do número
  duplicado (375-376), o 403 do atendente sem vínculo com a ordem (607, provado no navegador, não na
  suíte), a troca de cliente na edição (620) e o conflito de status quando outra requisição mexeu
  primeiro (682). Cobranças: o módulo inteiro em **91,21%** de instruções e **94,47%** de linhas;
  `charges.routes.ts` em **100%** (32/32) e `charges.service.ts` em 99/105, com as seis linhas de fora
  listadas uma por uma no `lcov.info`; `charge-adapters.ts` em 22/25 (fora: 79, 97 e 159 — três ramos
  do catálogo que só disparam com provedor real, e por isso mesmo o MANUAL nunca os percorre) e
  `charges.schemas.ts` em 18/19. Gateways: `gateways.service.ts` com **100%** de linhas (33/33) e
  `gateways.routes.ts` com 14/15. A ramificação do módulo de cobranças (75,14%) é a mais oca dos dois,
  e é ela que a suíte ainda não bate dos dois lados nos validadores condicionais — nada ali está
  escondido: o número está na tabela acima. O módulo da F4, medido arquivo por arquivo no mesmo
  `lcov.info`: `verificacao.service.ts` **100%** (24/24 linhas), `tentativas.ts` **100%** (26/26),
  `mail/fake.ts` 12/12, `mail/mensagens.ts` 13/13, `mail/porta.ts` 4/4, `config/producao.ts` **100%**
  (91/91), `plugins/auth.ts` 17/17 e `plugins/gate.ts` 7/7; `auth.service.ts` **98,91%** (182/184),
  `auth.routes.ts` **98,75%** (79/80), `criptografia.ts` **97,22%** (35/36) e
  `segundo-fator.service.ts` **94,51%** (86/91). As cinco linhas do serviço de segundo fator que ficaram
  de fora estão nomeadas uma por uma, lidas do `DA:,0` do `lcov.info`: **102** (pedido de configuração
  para quem já tem o fator ligado), **202** (`jwt.verify` que recusa o token de desafio), **209** (a
  etapa de código batendo em conta sem e-mail confirmado com a flag da D2 ligada), **262** (desligar
  quem nunca ligou) e **359** (o aviso de ativação cuja entrega falhou). É o mesmo tipo de oco que a
  suíte já tinha: ramo de recusa que a prova de navegador bate e o `vitest` não. As três linhas de fora
  do `lib/mail/index.ts` (33, 37 e 46) são exatamente o ramo que a suíte não pode percorrer: com
  `MAIL_TRANSPORT=memory` fixado no `vitest.config.ts`, `criarMailer` devolve o fake na linha 32 e nunca
  chega a montar o SMTP (33-45) nem o console (46).
- **Web:** **27 dos 91 arquivos com código mensurável estão em 0%** (100 entradas no
  `coverage-final.json`, 9 delas sem nenhuma instrução: os sete `.css`, `logo.png` e
  `vite-env.d.ts`). Eram 38 de 88 na passada da F4, e o denominador subiu porque a T4 estreou
  `registro-erros.ts`. O que saiu do zero nesta rodada: `pages/VerificarEmail.tsx` **97,22%** de
  instruções (0 de 36 linhas antes), `components/settings/SegundoFatorPanel.tsx` **96,15%** (28-180
  fora, agora só as linhas 57 e 90), `lib/verificacao.ts` **100%**, `lib/segundoFator.ts` **100%** —
  as linhas 74-90, o painel de códigos que a F4 deixou de fora, estão batidas —,
  `components/ErrorBoundary.tsx` **100%** e `lib/registro-erros.ts` **100%** de instruções. Os dois
  primeiros eram exatamente o achado **N62 / P17**, agora fechado, e a mesma tela foi aberta por
  navegador de verdade em `tools/verify-verificacao-e-2fa.cjs` (56 verificações, 0 falhas, banco
  devolvido a zero). Subiram também `Login.tsx` de 71,92% para **79,36%** (os três momentos em que a
  senha é zerada entraram no teste), `AuthContext.tsx` para **81,14%**, `AdminShell.tsx` para
  **58,58%** e `validators.ts` de 3,70% para **22,22%**. O que continua em 0%, sem maquiagem: **oito
  das dezessete linhas do menu** (Dashboard, Notificações, Vendas, Compras, Agenda, CMS, Rotinas e
  Configurações) mais as quatro telas públicas que nenhum teste abre (Cadastro, Recuperação, Legal e
  a `pages/errors.tsx`), os cinco painéis do editor CMS, os dois painéis de Configurações que não são
  o de segundo fator (`ContaPanel`, `EmpresaPanel`), o `Maintenance.tsx` da vitrine, `App.tsx` e
  `main.tsx`, e cinco módulos de `lib/` (`cmsApi`, `cronApi`, `settingsApi`, `landingApi`, `masks`).
  No meio-termo, medidos linha a linha: `Cobrancas.tsx` **82,89%** de instruções (89,71% de linhas),
  `OrdensDeServico.tsx` 65,80%, `Audit.tsx` 50,86%, `Landing.tsx` 77,77%, `ConfirmationModal` 75%,
  `Modal` 51,13%, `Pagination` 68,88%, `Tabs` 55%, `Fields` 26,31%, `NotificationBell` 44,82%,
  `csv.ts` 8,33% e `format.ts` 35,29%. **Oito telas de operação do painel seguem sem teste
  automatizado** — a garantia delas hoje são as provas de navegador em `tools/`, que não rodam
  sozinhas.

Limitações da medição que o revisor deve saber:

- No web não existe script `test:coverage`; o escopo foi passado por argumento na
  linha de comando. Sem isso o Vite mediria apenas os arquivos alcançados pelos
  12 arquivos de teste, o que daria um número bonito e falso.
- A API não tem threshold de cobertura configurado; fixar meta é decisão da
  Fase 7 do plano de auditoria e depende do dono.
- Nenhum teste sobe o servidor HTTP da API com TLS nem valida cabeçalhos em
  ambiente de produção real; `validador-de-producao.test.ts` exercita o
  validador de `.env`, não a hospedagem.
- As provas de navegador (`tools/verify-*.cjs`, `tools/shoot-*.cjs`) rodam contra
  o Chrome local com `puppeteer-core` e não fazem parte do `npm test`; elas
  provam interface, não regressão automática.

---

## 9. Divergências entre documentação e código

Todas conferidas arquivo por arquivo. As linhas com número foram re-medidas em
2026-10-13 (F3.2 Parte 1) e outra vez na Parte 2, e uma terceira vez na T3 (F4),
porque o README cresce a cada rodada e referência de linha velha é a primeira
mentira deste arquivo.

| # | Documentação diz | Código faz | Onde |
| --- | --- | --- | --- |
| D1 | "Autenticação, cadastro e recuperação: 8 rotas", depois 10 | são **19** rotas: as dez de antes mais `POST /verify-email` e `POST /resend-verification` (verificação de cadastro) e sete de segundo fator — `POST /2fa/challenge` (pública), `POST /2fa/setup` e `POST /2fa/activate` (as duas de etapa, sob token de configuração), `GET /2fa/status`, `POST /2fa/preparar`, `POST /2fa/ativar` e `POST /2fa/desativar` (as quatro de sessão) | **corrigido de novo nesta rodada**: a linha 485 do README (re-medida nesta passada, `grep -n` no arquivo) diz 19 rotas e nomeia as peças novas; a fonte é `apps/api/src/modules/auth/auth.routes.ts`, onde as dezenove foram contadas (`grep -cE 'app\.(get\|post\|put\|patch\|delete)\('` → 19) |
| D2 | `README.md:517` — a tabela de tecnologias dizia "react-router-dom 6" | `^7.18.4` no `package.json` do web | **corrigido nesta rodada**: a linha agora diz 7, conferido no `package.json` e no `node_modules` instalado (7.18.4) |
| D3 | `README.md:20` e `README.md:505` dizem "MySQL 8" | o servidor local é **8.4.7** (re-medido por `SELECT VERSION()` nesta rodada: 8.4.7) | a série está certa; falta só o número exato onde o documento descreve o ambiente |
| D4 | Nenhuma tabela do README somava as rotas | **re-medido nesta rodada**: a tabela de módulos (`README.md:483-508`) tem dezoito linhas com contagem explícita, que somam **128** — as 119 de antes mais as nove rotas novas da autenticação —, e falta exatamente uma, `GET /api/health`, que não tem linha própria. 128 + 1 = **129**, a contagem medida | `README.md:483-508` conferido contra a leitura estática dos 19 arquivos `*.routes.ts` (129) e contra a regra 4 de `isolamento-rotas.test.ts` |
| D5 | `docs/ANALISE-LACUNAS.md` e tarefas antigas citam "Módulo Relatórios + exportações" como pendente | os 8 relatórios agregados existem na API e 6 telas exportam CSV pelo navegador | `apps/api/src/modules/reports`, `apps/web/src/pages/*.tsx` |
| D6 | O passo a passo de instalação do README não mandava gerar o cliente Prisma (hoje manda: `README.md:703-715`, re-medido nesta passada) | um clone novo não compila sem `npm run prisma:generate -w @nexus/api` — 217 erros de tipo por cliente não gerado | **corrigido nesta rodada**; registrado como N9 em `docs/AUDITORIA.md` |
| D7 | `docs/ANALISE.md` e `docs/ANALISE-LACUNAS.md` são retratos de rodadas anteriores | rotas, tabelas e contagens mudaram desde então | `docs/ANALISE.md`, `docs/ANALISE-LACUNAS.md` — vale neles o mesmo aviso deste arquivo: quem mexer reatualiza |

Nada no README promete integração de pagamento ou nota fiscal como existente — a
linha de gateways diz explicitamente "**nenhuma chamada de saída** enquanto não
houver credencial real e a decisão G2", e o código confirma as duas partes:
`payment_gateways` hoje é lida e escrita só pela configuração do MANUAL, e
`charge-adapters.ts` não conhece URL, chave ou SDK de provedor nenhum. O **SMTP**
deixou de ser divergência nesta rodada: o README dizia "gateways de pagamento e
SMTP têm tabela mas não têm chamada", e a chamada de e-mail agora existe
(`nodemailer` atrás da porta `MailerPort`), então a linha de Terceiros foi reescrita
para dizer o que ainda não existe — o sino e o relatório diário não chamam a entrega
(N59), e nenhum provedor de pagamento é chamado. O que continua sem leitura de código
é a tabela `email_templates`: as mensagens são montadas em
`src/lib/mail/mensagens.ts`, e a linha "Modelos de e-mail" da tabela de módulos do
README diz isso em vez de dizer que falta SMTP.

---

## 10. Pendências conhecidas

Ligadas ao item correspondente de `docs/AUDITORIA.md`.

| # | Pendência | Ligação | Severidade |
| --- | --- | --- | --- |
| P1 | Senha de desenvolvimento visível nos pixels de `docs/screenshots/02-login.png`, já publicada no remoto | AUDITORIA N1 / G7 | risco **aceito pelo dono** em 2026-10-12: a conta é fictícia e nada é rotacionado ou reescrito por causa disso; deixou de travar o push |
| P2 | A credencial de desenvolvimento do seed (o valor não é impresso aqui; é o da chave `SEED_DEV_PASSWORD` do `.env` local) **não está em arquivo rastreado nenhum** — varrido nesta rodada: 0 ocorrência nos 307 arquivos de texto do `git ls-files`, e o seed recusa nascer sem a variável de ambiente (`apps/api/test/seed-seguro.test.ts`). O que sobra são 12 diffs do histórico que carregaram o literal antes da limpeza, e o dono decidiu não reescrever histórico | seção D da auditoria + §5 deste prompt | baixa em árvore, média no histórico público; **não vale em produção** |
| P3 | Código de recuperação de senha numa captura rastreada (`09-recuperar-senha.png`) | AUDITORIA N2 | média |
| P4 | Identificador real de empresa/espalhado em arquivos rastreados | AUDITORIA N3 | baixa |
| P5 | Capturas das outras telas do painel não foram reauditadas uma a uma | AUDITORIA N5 | NÃO VERIFICADO |
| P6 | Tema do painel x `data-bs-theme` do AdminLTE | AUDITORIA N7 | **fechado na T4.3**: o painel escreve `data-bs-theme` no `<html>` junto com o atributo próprio do produto, com o valor da preferência lido em `main.tsx` antes de `createRoot` (sem *script* inline, por causa do CSP); 6 casos em `tema-sincronizado.test.tsx`, decisão em `docs/adr/0016`, e as duas capturas de tema claro da barra conferidas no navegador (`verify-sidebar.cjs`, 104 checagens) |
| P7 | Relatórios sem asserção de valor por relatório | seção F | média |
| P8 | Sem CI, sem lint, sem threshold de cobertura | seção I / Fase 7 | média |
| P9 | Bundle único de 961,19 kB (gzip 282,12 kB) sem code-splitting | Fase 7 / F5 (decisão D8) | **fechado na T4.8**: 37 pedaços, `index` em 354,85 kB / 121,62 kB gzip, aviso de chunk acima de 500 kB extinto, medição antes/depois em `docs/adr/0014` e prova no navegador (`verify-code-splitting.cjs`, 44 verificações). O que sobrou do item virou P19 |
| P10 | Auditoria segue em parada: Fase 7 e os blocos B–H do prompt de mercado não foram executados | AUDITORIA, seção I | combinado com o dono |
| P11 | O movimento de estado feito pela tela não carregava motivo: a rota aceita `note`, o diálogo de confirmação da casa é de sim/não e o campo só aparecia quando a mudança veio pela API | AUDITORIA N36 | **fechado na T2** (decisão D4): `confirmActionComMotivo` — superfície aditiva, contrato dos cinco diálogos existentes intocado — obrigou motivo no cancelamento de ordem, no estorno de ordem concluída e no cancelamento de cobrança (ADR-0012) |
| P12 | Ordem de serviço concluída não gera lançamento financeiro sozinha | AUDITORIA N37 / ADR-0008 | **fechado na F3.2 Parte 2**: a tela de ordens tem o botão "Gerar cobrança", e a receita entra quando uma pessoa registra o recebimento. O lançamento automático continua não existindo, agora por decisão registrada (N45: com receita automática na venda, a mesma venda cobrada no papel entraria duas vezes no caixa) |
| P13 | O Financeiro formata coluna de dia a partir de objeto `Date`, a mesma classe de risco do vencimento lido no fuso | AUDITORIA N44 | média — é outra tela, e a passada dela não é desta fase |
| P14 | Cinco telas ainda pintam a resposta atrasada de uma busca antiga por cima da busca nova (`Clients.tsx`, `Products.tsx`, `Finance.tsx`, `CRM.tsx`, `Users.tsx`) | AUDITORIA N51 | **fechado na T4.1**: contador de corrida nas cinco telas, mais as quatro listas que nascem em `useEffect` com a escrita desligada na limpeza; varredura do front inteira mede 4 escritas sem guarda no início e **0** no fim; 5 casos em `resposta-atrasada.test.tsx` com vermelho antes do verde |
| P15 | Cobrança sem pagamento parcial, sem juros e sem estorno; `PAID` não cancela | AUDITORIA N46 | combinado com o dono: estorno é movimento do caixa e o produto ainda não tem |
| P16 | A entrega de e-mail criada pela F4 é síncrona: a request de cadastro, recuperação e segundo fator espera o SMTP responder, sem fila, sem retry e com os timeouts padrão do nodemailer | AUDITORIA N58 | média — quem segura a resposta é o cliente; o fechamento é a T5/F6 |
| P17 | As duas telas que a F4 estreou não têm teste de tela nem prova de navegador: `VerificarEmail.tsx` e `SegundoFatorPanel.tsx` estão em 0% de cobertura, e a mensagem de verificação só é lida pelo fake da suíte, nunca por um navegador | AUDITORIA N62 | **fechado na T4.7**: 8 + 9 casos novos (`verificar-e-mail.test.tsx`, `segundo-fator-conta.test.tsx`), cobertura das duas em **97,22%** e **96,15%**, `lib/verificacao.ts` e `lib/segundoFator.ts` em 100%, e a prova `tools/verify-verificacao-e-2fa.cjs` abrindo as duas telas no navegador (56 verificações, 0 falhas) |
| P18 | Bloqueio de conta é, pelo lado da vítima, uma negação de serviço de quinze minutos disparada por quem conhece o endereço | AUDITORIA N60 | risco **aceito e registrado**: janela de contagem, login que limpa o contador, recuperação que limpa o contador e limite de 10 requisições por IP; a divulgação vai em `SECURITY.md` na T6/F7 |
| P19 | O CSS do painel continua um arquivo único de **398,54 kB** (gzip 61,29 kB), quando o JavaScript já foi dividido por rota | AUDITORIA N62 / `docs/adr/0014` | baixa, dívida declarada: a divisão por rota é do lado do `import`, e o stylesheet entra todo no `<head>`; a passada é de uma rodada de frente que ainda não existiu |
| P20 | Nove ferramentas de captura (`tools/shoot-*.cjs`) não acompanham a interface de hoje, e 48 PNGs ainda mostram a barra anterior à F3.1 | AUDITORIA N29 e N30 | média — fora do escopo por decisão do dono (D7: nenhuma recaptura em massa); a consertada entra na **T7/F8**, e as famílias regravadas nesta rodada foram conferidas pixel a pixel (N30 re-medido) |

---

## 11. Decisões que dependem do dono

Nada aqui foi inventado; está bloqueado por escolha registrada.

1. **SMTP** (`docs/decisoes/G1-envio-de-email.md`) — escolha do provedor e
   credenciais reais. Desde a F4 (decisão D1) o caminho de entrega existe e é o
   único caminho: verificação de cadastro, recuperação de senha e os avisos de
   segundo fator saem pela `MailerPort`, e o código **nunca** volta no corpo da
   resposta em produção — a porta de eco `AUTH_EXPOSE_RESET_TOKEN=1` só funciona
   fora de produção e o validador de `.env` recusa a subida com ela ligada. O que
   depende do dono agora é ligar `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/
   `MAIL_FROM` e escolher o provedor; sem elas o transporte é o console, que escreve
   no log do processo. `email_templates` segue sem uso: os textos moram em
   `src/lib/mail/mensagens.ts`, não na tabela.
2. **Chave do segundo fator** — `TOTP_ENCRYPTION_KEY` é obrigatória em produção
   (decisão D3): sem ela o validador de `.env` não deixa o servidor subir, e sem
   ela ligada nenhum segredo TOTP pode ser cifrado. A geração e a guarda dessa
   chave são do dono da hospedagem; o produto não tem uma.
2. **Cobrança e assinatura** (`G2`) — gateway, contas, ambiente. A cobrança manual
   já está no ar (carnê, PIX por chave, boleto, transferência, dinheiro e cartão de
   maquininha, com o recebimento registrado por pessoa); o que a falta de credencial
   trava é a cobrança automática pelo provedor e o SaaS de planos.
3. **Fiscal / NF-e** (`G3`) — emissão depende de certificado e município.
4. **Cadastro aberto** (`G4`) — se a autoinscrição continua pública ou passa a
   convite.
5. **Hospedagem e backup** (`G5`) — onde roda, quem faz dump, com que frequência.
6. **Licença** (`G6`) — o `package.json` hoje declara `UNLICENSED`; publicar o
   repositório como público sem licença definida é decisão do dono.
7. **Tema do painel** (N7) — **decidido e executado na T4.3**: `data-bs-theme` no `<html>` junto
   com o atributo próprio do produto, escrito pela mesma porta em `ThemeContext.tsx` e lido da
   preferência salva em `main.tsx` antes de `createRoot`, com seis casos em
   `apps/web/src/test/tema-sincronizado.test.tsx`. A decisão registrada está em
   `docs/adr/0016-tema-do-painel-com-duas-chaves.md`.
8. **Publicação do histórico** — o repositório remoto é público e já contém a
   captura da seção 1; qualquer decisão de trocar a senha, apagar a imagem ou
   manter o histórico é do dono (reescrever histórico é proibido neste prompt).

---

## 12. Como rodar o projeto do zero

Ordem testada na rodada do pacote, e não re-executada nesta passada; o que não pude
testar está dito logo abaixo. As contagens de arquivos e casos daquela tabela são as
da suíte de então (28 arquivos / 230 casos na API e 4 / 20 no web) — as medidas desta
rodada estão na seção 8.

```bash
git clone <url> && cd nexusbusinessmanager
npm ci
npm run prisma:generate -w @nexus/api   # 1. SEM ESTE PASSO NADA COMPILA (N9)
cp apps/api/.env.example apps/api/.env  # 2. ajuste DATABASE_URL, DATABASE_URL_TESTE,
                                        #    JWT_*, SEED_*, WEB_BASE_URL e, para e-mail
                                        #    real, SMTP_HOST/SMTP_PORT/SMTP_USER/
                                        #    SMTP_PASS/MAIL_FROM; em produção também
                                        #    TOTP_ENCRYPTION_KEY e as flags D2/D3
npm run db:migrate -w @nexus/api        # 3. aplica as 22 migrations (veja o aviso abaixo)
npm run db:seed   -w @nexus/api         # 4. admin global + conta de desenvolvimento
npm run typecheck && npm run build && npm test   # 5. os três portões
npm run dev                             # 6. api + web juntos, um comando só
```

O passo 6 é novo nesta rodada e é a resposta ao N66: `npm run dev` executa
`tools/dev.cjs`, que sobe a API (`tsx watch src/server.ts`, porta 3001) e o Vite (5173) no mesmo
processo, com a saída prefixada por `[api]` e `[web]`, e derruba os dois juntos no `Ctrl+C`.
`npm run dev:api` e `npm run dev:web` continuam existindo para quem quer um só dos lados — os dois
comandos individuais funcionavam antes; o que não existia era a casa.

Para as provas de navegador e para a suíte, o banco é outro, e é a decisão D6:

```bash
npm run db:prova                        # cria/atualiza nexusbusinessmanager_teste e semea a conta de prova
npm run dev:api:teste                   # sobe a API apontada no banco de prova, na MESMA porta 3001
npm run dev:web                         # o Vite na 5173, que é a porta que as provas abrem
npm run verify                          # fumaça: 63 páginas em 360 / 1024 / 1440 px
node tools/verify-acessibilidade.cjs    # régua de rótulo, foco, teclado, alvo de toque e movimento
```

Aqui mora o aviso que a rodada descobriu do jeito difícil (**N65**): `npm run dev:api:teste` e
`npm run dev` brigam pela porta 3001 porque ambos querem ser "a API". Enquanto o servidor de prova
está de pé, o `npm run dev` da vida real não sobe, e o painel que aparece no navegador é o do banco de
prova. O servidor de prova agora avisa isso no banner de arranque, e as ferramentas de prova conferem
o endereço do banco antes de escrever (`tools/banco-de-prova.cjs`); mesmo assim, a regra de casa é a
de sempre: **nenhum teste nem nenhuma prova escreve no banco de desenvolvimento** — o que aparece em
`nexusbusinessmanager` é dado de quem usa a aplicação.

E aqui mora o diagnóstico que a casa agora sabe fazer em ordem, porque ele já aconteceu duas vezes
(**N65**): se a tela de entrada devolver 401 para a conta de administrador **desta máquina**, a senha não é a
primeira suspeita — a primeira suspeita é a porta. O roteiro medido:

```bash
netstat -ano | findstr :3001               # quem está segurando a API
tasklist /FI "PID eq <pid>"                # servidor de prova, ou servidor de desenvolvimento?
# se for o servidor de prova: derrubar os três processos da árvore dele e devolver a porta
powershell "Stop-Process -Id <api>,<tsx>,<provedor> -Force"
npm run dev                                # sobe os dois lados no banco de desenvolvimento
curl -s -o NUL -w "%{http_code}\n" http://localhost:3001/api/health   # 200
```

A conta raiz continua `active=true` com `platformRole=SUPER_ADMIN` e 37 vínculos `OWNER` no banco de
desenvolvimento, e não existe no banco de prova — por isso o mesmo par de credenciais entra em um e é recusado
no outro com a mesma mensagem muda. A regra de acesso do dono não admite essa armadilha, e o fechamento
definitivo (prova na 3002/5174, porta do dono intocável) é a primeira tarefa da T5.

Dois avisos que o passo a passo não pode esconder. O primeiro, novo nesta rodada:
**`npm test` não roda sem `DATABASE_URL_TESTE`** — o `vitest.config.ts` da API lê a
variável, confere o nome do banco (`nexusbusinessmanager_teste`) e se recusa a subir
sem ela, pela decisão D6; a mensagem diz exatamente o que preencher. O segundo, já
registrado como **N54**: `prisma migrate deploy` contra um MySQL zerado para na segunda
migration com `P3018 / 1826 Duplicate foreign key constraint name`, porque 13 das 22
declaram a mesma constraint de novo e, em MySQL, nome de constraint é por banco. No
ambiente de desenvolvimento isto nunca foi medido do zero, e o fechamento é a T7/F8.

O que foi executado naquela rodada, em `C:/wamp64/www/nexus-verificacao` (clone de
`git clone . ../nexus-verificacao`, feito a partir do commit `2355f05`, ou seja,
sem este arquivo e sem os três arquivos ignorados do trabalho (`apps/api/.env`, `CREDENCIAIS.md`, `tools/senha-admin.local.cjs`)):

| Passo | Resultado medido |
| --- | --- |
| `git clone` | 386 arquivos no checkout, sem `.env`, sem `CREDENCIAIS.md`, sem `node_modules` |
| `npm ci` | concluiu; o npm bloqueou por política de scripts o `preinstall` do Prisma e o `postinstall` do esbuild |
| `npm run typecheck` (sem gerar o cliente) | **falhou com 217 erros TS**, todos de símbolo ausente do Prisma (`Role`, `Decimal`, `PrismaClientKnownRequestError`) |
| `npm run prisma:generate -w @nexus/api` | ok |
| `npm run typecheck` (depois) | **0 erros** |
| `npm run build` | **ok**, `vite` em 3,81 s |
| `npm test` | **28 arquivos / 230 casos verdes** na API e **4 arquivos / 20 casos** no web. Nota honesta: a suíte só roda com um `.env` apontando para um MySQL de teste, e esse arquivo não é versionado — para medir isso copiamos o `.env` do diretório de trabalho para o clone (fora do repositório, nunca commitado). Ou seja: o código do clone é suficiente; a configuração continua sendo do dono, como sempre. |
| BOM e CRLF nos 386 arquivos rastreados | **nenhum** (`OK`) |
| conferência final na árvore do pacote (`394edbe`, com este arquivo) | o mesmo clone foi atualizado para o commit empacotado e medido de novo: `npm run typecheck` com **0 erros**, `npm run build` **ok** (Vite em 8,75 s), `npm test` com **28 arquivos / 230 casos** e **4 arquivos / 20 casos** verdes. A varredura de codificação refeita sobre os **387 arquivos rastreados** (277 textos, 110 binários) deu **0 BOM e 0 CR**. |

- **Não testável no clone limpo por desenho:** `db:migrate`, `db:seed` e o boot
  do servidor pedem o `.env`, que não é versionado de propósito. No diretório de
  trabalho os dois servidores estavam de pé, e as 15 rotas amostradas da seção 4
  responderam. Nesta passada a amostra chegou a 18 rotas e as três novas
  (`/api/charges`, `/api/charges/summary` e `/api/gateways`) foram medidas sem
  sessão: as três devolvem 401, que é a resposta correta para quem não tem token.
- **Não verificado:** montagem em máquina sem WAMP, `npm ci` em Linux, e
  qualquer deploy real (a hospedagem é a decisão 5 da seção 11).
- A linha extra `npm run prisma:generate` acima está registrada como achado **N9**
  em `docs/AUDITORIA.md` e foi adicionada à seção de instalação do README nesta
  mesma rodada — é a correção mínima permitida pelo prompt, porque sem ela o
  portão de build não passa num clone novo.

---

## Como este arquivo foi medido

Comandos executados nesta rodada, todos com saída real:

```bash
git status --short && git branch -vv && git rev-list --count origin/main..HEAD
git ls-files | wc -l
npm run typecheck; npm run build; npm test
npm run test:coverage --workspace @nexus/api
npm run test --workspace @nexus/web -- --coverage \
  --coverage.include="src/**" --coverage.exclude="src/test/**"
node --version && npm --version
node -e "... Prisma \$queryRawUnsafe('SELECT VERSION()') ..."   # MySQL e tabelas
# Nota desta rodada: inventario-rotas.cjs e inventario-tabelas.cjs nunca estiveram
# na arvore versionada - a contagem anterior saiu de script solto, fora do git. Desde
# aqui a matriz de rotas e o inventario de tabelas tem fonte dentro do repo: a regra 4
# de apps/api/test/isolamento-rotas.test.ts (roda no npm test) para as rotas, e a
# secao 5 deste arquivo, medida com SHOW TABLES no MySQL, para as tabelas.
node varredura-segredos.cjs    # segredo real x credencial de desenvolvimento
grep -rhcE 'app\.(get|post|patch|put|delete)\(' apps/api/src/modules/*/*.routes.ts
curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/<as 15 rotas da seção 4>

# Re-medicao de 2026-10-13 (F3.2 Parte 1), com saida real:
find apps/api/src -name "*.routes.ts" | wc -l        # 17
find apps/api/src -name "*.ts" | wc -l               # 74
grep -c "^model " apps/api/prisma/schema.prisma      # 30
grep -c "^enum " apps/api/prisma/schema.prisma       # 19
ls apps/api/prisma/migrations | grep -c "^20"        # 19
# rotas por modulo, somando 112:
for f in apps/api/src/modules/*/*.routes.ts; do printf "%s %s\n" "$(basename $f)" "$(grep -cE 'app\.(get|post|put|patch|delete)' $f)"; done
node -e "Prisma.$queryRawUnsafe('SELECT COUNT(*) ...') "   # 31 tabelas fisicas
node -e "Prisma.$queryRawUnsafe('SELECT VERSION()')"       # 8.4.7
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health           # 200
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/service-orders   # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/audit            # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/audit/plataforma # 401
node tools/verify-ordens-de-servico.cjs   # 102 verificacoes, 0 falha (Parte 1)
node tools/verify-sidebar.cjs             # 103 checagens, 0 falhas (Parte 1)

# Re-medicao de 2026-10-13 (F3.2 Parte 2 - Cobrancas manuais e catalogo de gateways),
# toda linha com saida real guardada em log desta rodada:
npm run typecheck                          # api + web, zero erro
npm run build                              # index.js 946,30 kB / 278,06 kB gzip
                                           # index.css 395,16 kB / 60,53 kB gzip
npm test                                   # api 37 arquivos / 350 casos / 341,60 s
                                           # web 10 arquivos / 77 casos / 8,73 s
npm run test:coverage --workspace @nexus/api
   # stmts 87,23% (2.871/3.291) · branch 75,40% (1.631/2.163) · funcs 86,81% (599/690)
   # lines 90,08% (2.625/2.914) · 81 arquivos no relatorio · duracao 386,96 s
node conta-cobertura.cjs          # script de bancada desta rodada (fora do repo, em Temp):
                                  # lê apps/web/coverage/coverage-final.json e soma
                                  # instrucoes 1.217/4.372 · ramificacoes 802/3.606
                                  # funcoes 334/1.397 · linhas 1.099/3.738
                                  # 92 arquivos no JSON, 83 mensuraveis, 38 em 0%
node tools/verify-cobrancas.cjs             # 137 verificacoes, 0 falhas
node tools/verify-sidebar.cjs               # 104 checagens, 0 falhas (17 linhas)
node tools/verify-ordens-de-servico.cjs     # 103 verificacoes, 0 falhas (recapturado)
find apps/api/src -name "*.routes.ts" | wc -l        # 19
grep -rhE 'app\.(get|post|put|patch|delete)\(' apps/api/src/modules \
  --include="*.routes.ts" | wc -l                    # 120 rotas declaradas
ls apps/api/test/isolamento-rotas.test.ts            # a regra 4 bate onRoute com os 120
find apps/api/src -name "*.ts" | wc -l               # 82
ls -d apps/api/src/modules/*/ | wc -l                # 19
ls apps/api/src/lib | wc -l                          # 18 (pix.ts entrou nesta rodada)
ls apps/api/test/*.test.ts | wc -l                   # 37
grep -c "^model " apps/api/prisma/schema.prisma      # 31
grep -c "^enum " apps/api/prisma/schema.prisma       # 21
ls apps/api/prisma/migrations | grep -c "^20"        # 20
node -e "... SHOW TABLES ..."                        # 32 tabelas fisicas; charges em 0 linhas
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/charges          # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/charges/summary  # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/gateways         # 401
find apps/web/src -name '*.ts' -o -name '*.tsx' | wc -l   # 96
ls apps/web/src/pages/*.tsx | wc -l                      # 23
ls apps/web/src/test | wc -l                             # 12 (10 testes + 2 fabricas)
cat apps/web/src/styles/*.css | wc -l                    # 3.321
grep -c 'to: "/app' apps/web/src/components/layout/AdminShell.tsx   # 17 linhas de menu
ls docs/adr/*.md | wc -l                                 # 9
ls docs/screenshots/*.png | wc -l                        # 116 capturas
ls tools/*.cjs | wc -l                                   # 38
git ls-files --cached --others --exclude-standard | wc -l  # 450 arquivos da arvore
# varredura de credencial literal desta rodada: zero literais nos arquivos rastreados
# e zero no patch origin/main..HEAD, com nenhum valor impresso em parte alguma.
# Seção 3, re-medida porque a árvore congelada contradizia as seções 5 a 7:
git ls-files --cached --others --exclude-standard \
  | awk -F/ '{if (NF==1) print "raiz"; else print $1}' | sort | uniq -c   # 428: apps 253, docs 130, tools 37, assets 1, raiz 7
ls -d apps/api/src/modules/*/ | wc -l                   # 17
ls apps/api/src/lib | wc -l                             # 17 (não 13: validate-doc não existe)
ls apps/api/test/*.test.ts | wc -l                      # 36
grep -lIi audit apps/api/test/*.test.ts | wc -l          # 23 arquivos que exercitam a auditoria
find apps/web/src -name '*.ts' -o -name '*.tsx' | wc -l  # 94
ls apps/web/src/lib | wc -l                             # 22
ls apps/web/src/pages/*.tsx | wc -l                     # 22
ls apps/web/src/components/landing | wc -l              # 12 (11 .tsx + copy.ts)
ls apps/web/src/test | wc -l                            # 11 (9 testes + 2 fábricas; sem setup.ts)
cat apps/web/src/styles/*.css | wc -l                   # 3.164
ls docs/adr/*.md | wc -l                                # 8
ls docs/decisoes/*.md | wc -l                           # 7 (G1-G6 + G8)
ls docs/screenshots/*.png | wc -l                       # 108 capturas
# Corrigido na T3, porque estas três linhas não foram re-rodadas no commit de documentação
# da Parte 2 (0d80215) e ficaram atrás da própria rodada. Medido agora com
# `git ls-tree -r --name-only 0d80215 -- docs/adr | wc -l` → **9** (não 8: a ADR da cobrança
# entra nesse commit), e o mesmo contra `docs/screenshots` → **116** (não 108: as oito
# capturas da cobrança entraram no commit anterior, 0513129). Na árvore de hoje: 13 ADR — a
# décima terceira é a 0013 desta rodada —, 7 decisões e 116 capturas, e a contagem completa
# está no bloco abaixo.
# varredura de credencial: 0 literais nos 307 arquivos de texto rastreados e
# nenhum valor impresso; a contagem do historico (12 diffs) saiu de git log -S
# com o valor lido do .env em memoria, nunca na linha de comando.

# Re-medicao de 2026-10-13 (T3 - F4: autenticacao reforcada, decisoes D1, D2 e D3).
# Toda linha abaixo foi executada nesta tarefa, com saida real:
npm run typecheck                          # api + web, zero erro
npm run build                              # index.js 961,19 kB / 282,12 kB gzip
                                           # index.css 396,43 kB / 60,78 kB gzip
npm test                                   # api 46 arquivos / 434 casos / 447,05 s
                                           # web 12 arquivos / 87 casos / 10,26 s
npm run test:coverage --workspace @nexus/api
   # stmts 87,79% (3.274/3.729) - branch 76,01% (1.889/2.485) - funcs 87,30% (674/772)
   # lines 90,62% (3.006/3.317) - 92 arquivos sob src no relatorio - duracao 500,83 s
npm run test --workspace @nexus/web -- --coverage --coverage.include="src/**" --coverage.exclude="src/test/**"
   # All files 29,67 stmts / 24,73 branch / 25,36 funcs / 31,37 lines - 15,39 s
node "$TMPDIR/resume-lcov.cjs" apps/api/coverage/lcov.info   # script de bancada desta rodada, fora do repo:
   # soma o lcov e lista os tres arquivos em zero: cron.runner.ts (0/32),
   # lib/mail/smtp.ts (0/8) e lib/mail/console.ts (0/4)
node "$TMPDIR/resume-cobertura.cjs" apps/web/coverage/coverage-final.json src
   # 97 entradas, 9 sem instrucao (7 css + logo.png + vite-env.d.ts), 88 mensuraveis,
   # 38 em zero; instrucoes 1.370/4.616 e funcoes 365/1.439
find apps/api/src -name "*.routes.ts" | wc -l        # 19
grep -rhE 'app\.(get|post|put|patch|delete)\(' apps/api/src/modules \
  --include="*.routes.ts" | wc -l                    # 129 rotas declaradas
node -e "particao de rotas"                          # 13 publicas, 2 de etapa,
   # 15 plataforma, 91 empresa, 8 conta, 0 sem cadeado (mesma regra do teste)
grep -c "^model " apps/api/prisma/schema.prisma      # 34
grep -c "^enum " apps/api/prisma/schema.prisma       # 21
ls apps/api/prisma/migrations | grep -c "^20"        # 22
node -e "... SHOW TABLES ..."                        # 35 tabelas fisicas nos dois bancos
find apps/api/src -name '*.ts' | wc -l               # 93
ls apps/api/src/lib | wc -l                          # 22 (entram criptografia, tentativas e mail/)
ls apps/api/test/*.test.ts | wc -l                   # 46
find apps/web/src -name '*.ts' -o -name '*.tsx' | wc -l   # 103
ls apps/web/src/pages/*.tsx | wc -l                  # 24
ls apps/web/src/components | wc -l                   # 12 na raiz; 35 recursivo
ls apps/web/src/lib | wc -l                          # 25
ls apps/web/src/test | wc -l                         # 14 (12 testes + 2 fabricas)
grep -c 'path=' apps/web/src/App.tsx                  # 26 caminhos + index = 27 elementos
cat apps/web/src/styles/*.css | wc -l                # 3.365
ls docs/adr/*.md | wc -l                             # 13
ls docs/screenshots/*.png | wc -l                    # 116: nenhuma captura entrou e nenhuma saiu
   # nesta rodada; as seis 16-sidebar-*.png foram refeitas pela prova e **mudaram de
   # conteudo**: o cabecalho do painel, que antes das decisoes D5 e D2 saia como
   # "Empresa-1791737996018-21-359870" - a primeira ativa na ordem do indice de uuid -
   # agora sai "Nexus Demo", o vinculo mais antigo da conta de prova. As seis telas do
   # README, capturadas pela conta fixa de um vinculo so, continuam com o mesmo cabecalho
ls tools/*.cjs | wc -l                                # 41 (nenhum novo nesta rodada)
git ls-files --cached --others --exclude-standard | wc -l   # 486 arquivos da arvore
npm audit                                             # 3 high, 0 moderate na arvore
npm ls otpauth nodemailer                             # os dois sao folha; nenhuma transitiva
node tools/verify-sidebar.cjs                         # 104 checagens, 0 falhas (17 linhas)
node tools/verify-ordens-de-servico.cjs               # 107 checagens, 0 falhas (entra pelo login novo)
node tools/verify-cobrancas.cjs                       # 137 checagens, 0 falhas
node tools/verify-rotinas.cjs                         # 37 verificacoes, 0 falhas
node "$TMPDIR/varredura-segredos-t3.cjs"              # script de bancada desta rodada, fora do repo:
   # 6.905 linhas da rodada examinadas no portao guardado em arquivo, 4 credenciais locais
   # comparadas por hash, 0 coincidencia
   # com senha ou endereco real; os 17 literais de chave de segredo e os 18 enderecos literais
   # foram lidos um por um e classificados como fixture, marca de exemplo ou placeholder
node "$TMPDIR/varredura-codificacao.cjs"              # tambem de bancada: 361 arquivos de texto,
   # 0 com BOM, 0 com CRLF, 0 com caractere de alfabeto nao latino
```

**Re-medicao de 2026-10-14 (T4 - F5: robustez do frontend, fumaca, divisao do
JavaScript e regua de acessibilidade)**. Toda linha abaixo foi executada nesta
tarefa, na arvore final, com saida real guardada em log desta rodada:

```bash
npm run typecheck                          # api + web, zero erro
npm run build                              # 37 pedacos: index 354,85 kB / 121,62 kB gzip,
                                           # Agenda 286,34 kB / 83,52 kB gzip,
                                           # CSS unico 398,54 kB / 61,29 kB gzip,
                                           # 215 modulos, sem aviso de chunk acima de 500 kB
npm test                                   # api 47 arquivos / 437 casos / 337,87 s
                                           # web 18 arquivos / 140 casos / 16,49 s
npm test                                   # de novo na arvore final, agora com o npm run dev e o
                                           # Chrome das provas rodando junto: 47 / 437 em 521,26 s
                                           # e 18 / 140 em 26,55 s, EXIT=0, zero falha, zero skip
npm run test:coverage --workspace @nexus/api
   # stmts 87,79% (3.274/3.729) - branch 76,01% (1.889/2.485) - funcs 87,30% (674/772)
   # lines 90,62% (3.006/3.317) - 92 arquivos - duracao 487,10 s - 3 arquivos em zero
(cd apps/web && npx vitest run --coverage --coverage.include="src/**" --coverage.exclude="src/test/**")
   # All files 38,19 stmts / 33,11 branch / 30,67 funcs / 41,03 lines - 17,02 s -
   # 100 entradas no universo, 91 sem instrucao nenhuma (7 css, PNG e d.ts incluidos),
   # 27 arquivos de codigo em zero. Sem filtro, o mesmo comando mede so o que os testes
   # importam (68 entradas) e devolve 58,73 / 50,05 / 51,47 / 62,94 - universo diferente,
   # e por isso a comparacao entre rodadas usa o dos globs
npm run db:prova                           # 35 tabelas, 124 usuarios, 3 empresas, 7 vinculos
node tools/verify-fumaca.cjs               # 63 paginas atravessadas, 0 problemas
node tools/verify-code-splitting.cjs       # 44 verificacoes, 0 falhas
node tools/verify-acessibilidade.cjs       # 22 telas, 649 controles, 22 verificacoes, 0 falhas
node tools/verify-verificacao-e-2fa.cjs    # 56 verificacoes, 0 falhas, 0 linhas no banco depois
node tools/verify-sidebar.cjs              # 104 checagens, 0 falhas
node tools/verify-privacidade-login.cjs    # 44 verificacoes em Chrome e Edge, 0 falhas
node tools/audit-contraste-painel.cjs      # 68 de 68 tela/tema/janela, 2.862 textos medidos
                                           # (34 em degradê), 14 isentos por componente
                                           # inativo, 0 abaixo do alvo e 0 falhas; cada linha
                                           # imprime "atributos dark/dark ok" ou
                                           # "light/light ok" — a dupla chave do N7 conferida
                                           # no navegador, não no fonte
find apps/api/src -name '*.ts' | wc -l                        # 93
ls apps/api/test/*.test.ts | wc -l                            # 47 (48 com helpers.ts)
find apps/web/src -name '*.ts' -o -name '*.tsx' | wc -l       # 112
ls apps/web/src/pages | wc -l                                 # 24
ls apps/web/src/components | grep -c '\.tsx$'                 # 13 na raiz; 36 recursivo
ls apps/web/src/lib | wc -l                                   # 27
ls apps/web/src/test | wc -l                                  # 20 (18 testes + 2 fabricas)
cat apps/web/src/styles/*.css | wc -l                         # 3.594
ls docs/adr/*.md | wc -l                                      # 16 (entra a 0016 do tema)
ls docs/screenshots/*.png | wc -l                             # 116 (74 regravadas nesta rodada)
ls tools/*.cjs | wc -l                                        # 48 no disco (47 versionados +
                                                              # o senha-admin.local.cjs ignorado);
                                                              # a pasta tem 48 versionados com o .ps1
git ls-files --cached --others --exclude-standard | wc -l     # 506 arquivos da arvore
for f in tools/*.cjs; do node --check "$f"; done              # 48 arquivos, 0 falha de sintaxe
node "$TMPDIR/varredura-codificacao-t4.cjs"                   # 378 textos lidos dos 506
   # (128 binarios fora): 0 BOM, 0 CRLF, 0 caractere nao latino, 0 sem newline final
node "$TMPDIR/varredura-segredos-t4.cjs" 55bbb50              # 6.480 linhas da rodada,
   # 11 credenciais locais comparadas por hash SHA-256 contra 1.140 tokens literais,
   # 0 coincidencia, nenhum valor impresso; os 3 literais de chave de segredo e os
   # 25 enderecos em 5 dominios foram lidos um por um e classificados (nome de chave
   # de armazenamento, token de prova e marca "Prova"; dominios .teste/.test/exemplo)
# --- o banco de desenvolvimento, intocado, medido por instantaneo ---
node "$TMPDIR/instantaneo-banco-dev.cjs" antes.json                 # 35 tabelas / 70.897 linhas
npm run test --workspace @nexus/api -- run test/auth.test.ts \
  test/auth-flows.test.ts test/bloqueio-de-conta.test.ts            # 3 arquivos / 20 casos em
  # 31,98 s, os tres verdes contra o banco de prova
node "$TMPDIR/instantaneo-banco-dev.cjs" depois.json                # 35 tabelas / 70.897 linhas,
  # e o diff entre os dois instantaneos nao devolve nenhuma linha. No intervalo maior da rodada
  # entraram 6 linhas no banco de desenvolvimento, e as seis tem origem identificavel: tres
  # auth.login das provas de acesso logo abaixo, mais as tres sessoes que eles abriram. No
  # mesmo intervalo o banco de prova recebeu 1.124 auditorias da suíte.
# --- a regra de acesso, com o npm run dev apontando para o banco de desenvolvimento ---
node "$TMPDIR/prova-acesso-admin-raiz.cjs"
   # POST /api/auth/login -> HTTP 200 (user, accessToken, refreshToken, expiresIn; papel OWNER)
   # GET  /api/auth/me    -> HTTP 200, 13 campos | GET /api/companies -> HTTP 200, 37 empresas
node "$TMPDIR/prova-navegador-admin-raiz.cjs"
   # 6 verificacoes, 0 falhas: /login leva a /app, a chave nexus.refresh fica no navegador ao
   # lado de nexus.theme e nexus.sidebar.collapsed, a barra monta com 18 links, o painel monta
   # 35 blocos de conteudo sob o cabecalho "Olá, Administrador", e uma segunda entrada limpa,
   # sem cache e com o storage zerado, repete o ciclo inteiro. Nenhum valor de segredo — nem
   # senha, nem token — apareceu em nenhuma dessas linhas.
git fetch origin && git merge-base --is-ancestor origin/main HEAD   # avanco direto
git ls-remote origin HEAD && git rev-parse HEAD               # mesma linha, depois do push
```

Atualizar este documento é obrigação de quem mexer no projeto: se ele divergir do
código, o revisor externo foi enganado.
