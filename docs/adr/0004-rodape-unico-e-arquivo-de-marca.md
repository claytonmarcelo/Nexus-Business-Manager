# ADR-0004 — Rodapé único e arquivo de marca

- Status: Aceita (2026-10-12)
- Contexto: F1.2 do PROMPT MESTRE. O crédito e o ano viviam duplicados em dois lugares — `LandingFooter` na
  vitrine e um `<footer className="admin-footer">` solto no `AdminShell` —, sem versão, sem links legais no
  painel e com texto em `--text-3`, token que não alcança 4,5:1 em nenhum dos temas. O dono decidiu que o nome
  "Clayton Marcelo" permanece como crédito, entregue com personalização melhor.
- Decisão:
  1. **Um componente.** `apps/web/src/components/layout/AppFooter.tsx` é o rodapé da vitrine, da página de
     documento legal e do painel. Variante por classe (`nexus-footer--vitrine` / `nexus-footer--painel`), nunca
     por texto diferente.
  2. **Um arquivo de marca.** `apps/web/src/lib/brand.ts` guarda nome do produto, autor, endereço do autor
     (opcional) e os rótulos institucionais dos três documentos legais. É a única edição necessária para mudar
     o crédito em qualquer tela.
  3. **Versão vem do pacote, não de gente.** `define: { __APP_VERSION__ }` no `vite.config.ts` lê o
     `package.json` no build (e o `vitest.config.ts` repete a injeção, para o teste ver o mesmo dado). Sem o
     dado, o selo não aparece — o rodapé não inventa número.
  4. **Link só existe com destino.** O crédito vira âncora apenas se `urlDoAutor` estiver preenchida; aí com
     `target="_blank"` e `rel="noopener noreferrer"`. Documento legal entra no rodapé se, e somente se, o CMS
     o marcou como publicado.
  5. **Estado do serviço com dado real.** `lib/statusServico.ts` consulta `GET /api/health` uma vez por
     montagem e valida campo a campo; resposta inesperada, erro ou timeout significam "não mostrar".
  6. **Nomes de classe evitam o framework.** O prefixo é `nexus-` porque o AdminLTE 4, importado em
     `main.tsx`, já define `.app-footer` com fundo branco, padding e altura próprios (ver N19 em
     `docs/AUDITORIA.md`).
- Atualização (2026-10-13): por decisão do dono, o rodapé deixou de mostrar o rótulo com o nome do produto ao
  lado do símbolo e o selo de versão. A decisão 3 acima está superada — não porque o número estivesse errado,
  mas porque número de pacote não é informação para quem usa o sistema. Com o selo fora da tela, a injeção
  `__APP_VERSION__` foi desmontada junto (o `define` do `vite.config.ts` e do `vitest.config.ts`, a declaração
  em `src/vite-env.d.ts` e o campo no arquivo de marca), para o pacote não carregar dado que nenhuma tela
  mostra. As decisões 1, 2, 4, 5 e 6 continuam valendo, e o nome do produto segue aparecendo — na linha de
  direitos autorais, que é onde ele pertence.
- Consequências: Rodapé coerente entre vitrine e painel; correção de marca em um arquivo; nada de link morto ou
  estado inventado; texto acima de 4,5:1 nos dois temas (`--text-2`: 8,64:1 noite, 5,50:1 dia sobre `--bg`). O
  custo é uma requisição pública a mais por montagem de tela, ao `/api/health` — rota aberta de propósito, sem
  sessão e sem dado de cliente.

