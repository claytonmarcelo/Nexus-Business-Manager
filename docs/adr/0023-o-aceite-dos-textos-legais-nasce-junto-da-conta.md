# ADR-0023 — O aceite dos textos legais nasce junto da conta, com a versão daquele momento

- Status: Aceita (2026-10-14)
- Contexto: primeiro item da T6 (F7) do prompt de continuação — "registro de aceite de termos e política (versão,
  data, IP, usuário) no cadastro", que é também a linha `F1. Base de conformidade | PENDENTE` de
  `docs/STATUS-AJUSTES.md`. A outra metade já existia: a prateleira de textos (`legal_documents`, criada no bloco de
  CMS), com editor da plataforma em *Site público → Textos legais* e leitura pública que recusa o que não foi
  publicado. O que não existia era a ponta do registro. Medido antes de escrever, na árvore publicada (`68f0d0d`):
  `ConsentRecord` no schema — **0 ocorrências**; coluna `version` em `legal_documents` — **0**; `aceitaTermos` em
  `apps/api/src` — **0 ocorrências em todos os arquivos**. Ou seja, à pergunta "mostre o que este usuário aceitou" a
  resposta era a palavra de quem opera o sistema, e nada no banco a sustentava. Isso não era um detalhe de
  relatório: desde a D2 (`REQUIRE_EMAIL_VERIFICATION=1` obrigatório em produção) o cadastro é a porta de entrada do
  produto, e a porta não pedia absolutamente nada sobre as duas vontades que a pessoa declara ao passar por ela.
  Alternativas consideradas e recusadas: **(a) uma caixa única "li e aceito"** — recusado: termos de uso é
  contrato, política de privacidade é consentimento sobre dados pessoais, e fundamentos diferentes não se
  assinam juntos; **(b) um booleano `terms_accepted` na tabela `users`** — recusado: sem versão, data e endereço
  não é prova, é estado, e o estado atual não diz o que estava em vigor quando a pessoa marcou; **(c) barrar o
  cadastro enquanto os textos não estiverem publicados** — recusado: uma instalação recém-subida não conseguiria
  criar a primeira conta, e o produto perderia a autoinscrição que a D2 acabou de organizar; **(d) registrar
  aceite também na conta que a equipe cria** — recusado: ninguém marcou caixa por aquela pessoa, e gravar um
  aceite que ela não deu seria fabricar justamente a prova que o registro existe para ser; **(e) em vez de copiar
  a versão, juntar vivos `consent_records` e `legal_documents`** — recusado: o texto pode ser reescrito amanhã, e
  a prova do que foi aceito ontem mudaria junto com ele; **(f) exigir `aceitaTermos: true` com
  `z.boolean().refine`** — recusado: com o campo ausente o zod falha antes do refine e a pessoa leria "Required"
  em inglês numa tela em português; a `caixaObrigatoria` abaixo cobre os dois caminhos com a mesma frase.
- Decisão (padrão seguro, reversível — regra da decisão D14 do dono):
  1. **duas vontades, duas linhas.** `POST /api/auth/register` passou a exigir `aceitaTermos` **e**
     `aceitaPrivacidade` (`apps/api/src/modules/auth/schemas.ts`), e a gravação faz duas linhas em
     `consent_records` (`modules/lgpd/lgpd.service.ts`). A guarda existe nos dois lugares de propósito: o esquema
     recusa na borda, e `register()` relança `badRequest` se alguém chamar o serviço por outro caminho — a
     segunda é por construção, não por confiança no primeiro.
  2. **o aceite é do cadastro self-service, e só dele.** A conta que um ADMIN cria para a equipe continua sendo
     criada como era, com zero linhas de aceite. O caso está amarrado por teste, porque é a linha que separa
     "registrar o que a pessoa declarou" de "fabricar o que ela não declarou".
  3. **a linha guarda a versão daquele momento.** `legal_documents` ganhou `version` (inteiro, padrão 1), e
     `consent_records` copia `kind` + `version` + `ip` + `acceptedAt` na hora do aceite. A relação é só com
     `user` (`onDelete: Cascade`), então o histórico cai junto da conta pela mesma regra das chaves de acesso.
  4. **a versão sobe quando o texto muda — e só então.** Em `salvarLegal`, o incremento acontece quando
     `content` é enviado e difere do conteúdo atual. Trocar título, ou publicar e despublicar, não reescreve o
     que a pessoa aceitou, e um número que sobe sem o corpo mudar tornaria a linha de aceite inútil.
  5. **a leitura da oferta acontece antes de abrir a transação; a escrita dentro dela.** `ofertasDoCadastro()`
     resolve as duas versões fora do `$transaction`; `registrarAceites(tx, ...)` escreve dentro. Ou a conta
     existe com os aceites dela, ou não existe nenhuma das duas — não há janela em que alguém é criado sem a
     prova de ter aceitado.
  6. **a tela mostra o que está publicado, e continua exigindo as duas caixas quando não há nada publicado.**
     `Register.tsx` lê a vitrine pública (`/public/landing`), e os links "Leia antes de aceitar:" só aparecem
     para os textos publicados; ausentes os dois, a frase some e a obrigatoriedade fica. A caixa não depende do
     conteúdo existir, e o conteúdo não depende da caixa: são as duas pontas da mesma decisão (c) acima.
  7. **a migration é aditiva e declara a reversão na própria SQL.** `legal_documents ADD COLUMN version` +
     `CREATE TABLE consent_records` + a chave estrangeira, com os três passos de volta escritos em comentário na
     ordem inversa.
- Consequências:
  - Positivas (medidas nesta árvore, banco de prova): `apps/api/test/aceite-de-termos-no-cadastro.test.ts` com
    **5 casos** cobre recusa sem aceite (nenhuma linha criada em `users`, `companies` ou `consent_records`),
    aceite isolado, as duas linhas com usuário/versão/data/IP, a versão congelada quando o texto é reescrito
    depois, e a conta da equipe sem aceite; `apps/web/src/test/aceite-de-termos-no-cadastro.test.tsx` com
    **7 casos** cobre as caixas, o bloqueio do envio antes de chamar a API, o corpo enviado, a falha de API que
    mantém as caixas marcadas e os links conforme o que foi publicado. Vermelho medido no lado da web antes do
    componente existir: **7 failed (7)**; verde depois: **7 passed (7)**, e a suíte web inteira
    **21 arquivos / 163 casos**. No lado da API a corrida vermelha é da janela que escreveu o serviço, e o que
    está medido nesta janela é a verde: a vizinhança inteira — os quatro arquivos que leem ou escrevem na
    prateleira (`aceite-de-termos-no-cadastro`, `auth-flows`, `verificacao-de-email` e `cms`) — fechou
    **4 arquivos / 34 casos** em 28,93 s, corrida rodando junta de propósito porque é ela que prova a devolução
    do estado compartilhado; e a suíte inteira fechou **52 arquivos / 472 casos** sem falha. A
    superfície de rotas não mudou (o aceite entrou no `register` que já existia): continua **131** em
    `isolamento-rotas.test.ts`.
  - Custos e o que fica aberto: **(1) o aceite é do cadastro, e nada hoje pede re-aceite quando a versão muda** —
    quem aceitou a versão 1 continua entrando com a 3 em vigor; a régua de re-aceite é decisão de produto, e
    precisaria de uma coluna de "último aceite conferido" que não existe. **(2) a prova é fraca enquanto os
    textos não forem publicados** — a linha registra a versão da prateleira vazia (1), e é por isso que a
    publicação entrou na seção 9 de `docs/PRODUCAO.md`. **(3) o `ip` é o que `req.ip` devolve**, ou seja, o
    endereço do proxy quando `TRUST_PROXY` estiver declarado; installation com proxy mal configurado grava o
    endereço errado, e isso já é risco da auditoria inteira, não deste registro. **(4) ainda não há tela nem
    exportação para consultar o aceite** — a linha existe, e "mostre o que este usuário aceitou" hoje se responde
    no banco; a ponta de consulta é T6.3 (exportação) e T6.4 (anonimização). **(5) `legal_documents` é estado
    global de plataforma**, então um arquivo de teste que publica um texto escreve no estado que o arquivo
    seguinte lê — este arquivo captura a prateleira antes e a devolve no `afterAll`, inclusive a versão; o write
    que a rota pública anônima faz nessa tabela é o **N79** abaixo, registrado e não consertado aqui por escopo.
