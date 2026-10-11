# G6 — Licença do repositório

**Situação:** BLOQUEADO POR DECISÃO · **Década:** 2026-10-11

## O que o contrato dizia

O prompt de mercado apontava uma divergência: `package.json` raiz com `UNLICENSED` contra um README que
citava MIT.

## O que o repositório diz hoje (conferido nesta rodada)

- `package.json` raiz: `"private": true` e `"license": "UNLICENSED"`.
- `README.md`, seção de licença: "uso não autorizado a terceiros (`UNLICENSED` no `package.json` raiz) — o
  código é protegido pela legislação de direitos autorais".
- Não existe arquivo `LICENSE` na raiz.
- **A divergência não está mais no repositório** — os dois lugares dizem a mesma coisa, e o texto que citava
  MIT foi retirado quando o README passou a descrever o que o código realmente é.

## O que ainda é decisão sua

Fechar a divergência técnica não escolhe o regime comercial do produto. As três opções reais:

| Opção | O que significa | Quando faz sentido |
|---|---|---|
| **Proprietário (`UNLICENSED`, como está)** | nenhum direito concedido a terceiros; quem usa precisa de contrato com você | o produto é vendido como serviço/licença e o código é o ativo |
| **Open source com copyleft (GPL-3.0 / AGPL-3.0)** | qualquer um usa e modifica, mas derivações publicam o código; AGPL alcança quem oferece como serviço pela rede | você quer o código aberto e não quer que nuvem concorrente empacote seu trabalho |
| **Open source permissivo (MIT / Apache-2.0)** | qualquer uso, inclusive fechado, com atribuição | o objetivo é adoção, comunidade, currículo ou ecossistema — não proteger o código |

## Recomendação

**Manter proprietário**, porque o produto está sendo posicionado para venda (auditoria comercial, telas de
assinatura/planos na agenda). Mas com duas coisas que hoje faltam e que eu não escrevo sem sua ordem, porque
são texto com efeito jurídico:

1. um `LICENSE` na raiz com o texto de "todos os direitos reservados" e o nome do titular;
2. a cláusula de uso no aceite do painel (que é o bloco F1 de LGPD/termos — lá o texto também fica marcado
   como rascunho até seu jurídico aprovar).

Se a intenção for abrir o código, a escolha é MIT para simplicidade ou AGPL para impedir que alguém revenda
como serviço. Nesse caso eu crio o `LICENSE` e atualizo `package.json` e README juntos, num único commit.

## O que eu preciso de você

- [ ] Proprietário, copyleft (GPL/AGPL) ou permissivo (MIT/Apache-2.0)?
- [ ] Nome do titular dos direitos (seu nome completo ou razão social)?
- [ ] Ano no arquivo de licença (2026)?
