# ADR-0009 — Cobrança manual: o papel nasce na tela, o dinheiro entra uma única vez, e "vencida" é lida, não gravada

- Status: Aceita (2026-10-13)
- Contexto: F3.2 Parte 2 do PROMPT MESTRE, no anexo `PROMPT_IDE_ORDENS_E_COBRANCAS.md`. A Parte 1 deu ao
  atendimento um documento e uma baixa de estoque; faltava o que vem depois da peça consertada: dizer ao
  cliente quanto ele deve, até quando, e registrar que alguém recebeu. O produto já tinha o caixa
  (`finance_entries`) e a nota (`sales`), e nenhuma porta entre "o serviço terminou" e "o dinheiro entrou" —
  quem cobrava usava papel. A decisão mais pesada aqui é que **não existe integração de pagamento assinada
  pelo dono** (registrada em `docs/decisoes/G2-cobranca-e-assinatura.md`, ainda BLOQUEADO POR DECISÃO): o
  produto precisa cobrar hoje sem esperar o provedor de amanhã, e sem credencial inventada.
- Decisão:
  1. **A cobrança é o papel; o provedor é o carimbo.** `Charge` guarda número por empresa, cliente, valor em
     `Decimal`, vencimento, forma (`PIX`/`BOLETO`/`TRANSFERENCIA`/`DINHEIRO`/`CARTAO`/`OUTRO`) e o vínculo com
     a venda ou a OS. O campo `provider` existe para um dia dizer quem cobra; hoje ele só vale `MANUAL`, e a
     porta entre a cobrança e o provedor é `charge-adapters.ts` — um arquivo com uma interface
     (`prepararCobranca` / `prepararConfiguracao`). Um provedor novo entra como MAIS um arquivo; nenhuma
     linha do serviço muda. MERCADO_PAGO, EFI e STRIPE aparecem no catálogo da tela com
     `available: false` e o motivo por escrito, e param antes do banco: sem rota de webhook, sem campo de
     credencial preenchido, sem estado meio-cadastrado para alguém limpar depois.
  2. **Quem registra o recebimento é uma pessoa, e a receita nasce uma única vez.** O `MANUAL` não consulta
     ninguém: ele valida a chave PIX da empresa e devolve o que a empresa decidiu. O pagamento é a
     reivindicação condicional (`updateMany` com o `status` lido no `where`, `charges.service.ts:534-546`)
     dentro da mesma transação que cria o lançamento de receita; o perdedor da corrida vê `count = 0` e
     recebe 409. A coluna `finance_entry_id` é `UNIQUE`, então mesmo um caminho de pagamento escrito amanhã
     não consegue apontar uma cobrança para duas receitas. Medido no teste de corrida (`apps/api/test/
     cobrancas.test.ts`): dois pay simultâneos, um lançamento, um 409.
  3. **"Vencida" é calculada na leitura, nunca gravada.** `overdue = status === "PENDING" && dueDate <
     hojeDaEmpresa(companyId)` (`charges.service.ts:122`), onde `hojeDaEmpresa` usa o dia de calendário do
     fuso da empresa — a mesma régua da Fase 3c do resto do produto. Não existe cron que venda cobrança: se
     existisse, o carnê dependeria de um job para dizer a verdade. O `dueDate` guarda o instante UTC de
     meia-noite e o `dueDateLabel` guarda o dia nu (`AAAA-MM-DD`); a tela converte por recorte de string, sem
     objeto `Date`, porque `new Date("2026-10-20")` em `America/Sao_Paulo` viraria 19/10 — e ninguém aceita
     ver a própria conta vencer um dia antes.
  4. **Uma cobrança pendente por venda ou por OS — a trava é sobre a pendência, não sobre o documento.**
     `conferirPendenciaUnica` (`charges.service.ts:222-238`) devolve 409 citando o número que já está no
     carnê. Pagar ou cancelar libera a linha seguinte, e é assim que o balcão corrige um valor digitado errado
     sem apagar o histórico da primeira. Cobrar duas vezes a mesma conta é a forma mais rápida de perder um
     cliente, e um índice único não serviria: depois do cancelamento a segunda cobrança legitima seria
     bloqueada para sempre.
  5. **O número é por empresa e nunca recomeça** — `SELECT id FROM companies ... FOR UPDATE`, depois
     `MAX(number)+1`, com `UNIQUE (company_id, number)` e retratativa em `P2002`
     (`charges.service.ts:268-293`). É o desenho da ADR-0008, repetido de propósito: duas séries com duas
     regras diferentes no mesmo produto é o que faz um número deixar de ser protocolo.
  6. **O cancelamento exige motivo e não desfaz dinheiro.** Cancelar apaga uma expectativa de receita, então
     a pergunta "por quê" é obrigatória (400 sem ela) e a resposta guarda motivo, data e quem cancelou.
     `PAID` não cancela (409): estorno é um movimento do caixa, não o apagar de um papel, e o produto ainda
     não tem estorno — limitação declarada em `docs/AUDITORIA.md`. Nada aqui remove linha: cancelada
     continua na lista, no filtro e no rodapé que conta o carnê.
  7. **O dia do dinheiro é dito por quem recebeu, e atrasar o registro não move o vencimento.** O diálogo de
     recebimento pede data, forma e observação — o anexo manda, e é o que o balcão sabe melhor que o relógio
     da máquina: atendeu sexta, digitou segunda. O dia digitado é convertido no instante da meia-noite
     daquele dia **no fuso da empresa** (`meiaNoiteDoDia`, a mesma casa da Fase 3c) e entra em
     `charge.paidAt` e no `paidAt` do lançamento; o `dueDate` do lançamento continua o vencimento combinado,
     então a conta atrasada não se rebatiza de nova. O lançamento nasce na categoria `Cobranças`, criada por
     `upsert` no primeiro recebimento (do mesmo jeito que "Vendas" e "Compras" nascem com a primeira parcela
     em `lib/installments.ts`), com `clientId` do vínculo e o número da cobrança na descrição. Duas portas na
     frente: dia que não existe no calendário ("2026-13-45", "2026-02-30") e dia que ainda não chegou para a
     empresa são 400 antes de qualquer escrita — `Date.UTC` transborda o excesso em vez de reclamar, e a
     leitura de volta (`diaNoFuso`) é o que denuncia o dia que ninguém escreveu. Sem nada digitado, vale o
     relógio do servidor, que é o caso de quem marca o fato na hora. O dia vai junto na auditoria
     (`dataInformada`), porque recebimento retroagido é escolha de pessoa e responde por ela. No papel, o
     recibo imprime o **dia** — não a hora em que alguém abriu o sistema, que num recebimento escrito na
     segunda sobre o sexta sairia como "00:00" e seria lido como erro de relógio por quem recebe o papel.
  8. **O atendente lê o carnê e não escreve nada.** `charge:write` não é do `STAFF` na matriz de RBAC, e a
     API devolve 403 para criar, receber e cancelar — medido na prova de navegador com a sessão dele. Ler é
     permitido porque ninguém atende sem saber o que o cliente deve. A tela esconde os botões, e esconder
     nunca foi a guarda.
  9. **Gateways ficam como aba dentro de `/app/cobrancas`, não como linha da barra.** Configurar a chave PIX
     é parte do carnê, e a regra da F3.1 não permite página vazia no menu: por isso a barra larga foi de 16
     para 17 linhas (`Cobranças` depois de `Financeiro`) e nenhuma linha nova foi criada para o provedor.
 10. **A lista mostra o último filtro escolhido, não o último pacote que a rede devolveu.** Mudar dois filtros
     no mesmo segundo dispara dois pedidos, e a rede responde na ordem que quiser: sem guarda, o pedido da
     lista cheia chega por último e escreve, por cima do filtro, contas que o servidor não devolveu. Cada
     recarga recebe um número e só quem ainda é o mais novo pode tocar `rows`, `erro` ou o spinner
     (`Cobrancas.tsx`, `ultimaLista`). A corrida que a prova de navegador flagou duas vezes é o motivo desta
     linha estar num ADR e não num comentário de componente; o mesmo padrão falta nas telas que ainda o copiam
     de antes, relatado em `docs/AUDITORIA.md`.
- Consequências:
  - Fecha-se a cadeia que o produto já tinha por pedaços: cliente → ordem de serviço → cobrança →
    recebimento → lançamento no caixa, com o número da cobrança escrito na descrição da receita
    (`Cobrança 12 — Conserto da furadeira`) e a chave PIX da empresa saindo no papel que o cliente recebe.
  - O documento impresso é uma **instrução de pagamento**, não um instrumento bancário: a chave PIX é a
    chave estática da empresa, o boleto é a forma escolhida com instruções em texto livre. Enquanto o
    provedor de mercado não for decidido (G2), não há código PIX dinâmico, linha digitável nem confirmação
    automática — e a tela diz isso em vez de fingir que há.
  - O preço pago por "o homem registra o recebimento" é o atraso entre o dinheiro entrar e o carnê saber:
    o painel mostra quem ainda não marcou, nunca quem ainda não pagou no banco.
  - O custo de manutenção é pago por teste: 24 casos em `apps/api/test/cobrancas.test.ts`
    (isolamento entre empresas, recusa de vínculo, chave PIX obrigatória, corrida de dois pagamentos,
    cancelamento com e sem motivo, `paidMethod` diferente da forma emitida, e o dia dito no recebimento
    conferido na cobrança e no lançamento — inclusive os dois 400 de data inventada), 15 em
    `apps/web/src/test/cobrancas.test.tsx` (o campo de data nascendo com o dia da empresa, o teto dele, e a
    resposta atrasada que não pode pintar por cima do filtro) e 137 verificações em
    `tools/verify-cobrancas.cjs`, que confere tela contra banco, mede a corrida simultânea na mesma linha,
    imprime documento e recibo com `window.print` interceptado, atravessa a sessão de um atendente e termina
    com zero erro de console.
  - O que este ADR não decide: assinatura recorrente, plano e fatura continuam na G2; juros, multa e
    desconto por atraso não existem; pagamento parcial não existe (o valor do recebimento é o valor da
    cobrança, e a regra é a mesma do item 4 — meio pagamento deixaria duas verdades no mesmo papel); e uma
    empresa que já lança a receita automática da venda não deve criar cobrança pendente para a mesma venda,
    sob pena de receber o lançamento duas vezes. Isso é relatado como limitação de uso em
    `docs/AUDITORIA.md`, não consertado por trás das costas do operador.
