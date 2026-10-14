# G4 — Cadastro self-service sem verificação de e-mail

**Situação:** PARCIALMENTE FECHADO · **Década:** 2026-10-11 · **Re-medido:** 2026-10-13 (decisão D2, tarefa T3/F4) · **Sem mudança de comportamento sem sua ordem.**

## O que mudou em 2026-10-13 (decisão D2, tarefa T3/F4)

A decisão D2 do dono escolheu a terceira opção da tabela abaixo — **verificação obrigatória antes de entrar** —
e ela foi implementada, com uma ressalva que é a razão desta linha:

- `REQUIRE_EMAIL_VERIFICATION` (`config/env.ts:63`, padrão `"0"`) é a porta. Ligada, o `POST /auth/register`
  devolve 201 **sem sessão nenhuma** (`auth.service.ts:520`), e o login de quem não confirmou não abre o painel
  (`auth.service.ts:225`, e o mesmo na rota de segundo fator em `segundo-fator.service.ts:208`). Desligada, o
  comportamento é o antigo: entrou, criou, usou.
- A régua de produção (`config/producao.ts:123`) **exige** a flag ligada: em produção não existe cadastro que
  entra sem clique. Em desenvolvimento e nos testes ela fica desligada, senão cada prova de tela teria que
  confirmar e-mail antes de abrir o painel.
- O token de confirmação é de uso único, guardado como hash em `email_verification_tokens`, com TTL, reenvio
  por `POST /auth/resend-verification` (rate-limited) e **não** reutiliza o mecanismo de recuperação de senha —
  a invariantes 2 do desenho foi cumprida.
- A tela de cadastro deixa de prometer "você entrou" e mostra o passo de confirmação (`apps/web`, `register`
  devolve `{ estado: "verificacao-pendente" }`).

**Continua em aberto, e nada disso foi feito por conta própria:** a opção 1 da recomendação — limite de
empresas por usuário e por IP/dia — não existe no código (nenhum `creation_source`, nenhum `creation_ip`,
nenhum contador por IP; medido por grep em `apps/api/src`). Também não existe captcha. Ou seja, o spam de
cadastro segue protegido só pelo rate-limit de 5/min e, agora, pela caixa de entrada: a empresa passa a
existir no banco **antes** de haver dono verificado, que é exatamente o contra que a tabela aponta.

## O que existe hoje


- `POST /api/auth/register` cria usuário **e** empresa própria como OWNER numa transação, já autentica e
  libera o painel. A empresa passa a existir imediatamente.
- Proteção atual: rate-limit de **5 requisições por minuto** nessa rota (`auth.routes.ts:29`), regra de
  senha forte (8+, maiúscula, especial) e e-mail único no banco (`409` em duplicidade).
- Não existe verificação de e-mail, não existe limite de empresas por usuário nem por IP, e não existe
  captcha. Qualquer pessoa com um script cria empresas ilimitadas — o rate-limit só atrasa, não impede.

## Por que é decisão sua

Fechar essa porta tem custo direto de conversão: exigir clique no e-mail antes de entrar no painel muda a
primeira experiência do produto, e sem SMTP (G1) não há como enviar o link. As duas decisões estão
amarradas — por isso nenhuma foi implementada por conta própria.

## Opções

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **Deixar como está** | cadastro entra direto | conversão máxima, zero dependência | base inflada de contas falsas, spam de teste, ninguém sabe quem é o cliente |
| **Verificação por link, sem bloquear** | cria e entra, mas o painel avisa "confirme seu e-mail" até confirmar; limites baixos enquanto não confirma | não perde ninguém, ainda dá para limpar depois | exige SMTP (G1); o dado entra no banco antes de existir dono verificado |
| **Verificação obrigatória antes de entrar** | cria pendente, só libera o painel depois do clique | base limpa por construção | precisa de SMTP, de link com validade e de reenvio; fricção na entrada |
| **Convite / onboarding assistido** | sem cadastro público; a plataforma cria as contas | controle total | não é produto self-service, mata a proposta do site público |
| **Captcha + limite por IP** | `register` exige token de captcha e um teto por IP/hora | barateia o spam sem pedir e-mail verificado | captcha é atrito e é um fornecedor a mais; IP em rede corporativa é compartilhado |

## Recomendação

**Verificação por link, sem bloquear o primeiro acesso**, com duas travas pequenas antes disso:

1. limite de empresas criadas por usuário (por exemplo 3) e por IP/dia, para o script parar de multiplicar
   empresa;
2. marca `emailVerifiedAt` no usuário, que só passa a valer quando o link for clicado.

É a opção que não perde cliente na porta, não depende de captcha, e encaixa no adaptador de e-mail do G1
quando ele existir. Enquanto não houver SMTP, a flag fica existindo e nada muda no comportamento — o
cadastro continua entrando, e a tela só não mostra aviso nenhum.

## O que a porta vai ficar sendo (desenho, ainda não escrito)

```
migrations: user.email_verified_at (nullable), company.creation_source, company.creation_ip
src/lib/cadastroGuard.ts            limites por usuário e por IP, função pura e testável
src/integrations/email (G1)         envio do link de confirmação
```

Invariantes:

1. limite por IP é **defesa**, não identidade: IP atrás de proxy só funciona com `TRUST_PROXY` declarado
   (A9 já trata isso).
2. O link de confirmação é de uso único, com hash no banco e TTL, igual ao reset de senha — nunca reutiliza
   o mesmo mecanismo do reset.
3. Nenhum cadastro em massa silencioso: criar empresa registra origem e IP, e a tela de administração da
   plataforma enxerga a lista.

## O que eu preciso de você

- [ ] O produto continua self-service público ou passa a ser por convite?
- [ ] Quantas empresas uma pessoa pode criar antes de virar suspeita?
- [ ] Confirmar e-mail bloqueia alguma coisa (relatórios, exportação) ou é só aviso?
- [ ] Captcha na entrada: sim ou não (e se sim, qual fornecedor)?
