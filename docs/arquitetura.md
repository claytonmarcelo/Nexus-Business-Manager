# Nexus Business Manager — Arquitetura do Sistema

## Visão Geral

O Nexus Business Manager é uma plataforma ERP SaaS (Software as a Service) desenvolvida para centralizar e automatizar processos empresariais em um único ambiente integrado.

A solução adota uma arquitetura modular baseada em APIs REST, permitindo escalabilidade, manutenção simplificada e futura expansão de funcionalidades sem impacto nos módulos existentes.

O sistema é composto por:

* Frontend Web em React + Vite
* Aplicativo Mobile em React Native
* Backend API em Fastify + TypeScript
* Banco de Dados MySQL
* Autenticação JWT
* Isolamento Multiempresa (Multi-Tenant)
* Controle de Permissões por Perfil
* Auditoria Completa de Operações

---

# Arquitetura Geral

```text
┌─────────────────────────────────────────────────────┐
│                     CLIENTES                        │
│                                                     │
│  Navegador Web (React)      Aplicativo Mobile       │
│  Desktop / Notebook         Android / iOS           │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ HTTPS + JSON
                    ▼
┌─────────────────────────────────────────────────────┐
│                     API BACKEND                     │
│              Fastify + TypeScript + Zod            │
│                                                     │
│  • JWT Authentication                               │
│  • Controle de Permissões                           │
│  • Validação de Dados                               │
│  • Rate Limit                                       │
│  • Helmet Security                                  │
│  • Auditoria                                        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│                  CAMADA DE SERVIÇOS                 │
│                                                     │
│  Auth │ Users │ Clients │ Products │ Stock          │
│  Sales │ Purchases │ Financial │ CRM │ Agenda       │
│  Reports │ Dashboard │ Audit │ Notifications        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                   │
│                    MySQL Server                     │
│                                                     │
│  company_id em todas as tabelas                     │
│  garantindo isolamento total entre empresas         │
└─────────────────────────────────────────────────────┘
```

---

# Stack Tecnológica

| Camada             | Tecnologia     |
| ------------------ | -------------- |
| Backend            | Node.js        |
| Framework API      | Fastify        |
| Linguagem          | TypeScript     |
| Frontend Web       | React          |
| Build Tool         | Vite           |
| Estilização        | Tailwind CSS   |
| Mobile             | React Native   |
| Banco de Dados     | MySQL          |
| Driver SQL         | mysql2/promise |
| Autenticação       | JWT            |
| Validação          | Zod            |
| Criptografia       | bcryptjs       |
| Testes             | Vitest         |
| Controle de Versão | Git + GitHub   |

---

# Fluxo de Processamento

```text
Usuário
   │
   ▼
Frontend React
   │
   ▼
Requisição HTTP/HTTPS
   │
   ▼
API Fastify
   │
   ├─ Rate Limit
   ├─ Helmet
   ├─ CORS
   ├─ JWT Verify
   └─ Role Check
   │
   ▼
Validação Zod
   │
   ▼
Controller
   │
   ▼
Service
   │
   ▼
MySQL
   │
   ▼
Resposta JSON
   │
   ▼
Frontend
```

---

# Fluxo de Autenticação

```text
1. Usuário informa e-mail e senha
2. POST /api/auth/login
3. Validação dos dados via Zod
4. Busca do usuário no banco
5. bcrypt.compare()
6. Geração do JWT
7. Retorno do token
8. Armazenamento local seguro
9. Envio do Bearer Token nas requisições
10. Validação automática em cada endpoint
```

### Payload JWT

```json
{
  "userId": 1,
  "companyId": 1,
  "role": "admin"
}
```

---

# Arquitetura Multiempresa (Multi-Tenant)

O Nexus Business Manager foi projetado para atender múltiplas empresas utilizando a mesma infraestrutura.

## Regras

* Todas as tabelas possuem `company_id`
* Todas as consultas filtram por `company_id`
* O JWT contém o identificador da empresa
* Não existe compartilhamento de dados entre empresas
* Relatórios, dashboards e métricas são isolados

### Exemplo

```sql
SELECT *
FROM clients
WHERE company_id = ?
```

---

# Controle de Permissões

O sistema utiliza RBAC (Role-Based Access Control).

| Perfil   | Nível | Permissão                           |
| -------- | ----- | ----------------------------------- |
| Admin    | 4     | Controle total do sistema           |
| Manager  | 3     | Gestão operacional e administrativa |
| Operator | 2     | Operações diárias                   |
| Viewer   | 1     | Apenas leitura                      |

---

# Segurança

## Proteção de Aplicação

* Helmet
* CORS Controlado
* Rate Limiting
* JWT Authentication
* Senhas criptografadas
* Validação Zod
* Logs de Auditoria
* Isolamento Multiempresa

## Proteção de Senhas

```text
Senha
  ↓
bcryptjs + Salt
  ↓
Hash Seguro
  ↓
Banco de Dados
```

---

# Módulos do Sistema

## Administração

* Empresas
* Usuários
* Perfis
* Permissões
* Auditoria

## CRM

* Clientes
* Histórico
* Relacionamento

## Comercial

* Produtos
* Categorias
* Fornecedores

## Estoque

* Entradas
* Saídas
* Inventário
* Movimentações

## Compras

* Pedidos
* Recebimentos
* Fornecedores

## Vendas

* Orçamentos
* Pedidos
* Faturamento

## Financeiro

* Contas a Pagar
* Contas a Receber
* Fluxo de Caixa
* Transações

## Agenda

* Agendamentos
* Calendário
* Compromissos

## Dashboard

* KPIs
* Indicadores
* Métricas em tempo real

## Relatórios

* Operacionais
* Financeiros
* Gerenciais

## Notificações

* Alertas internos
* Eventos do sistema

---

# Estrutura de Diretórios

```text
Nexus-Business-Manager/

backend/
│
├── src/
│   ├── modules/
│   ├── shared/
│   ├── database/
│   ├── routes/
│   ├── services/
│   ├── middlewares/
│   └── tests/
│
frontend/
│
├── src/
│   ├── pages/
│   ├── components/
│   ├── contexts/
│   ├── services/
│   ├── hooks/
│   └── layouts/
│
mobile/
│
├── src/
│   ├── screens/
│   ├── components/
│   ├── services/
│   └── navigation/
│
database/
│
├── migrations/
├── seeds/
└── backups/

docs/
assets/
```

---

# Objetivo da Arquitetura

Garantir:

* Escalabilidade
* Segurança
* Manutenibilidade
* Performance
* Isolamento Multiempresa
* Facilidade de expansão
* Integração Web e Mobile
* Base sólida para crescimento do ERP
* Estrutura profissional para portfólio e uso comercial
