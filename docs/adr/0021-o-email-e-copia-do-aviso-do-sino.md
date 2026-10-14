# ADR-0021 — O e-mail é cópia do aviso do sino, e a caixa da tela obedece ao estado do canal

- Status: Aceita (2026-10-14)
- Contexto: quarto item da T5 (F6) do prompt de continuação — achado **N59** de `docs/AUDITORIA.md` e a
  última linha aberta de `docs/decisoes/G1-envio-de-email.md`. Depois da T3 existiam exatamente três caminhos
  que chamavam o mailer, e nenhum deles era de produto comercial: recuperação de senha, verificação de
  cadastro e aviso de segundo fator. O sino (`notifications.service.ts`) guardava `emailChannel` no banco sem
  que ninguém lesse, e o relatório diário (`cron.handlers.ts:94`) carregava a anotação "sem SMTP não há
  e-mail". A tela afirmava a mesma coisa por conta própria: `Notifications.tsx:392` tinha `<input ... disabled
  onChange={() => undefined}>` e uma frase escrita em pedra — "Indisponível: não há servidor de e-mail (SMTP)
  configurado nesta instalação". Até a T3 a frase era verdade por construção; com o transporte escolhido por
  ambiente, a mesma frase passa a ser mentira numa instalação que tem SMTP, porque não depende de estado
  nenhum. Alternativas consideradas e recusadas: **(a) e-mail como canal independente** (avisar por mensagem
  mesmo com o sino desligado) — a chave antiduplicação mora na linha do sino, e sem ela a varredura de contas
  vencidas viraria spam diário na caixa postal de quem ligou o canal; **(b) persistir a fila de e-mail por
  aviso** — recusado pela mesma razão da ADR-0020, e aqui sem necessidade nenhuma, porque o aviso já está
  gravado; **(c) recusar a gravação de `emailChannel` quando não há SMTP** — a pessoa que ligar o canal antes
  de apontar o `SMTP_HOST` perderia a intenção, e ter que remarcar dez caixas de preferência é o tipo de
  trabalho que ninguém faz; **(d) deixar a caixa como está e só ligar o backend** — manteria a mentira de
  interface que o próprio achado descreve.
- Decisão:
  1. **O e-mail é cópia de uma linha nova do sino, nesta ordem.** `notificarDetalhado()` grava primeiro, depois
     enfileira. A ordem é a regra, não um detalhe: (a) o e-mail só existe para quem tem linha nova no sino, o
     que faz a chave antiduplicação da varredura segurar as duas pontas, e (b) nenhuma mensagem é enviada por
     um aviso que não chegou a ser gravado. `createMany({ skipDuplicates: true })` já não gravaria a linha
     repetida, mas não devolve QUAIS eram velhas — por isso existe a pré-consulta de `dedupeKey` antes da
     escrita, que é o que deixa o e-mail do lado certo da regra.
  2. **O portão é o que o entregador afirma, não o nome do transporte.** `MailerPort` ganhou
     `entregaDeVerdade?: boolean` e `motivoDaIndisponibilidade?: string`, ambos **opcionais**: o padrão é a
     ausência, e ausência significa "não afirma que entrega". Só o `smtp.ts` afirma. `console.ts` e `fake.ts`
     negam com motivo escrito — o `fake` dos testes entrega para a caixa de memória do teste, não para a pessoa.
     `estadoDoCanalDeEmail()` (`lib/mail/index.ts`) traduz isso em `{ disponivel, transporte, motivo }`. O
     motivo de escolher afirmação em vez de comparação de nome: um adaptador novo que alguém escrever amanhã
     começa no lado seguro sem que ninguém precise lembrar de atualizar uma lista de nomes.
  3. **Nada é simulado, e nada é enfileirado sem entregador que entrega.** Sem `disponivel`, o serviço devolve
     `{ criadas: n, emails: 0 }` antes de montar mensagem. A tela não ganha um "enviado" falso e o log não ganha
     linha de entrega que não aconteceu.
  4. **Os dois números aparecem onde alguém opera.** `notificarDetalhado`, `varreduraEmpresaDetalhada` e
     `varreduraGlobal` devolvem contagem de linhas do sino **e** de mensagens postas na fila; `POST
     /notifications/scan` responde `{ criadas, emails }` (e a auditoria `notification.scan` grava os dois); os
     três handlers de rotina fecham a frase de execução com `· N e-mail(s)`, que é o que aparece na coluna
     "última execução" da tela de Rotinas. `varreduraEmpresa()` continua devolvendo um número só: é a casca que
     as operações de negócio chamam, e mudar a assinatura dela por causa de um relatório seria tocar dez
     chamadores para ganhar um segundo contador.
  5. **A falha de entrega vira uma linha de auditoria; o sucesso não vira nenhuma.** `notification.entrega_falhou`
     com `{ rotulo, tentativas, motivo, para }`, onde `para` é `mascaraEndereco()` — nunca a caixa postal
     inteira. Sucesso não é auditado de propósito: um aviso por venda, por minuto, numa empresa com movimento
     encheria a trilha de eventos que não mudam nada. O que precisa de rastro é o que deu errado. A contagem de
     `emails` é de mensagens **enfileiradas**, não de entregas confirmadas — entrega é assíncrona (N58).
  6. **A caixa da tela mostra duas verdades ao mesmo tempo.** `disabled={!email.disponivel}`; `checked` continua
     sendo a preferência salva. Então numa instalação sem SMTP quem pediu e-mail vê a caixa **marcada e
     desabilitada**, com a dica "Indisponível: {motivo}". Desmarcar por dentro seria a tela jogando fora uma
     intenção guardada: qualquer outro clique em salvar mandaria o rascunho, e a preferência desapareceria.
     Com SMTP, a mesma dica diz "as mensagens saem pelo transporte {transporte}". Nenhuma das duas frases está
     escrita na tela — o texto vem do estado que a API devolve.
  7. **O texto do aviso entra no HTML escapado.** `textoSeguro()` escapa `& < > "` no título, no corpo e no nome
     da empresa antes de montar o HTML: a mensagem de aviso carrega nome de produto, de cliente e de fornecedor
     digitados na tela por uma pessoa, para ser lida por outra. As três mensagens antigas ficam como estão e
     viraram achado (**N76**), porque só interpolam o primeiro nome de quem pediu — dados da própria pessoa, na
     caixa postal dela.
- Consequências:
  - Positivas (medidas nesta árvore, banco de prova): `apps/api/test/avisos-por-email.test.ts` **8 passed (8)**
    e `apps/web/src/test/avisos-por-email.test.tsx` **4 passed (4)**; antes da implementação, os mesmos arquivos
    marcaram **6 failed | 2 passed** e **3 failed | 1 passed**, respectivamente. As duas suítes completas passaram
    depois, medidas nesta árvore: API **49 arquivos / 450 casos** verdes em 314 s com código de saída 0, e web
    **19 arquivos / 144 casos** verdes. O caso 4 prova os dois contadores na rota (`criadas: 2`, `emails: 1`) e o
    caso 5
    prova o portão do sino (sino desligado + e-mail ligado = nenhuma mensagem).
  - Custos e o que fica aberto: **o `emails` não é persistido por aviso** — não há coluna "enviado", e a única
    prova de que uma mensagem específica saiu é a ausência de linha de falha; quem precisar de trilha de
    entrega por aviso vai ter que adicionar coluna ou tabela, e isso não foi pedido. **O e-mail de aviso
    compartilha o teto da fila** (`MAIL_FILA_MAXIMA = 200`), que foi dimensionado para três mensagens
    interativas por evento, não para varredura de 500 contas vencidas: uma varredura grande com SMTP lento pode
    encher a fila e recusar o resto, e a recusa é auditada mensagem por mensagem. **O link da mensagem é
    `WEB_BASE_URL` + o link do sino** — se o painel mudar de endereço, mensagens antigas apontam para o
    endereço velho, como já acontecia com o link de verificação. E a caixa postal continua sendo a do cadastro
    (`users.email`), sem verificação de que o aviso chegou: a pessoa que nunca ligou `emailChannel` não recebe
    nada, e a que ligou recebe cópia de tudo que o sino recebeu.
