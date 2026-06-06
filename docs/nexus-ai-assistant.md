# Nexus AI Assistant

O **Nexus AI Assistant** e um assistente inteligente integrado ao ERP Nexus Business Manager para ajudar usuarios a operar o sistema e gerar insights de negocio.

## Funcionalidades

- **Ajuda contextual por pagina** — Sugestoes e respostas baseadas no modulo atual.
- **Chat de suporte interno** — Tire duvidas sobre como usar cada modulo.
- **Insights de negocio** — Alertas sobre estoque, financeiro, clientes inativos e mais.
- **Analise inteligente** — Resumo executivo, riscos, oportunidades e acoes recomendadas.
- **Fallback local** — Funciona sem Ollama usando regras internas.

## Como funciona

### Arquitetura hibrida

1. **Regras locais (prioritario)** — Respostas predefinidas para perguntas frequentes, sem dependencia externa.
2. **Ollama (opcional)** — Se disponivel, usa modelo local para respostas mais inteligentes.
3. **Fallback** — Se nada estiver disponivel, retorna mensagem amigavel.

### Rotas da API

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/ai/chat` | Enviar pergunta para o assistente |
| GET | `/api/ai/suggestions` | Sugestoes rapidas para um modulo |
| GET | `/api/ai/insights` | Insights automaticos do negocio |
| GET | `/api/ai/help/:module` | Ajuda contextual de um modulo |
| POST | `/api/ai/analyze` | Analise inteligente de um modulo |

Todas as rotas sao protegidas por JWT e respeitam o `company_id` do usuario autenticado.

## Como ativar Ollama

1. Instale o [Ollama](https://ollama.com)
2. Baixe um modelo: `ollama pull llama3`
3. Configure o `.env` do backend:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
AI_TIMEOUT_MS=20000
AI_ENABLED=true
```

4. Reinicie o servidor backend.

## Como usar sem IA externa

O assistente funciona **sem Ollama** usando o sistema de regras internas (`ai.rules.ts`). 
As respostas sao predefinidas para perguntas frequentes sobre:

- Clientes (cadastro, edicao, busca, inativos)
- Produtos (cadastro, preco, imagem)
- Estoque (entrada, saida, baixo, correcao)
- Financeiro (receita, despesa, vencidas, saldo)
- Vendas (criar, cancelar, historico)
- Compras
- Relatorios (PDF, Excel, filtros)
- Dashboard
- Notificacoes
- Auditoria
- Configuracoes

## Seguranca

- Todas as requisicoes exigem JWT valido.
- Dados sao filtrados por `company_id`.
- Nunca enviamos senhas, tokens ou dados sensiveis para IA externa.
- Mensagens sao sanitizadas e limitadas a 2000 caracteres.
- Rate limit global protege contra abuso.

## Exemplos de perguntas

### Ajuda operacional
- "Como cadastro um novo cliente?"
- "Como lancar uma despesa?"
- "Como gerar relatorio de vendas?"
- "O que significa estoque baixo?"

### Analise de negocio
- "Analise meu financeiro"
- "Quais sao os riscos do meu negocio?"
- "Oportunidades de melhoria"

## Componentes frontend

```
frontend/src/components/ai/
  NexusAIButton.tsx    - Botao flutuante no canto inferior direito
  NexusAIChat.tsx      - Modal de chat com historico
  NexusAIMessage.tsx   - Bolha de mensagem individual
  NexusAISuggestions.tsx - Sugestoes rapidas em chips
  NexusAIInsights.tsx  - Cards de insights
  NexusAIPanel.tsx     - Painel de analise e insights
```

## Pagina completa

`/nexus-ai` — Pagina dedicada com chat e painel de insights/analise.

## Limitações

- Sem Ollama: respostas limitadas ao conhecimento predefinido.
- Com Ollama: depende do modelo e hardware disponivel.
- Insights sao baseados em dados agregados, nao em machine learning avancado.
- Nao ha persistencia de conversa nesta versao.
