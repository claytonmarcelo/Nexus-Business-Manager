# G1 — Envio de e-mail (SMTP)

**Situação:** BLOQUEADO POR DECISÃO · **Década:** 2026-10-11 · **Nenhuma integração foi inventada.**

## O que existe hoje, no código

- A recuperação de senha gera o código, guarda só o hash (`password_reset_tokens`) e **não envia nada**.
  Em desenvolvimento, com `AUTH_EXPOSE_RESET_TOKEN=1` e ambiente não-produtivo, o código volta no corpo da
  resposta para o navegador poder concluir o fluxo. Em produção, sem provedor, a tela diz que o e-mail foi
  enviado e o usuário nunca recebe nada — a funcionalidade está **morta na prática**.
- O cron de relatório diário (`modules/cron/cron.handlers.ts`) e os avisos do sino
  (`notifications.service.ts`) carregam a mesma anotação: "sem SMTP configurado não há e-mail; nada é
  simulado aqui".
- Não existe tabela de SMTP no schema nem porta de envio em `src/`. A tela de Configurações tem as abas de
  sistema, mas nenhuma credencial de e-mail é pedida em lugar algum.

## Por que está parado

O contrato (§46 e Bloco G) proíbe escrever integração sem credencial real e manda entregar opção +
recomendação + a porta pronta. Escolher provedor é decisão de dono: muda custo mensal, endereço de
remetente, reputação de domínio e quem lê a caixa de span.

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

## O que a porta vai ficar sendo (desenho, ainda não escrito)

```
src/integrations/email/porta.ts        interface PortaDeEmail { enviar(m: Mensagem): Promise<Resultado> }
src/integrations/email/nenhum.ts       adaptador falso: grava "e-mail não enviado" e não sai do processo
src/integrations/email/ses.ts | smtp.ts  adaptadores reais, escolhidos por variável de ambiente
```

Regras que a porta carrega, independente do fornecedor:

1. **Nunca logar conteúdo nem credencial.** O log registra destino hashingado, template e resultado.
2. **Fila, não espera.** Nenhum request HTTP fica esperando provedor de e-mail; o envio sai do cron ou de
   uma fila, com re-tentativa e backoff.
3. **Credencial só no `.env`.** Nada de senha de SMTP no banco e no `company` — a configuração por empresa
   é uma decisão separada, que vem depois.
4. O adaptador falso continua respondendo `enviado: false` em vez de fingir sucesso: teste e produção
   precisam saber quando o e-mail de verdade não saiu.

## O que eu preciso de você

- [ ] Qual provedor (SES / Postmark / Brevo / SMTP próprio / nenhum por enquanto)?
- [ ] Domínio de remetente e endereço (ex. `no-reply@seudominio.com.br`)?
- [ ] Resumo do conteúdo de recuperação e do relatório diário: texto próprio ou modelo?
- [ ] E-mail por empresa (cada cliente usa o próprio SMTP) ou um e-mail só da plataforma?

Com essas quatro respostas eu escrevo a porta + adaptador falso + adaptador real e o teste que prova o
envio sem tocar em credencial viva.
