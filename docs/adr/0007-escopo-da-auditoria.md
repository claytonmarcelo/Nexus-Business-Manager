# ADR-0007 — Escopo da auditoria: a trilha da plataforma separada por construção

- Status: Aceita (2026-10-13)
- Contexto: F2 do PROMPT MESTRE, executando a opção D do G8 (`docs/decisoes/G8-administrador-da-plataforma.md`)
  para fechar N14 e N15 de `docs/AUDITORIA.md`. O administrador global é `OWNER` de todas as empresas (decisão
  do dono, ainda em aberto quanto a migrar para a opção B), e as rotas reservadas da plataforma — vitrine,
  textos legais e rotinas de sistema — gravavam auditoria com `companyId: ctx.companyId`, isto é, a empresa em
  que o administrador estava sentado quando agiu. Medido antes de qualquer mudança: uma ação que alcança todos
  os tenants aparecia como se fosse de um deles, sobrando registro no log do cliente e faltando na trilha de
  conformidade da plataforma. Não havia campo nenhum no registro que dissesse "isto é a plataforma agindo", e
  nenhuma leitura capaz de responder "o que o administrador fez, em qual empresa, quando" sem abrir a
  auditoria tenant por tenant.
- Decisão:
  1. **O escopo vira coluna, não convenção.** `AuditLog.scope` (`apps/api/prisma/schema.prisma:168`, migração
     `20261013000000_add_escopo_da_auditoria`) vale `"tenant"` (padrão) ou `"platform"`, e é a coluna que decide
     em qual trilha o evento aparece. O padrão existe para que as linhas escritas antes da F2 continuem sendo o
     que sempre foram: eventos de empresa.
  2. **`audit()` anula o `companyId` de evento de plataforma por construção** (`apps/api/src/lib/audit.ts:33-41`).
     Quem escreve a rota não consegue, mesmo esquecendo, produzir um evento de plataforma com empresa dona: a
     linha nasce com `companyId: null`. A empresa da sessão não desaparece — passa a `metadata.empresaDaSessao`,
     que é origem, não posse. Isso é o que impede a trilha de virar uma porta: continua sabendo de onde o
     administrador agiu sem afirmar que o registro pertence àquela empresa.
  3. **Só módulo de plataforma carimba evento de plataforma, e quem lê não escreve.** Medido nesta rodada: dos
     57 blocos `audit({...})` do `src`, exatamente 8 são de plataforma — 5 em `modules/cms/cms.service.ts`,
     1 em `modules/cms/cms.routes.ts` (token de manutenção) e 2 em `modules/cron/cron.routes.ts`. As 6 rotas de
     escrita do CMS têm bloco de auditoria correspondente, o que fecha o "NÃO VERIFICADO" que a R3 registrou.
     `modules/audit/audit.routes.ts` tem zero blocos: a leitura de auditoria não gera auditoria, o que evita uma
     trilha que cresce ao ser consultada. A regra é guarda estrutural em `apps/api/test/isolamento-rotas.test.ts`
     (regras 8 e 9), que compara a lista de arquivos que carimbam plataforma com a lista nominal dos módulos de
     plataforma.
  4. **A leitura é uma rota própria, conferida no banco a cada requisição.** `GET /api/audit/plataforma`
     (`apps/api/src/modules/audit/audit.routes.ts:98-135`) exige `assertPlatformAdmin` — que consulta
     `platformRole`/`SUPER_ADMIN_EMAIL` no banco, não o token — e filtra por `scope: ESCOPO_PLATAFORMA`. Ela não
     pede permissão de módulo porque não responde por uma empresa, e nenhuma linha devolvida carrega
     `companyId`: o que o cliente recebe é `origemSessao` com o **nome** da empresa de origem, resolvido em uma
     única consulta, com `"empresa removida"` quando o vínculo sumiu.
  5. **A trilha do tenant não é o lugar da plataforma, e isso fica dito na tela.** `/app/auditoria` ganhou
     painel permanente ("O que esta trilha não mostra") e o atalho para a trilha da plataforma só aparece para
     quem tem `user.platform === true`. A tela nova (`apps/web/src/pages/PlataformaAuditoria.tsx`) é a única
     página do painel sem `permission:` no menu: o critério é o papel da plataforma, e a guarda é a mesma da
     rota — sem o papel, a tela diz "Área reservada da plataforma" e **nenhuma chamada de rede sai do
     navegador** (medido em teste e na prova do navegador).
  6. **Nada foi reescrito na história.** As 3.705 linhas de entidade de plataforma que já existiam no banco de
     desenvolvimento quando a coluna entrou continuam com `scope: "tenant"` e `companyId` preenchido, e não
     foram corrigidas em massa. Reescrever auditoria para fazer número bonito é exatamente o que a trilha existe
     para impedir; a limitação está registrada como N27 em `docs/AUDITORIA.md`.
- Consequências:
  - A conformidade do administrador global passa a ter prova técnica, que é o que a opção D prometia: a
    pergunta "o que ele fez pela plataforma" tem resposta em uma tela, em ordem, com origem nomeada.
  - O poder do administrador não mudou nada: nenhuma autorização foi tocada nesta fase, e o vínculo `OWNER`
    continua como o dono decidiu. A pergunta do G8 (migrar para break-glass, opção B) continua em aberto — e o
    D é o que torna o B uma mudança de procedimento, não de arquitetura, porque a trilha já existe.
  - Toda escrita de plataforma passa a ser visível **só** na trilha da plataforma. O dono da empresa onde o
    administrador estava sentado deixa de ver, na própria auditoria, eventos que nunca foram do seu tenant — e
    passa a ver, no painel, a explicação de por que aquilo não está lá.
  - O custo de manutenção é real e pago por teste: um módulo novo que carimbar evento de plataforma sem ser
    módulo de plataforma quebra a regra 9; uma rota de leitura que começar a escrever auditoria quebra a mesma
    regra; uma linha de plataforma que nascer com `companyId` quebra a regra 8 e o teste comportamental
    `auditoria-da-plataforma.test.ts`. A prova de que as guardas mordem foi feita por mutação: trocar `audit()`
    para respeitar o `companyId` recebido devolve 5 falhas na suíte.
  - A coluna nova é `VARCHAR(16)` com padrão, então a migração é aditiva: no banco de desenvolvimento, com
    45.609 eventos de auditoria, nenhuma linha existente foi tocada — as 195 linhas de plataforma medidas nesta
    rodada são todas escritas depois da migração.
