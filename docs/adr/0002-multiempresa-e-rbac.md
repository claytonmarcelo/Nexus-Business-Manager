# ADR-0002 — Isolamento multiempresa e RBAC

- Status: Aceita (2026-10-10)
- Contexto: SaaS multiempresa (§35) + RBAC (§34). Risco comprovado: confiar em `company_id` vindo do
  frontend.
- Decisão:
  - Vínculo usuário↔empresa em `company_users` (com `role`). O JWT carrega `sub` (userId) e `cid`
    (empresa ativa). O backend nunca aceita `company_id` arbitrário do corpo/query: é derivado do
    token e revalidado contra `company_users` a cada request.
  - Toda query de entidade pertencente a empresa filtra por `companyId` do contexto.
  - RBAC: papéis (`owner`, `admin`, `manager`, `staff`) com mapa de permissões recurso/ação,
    aplicado no backend (esconder botão no FE não é controle de acesso).
  - Sem regra de negócio atrelada a e-mail/pessoa específica (§34).
- Consequências: Testes de acesso cruzado entre empresas são obrigatórios.
