# ADR 0024 — O histórico de migrations recomeça com um baseline

Data: 2026-10-15
Estado: Aceito

## Contexto

O achado N54 foi medido na rodada do README (2026-10-15) e reproduzido novamente nesta fase C1.1:
`prisma migrate deploy` falha na segunda migration (`20261010164015_add_clients`) com
`P3018 / 1826 Duplicate foreign key constraint name 'company_users_user_id_fkey'`.

A causa é o comportamento do MySQL: nomes de chave estrangeira são únicos dentro do *database*,
não por tabela. As 23 migrations foram geradas com `prisma migrate dev` em um banco que já existia.
Cada uma delas recria a tabela `company_users` com `DROP TABLE IF EXISTS` + `CREATE TABLE` + a FK
`company_users_user_id_fkey`. O `init_foundation` cria a FK; a próxima migration a recria; MySQL não
permite dois objetos com o mesmo nome no mesmo schema.

Nenhum ambiente real — nem produção, nem hospedagem — aplicou as migrations antigas até hoje: o
caminho que a casa usa é `prisma db push`, que ignora o histórico. Isso torna as 23 migrations um
registro sem consequência prática.

## Decisão

Recomeçar o histórico com uma única migration baseline que contém o schema atual inteiro.

1. Gerar o SQL com `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`.
2. Salvar as 23 migrations antigas em `docs/legado/migrations-antigas/` — o conteúdo fica no
   repositório para consulta histórica, sem participar do `migrate deploy`.
3. Criar `apps/api/prisma/migrations/20261015000000_baseline/migration.sql` com o SQL gerado.
4. Manter `migration_lock.toml` (provider mysql).

## Consequências

- `prisma migrate deploy` funciona em banco vazio — portão 1 da versão 1.0.0.
- Quem já tem o banco de desenvolvimento estruturado precisa registrar o baseline antes de rodar
  `migrate deploy`: `prisma migrate resolve --applied 20261015000000_baseline`.
- A verificação de deriva (`migrate diff --from-migrations --to-schema-datamodel --exit-code`)
  entra no CI.
- O `db:push` permanece como atalho de desenvolvimento rotulado, nunca como porta de produção.

## O que foi recusado

- **Apagar e reescrever as migrations antigas com FK por tabela.** Não resolve o problema das 13
  migrations que redeclaram a FK; gera um histórico mais confuso; exige reconstruir o banco.
- **Usar `db push` em produção.** Ignora o histórico de `_prisma_migrations`, impossibilita rollback
  controlado e não é auditável.
- **Manter `db push` como porta de entrada do README e adiar N54.** O contrato (§1, portão 1) exige
  `migrate deploy` funcionando em banco vazio para a tag 1.0.0.
