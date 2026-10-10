# ADR-0001 — Persistência única com Prisma

- Status: Aceita (2026-10-10)
- Contexto: O prompt §6.1 lista `mysql2` e Prisma como tecnologias possivelmente presentes, mas
  exige escolha de persistência única e clara (§4, §9). Não há código legado (ver `docs/ANALISE.md`).
- Decisão: Adotar Prisma como única camada de acesso a dados. `mysql2` é usado apenas como driver
  de conexão do Prisma (via `DATABASE_URL`), nunca para SQL direto na aplicação. Repositórios
  chamam o Prisma Client; nenhuma query SQL crua espalhada.
- Alternativas: (a) SQL parametrizado puro com mysql2; (b) híbrido — rejeitado por recriar a
  inconsistência que o prompt quer evitar.
- Consequências: Migrations reproduzíveis, tipos gerados, integridade referencial declarada. Quando
  necessário SQL arbitrário, `$queryRaw` parametrizado de forma pontual e documentada.
