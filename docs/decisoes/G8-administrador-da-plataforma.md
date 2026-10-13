# G8 — Administrador da plataforma é OWNER de todas as empresas

**Situação:** AGUARDA DECISÃO DO DONO para A/B/C · **Década:** 2026-10-12, atualizado em 2026-10-13 ·
**A opção D foi entregue na F2 do PROMPT MESTRE: nenhuma autorização mudou, e a trilha separada passou a
existir.** O retrato do código abaixo é o que a R3 mediu; a seção "O que mudou desde a R3" diz o que vale hoje.

## O que o código faz hoje, com arquivo e linha

**1. O administrador global vira OWNER de toda empresa nova, sem ninguém pedir.** São três portas, e nenhuma
delas é opcional:

- `apps/api/src/modules/auth/auth.service.ts:279-293` — no cadastro self-service, depois de criar a empresa e
  o vínculo do dono, a transação busca `user.findMany({ where: { platformRole: "SUPER_ADMIN", active: true } })`
  e faz `companyUser.upsert(... role: "OWNER")` para cada um.
- `apps/api/src/modules/companies/companies.service.ts:34-47` — criação de empresa pela API tem o mesmo loop e
  o mesmo upsert.
- `apps/api/prisma/seed.ts:107-115` — o seed percorre **todas** as empresas do banco (`company.findMany`) e
  garante `OWNER` ao administrador global em cada uma. Uma empresa criada antes dessa regra volta a ter o
  administrador dentro na primeira corrida do seed.

**2. Ele não perde o papel.** `apps/api/src/modules/users/users.service.ts:115-124` recusa em 409 qualquer
rebaixamento de quem tem `platformRole === "SUPER_ADMIN"` (ou o e-mail de `SUPER_ADMIN_EMAIL`) — e a regra de
hierarquia em `apps/api/src/lib/rbac.ts` não é o caminho disso, é um cadeado separado, posto na Fase 1b. Como
`rbac.ts:9` define `OWNER: ["*"]`, o papel dá a ele tudo o que a empresa dá ao próprio dono: ler e escrever
clientes, vendas, financeiro, estoque, usuários, papéis e auditoria.

**3. Ele lê e escreve em qualquer empresa — mas não por bypass.** `apps/api/src/lib/company-context.ts:20-47`
não tem atalho nenhum para administrador de plataforma: cada requisição continua exigindo linha em
`company_user`, conta ativa e empresa ativa. O que abre a porta é o vínculo que os itens 1 e 2 criam em todo
lugar. A lista de empresas (`companies.service.ts:60-73`) também é filtrada por vínculo, então ele vê a
plataforma inteira porque é membro de tudo, não porque há uma rota "liste todos os tenants".

**4. Superfície só dele.** `apps/api/src/lib/platform.ts:11-21` (`assertPlatformAdmin`, conferido no banco a
cada requisição) guarda a vitrine e os textos legais (`modules/cms/cms.routes.ts:68-145`) e as rotinas de
sistema (`modules/cron/cron.routes.ts:16-44`).

**5. Uma porta que ele não tem.** A recuperação de senha não toca o administrador da plataforma
(`auth.service.ts:316-331`, com cinto extra no `resetPassword` em `:364-368`) — o registro volta `ok` genérico
e grava `auth.forgot_password_bloqueado`.

## O que NÃO existe hoje (a terceira pergunta da R3)

**Não há auditoria separada do administrador.** `apps/api/src/lib/audit.ts:14-32` grava
`userId`/`companyId`/`action`/`ip` exatamente igual para qualquer usuário, e a leitura é filtrada pela empresa
do contexto (`apps/api/src/modules/audit/audit.routes.ts:28`). Consequências, uma a uma:

- **O que é bom:** o dono de cada empresa enxerga a ação do administrador na própria aba de Auditoria — não há
  acesso invisível dentro do tenant.
- **O que falta (a):** não existe visão de plataforma do tipo "o que o administrador fez, em qual empresa,
  quando". Para saber isso hoje é preciso abrir a auditoria de cada tenant, um por um.
- **O que falta (b):** nada distingue, no registro, "atuando como plataforma" de "atuando como dono desta
  empresa". O campo que permitiria essa separação não é preenchido em lugar nenhum.
- **O que falta (c):** não há aviso ao dono da empresa quando o administrador entra, nem alerta, nem relatório.
- **Um ruído medido agora:** as rotas de plataforma gravam auditoria com `companyId: ctx.companyId`
  (`cron.routes.ts:27-35` e `:44`), ou seja, uma ação que é da plataforma inteira aparece no log do tenant que
  estava ativo na sessão de quem clicou. É registro a menos no lugar certo e registro a mais no lugar errado.
- **NÃO VERIFICADO:** se todas as escritas de CMS gravam auditoria (contei 1 chamada em `cms.routes.ts` e 5 em
  `cms.service.ts`, mas não conferi rota por rota).

## Por que isso é um problema (LGPD)

- Quem coleta os dados do tenant é o **controlador** (art. 5º, II); a plataforma, no melhor dos casos, é
  **operador** (art. 5º, VII) — e operador trata dado **por instrução** do controlador (art. 39, e o art. 6º,
  III). Um vínculo OWNER permanente, que não nasce de instrução nenhuma e não pode ser removido, não cabe
  nessa figura.
- O acesso abre dados pessoais de clientes, funcionários e histórico financeiro de terceiros sem base legal no
  art. 7º e sem necessidade demonstrável — o art. 6º, I (necessidade) e III (adequação) pedem que o tratamento
  se limite ao essencial para a finalidade.
- Art. 6º, VI e o dever de *accountability*: sem trilha separada, não há como demonstrar a um titular ou à ANPD
  que os acessos foram limitados, justificados e revogáveis.
- Art. 46: segurança técnica. Um vínculo irremovível em todas as contas multiplica o impacto de uma única
  credencial vazada — com a senha do administrador se entra em qualquer empresa, com o papel de dono.
- Comercial: se o painel for vendido como SaaS, essa regra precisa estar escrita no contrato e na política de
  privacidade. **Hoje ela não está em lugar nenhum** — só no código e no `CREDENCIAIS.md` da máquina.

## Opções

| Opção | Como funciona | Prós | Contras | Esforço |
|---|---|---|---|---|
| **A — manter como está e ser honesto** | Código não muda; a regra vira cláusula: política de privacidade e contrato dizem que o administrador da plataforma é OWNER de todas as empresas para suporte, e a tela de Auditoria ganha um aviso permanente disso | risco zero de quebrar isolamento; honestidade com o cliente; sai barato | o poder ilimitado continua; a conformidade passa a depender de contrato, não de técnica; o titular continua sem como ver o que ele fez | **BAIXO** — ~0,5 dia de documento + ~1 dia de tela |
| **B — acesso elevado sob demanda (break-glass)** | Tiram-se os auto-OWNER de `auth.service.ts:282-293` e `companies.service.ts:36-47`; entrar na empresa de terceiros passa a exigir comando explícito com motivo e TTL (ex. 60 min), gravando abertura e fechamento em trilha própria | menor privilégio de verdade (art. 6º, I); continua servindo ao suporte; a trilha nasce junto com o recurso; é o desenho que um cliente enterprise espera | migration nova (`platform_grants`), rotas novas, testes de intrusão e de seed reescritos, e o suporte fica um passo mais lento quando o dono está offline; o seed de desenvolvimento perde a conveniência | **MÉDIO-ALTO** — 3 a 5 dias com testes |
| **C — OWNER só em empresa de demonstração** | O auto-OWNER passa a valer apenas para empresa marcada como demo; em empresa real não há vínculo, e o suporte usa telas administrativas que não expõem dado pessoal | resolve o problema na raiz; é o mais defensável num contrato; SaaS vendável sem asterisco | suporte a incidente de dados fica dependente de o cliente dar acesso; mexe em `company-context` e em toda suposição de vínculo; é a maior mudança de comportamento do projeto | **ALTO** — 5 a 8 dias |
| **D — manter o vínculo e auditar à parte** | Continua OWNER, porém: marca "plataforma" no evento, tela `/app/plataforma/auditoria` que atravessa tenants, e aviso ao dono da empresa quando o administrador entra | preserva 100% do comportamento atual; responde ao art. 6º, VI com prova técnica; esforço pequeno; é compatível com A e prepara B | não reduz poder nenhum, só vigia; exige decisão sobre avisar ou não o dono (em demonstração o aviso pode sobrar) | **BAIXO-MÉDIO** — 1,5 a 2,5 dias |

## Recomendação

**A + D agora, B como destino.** A é obrigatória em qualquer cenário — o que existe hoje não pode ficar só no
código. D custa pouco, não muda autorização nenhuma e fecha o buraco da trilha, que é a parte tecnicamente
indefensável do desenho atual. B é o modelo correto quando o produto for vendido como SaaS multi-tenant de
verdade, e D já deixa pronta a trilha que o B vai usar. C só se o suporte nunca precisar entrar nos dados do
cliente.

## O que eu preciso de você

**O administrador global continua sendo OWNER automático de toda empresa criada (cenário A/D), ou passa a
entrar na empresa de terceiros só por acesso temporário, com motivo e trilha (cenário B)?**

Sem essa resposta nada muda: o vínculo de hoje continua exatamente como está, e a R3 não toca em código.

## O que mudou desde a R3 — a opção D foi entregue na F2 (2026-10-13)

Nenhuma autorização foi tocada: o administrador continua `OWNER` de toda empresa pelos mesmos três caminhos
medidos acima, `assertPlatformAdmin` continua conferido no banco a cada requisição, e a pergunta do fim deste
documento continua sem resposta. O que mudou é a **prova técnica** de quem ele é quando age pela plataforma, que
é exatamente o item (a), (b) e o "ruído medido" da seção "O que NÃO existe hoje".

**1. O registro agora diz de quem é o evento.** `AuditLog.scope` vale `"tenant"` (padrão) ou `"platform"`, e o
`audit()` (`apps/api/src/lib/audit.ts:33-41`) **anula** o `companyId` de todo evento de plataforma por
construção: a linha nasce sem empresa dona. A empresa em que o administrador estava sentado continua registrada,
em `metadata.empresaDaSessao`, como origem — não como posse. Isso fecha o **ruído medido** do item acima: as 8
escritas de plataforma (5 em `cms.service.ts`, 1 em `cms.routes.ts`, 2 em `cron.routes.ts`) não aparecem mais no
log do tenant como se fossem do tenant.

**2. A visão de plataforma existe.** `GET /api/audit/plataforma` (`audit.routes.ts:98-135`) lê só
`scope: "platform"`, atravessa tenants, e devolve `origemSessao` com o **nome** da empresa de origem — nunca um
`companyId`. A tela `/app/auditoria-plataforma` (menu "Auditoria da plataforma", visível apenas com
`user.platform === true`) mostra Ação · Entidade · Quem · Origem da sessão · IP · Quando, com filtro, período e
exportação CSV. O caminho entregue difere do rascunho da opção D ("`/app/plataforma/auditoria`"): o nome segue o
padrão de rota do painel, e isso está registrado na divergência N26 de `docs/AUDITORIA.md`.

**3. O item (a) está respondido e o (c) não.** Hoje se sabe, em uma tela, o que o administrador fez pela
plataforma, em qual empresa ele estava e quando — sem abrir a auditoria tenant por tenant. Já o **aviso ao dono
da empresa quando o administrador entra** não foi entregue como notificação em tempo de entrada: o que existe é o
painel permanente na Auditoria da empresa ("O que esta trilha não mostra"), que diz que ações de plataforma têm
trilha própria e reservada. Avisar o dono no momento do acesso é escolha de produto e de contrato (item A e a
pergunta abaixo), não correção técnica, e continua com o dono.

**4. O item (b) morreu por construção, não por convenção.** A guarda estrutural
`apps/api/test/isolamento-rotas.test.ts` (regras 8 e 9) exige que todo evento de plataforma declare o escopo e
que a lista de arquivos que carimbam plataforma seja exatamente a lista dos módulos de plataforma — um módulo de
tenant que tentar se carimbar como plataforma quebra o teste, assim como uma rota de leitura de auditoria que
começar a escrever. A leitura de auditoria não gera auditoria (`audit.routes.ts` tem zero blocos `audit({`).

**5. A história não foi reescrita.** No banco de desenvolvimento, 3.705 linhas de entidade de plataforma escritas
antes da coluna nova seguem com `scope: "tenant"` e empresa dona. Nada foi corrigido em massa: reescrever
auditoria para melhorar a métrica é o que a trilha existe para impedir. Limitação registrada como N27.

**Medida desta rodada:** a matriz lida do próprio Fastify dá **106** rotas de negócio (método + caminho, sem as
espelhos de `HEAD` e sem o `OPTIONS *` do CORS), das quais **10** públicas de propósito, **15** de plataforma
(11 de CMS + 3 de rotinas + a nova leitura da trilha) e **81** de empresa; **0** rotas registradas sem gate. A
varredura anônima pelas 95 rotas não públicas devolveu 401 em todas.

**O que a F2 não responde:** se o vínculo `OWNER` automático deve continuar. A opção D deixou a trilha pronta —
ela é o que torna a opção B uma mudança de procedimento, e não de arquitetura — mas o poder em si continua
exatamente como a R3 descreveu.
