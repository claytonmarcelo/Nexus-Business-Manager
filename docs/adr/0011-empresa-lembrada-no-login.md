# ADR-0011 — A empresa lembrada: escolha determinística, e a renovação não muda de casa

- Status: Aceita (2026-10-13)
- Contexto: decisão **D5** do dono no prompt de continuação de 2026-10-13, fechando o achado **N32**
  (`docs/AUDITORIA.md`) e a linha **P11** do lado do servidor em `docs/ESTADO-ATUAL.md`. O que foi medido
  antes de decidir:
  - `pickMembership` (`apps/api/src/modules/auth/auth.service.ts`) não recebia nenhuma informação além da
    lista de vínculos, e devolvia a **primeira empresa ativa na ordem que o banco entregava**. Sem `orderBy`,
    o `include` do Prisma traz `companyUsers` na ordem do índice composto — que é ordem de uuid, não de
    criação. Duas consequências do mesmo defeito: o cabeçalho das capturas do painel mudou de empresa depois
    do `admin:criar` da F1.4 (o administrador passou a ter vínculo em dezenas de casas), e quem tem duas
    empresas não tinha como saber em qual ia acordar.
  - A renovação já estava consertada (A4, `docs/STATUS-AJUSTES.md`): o `refresh_token` guarda a empresa em que
    foi emitido. O que faltava era o **login**: sem empresa pedida, ele escolhia sozinho.
  - `switch-company` trocava a empresa do token novo e não deixava nenhuma memória da escolha no usuário. A
    pessoa trocava para a B, fechava a aba, voltava no dia seguinte e entrava na A.
- Decisão:
  1. **Preferência, não vínculo.** Entra `users.last_company_id` (`VARCHAR(36)`, anulável, migration aditiva
     `20261013030000_add_empresa_lembrada`). Não tem chave estrangeira de propósito: a casa lembrada pode
     adormecer ou ser apagada e a conta continua entrando; quem confere o vínculo ativo antes de usar a
     lembrança é o `auth.service`, sempre, e nunca o banco por restrição.
  2. **Três degraus, nesta ordem.** (a) a empresa **pedida** no corpo do login manda, e **não** reescreve a
     lembrança — um login avulso não apaga a preferência de ninguém; (b) sem pedido, vale a empresa
     **lembrada**, desde que o vínculo exista e a casa esteja ativa; (c) sem lembrança válida, o **vínculo mais
     antigo**, desempatado por `createdAt` e depois pelo `id` do vínculo. O terceiro degrau é o que torna a
     resposta a mesma em qualquer banco: não existe "a que o índice entregou hoje".
  3. **A escolha vira memória.** `switch-company` grava `lastCompanyId` antes de emitir os tokens. O refresh de
     um token **sem** empresa gravada — o caso histórico, anterior à migration da A4 — segue a lembrança em vez
     de cair no primeiro vínculo que o banco entregar.
  4. **O que não muda.** A renovação continua reemitindo para a empresa registrada no `refresh_token`
     (comportamento da A4, provado por `test/sessoes-empresa.test.ts`); a lembrança só entra quando não há
     empresa no token, ou no login. Nenhum contrato de rota mudou: `companyId` continua opcional no corpo do
     login, e a resposta é a mesma de antes.
- Consequências:
  - O achado N32 passa de "relatado, espera decisão" para fechado: com o degrau (c) o cabeçalho do painel é
    previsível, e a casa de demonstração pode ser escolhida uma vez pelo login e ficar lembrada.
  - A escolha (b) é a que decide o caso do administrador da plataforma: ele tem vínculo em todas as casas, e o
    degrau (c) devolve a mais antiga. Isso é medido em `apps/api/test/empresa-lembrada.test.ts`, que constrói
    três casas com uuids e datas desenhados para que a ordem do índice **divirja** da ordem por data — sem
    esse desenho o teste passaria por acidente lendo a ordem do banco.
  - Quem for expulso de uma casa (vínculo apagado) ou vir a casa adormecer entra no degrau (c) no login
    seguinte, sem erro e sem escolher nada: a preferência deixa de ser válida em vez de derrubar o acesso.
  - A coluna é anulável e não tem `NOT NULL`: as contas que já existem continuam entrando sem que ninguém
    precifique uma preferência retroativa.
