# ADR-0013 — Reforço de autenticação: entregador de mensagem no ambiente, cadastro confirmado e segundo fator com segredo cifrado

- Status: Aceita (2026-10-13)
- Contexto: decisões **D1**, **D2** e **D3** do dono no prompt de continuação de 2026-10-13, executadas na
  tarefa **T3** (fase **F4**). O que estava medido antes de escrever qualquer linha:
  - a recuperação de senha gerava o código, guardava só o hash e **não enviava nada** — `G1` de
    `docs/decisoes/` estava bloqueado por escolha de provedor, e enquanto isso a tela dizia "e-mail enviado"
    para uma caixa que nunca recebia nada (registro N53 e o próprio G1);
  - o cadastro criava conta com sessão na mão: ninguém provava ler aquela caixa de e-mail, então um endereço
    digitado errado ou alheio virava uma empresa;
  - o login tinha um fator só, e a única trava contra tentativa e erro era o rate-limit por endereço
    (`RATE_LIMIT_MAX`), que um rotador de IP atravessa;
  - não existia coluna de segredo TOTP, nem de e-mail confirmado, nem tabela de contagem de falhas.
- Decisão:
  1. **D1 — a porta fica no código, o entregador fica no ambiente.** `src/lib/mail/porta.ts` define
     `MailerPort { enviar(mensagem): Promise<ResultadoDeEnvio> }`, e `criarMailer(fonte)` escolhe o
     entregador pelo ambiente: `MAIL_TRANSPORT=smtp` usa o adaptador SMTP genérico (`nodemailer` 10.1.0,
     `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`/`MAIL_FROM`), `memory` é a caixa de teste,
     e vazio decide pelo ambiente — SMTP quando host, porta e remetente existem; console fora deles. A
     escolha de **provedor** (SES, Brevo, Postmark, servidor próprio) continua sendo do dono e continua em
     G1: os quatro falam SMTP, então a decisão de fornecedor não muda uma linha de código, muda só o `.env`.
  2. **O código nunca sai pelo HTTP nem pelo log.** A resposta de `forgot-password` é o genérico
     ("se o endereço existe, a mensagem foi enviada") em qualquer ambiente; o token em claro vive só no corpo
     do e-mail. A exceção que existia (devolvê-lo na resposta) continua fechada por trás de
     `AUTH_EXPOSE_RESET_TOKEN=1`, que a régua de produção recusa, e o `console` imprime endereço com a caixa
     alta mascarada, nunca o código.
  3. **D2 — a verificação é do ambiente, não da conta.** `REQUIRE_EMAIL_VERIFICATION=1` faz o cadastro
     devolver `201 {verificationRequired:true}` sem sessão e faz o login recusar quem não confirmou. Em dev e
     teste a flag fica desligada, de propósito: nenhuma suíte depende de ler caixa de e-mail, e uma conta
     criada antes da mudança não é trancada numa atualização de servidor — `email_verified_at` nulo só barra
     quem o ambiente exige, e a própria pessoa confirma quando quiser. Reenvio responde 200 genérico para
     endereço existente e inexistente.
  4. **D3 — TOTP com `otpauth` 9.5.2 fixado, segredo cifrado em repouso.** A biblioteca foi escolhida em vez
     de escrever RFC 6238 à mão por dois motivos concretos: é a mesma janela de verificação/`step` que os
     aplicativos do mercado usam (escrever o algoritmo é uma porta de incompatibilidade com o Google Authenticator
     do cliente), e não trouxe dependência transitiva nenhuma — `npm ls otpauth nodemailer` mostra as duas
     folhas do gráfico, e o `npm audit` desta rodada (3 high, todos na cadeia
     `deepmerge-ts` → `@prisma/config` → `prisma`, o mesmo Bloco B já registrado) não lista nenhuma delas.
     O segredo em base32 é gravado como envelope
     `v1:<iv>:<tag>:<cifrado>` de AES-256-GCM (`src/lib/criptografia.ts`) com a chave `TOTP_ENCRYPTION_KEY`,
     e o dump do banco sozinho não vale um segundo fator.
  5. **D3 — dez códigos de recuperação, um uso cada, guardados como hash.** `recovery_codes.code_hash` é
     HMAC-SHA256, o mesmo desenho de `password_reset_tokens` e `email_verification_tokens`. Eles aparecem uma
     vez, na resposta que liga o segundo fator, e não têm tela de "mostrar de novo" porque não existe de onde
     mostrar.
  6. **Obrigatório onde o risco mora.** Segundo fator é obrigatório em produção para quem tem papel de
     plataforma e para qualquer OWNER (`doisFatorObrigatorio`); fora disso é opcional e a tela de Configurações
     oferece. Em dev e teste a régua fica desligada para que a suíte existente não entre em modo de etapa — e
     é por isso que as regras de produção desta fase são provadas com `comFlag` (a flag é escrita e restaurada
     no `finally`, e o serviço lê o `env` na hora da chamada).
  7. **As rotas de etapa não são sessão.** O login passou a devolver três estados (sessão, desafio,
     configuração). Os tokens de etapa têm escopo próprio (`2fa-desafio` 5 min, `2fa-configuracao` 15 min),
     só abrem a rota da própria etapa (decorador `authenticateSegundoFator`) e não abre rota de negócio
     nenhuma. No navegador eles vivem em estado de tela e morrem com ela; a matriz de rotas de
     `isolamento-rotas.test.ts` passou a declarar essa terceira porta (`DE_ETAPA`) em vez de fingir que ela é
     pública.
  8. **Bloqueio por conta, sem resposta que denuncia.** Cinco falhas em quinze minutos bloqueiam quinze
     minutos, e a contagem mora em `login_attempts`, chaveada pelo e-mail em minúsculas — **sem chave
     estrangeira**, porque endereços que não existem no sistema também precisam ser contados. Uma conta que não
     existe perde o mesmo tempo de uma que existe, por um hash-isca (mesmo custo do `bcrypt` real, 12 rondas),
     para que o tempo de resposta não diga "esse e-mail está cadastrado".
  9. **A janela de corrida de abas, e a guarda que ela exigiu.** Uma renovação gira o refresh token, e duas
     abas do mesmo navegador renovam juntas: a segunda chega com o token velho antes de o giro chegar ao
     disco. Sem janela, a aba legítima era tratada como roubo e derrubava a própria pessoa de todas as
     sessões. A janela é de dez segundos (`JANELA_DE_CORRIDA_MS`), cada uso dela fica em
     `auth.refresh_corrida`, e fora dela a reapresentação continua caindo na reação em cadeia de
     `auth.refresh_reuse`. O preço descoberto por teste — e este é o registro que importa — é que a janela
     sobrevivia a uma **decisão**: depois de trocar a senha ou fazer logout, reapresentar o pai rotacionado
     dentro dos dez segundos ainda emitia sessão. A regra ficou então: a janela é da **linhagem**, não da
     conta. Ela só vale enquanto existir token vivo nascido a partir do instante do consumo; se a revogação por
     decisão derrubou a linhagem, o replay volta a ser 401 e a registrar reuso.
  10. **A chave do segundo fator é validada como segredo, não como formato.** A régua de produção recusa
      `TOTP_ENCRYPTION_KEY` ausente, fora de 64 caracteres hexadecimal, que contenha palavra de tutorial e que
      tenha pouca variedade de caracteres (menos de 8 diferentes nos 64): "0" repetido 64 vezes passa no regex
      de hexadecimal e é um cadeado de brinquedo justamente sobre o segredo que não pode ser reconstruído.
- Consequências:
  - Migration **aditiva** `20261013040000_reforco_de_autenticacao`: três colunas em `users`, três tabelas
    novas (`email_verification_tokens`, `recovery_codes`, `login_attempts`). Nenhum dado existente foi reescrito
    e nenhuma coluna antiga mudou de significado.
  - O contrato de ambiente cresceu dez variáveis, documentadas em `apps/api/.env.example` com o comando que
    gera a chave do TOTP, e a régua de produção (`src/config/producao.ts`) passou a cobrá-las em produção.
    `docs/PRODUCAO.md` recebe o passo a passo na **T5** (F6), onde moram Docker e operação.
  - A tela de entrada deixou de ser um formulário e passou a ser quatro passos com o mesmo layout, porque uma
    etapa de autenticação que troca de cara no meio faz a pessoa duvidar de onde está. O destino depois do
    login passou por `destinoSeguro`: origem que não é caminho desta casa (incluindo `//dominio`, `https://` e
    `javascript:`) vira `/app`.
  - As proteções herdadas foram **re-aprovadas** sob o regime novo, com teste vermelho antes de correção:
    hierarquia de papéis, última empresa sem OWNER, empresa ativa no refresh, conta desativada, sessões da
    empresa ativa, recuperação que não derruba sessão, aviso que não cruza empresa e estoque atômico estão em
    `apps/api/test/guardas-herdadas.test.ts`, e as duas que a janela de corrida tinha quebrado voltaram a valer
    com a guarda da linhagem (item 9).
  - Nada de entrega de mensagem foi simulado em produção: a régua recusa `MAIL_TRANSPORT=memory` e recusa cair
    no console, porque "recupere sua senha" sem provedor é a conta trancada por fora com alguém achando que
    avisou.
