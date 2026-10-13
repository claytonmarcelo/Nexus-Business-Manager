# ADR-0008 — Ordem de serviço: o estoque baixa na conclusão e o estorno é o único caminho de volta

- Status: Aceita (2026-10-13)
- Contexto: F3.2 Parte 1 do PROMPT MESTRE, no anexo `PROMPT_IDE_ORDENS_E_COBRANCAS.md`. O produto tinha a
  nota (Vendas) e o caixa (Financeiro), e nada entre os dois para quem conserta ou instala: o atendimento
  vivia no papel do balcão e a peça saía do estoque "por acidente", sem documento que diga quem esteve com
  o quê, desde quando, com quais peças e o que foi feito. Três decisões desse módulo mexem em número —
  saldo de estoque, total em dinheiro e o protocolo que o cliente recebe — e uma quarta mexe em quem pode
  fazer o quê. Nenhuma delas podia ficar implícita no código. Medido antes: 27 tabelas, 106 rotas de
  negócio, nenhuma delas capaz de registrar um atendimento.
- Decisão:
  1. **A baixa de estoque acontece na CONCLUSÃO, não na abertura.** Uma OS aberta é intenção; baixa de
     estoque é fato. Adiantar a baixa faria a peça sair do sistema antes de sair da prateleira, e o painel
     de estoque deixaria de ser a verdade da prateleira. O módulo reusa `lib/stock.ts` (`baixarEstoque` /
     `subirEstoque`) em vez de inventar caminho próprio, então a política da empresa continua mandando:
     `allowNegativeStock` é lido por `permiteEstoqueNegativo(companyId)` (`service-orders.service.ts:741`) e
     uma OS não consegue baixar o que a empresa não deixa baixar. A nota da movimentação carrega o número
     da ordem (`OS 7 — peças aplicadas`), que é o que liga o saldo ao documento anos depois.
  2. **O estorno é o único caminho de volta, e é de OWNER e ADMIN.** Cancelar uma OS viva é rotina: nada
     baixou, nada estorna. Cancelar uma concluída é dizer que o que aconteceu não aconteceu, e isso mexe no
     saldo — então o evento nasce como movimentação `IN` com nota `Estorno da OS 7` e a linha do tempo
     registra a decisão. `podeEstornar` (`service-orders.service.ts:125-127`) é a função que decide isso no
     servidor; o botão correspondente só aparece na tela porque a tela lê o mesmo papel, e esconder o botão
     nunca foi a guarda.
  3. **O número é por empresa, nunca recomeça e é o protocolo do cliente.** `SELECT id FROM companies ...
     FOR UPDATE` antes de qualquer leitura, depois `MAX(number)+1`, com `UNIQUE (company_id, number)`
     fechando a porta (`service-orders.service.ts:335-357`). Quem chega primeiro toma a trava da empresa e o
     resto espera na fila dela — não na fila das outras empresas, porque a trava é a linha da empresa, não um
     lock de índice. `P2002` (número repetido) e `P2010`/`1213` (deadlock, que o driver do MySQL devolve
     dentro da mensagem) disparam nova tentativa dentro do mesmo lote; a série não recomeça nunca.
  4. **O dinheiro é do servidor, em centavo.** A tela mostra uma prévia e o que entra no banco é a linha
     arredondada uma única vez na base 10 (`linhaDecimal`), somada em centavo (`somarCentavos`), com o
     desconto subtraído depois da soma — a mesma regra da Fase 3d do resto do produto. Um `totalPrice`
     digitado no navegador não tem caminho para o banco: o schema não recebe total.
  5. **A máquina de estados é uma tabela no código, e estado terminal não se reabre.** `CAMINHOS`
     (`service-orders.service.ts:105-111`): aberta vai para andamento, aguarda-peça ou cancelada; andamento
     para aguarda-peça, concluída ou cancelada; aguarda-peça volta para andamento; concluída só cancela
     (estorno); cancelada não tem saída. Repetir um estado deixou de ter uma resposta única: em estado vivo
     é 400, em estado terminal é a mesma 409 das portas que não existem para esta empresa.
  6. **O alcance do atendente mora no serviço, não na tela.** `STAFF` não tem `service_order:write` na
     matriz de RBAC, e isso corta os campos de estrutura (cliente, título, prioridade, responsável,
     agendamento, desconto, itens); além disso o serviço só deixa o atendente mexer na OS atribuída a ele,
     só no andamento e nas anotações, e nunca cancelar. A tela esconde o que ele não pode fazer — porque a
     resposta da API a ele já é 403, medido na prova de navegador.
  7. **O histórico é imutável.** Cada mudança grava de-para, quem e quando em `service_order_histories`;
     nada no módulo apaga ou reescreve linha do tempo, e a nota do movimento é campo opcional de quem
     mexeu — não um texto gerado depois.
- Consequências:
  - O atendimento entra na cadeia que o produto já fechava: cliente → ordem de serviço → baixa de estoque →
    documento para imprimir, com o número da ordem aparecendo na movimentação. O estoque do painel volta a
    ser a prateleira, agora também para quem conserta.
  - Concluir é a decisão que mexe no saldo, e por isso o caminho é sempre confirmado na tela com o texto do
    que vai acontecer (`As peças desta ordem saem do estoque agora`), e o cancelamento de uma concluída diz
    o contrário (`as peças voltam ao estoque como estorno`).
  - O preço pago pela trava da empresa é serialização das criações de uma mesma empresa. Para o volume de um
    balcão isso é invisível; se um dia não for, a alternativa é número por ano ou por série, e aí o
    protocolo do cliente muda de contrato — decisão nova, não ajuste deste ADR.
  - O custo de manutenção é pago por teste: 35 casos em `apps/api/test/ordens-de-servico.test.ts` (inclusive
    corrida de numeração e os 403/404 de isolamento), 10 em
    `apps/web/src/test/ordens-de-servico.test.tsx` e 102 verificações em
    `tools/verify-ordens-de-servico.cjs`, que confere os oito indicadores contra o banco, mede o saldo antes
    e depois de cada movimento e devolve o banco no fim.
  - O que este ADR não decide: a ordem de serviço **não** gera lançamento financeiro nem venda. O atendimento
    concluído hoje é documento e estoque; transformar a peça e a mão de obra em conta a receber é decisão da
    Parte 2 (Gateways & Cobranças) e está registrada como pendência em `docs/STATUS-AJUSTES.md`.
