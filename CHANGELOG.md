# Changelog

Todas as mudanças notáveis deste projeto, em português brasileiro.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), ordem mais novo primeiro.

## [Não lançado]

### Alterado
- Página pública: herói agora é 100% marca — botões "Acessar o sistema" e "Conhecer recursos" removidos; o acesso ao sistema permanece no botão "Acessar" do topo.
- Alternador de tema redesenhado como switch moderno (trilho em pílula, ícones sol/lua e thumb em degradê cobre que desliza), com `role=switch`, `aria-checked` e respeito a `prefers-reduced-motion`.

### Adicionado
- Fundação vertical completa do frontend: AdminShell (sidebar, header, footer), Landing pública com "Acessar", Login real com JWT, Dashboard com KPIs vindos da API, Usuários (busca, papel editável, modal de novo membro), Auditoria, Configurações (tema, conta, troca de empresa) e páginas de erro 401/403/404/500 com identidade da marca.
- Design system Premium Gourmet em `apps/web/src/styles/` (tokens de tema, global, componentes) com alternância dark ("noite sofisticada") / light ("dia elegante") persistida e sem preto/branco puros.
- Paginações globais servidor-cliente (`{data, meta}`), estados de carregamento/vazio/erro padronizados, Toastr centralizado e confirmações via SweetAlert2 (nenhum `alert/confirm` nativo).
- Capturas reais das 6 telas em `docs/screenshots/` e README com imagens do sistema em execução.
- Favicon derivado da logo oficial (`apps/web/public/favicon.png`).

### Corrigido
- `components.css` reescrito para casar exatamente com as classes dos componentes (divergência de nomenclatura detectada em inspeção visual das telas).
- Removida opção `fade` inexistente na configuração do Toastr e import não utilizado no AdminShell.

### Fase 1 (análise e fundação do backend)
- Análise real do repositório/bancos de referência (`docs/ANALISE.md`) — confirmado que não há legado recuperável.
- Paleta oficial extraída da logo (`docs/design/palette.md`).
- ADRs 0001–0003 (persistência Prisma, multiempresa/RBAC, frontend AdminLTE 4 + design system).
- Fundação do backend (Fastify 5 + TS + Prisma + auth + RBAC + multiempresa + auditoria), com 14 testes de integração contra MySQL real.
