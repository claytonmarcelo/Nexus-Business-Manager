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
npm run db:push
npm run db:seed
npm run dev
```

Antes do `db:push`, copie `apps/api/.env.example` para `apps/api/.env` e ajuste `DATABASE_URL`, os dois segredos de JWT e as senhas que o seed exige (`SUPER_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e `SEED_DEV_PASSWORD`). O `db:push` monta a estrutura atual do schema e gera o cliente Prisma; o `db:seed` cria o administrador da plataforma, a conta de desenvolvimento e a empresa de demonstração. O painel sobe em `http://localhost:5173` e fala com a API em `3001`.

Esses quatro comandos foram rodados num clone novo do repositório, contra um banco MySQL zerado: o `db:push` montou a estrutura do schema, o `db:seed` semeou as contas, e o login da conta de desenvolvimento respondeu pelo proxy do Vite até a API.

O `npm run db:migrate` não é o caminho de uma instalação zerada, e isso é achado aberto: treze migrations redeclaram as chaves `company_users_*_fkey`, e no MySQL o nome de uma chave vale para o banco inteiro — a cadeia para em `P3018 / 1826`. Está registrado como **N54** em [`docs/AUDITORIA.md`](docs/AUDITORIA.md), e o fechamento é a fase de operações. Num banco que já tem estrutura a subida continua por `prisma migrate deploy`, que é o que o container tenta primeiro.

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
