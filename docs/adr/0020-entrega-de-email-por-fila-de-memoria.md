# ADR-0020 — A entrega de e-mail sai por uma fila de memória do processo, e o código nunca vai para a fila

- Status: Aceita (2026-10-14)
- Contexto: terceiro item da T5 (F6) do prompt de continuação — achado **N58** de
  `docs/AUDITORIA.md` e regra 2 de `docs/decisoes/G1-envio-de-email.md`: *"a entrega de e-mail não pode
  acontecer dentro do request"*. Os três envios do produto (`auth.service.ts`, `verificacao.service.ts` e
  `segundo-fator.service.ts`) eram `await mailer().enviar(...)` no corpo do handler. Medido antes da mudança,
  com um entregador de 250 ms injetado no lugar do SMTP: o `POST /api/auth/forgot-password` respondeu em
  **320 ms** (`expected 320 to be less than 250`), numa tela onde a pessoa acabou de digitar o próprio e-mail.
  Um provedor lento ou mudo segura a connection da pessoa, o socket do proxy e o tempo do navegador dela — e a
  porta de entrega em si (D1) já estava certa, o que faltava era o chão embaixo dela. As alternativas
  consideradas e recusadas: **(a) fila persistida no banco** — a mensagem de recuperação e a de verificação
  carregam o código em texto puro porque é isso que a pessoa digita; gravar a fila seria escrever token em
  repouso numa tabela nova, contra a regra do projeto que guarda só o HMAC desses códigos. **(b) fila externa
  (Redis, SQS, worker dedicado)** — hospedagem própria e container único por decisão (ADR-0018); trazer um
  broker para três mensagens por evento é trocar uma dependência por um problema que ainda não existe.
  **(c) continuar no request com timeout menor** — resolve a espera, não resolve a retentativa, e mantém o
  handler como dono do tempo do provedor.
- Decisão:
  1. **Fila de memória do processo, um consumidor, FIFO, criada só quando há mensagem.**
     `apps/api/src/lib/mail/fila.ts` expõe `enfileirarMail(mensagem, aoConcluir)`, que empurra e devolve na
     hora; o worker é ligado por `setImmediate` (é o que permite ao handler fechar a resposta) e só existe
     enquanto há mensagem — nenhum relógio fica pendurado no boot, do mesmo jeito do agendador de rotinas. O
     handler passou a ser uma linha, e `aguardarFilaDeMail()` é a única espera que existe no caminho.
  2. **Sem persistência, e isso é consequência declarada, não detalhe de implementação.** O que está na fila
     na hora do desligue se perde. A saída do produto continua sendo a que já existia: reenviar (verificação)
     ou pedir de novo (recuperação), que é idempotente por natureza porque cada pedido gera um token novo e o
     anterior vence no uso. O desligue drena antes de fechar (`server.ts`, entre parar o agendador e fechar o
     Fastify) e, se não conseguir, **escreve no log** em vez de sumir com a mensagem calado.
  3. **Retentativa com recuo exponencial, sem jitter, e uma linha de auditoria por mensagem.**
     `MAIL_TENTATIVAS` (padrão 3) e `MAIL_BACKOFF_BASE_MS` (padrão 500 → esperas de 500 ms e 1000 ms). O
     recuo não tem jitter: com três tentativas e um consumidor por vez, o cenário em que jitter importa
     (vários workers recuando ao mesmo tempo) não existe aqui. A auditoria de falha deixou de ser carimbada pelo handler e
     passou a ser carimbada pelo worker, depois da última tentativa, com o resumo do motivo e a contagem de
     tentativas (`{ rotulo, tentativas, motivo }` nos dois fluxos de código; `{ tentativas, motivo }` no aviso
     de segundo fator, como antes). As `action`s existentes (`auth.forgot_password_entrega_falhou`,
     `auth.verificacao_entrega_falhou`, `auth.2fa_aviso_entrega_falhou`) continuam as mesmas, e o que mudou é a
     frequência: uma linha, não três. O sucesso continua sem linha nova.
  4. **Teto por tentativa, e o socket do nodemailer também tem teto.** `MAIL_TIMEOUT_MS` (padrão 15 000) corta
     a *espera* da fila por `Promise.race`; o transporte recebe os quatro tempos que existem nos tipos do
     nodemailer 10.1.0 — `connectionTimeout`, `greetingTimeout`, `socketTimeout` e `dnsTimeout` —, que eram os
     padrões de cliente interativo (dois minutos para conectar, **dez minutos** de socket mudo). O mesmo número
     vai para os dois lados porque fila e transporte têm que enxergar o mesmo teto; ele é injetado em
     `criarMailer` a partir do `env` validado pelo zod, para a fábrica continuar pura. **Erro registrado aqui,
     que foi meu e não do código:** a primeira versão pediu `dataTimeout` ao `createTransport`, que não existe
     nos tipos da biblioteca (`TS2769`), e o `.env.example` repetiu o nome errado — conferidos contra
     `node_modules/nodemailer/dist/cjs/smtp-connection/index.d.ts` antes de corrigir os dois.
  5. **Teto de RAM (`MAIL_FILA_MAXIMA`, padrão 200) com recusa auditada.** Passou do teto, a mensagem sai da
     fila com `tentativas: 0` e o motivo `a fila de e-mail está cheia (N mensagens na espera)`, pelo mesmo
     callback de uma entrega que falhou. Encher a memória do processo para entregar uma mensagem a mais não é
     troca que se faça num servidor que também atende HTTP.
  6. **Semântica de entrega: pelo menos uma vez, no máximo uma vez por tentativa.** O `Promise.race` do teto
     não cancela a entrega que estourou o tempo — ela continua no ar e pode chegar depois. Então um SMTP que
     aceita a mensagem, demora mais que o teto e a pessoa pede de novo produz **duas mensagens na caixa
     postal**. Aceito de propósito: duplicar e-mail de recuperação é incômodo, perder a mensagem sem ninguém
     saber é pior, e o código antigo vence no primeiro uso (a regra já existe e está provada).
  7. **Os quatro números são opcionais e não mudam a régua de produção.** `config/env.ts` traz padrões que
     mantêm `producao.ts` dizendo a mesma coisa de antes — nenhuma chave nova é obrigatória, e
     `validador-de-producao.test.ts` (as asserções `toEqual([])`) passou sem alteração. `.env.example` explica
     cada uma, inclusive que `MAIL_TIMEOUT_MS` é o teto da fila *e* do socket.
  8. **A prova de tempo mudou de endereço, e os testes que leem caixa de e-mail drenam.**
     `test/fila-de-mail.test.ts` (5 casos) é quem prova que o request não espera; os quatro arquivos que leem
     `fakeMailer` (`recuperacao-por-email`, `verificacao-de-email`, `segundo-fator`, `guardas-herdadas`)
     ganharam `aguardarFilaDeMail()` nos `beforeEach`/`afterEach` e antes de cada leitura de caixa. Nenhuma
     asserção foi enfraquecida ou removida. O `aguardarFilaDeMail()` **rejeita** quando não esvazia — devolver
     a fila ainda cheia faria um teste ler caixa vazia e aprovar. O atraso de prova do caso 1 subiu de 250 ms
     para **600 ms** depois de medir o ruído da máquina: o mesmo pedido aquecido marcou 7 ms numa corrida e
     259 ms em outra, e um soluço de agendamento do Windows não pode ser confundido com "o request pagou o
     provedor". A asserção de tempo vem agora acompanhada de duas que não dependem de relógio — no instante da
     resposta a caixa está vazia e `estadoDaFilaDeMail().vivas` é 1 — e de uma que mede a lentidão do
     entregador no mesmo processo (600 ms aguardados, direto, sem fila).
- Consequências:
  - Positivas: medido nesta árvore, rodando só o arquivo da fila, o `POST /api/auth/forgot-password` do caso 1
    respondeu em **7,43 ms** (`responseTime` do pino) com um entregador de **600 ms** injetado no lugar do SMTP —
    o mesmo pedido, antes da fila, levou **320 ms** para responder com um entregador de 250 ms. Os cinco casos
    fecham verdes (`5 passed (5)`, código 0), e o request devolve antes de a entrega terminar. O handler
    de recuperação perdeu a dependência do tempo do provedor, e o caminho de falha passou a ter um registro por
    mensagem, com o motivo técnico e a contagem de tentativas, escrito por quem tentou. O texto do erro é
    redigido por uma função só (`resumoDaFalha`, que existia em três cópias parecidas), sem endereço inteiro,
    token ou credencial.
  - Custos e o que fica aberto: **fila não sobrevive a reinício** nem a processo duplo (escala horizontal
    precisaria de broker — hoje o compose sobe um só `api`, ADR-0018); a recusa por teto de fila é contada em
    mensagens, não em tamanho de corpo; um entregador que trava para sempre segura o consumidor único até o
    teto de `MAIL_TIMEOUT_MS` cortar; e o dreno do desligue espera no máximo 5 s
    (`AGUARDAR_FILA_PADRAO_MS`), que é menos que o `MAIL_TENTATIVAS × MAIL_TIMEOUT_MS` pior caso — mensagem no
    meio da terceira tentativa se perde, e isso está no log.
