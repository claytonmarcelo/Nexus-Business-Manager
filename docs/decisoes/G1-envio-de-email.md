# G1 — Envio de e-mail (SMTP)

**Situação:** PARCIALMENTE FECHADO · **Década:** 2026-10-11 · **Re-medido:** 2026-10-14 (fila de entrega, tarefa T5.3; antes: decisão D1, tarefa T3/F4) · **Nenhuma integração foi inventada.**

## O que mudou em 2026-10-14 (tarefa T5.3, achado N58)

A regra 2 desta página estava marcada como **não cumprida**, e deixou de estar. Os três envios
(`auth.service.ts`, `verificacao.service.ts`, `segundo-fator.service.ts`) agora empurram a mensagem para a fila
do processo (`apps/api/src/lib/mail/fila.ts`) e devolvem; quem espera o provedor é a fila, com retentativa,
recuo exponencial, teto por tentativa e teto de tamanho. A decisão está escrita em
`docs/adr/0020-entrega-de-email-por-fila-de-memoria.md`, e os números do operador estão na seção 10 de
`docs/PRODUCAO.md`. Medido antes e depois, com entregador lento injetado: **320 ms** de
request dentro do handler (entregador de 250 ms) contra **7,43 ms** com a fila (entregador de 600 ms; a
mensagem ainda viva, `vivas: 1`, no instante da resposta). O `connectionTimeout`/`greetingTimeout`/`socketTimeout`/`dnsTimeout` do nodemailer, que antes iam
nos padrões da biblioteca, agora recebem o mesmo teto da tentativa (`MAIL_TIMEOUT_MS`). As quatro chaves da fila
são opcionais e têm padrão seguro — a régua de produção (A9) não passou a cobrar nenhuma delas.

O que **não** mudou: a fila é memória do processo, não sobrevive a reinício, e o motivo está escrito na regra 2
abaixo — persisti-la no banco seria gravar o código de recuperação em texto puro.

## O que mudou em 2026-10-13 (decisão D1, tarefa T3/F4)

A **porta** foi escrita, com o adaptador SMTP genérico que a decisão D1 mandou — sem escolher fornecedor por
conta própria. Em `apps/api/src/lib/mail/`:

- `porta.ts` define `MailerPort` (`enviar(mensagem)`), o único contrato que os chamadores conhecem;
- `smtp.ts` é o adaptador real, `nodemailer` 10.1.0 (folha, sem transitivos no `npm ls`), configurado por
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` — exatamente as cinco variáveis que um
  SES, um Postmark, um Brevo ou um Postfix próprio respondem;
- `console.ts` imprime assunto e destinatário no desenvolvimento, sem fingir entrega;
- `fake.ts` guarda as mensagens em memória para os testes (`MAIL_TRANSPORT=memory`);
- `mensagens.ts` centraliza os textos, `index.ts` escolhe pelo ambiente (`criarMailer(fonte)`), e a régua de
  produção (`src/config/producao.ts`) recusa subir com transporte `smtp` e credencial de exemplo.

**O código nunca saiu por HTTP nem por log** desde a primeira versão: a recuperação de senha guarda só o hash
e a resposta não devolve o código; `AUTH_EXPOSE_RESET_TOKEN` continua sendo um atalho de desenvolvimento, não
produtivo, e a verificação de e-mail do cadastro (D2) tem a mesma regra.

Continuam **abertas**, e são exatamente as quatro caixas da seção "O que eu preciso de você" abaixo:

1. o **provedor** (a escolha é de dono: custo, remetente, reputação de domínio);
2. o **domínio e endereço remetente**;
3. se o texto é próprio ou modelo — o que existe hoje é o texto dos três envios reais;
4. **e-mail por empresa** ou um e-mail só da plataforma (a porta atual é da plataforma, uma instância).

E falta um quarto item, descoberto ao escrever: o **relatório diário do cron**
(`apps/api/src/modules/cron/cron.handlers.ts`) ainda carrega a anotação "sem SMTP configurado não há e-mail" e
não chama o mailer. Os três chamadores reais são recuperação de senha (`auth.service.ts`), verificação de
cadastro (`verificacao.service.ts`) e aviso de segundo fator (`segundo-fator.service.ts`). Registrar isso
como G1 **PARCIAL** é o que impede o documento de mentir.

## O que existia antes, no código

- A recuperação de senha gera o código, guarda só o hash (`password_reset_tokens`) e **não envia nada**.
  Em desenvolvimento, com `AUTH_EXPOSE_RESET_TOKEN=1` e ambiente não-produtivo, o código volta no corpo da
  resposta para o navegador poder concluir o fluxo. Em produção, sem provedor, a tela diz que o e-mail foi
  enviado e o usuário nunca recebe nada — a funcionalidade está **morta na prática**.
- O cron de relatório diário (`modules/cron/cron.handlers.ts`) e os avisos do sino
  (`notifications.service.ts`) carregam a mesma anotação: "sem SMTP configurado não há e-mail; nada é
  simulado aqui".
- Não existe tabela de SMTP no schema nem porta de envio em `src/`. A tela de Configurações tem as abas de
  sistema, mas nenhuma credencial de e-mail é pedida em lugar algum.

## Por que ainda falta decisão

O contrato (§46 e Bloco G) proíbe escrever integração sem credencial real e manda entregar opção +
recomendação + a porta pronta. A porta está pronta desde 2026-10-13; o que continua sendo decisão de dono é
escolher provedor: muda custo mensal, endereço de remetente, reputação de domínio e quem lê a caixa de span.

## Opções

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **Amazon SES** | API/SMTP da AWS; domínio verificado, SPF/DKIM assinados | barato por e-mail (≈ US$ 0,10 por mil), escala, o projeto já vive de AWS Academy | exige conta AWS, produção fora do sandbox precisa de solicitação de saída, e SMTP direto pede credencial IAM (SigV4) |
| **Postmark** | API de transacional | entrega transacional excelente, métricas por template, SDK simples | custo por volume maior; outro fornecedor na lista |
| **Brevo (ex-Sendinblue)** | SMTP ou API, tier gratuito mensal | começar custa zero, servidor SMTP comum | entrega e reputação do tier gratuito são medianas; marca d'água em alguns planos |
| **SMTP próprio (WAMP/VPS + Postfix)** | `nodemailer` com host/porta/usuário | controle total, nenhum fornecedor novo | você vira responsável por reputação de IP, blocklist, TLS e entrega; suporte é seu |
| **Ficar sem e-mail** | a recuperação vira "procure o suporte" | zero custo, zero superfície | o produto não é autossuficiente para um cliente sozinho recuperar a senha |

## Recomendação

**Amazon SES** se a hospedagem final for AWS (mesma conta, mesma fatura, mesma região), com **Brevo** como
plano B quando o volume esperado for pequeno e a equipe não quiser mexer em IAM. Nos dois casos, a
implementação é a mesma porta — o que muda é só o adaptador.

## O desenho da porta (escrito em 2026-10-13)

```
apps/api/src/lib/mail/porta.ts    MailerPort { nome; enviar(m: MensagemDeMail): Promise<void> } + mascaraEndereco()
apps/api/src/lib/mail/smtp.ts     adaptador genérico (nodemailer 10.1.0), escolhido por variável de ambiente
apps/api/src/lib/mail/console.ts  desenvolvimento: imprime assunto e destinatário mascarado
apps/api/src/lib/mail/fake.ts     testes: guarda as mensagens em memória e permite ler o texto recebido
apps/api/src/lib/mail/mensagens.ts  os três textos reais (recuperação, verificação de cadastro, aviso de 2FA)
apps/api/src/lib/mail/index.ts    criarMailer(fonte) decide pelo ambiente; mailer() é o ponto dos chamadores
apps/api/src/lib/mail/fila.ts     desde a T5.3: fila de memória do processo, retentativa, recuo, teto e auditoria da falha
```

O nome mudou em relação ao rascunho de 2026-10-11 (`src/integrations/email/` → `apps/api/src/lib/mail/`,
`PortaDeEmail` → `MailerPort`) porque a porta de e-mail nasceu junto das outras portas do processo, e não como
integração de terceiro. Não existe adaptador de fornecedor nenhum — o que existe é SMTP, que todos eles falam.

Regras que a porta carrega, com o estado medido nesta rodada:

1. **Nunca logar conteúdo nem credencial.** Cumprida. O adaptador SMTP monta erro com o código do protocolo e
   o endereço mascarado (`mascaraEndereco`), e os três chamadores gravam na auditoria só rótulo e resumo da
   falha.
2. **Fila, não espera.** **Cumprida em 2026-10-14 (T5.3, N58).** Os três chamadores agora fazem uma chamada
   síncrona a `enfileirarMail(...)` e devolvem; quem espera o provedor é `apps/api/src/lib/mail/fila.ts` —
   consumidor único, FIFO, três tentativas com recuo exponencial, teto de 15 s por tentativa (o mesmo número
   que vai para `connectionTimeout`/`greetingTimeout`/`socketTimeout`/`dnsTimeout` do nodemailer) e teto de 200
   mensagens vivas, com recusa auditada. A auditoria de falha saiu do request e passou a ser carimbada pela
   fila, uma linha por mensagem (`auth.forgot_password_entrega_falhou`, `auth.verificacao_entrega_falhou`,
   `auth.2fa_aviso_entrega_falhou`), com o resumo do motivo e a contagem de tentativas — nos dois fluxos de
   código também o rótulo da mensagem. O preço declarado em
   `docs/adr/0020-entrega-de-email-por-fila-de-memoria.md`: fila é memória, não sobrevive a reinício, e
   **persisti-la no banco estava fora de cogitação** — a mensagem de recuperação e a de verificação carregam o
   código em texto puro (é o que a pessoa digita), e o projeto guarda só o HMAC desses códigos. Por isso a
   entrega é *pelo menos uma vez*: uma tentativa cortada pelo teto pode chegar depois, e duplicar e-mail de
   recuperação é preferível a perder a mensagem em silêncio.
3. **Credencial só no `.env`.** Cumprida. Nada de SMTP no banco nem no `company`; a régua de produção
   (`src/config/producao.ts`) barra subir com credencial de exemplo.
4. **O adaptador falso não finge sucesso.** Cumprida de outra forma: o `fake` grava o que foi enviado — e os
   testes leem o que foi gravado — enquanto o `console` escreve no log do processo. A falha real de entrega
   vira auditoria (`auth.forgot_password_entrega_falhou`) sem mudar a resposta HTTP.

## O que eu preciso de você

- [ ] Qual provedor (SES / Postmark / Brevo / SMTP próprio / nenhum por enquanto)?
- [ ] Domínio de remetente e endereço (ex. `no-reply@seudominio.com.br`)?
- [ ] Resumo do conteúdo de recuperação e do relatório diário: texto próprio ou modelo?
- [ ] E-mail por empresa (cada cliente usa o próprio SMTP) ou um e-mail só da plataforma?

Com essas quatro respostas eu escrevo a porta + adaptador falso + adaptador real e o teste que prova o
envio sem tocar em credencial viva.

**Estado em 2026-10-13:** a frase acima já foi cumprida — porta, adaptador de teste, adaptador de
desenvolvimento, adaptador SMTP real e as provas de envio existem, sem credencial viva em lugar nenhum. Das
quatro caixas, a primeira deixou de ser bloqueio técnico: SES, Postmark, Brevo e Postfix próprio conversam
todos por SMTP, então a resposta do dono agora é apontar `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/
`MAIL_FROM` e escolher o plano. As caixas 2, 3 e 4 (remetente, texto por modelo próprio, e-mail por empresa)
continuam com o dono, e o relatório diário do cron continua sem chamador de e-mail.
