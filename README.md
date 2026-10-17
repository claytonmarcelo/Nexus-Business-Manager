# Nexus Business Manager

![Logotipo do Nexus](assets/brand/logo/logo.png)

Sistema de gestão empresarial multiempresa para pequenas e médias empresas: clientes, produtos e estoque, vendas, compras, financeiro, CRM, agenda e ordens de serviço em um único painel.

![Licença: UNLICENSED](https://img.shields.io/badge/licen%C3%A7a-UNLICENSED-orange) ![TypeScript: 5.6](https://img.shields.io/badge/TypeScript-5.6-blue) ![Node.js: 20 ou maior](https://img.shields.io/badge/Node.js-20%2B-green)

![Painel do Nexus: visão geral da empresa](docs/screenshots/03-dashboard.png)

## Destaques técnicos

- **Monorepo de workspaces**: a API (`@nexus/api`, Fastify) e o painel (`@nexus/web`, React) são separados e conversam por HTTP autenticado.
- **Duas camadas de administração**: a plataforma e a empresa. Quem responde pela vitrine e pelas rotinas não é o administrador do tenant, e cada camada tem rotas e auditoria próprias.
- **Isolamento por empresa por construção**: toda leitura e escrita parte do `companyId` da sessão autenticada, e um teste de intrusão monta duas empresas reais para atacar as rotas de uma com os identificadores da outra.
- **Sessão que gira**: o access token vive só na memória do navegador, o refresh token é rotacionado a cada uso, e um token já rotacionado que reaparece derruba a linhagem inteira e fica registrado na auditoria.
- **Papéis no banco**: `OWNER`, `ADMIN`, `MANAGER` e `STAFF` dentro da empresa, mais `SUPER_ADMIN` para a plataforma.
- **Trilha de auditoria**: quem fez o quê, em qual registro, quando e de que endereço — com tela para a empresa e tela separada para a plataforma.

## Módulos

Clientes · Produtos e estoque · Vendas · Compras e fornecedores · Financeiro · CRM e pipeline · Agenda · Ordens de serviço · Cobranças · Notificações · Equipe e permissões · Auditoria · Configurações · Rotinas agendadas · Editor da vitrine pública.

Os indicadores vêm de rotas de relatório na API e aparecem no painel; o CSV é gerado no navegador, nas telas de listagem. Não existe tela de relatórios nem servidor de exportação.

## Tecnologias

| Camada | Stack |
|---|---|
| API | Node.js, Fastify, Prisma, MySQL, Zod, Vitest |
| Web | React, Vite, Tailwind CSS, AdminLTE, FullCalendar |
| Operação | Docker Compose, scripts de verificação em `tools/` |

Lint, formatador e integração contínua ainda não existem no repositório. É item aberto, listado em [`docs/ESTADO-ATUAL.md`](docs/ESTADO-ATUAL.md).

## Como rodar

Pré-requisito: Node.js 20 ou maior e um MySQL 8 com um banco vazio criado.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Antes do `db:migrate`, copie `apps/api/.env.example` para `apps/api/.env` e ajuste `DATABASE_URL`, os dois segredos de JWT e as senhas que o seed exige (`SUPER_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e `SEED_DEV_PASSWORD`). Para a conta de desenvolvimento e a empresa de demonstração aparecerem, ligue também `SEED_DEV_ACCOUNT=1` e `SEED_DEMO_COMPANY=1` — no arquivo de exemplo as duas vêm desligadas de propósito. O `db:migrate` aplica o histórico versionado de migrations — desde a C1 (2026-10-15) ele funciona em banco vazio; o baseline está descrito em [`docs/adr/0024-baseline-de-migrations.md`](docs/adr/0024-baseline-de-migrations.md). O `db:seed` cria o administrador da plataforma, a conta de desenvolvimento e a empresa de demonstração. O painel sobe em `http://localhost:5173` e fala com a API em `3001`.

Os quatro comandos acima foram rodados num clone novo do repositório, contra um banco MySQL zerado, no commit da própria C1: o `npm ci` precisou de `npm run prisma:generate -w @nexus/api` no meio (é o achado **N9** — o npm bloqueia o postinstall do Prisma por política de scripts), o `db:migrate` aplicou o baseline, o `db:seed` semeou as contas e o login da conta de desenvolvimento respondeu 200 pelo proxy do Vite até a API, com `/api/auth/me` e `/api/companies/current` atrás dele. A medição está na linha C1.6 de [`docs/STATUS-AJUSTES.md`](docs/STATUS-AJUSTES.md).

`npm run db:push` é atalho de desenvolvimento para reconstruir a estrutura do schema sem histórico de migrations — não é o caminho de uma instalação limpa.

Subida em container e ordem de produção estão em [`docs/PRODUCAO.md`](docs/PRODUCAO.md).

## Estrutura

```
apps/api      Fastify + Prisma
apps/web      React + Vite
docs/         estado, decisões, auditoria e capturas
tools/        pilha de prova, capturas e provas de navegador
deploy/       backup e restauração do banco
assets/       marca
```

## Estado do projeto

Projeto em desenvolvimento ativo. Contagem de rota, de migration e de teste não fica aqui porque envelhece: está em [`docs/ESTADO-ATUAL.md`](docs/ESTADO-ATUAL.md). O que está aberto, achado por achado, em [`docs/AUDITORIA.md`](docs/AUDITORIA.md); as escolhas em [`docs/adr/`](docs/adr/) e [`docs/decisoes/`](docs/decisoes/). Índice da documentação: [`docs/README.md`](docs/README.md).

## Autor

**Clayton Marcelo** — Desenvolvedor Full Stack

[GitHub](https://github.com/claytonmarcelo) · [LinkedIn](https://www.linkedin.com/in/clayton-marcelo-dev) · [Site](https://cmarcelodev.com)

## Licença

Ainda não existe arquivo `LICENSE`: o `package.json` declara `UNLICENSED`, e a licença do repositório é decisão pendente do dono ([`docs/decisoes/G6-licenca.md`](docs/decisoes/G6-licenca.md)).
