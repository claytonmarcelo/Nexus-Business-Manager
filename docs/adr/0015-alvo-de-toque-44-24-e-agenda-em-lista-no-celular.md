# ADR-0015 — Alvo de toque: 44 px onde mora o dedo, 24 px onde mora o teclado, e a grade do mês só vale com equivalente provado

- Status: Aceita (2026-10-14)
- Contexto: item 7 da F5, no prompt de continuação da F4 -> F9 ("rótulos, foco visível, navegação por teclado,
  `prefers-reduced-motion`, alvo de toque >= 44 px nos controles principais"). Até a T4.9 nada disso tinha
  medição: a casa tinha layout responsivo (`tools/verify-responsive.cjs`) e ganhou contraste nesta mesma rodada
  (`tools/audit-contraste-painel.cjs`), mas nenhum instrumento afirmava que a tela é operável sem mouse ou com
  dedo.
  O problema não é de gosto, é de régua: sem número, "acessível" é adjetivo.
- Decisão:
  1. **Dois pisos, não um.** Em janela estreita ou dispositivo de toque vale o **AAA 2.5.5 de 44x44 px**; em
     mesa vale o **AA 2.5.8 de 24x24 px**. Aplicar 44 px numa janela de 1440 px teria estourado cabeçalho de
     tabela e linha de ação por um motivo que não existe lá - mouse não tem largura de dedo. O gatilho do piso
     de 44 px é `@media (max-width: 820px), (pointer: coarse)`: o segundo termo é o que pega notebook com tela
     de toque em janela larga, que é exatamente o aparelho onde a regra de 820 px sozinha deixaria passar.
  2. **Quebra de linha é parte da decisão, não consequência.** Dois botões de 44 px lado a lado não cabem em
     360 px. As linhas que eram `flex` sem permissão de quebrar - `.page-head`, `.nx-bloco-head`,
     `.nx-modal-foot`, `.nx-modal-actions` - ganharam `flex-wrap`. Tabela continua rolando dentro do próprio
     `.table-wrap`, que é onde o overflow horizontal já estava tratado antes.
  3. **A grade do mês só fica curta se a lista existir.** A exceção de "equivalente" do critério 2.5.8 não é
     declarada, é conferida: a prova exige que o nome de cada pílula de 39x25 px apareça entre os controles de
     >= 44 px da mesma tela. É por isso que o celular abre a Agenda na `listMonth` (`Agenda.tsx`, com
     `emTelefone()` lido do `matchMedia`), e não na grade: na lista o evento é uma linha de 144x44 px. A
     alternância continua na barra de ferramentas, e quem estiver no celular pode ir à grade se quiser - o que a
     casa não pode é fingir que a grade é alcançável com o dedo.
  4. **A prova não pode medir o vazio.** `tools/verify-acessibilidade.cjs` cria um compromisso próprio pelo
     contrato público da Agenda, mede a grade com ele lá, e apaga no fim, imprimindo a contagem antes e depois.
     Sem isso, um mês sem evento passaria na checagem da grade sem olhar nada.
- Consequências:
  - Medido na última corrida: **22 verificações, 0 falhas**; **649** controles montados, **0** sem rótulo
    acessível, **0** sustentados só por `placeholder`/`title`; **68** paradas de `Tab`, **0** sem anel de foco;
    **0** controles principais abaixo de 44 px em 360 px e **0** abaixo de 24 px em 1440 px; teclado sem mouse
    (menu com `Enter`, gaveta com `Escape`, abas, diálogo); `prefers-reduced-motion` com **0** elementos em
    animação na vitrine e **0** no painel.
  - As dez capturas estreitas do repositório mudaram de pixels com o piso novo (botão, aba, campo e paginação
    maiores), e ficaram. Está registrado em N30 de `docs/AUDITORIA.md`, com o método de comparação.
  - O piso é CSS, não componente: uma tela nova entra nele de graça. O que não entra de graça é o rótulo - e é
    por isso que a varredura de rótulo percorre as telas inteiras em vez de checar três amostras.
  - Ficou de fora, declarado: zoom de 200%, leitor de tela, e o contraste dos estados desabilitados. Estes três
    continuam não medidos.
