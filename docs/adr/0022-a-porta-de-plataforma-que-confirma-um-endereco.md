# ADR-0022 — A porta de plataforma que confirma um endereço, e o administrador que nasce destrancado

- Status: Aceita (2026-10-14)
- Contexto: quinto item da T5 (F6) do prompt de continuação — achado **N61** de `docs/AUDITORIA.md`. Desde a F4
  a única escrita em `users.email_verified_at` era `confirmarEmail()` (`verificacao.service.ts:118`), disparada
  pelo clique no link ou pelo código digitado na tela pública; medido por grep em `apps/api/src`: nenhum
  endpoint, nenhuma rota de plataforma, nenhum script de linha de comando marcava a coluna. Com a decisão D2
  obrigando verificação em produção (`REQUIRE_EMAIL_VERIFICATION=1`), isso deixou de ser teórico: a entrega do
  link falha exatamente no cadastro (`auth.verificacao_entrega_falhou` na auditoria), a pessoa fica sem link,
  sem confirmação e sem painel, e quem atende não tem botão — a saída documentada era `UPDATE` no banco à mão,
  que é a coisa que um runbook existe para evitar. No caminho apareceu um segundo caso, mais grave e invisível:
  `verificacao.service.ts:147` **recusa** enviar link para quem tem `platformRole === "SUPER_ADMIN"`, e o
  bootstrap (`apps/api/prisma/administrador-da-plataforma.ts`) nunca escreveu a coluna. Com a régua da D2 ligada,
  o script que a regra de acesso do dono manda criar criava uma conta que não consegue entrar — registrada aqui
  como **N78**. Alternativas consideradas e recusadas: **(a) CLI `npm run confirmar-email`** no padrão do
  `admin:criar` — recusado porque suporte não se faz de terminal, a trilha de quem confirmou dependeria do log
  do processo, e a fila de quem espera continuaria invisível; **(b) abrir a porta para o ADMIN da empresa** —
  recusado: confirmar endereço é afirmar identidade, e um administrador de tenant escolhendo quais contas entram
  sem provar a caixa postal delas é maior poder do que qualquer rota de empresa deveria ter; **(c) desligar a D2
  em produção** — não é escolha desta tarefa, é escolha do dono, e ela existe justamente para o cenário que o
  achado descreve; **(d) apagar o link de verificação em vez de marcá-lo como gasto** — recusado porque a tabela
  é a prova de que o link existiu, e `usedAt` já é o estado de "assunto encerrado" que o caminho público usa;
  **(e) gravar `emailVerifiedBy` na tabela `users`** — recusado por ora: exige migration, e a coluna nova não
  diria mais nada além do que a linha de auditoria já diz com quem, quando, por qual motivo e para qual endereço
  mascarado. Fica declarado embaixo o dia em que isso passa a ser necessário.
- Decisão:
  1. **A porta é da plataforma, e a matriz confere isso.** `GET /api/plataforma/contas/sem-confirmacao` e
     `POST /api/plataforma/contas/:userId/confirmar-email` (`apps/api/src/modules/platform-accounts/`) têm
     `assertPlatformAdmin` como único cadeado, sem permissão de módulo. O prefixo `/api/plataforma` entrou na
     regra 5 de `isolamento-rotas.test.ts` ao lado de `/api/cms` e `/api/ops`, e `contas.service.ts` entrou na
     lista de arquivos de plataforma, que o mesmo teste exige ser exatamente o conjunto que carimba
     `ESCOPO_PLATAFORMA`. A superfície foi de 129 para **131** rotas em 20 arquivos.
  2. **A fila mostra quem espera, com o tamanho do transtorno.** Entram só contas com `emailVerifiedAt` nulo,
     ordenadas da mais antiga para a mais nova, com nome, endereço, situação (`active`), data de criação e
     **quantas empresas a pessoa serve** — desativada continua na lista, porque desativar não apaga ninguém e
     quem atende precisa ver o endereço para saber do que se trata. A busca vai para a API (`name` ou `email`,
     o `OR` dos dois) e não para o navegador.
  3. **Uma escrita, um link a menos.** A confirmação administrativa roda em `$transaction` com o `update` da
     coluna e o `updateMany` que marca de gasto todo `emailVerificationToken` vivo daquela conta — pelo mesmo
     motivo do caminho público: não há por que sete portas escreverem na mesma coluna, e um link que continua
     válido depois de o assunto ter sido encerrado por outra porta é uma segunda escritura sem rastro.
  4. **Idempotência, não erro.** Botão clicado duas vezes, corrida chegando antes do clique, duas abas abertas:
     a segunda chamada lê a coluna, devolve `{ alterado: false }` e **não escreve nem audita nada**. A tela diz
     "já estava confirmada" e a linha sai da fila do mesmo jeito, porque ela saiu da realidade.
  5. **O rastro é a trilha da plataforma, com o endereço mascarado.** `admin.email_confirmado` com
     `entity: "user"`, `scope: ESCOPO_PLATAFORMA` (então `companyId` nulo por construção, e a empresa da sessão
     do administrador só em `metadata.empresaDaSessao`) e `metadata.para` vindo de `mascaraEndereco()` — nunca a
     caixa postal inteira. O motivo é opcional na API e obrigatório na tela: a porta é de suporte, e exigir texto
     no contrato levaria gente a escrever "suporte" em toda linha; sem o campo obrigatório, porém, a tela não
     chama a rota nenhuma vez (provado em teste de componente e na prova de navegador pela contagem de recursos).
  6. **A coluna não prova leitura, e a tela diz isso.** O painel da fila tem a frase escrita: confirmar aqui não
     afirma que a pessoa leu mensagem nenhuma — afirma que quem responde pela plataforma decidiu abrir a porta.
     Nada aqui simula entrega: o produto não tem como saber o que a caixa postal do outro lado fez.
  7. **O administrador da plataforma nasce confirmado (N78), e só quando falta.** No bootstrap, a conta criar,
     promovida, reativada ou apenas confirmada recebe `emailVerifiedAt` **se, e somente se, ela ainda não tem**.
     Reescrever o carimbo de quem entrou pelo próprio link seria falsificar a data em que a caixa postal foi
     provada; por isso `confirmaEmail = !conta?.emailVerifiedAt` e a recusa de promoção não toca a coluna. O
     resumo do script ganhou `emailConfirmado: "marcado agora" | "já estava"`, sem imprimir nada além disso.
- Consequências:
  - Positivas (medidas nesta árvore, banco de prova): `apps/api/test/confirmacao-administrativa-de-email.test.ts`
    **9 passed (9)** — vermelho medido antes: **8 failed | 1 passed (9)** — e
    `apps/web/src/test/porta-administrativa-de-email.test.tsx` **12 passed (12)**, com o primeiro vermelho sendo
    a importação que não existia (`Failed to resolve import "../pages/PlataformaContas"`) e um caso vermelho
    meu, declarado: eu esperava `notify.error` na falha de API, e a casa mostra o erro **dentro** do diálogo.
    O caso que fecha o N61 de verdade é "a porta destranca o login": com a régua da D2 ligada, o mesmo login que
    nega antes passa depois da confirmação. Prova de navegador `tools/verify-contas-plataforma.cjs`.
  - Custos e o que fica aberto: **`emailVerifiedAt` passou a ter duas origens e a coluna não diz qual delas** —
    link clicado ou decisão de quem administra a instalação. A única forma de distinguir é a linha
    `admin.email_confirmado` na trilha da plataforma; se um dia a conformidade pedir a origem na própria linha
    do usuário, isso é migration nova, e ela não foi feita aqui porque nada a pediu. **A confirmação não avisa
    ninguém**: quem esperou semanas recebe acesso sem receber mensagem de que algo mudou, e o produto hoje não
    tem mensagem desse tipo. **A contagem de empresas é `memberships`, vínculos, não empresas ativas** — uma
    conta pode aparecer com "2 empresas" e nenhuma delas estar aberta. **A busca é `contains` sobre `name` e
    `email`**, sem índice de texto: com a fila de um banco de produção grande isso é varredura, e o plano de
    índice é trabalho de quem medir essa tabela crescendo. **A fila não tem expiração nem escopo de tempo** —
    conta criada em 2020 e nunca confirmada continua na linha 1 da ordenação `createdAt asc`. E o N78 ficou
    **corrigido no código, não revertido no passado**: qualquer ambiente em que o `admin:criar` já rodou com a
    D2 ligada tem hoje uma conta de plataforma sem entrada, e o conserto para esse ambiente é rodar o script de
    novo, que é idempotente por decisão (item 7) — está escrito no runbook de `docs/PRODUCAO.md`.
