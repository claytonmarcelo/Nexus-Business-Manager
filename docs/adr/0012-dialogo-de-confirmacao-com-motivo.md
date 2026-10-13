# ADR-0012 — Decisão que desfaz um registro exige motivo escrito, e o contrato antigo não muda

- Status: Aceita (2026-10-13)
- Contexto: decisão **D4** do dono no prompt de continuação de 2026-10-13, fechando a linha **P11** de
  `docs/ESTADO-ATUAL.md` e o achado **N36** de `docs/AUDITORIA.md`. O que estava medido antes de decidir:
  - `POST /service-orders/:id/status` já aceitava `note` (opcional, `max` 500), o histórico guardava o campo e
    a tela já sabia pintar `.nx-os-motivo` quando ele vinha preenchido. Faltava só o meio: `mover()` chamava a
    rota sem nota, porque o diálogo de confirmação da casa é de sim/não.
  - Resultado prático, lido na prova de navegador: a linha do tempo de uma ordem movida pelo navegador dizia
    **quem** e **quando**, e a de uma ordem movida pela API dizia também **por quê**. A mesma informação, duas
    qualidades de registro, dependendo de por onde a pessoa entrou.
  - Cobrança já tinha motivo obrigatório, mas implementado como modal próprio da página
    (`CancelamentoDeCobranca` em `Cobrancas.tsx`), com o `notify.error` avisando o campo vazio — a regra certa,
    no lugar errado, e invisível para quem cancela uma ordem de serviço.
- Decisão:
  1. **Superfície nova, aditiva.** Entra `ConfirmMotivoOptions`, `ConfirmationMotivoDialog` e
     `abrirConfirmacaoComMotivo` em `components/ConfirmationModal.tsx`, com a saída `confirmActionComMotivo` em
     `lib/confirm.ts`. `confirmAction`, `ConfirmActionOptions` e `ConfirmationDialog` **não mudam de
     contrato**: a guarda está provada no teste que conclui uma ordem e exige
     `queryByLabelText(/motivo/i)` nulo dentro do diálogo. Nada de diálogo antigo foi reescrito, e nenhuma
     página que só pergunta "tem certeza?" ganhou campo.
  2. **Onde o motivo é obrigatório.** Nos três casos que desfazem um registro: cancelar ordem de serviço,
     estornar uma ordem concluída (o mesmo caminho, com rótulo e ajuda próprios — "Motivo do estorno") e
     cancelar cobrança. O servidor já era a autoridade nos três; a tela deixou de ser o único lugar onde a
     explicação existiu.
  3. **Sem motivo, nada sai — e o aviso fica onde a pessoa olha.** O botão de confirmar não dispara requisição
     nenhuma com o campo vazio: a frase "Diga o motivo do cancelamento." aparece dentro do diálogo, em
     `.field-error` com `role="alert"`, no próprio campo. O toast que some em três segundos saiu do caminho —
     inclusive o do cancelamento de cobrança, que era `notify.error`.
  4. **Falha da rota não apaga o texto.** Se a API devolver erro, o diálogo continua aberto, mostra a mensagem
     do servidor e devolve o motivo já escrito. Fechar e jogar o erro no toast obrigaria a pessoa a digitar
     tudo de novo, no exato momento em que ela mais quer desistir.
  5. **A copy do modal antigo veio junto.** O contexto do documento ("#12 · cliente · valor") virou o `nome` do
     diálogo, o aviso do caixa virou o `detalhe`, e a nota "sem motivo a cobrança não sai do carnê" virou a
     ajuda abaixo do campo. Nenhum texto foi perdido na troca, e o `maxLength` espelha o `max` da rota (500).
  6. **A mesma trava do diálogo comum.** Spinner no botão, `disabled` durante a escrita e a trava síncrona em
     `useRef` contra duplo clique continuam valendo — o duplo clique num cancelamento é exatamente o tipo de
     coisa que gera dois registros no histórico.
- Consequências:
  - `Cobrancas.tsx` perdeu o modal próprio de cancelamento, o estado `cancelando` e o import do `Modal` usado
     só por ele. A tela fica com um mecanismo de confirmação a menos para manter igual ao resto do painel.
  - As duas provas de navegador ganharam o passo novo em vez de perderem a checagem: `verify-cobrancas.cjs`
     agora digita no seletor do diálogo da casa, e `verify-ordens-de-servico.cjs` tenta estornar **sem** motivo,
     exige que a linha continue "Concluída" e que nada saia da tela, e depois confirma com o motivo escrito —
     que passa a ser conferido no histórico da ordem.
  - O custo de digitar uma frase em três ações é deliberado. Movimentos que não destroem nada (iniciar,
    aguardar peça, concluir) continuam a dois cliques, e o teste do "concluir" prova isso.
