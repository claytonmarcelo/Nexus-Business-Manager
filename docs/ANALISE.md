# Matriz de analise - Fase 1 (evidencias reais)

> Data: 2026-10-10. Ambiente: Windows + WAMP (MySQL 8.4.7 em `localhost:3306`).

## Fontes inspecionadas (evidencia, nao suposicao)

| Fonte | Resultado | Verificacao |
|---|---|---|
| `github.com/claytonmarcelo/Nexus-Business-Manager` | **Repositorio vazio** | `git clone` ("empty repository"), `git ls-remote` vazio, API `409 Git Repository is empty` |
| Banco `nexusbusinessmanager` | **Existe, sem tabelas** | `SHOW TABLES` vazio |
| Banco `nexusfield` | **Outro produto** (Laravel, servico de campo) | `service_orders`, `technicians`, `teams`, `tickets`, `jobs`, `migrations` |
| Banco `nexusdb` | **Outro app** (alugueis/negociacoes) | `alugueis`, `negociacoes`, `pedidos` |
| Logo oficial | **Asset de marca real** | Copiada para `assets/brand/logo/`; cores extraidas por decodificacao PNG |

## Conclusao central

Nao ha codigo nem schema legado do Nexus Business Manager recuperavel. O repositorio de referencia
esta vazio e o banco-alvo nao tem tabelas. A "reconstrucao do zero" e, portanto, um fato do
ambiente - confirmado pelo usuario: construir 100% do zero, usando o PROMPT MESTRE como
especificacao funcional e a logo como fonte de verdade da identidade visual.

`nexusfield` e `nexusdb` sao de outros produtos e NAO serao misturados (ver secao 37 do prompt).

## Matriz por area

| Area | Estado | Problema/risco | Conceito a preservar | Solucao no projeto novo |
|---|---|---|---|---|
| Arquitetura | Sem codigo anterior | - | Modulos coerentes | Monorepo `apps/api`+`apps/web`, camadas definidas |
| Backend | Nao encontrado | - | Node+TS+Fastify+JWT+Zod | Fastify 5 + TS estrito + Zod + Prisma |
| Frontend | Nao encontrado | - | React+Vite+AdminLTE | React 18 + Vite + AdminLTE 4 + Tailwind 4 |
| Banco | `nexusbusinessmanager` vazio | Sem schema | MySQL multiempresa | Schema novo via Prisma migrations |
| Autenticacao | Nao encontrada | - | JWT + hash | `@fastify/jwt` + bcryptjs |
| Multiempresa | Nao encontrado | `company_id` do FE sem validacao | Isolamento por empresa | Contexto do token + vinculo verificado no backend |
| Seguranca | Nao encontrada | - | - | helmet, CORS, rate-limit, Zod, Prisma parametrizado |
| Identidade | Logo real | Cores do prompt eram hipotese | Premium gourmet | Paleta extraida da logo (`docs/design/palette.md`) |
| Modulos | Nao encontrados | Contaminacao de escopo | ERP SaaS | Fase 1: auth/empresas/usuarios/RBAC/auditoria |
| Testes | Nao encontrados | - | - | Vitest (auth/RBAC/multiempresa/paginacao) |
| Docs | Inexistente | - | - | README novo coerente com o codigo |
| CI/CD e Git | Repo vazio | - | - | Git local, commits pt-BR; CI quando houver remoto |

## Diferenciacao (secao 3)

- Comprovado: repo de referencia vazio; banco-alvo sem tabelas.
- Risco: contaminacao por `nexusfield`/`nexusdb`.
- Hipotese nao comprovada: paletas/versoes "aproximadas" do prompt secoes 4 e 10.
- Existente: apenas a logo.
- A reconstruir: todo o restante.
