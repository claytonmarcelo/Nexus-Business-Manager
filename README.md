<p align="center">
  <img
    src="assets/branding/Logo.png"
    alt="Nexus Business Manager"
    width="650"
  >
</p>

<h1 align="center">Nexus Business Manager</h1>

<p align="center">
  <strong>ERP SaaS Completo para GestÃ£o Empresarial</strong><br>
  Sistema moderno para centralizar CRM, Estoque, Compras, Vendas, Financeiro, Agendamentos, RelatÃ³rios e Multiempresa em uma Ãºnica plataforma.
</p>

<p align="center">
  <img src="https://flagcdn.com/w20/br.png" width="20" alt="Brasil">
  <strong>PortuguÃªs</strong>
  |
  <a href="README.en.md">
    <img src="https://flagcdn.com/w20/us.png" width="20" alt="USA">
    English
  </a>
</p>


<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/typescript-5.5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/fastify-4.28-000000?logo=fastify" alt="Fastify">
  <img src="https://img.shields.io/badge/mysql-8.0-4479A1?logo=mysql" alt="MySQL">
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/react%20native-0.76-61DAFB?logo=react" alt="React Native">
</p>

---
## Screenshots

> Capturas ilustrativas da interface do Nexus Business Manager.

<div align="center">

|                               Login                              |                                 Dashboard                                |
| :--------------------------------------------------------------: | :----------------------------------------------------------------------: |
| <img src="assets/screenshots/login.png" alt="Login" width="300"> | <img src="assets/screenshots/dashboard.png" alt="Dashboard" width="300"> |

|                              CRM Clientes                              |                                Estoque                               |
| :--------------------------------------------------------------------: | :------------------------------------------------------------------: |
| <img src="assets/screenshots/clientes.png" alt="Clientes" width="300"> | <img src="assets/screenshots/estoque.png" alt="Estoque" width="300"> |

|                                 Financeiro                                 |                                 RelatÃ³rios                                 |
| :------------------------------------------------------------------------: | :------------------------------------------------------------------------: |
| <img src="assets/screenshots/financeiro.png" alt="Financeiro" width="300"> | <img src="assets/screenshots/relatorios.png" alt="RelatÃ³rios" width="300"> |

</div>

---
---

## Sobre o Projeto

O **Nexus Business Manager** Ã© um sistema ERP SaaS completo desenvolvido para atender pequenas e mÃ©dias empresas que precisam de uma soluÃ§Ã£o unificada de gestÃ£o.

### Problema que resolve

Pequenas empresas frequentemente utilizam ferramentas isoladas para cada Ã¡rea: um sistema para clientes, uma planilha para estoque, outro para finanÃ§as e uma agenda separada. Isso gera retrabalho, dados inconsistentes e perda de tempo.

O Nexus unifica **tudo em um Ãºnico sistema**, com dados centralizados, acesso web e mobile, suporte a mÃºltiplos usuÃ¡rios e isolamento completo entre empresas.

### PÃºblico-alvo

- Lojas de varejo e atacado
- Prestadores de serviÃ§os (oficinas, consultÃ³rios, escritÃ³rios)
- Pequenas indÃºstrias e distribuidoras
- Profissionais autÃ´nomos
- EscritÃ³rios de contabilidade

### BenefÃ­cios

- **CentralizaÃ§Ã£o**: Todos os dados em um sÃ³ lugar
- **Economia**: Substitui mÃºltiplas ferramentas pagas
- **Escalabilidade**: Arquitetura preparada para crescer
- **Multiempresa**: Gerencie quantas empresas precisar
- **CÃ³digo aberto**: Liberdade para customizar e estender

---

## Funcionalidades

### AutenticaÃ§Ã£o
- Login seguro com JWT
- Controle de sessÃ£o por token
- Suporte a recuperaÃ§Ã£o de senha

### UsuÃ¡rios
- Cadastro completo com perfis
- Hierarquia de permissÃµes: admin, manager, operator, viewer
- AtivaÃ§Ã£o/desativaÃ§Ã£o de usuÃ¡rios

### CRM
- Cadastro de clientes com busca e paginaÃ§Ã£o
- HistÃ³rico de vendas por cliente
- Status de cliente (ativo/inativo)

### Produtos
- Cadastro com SKU Ãºnico
- Categorias e preÃ§os
- Controle de imagem do produto

### Estoque
- MovimentaÃ§Ãµes de entrada e saÃ­da
- Controle de quantidade por produto
- Alerta de estoque baixo
- HistÃ³rico completo de movimentaÃ§Ãµes

### Fornecedores
- Cadastro com dados de contato
- Busca por nome e documento

### Compras
- Pedidos com mÃºltiplos itens
- Recebimento parcial
- Status: pendente, recebida, cancelada
- AtualizaÃ§Ã£o automÃ¡tica de estoque ao receber

### Vendas
- Registro com mÃºltiplos itens
- Baixa automÃ¡tica de estoque
- VÃ­nculo com cliente
- Status: aberta, concluÃ­da, cancelada

### Financeiro
- Receitas e despesas
- Fluxo de caixa
- Categorias personalizÃ¡veis
- Status: pendente, pago, vencido, cancelado
- RelatÃ³rio de fluxo de caixa

### Agendamentos
- CalendÃ¡rio de serviÃ§os
- VÃ­nculo com clientes
- Filtro por data
- Status: agendado, concluÃ­do, cancelado

### Dashboard
- Indicadores: clientes, produtos, vendas, estoque baixo
- GrÃ¡fico de receitas x despesas por mÃªs
- GrÃ¡fico de vendas por mÃªs
- GrÃ¡fico de produtos por categoria
- Valor total em estoque

### RelatÃ³rios
- RelatÃ³rios em JSON, PDF e Excel
- Tipos: clientes, produtos, financeiro, estoque, vendas
- Download direto pelo navegador

### NotificaÃ§Ãµes
- Alertas de estoque baixo
- Alertas de contas a vencer
- Alertas de agenda do dia
- Marcar como lida / ler todas

### Auditoria
- Registro de todas as aÃ§Ãµes (criaÃ§Ã£o, alteraÃ§Ã£o, exclusÃ£o)
- Registro de login e logout
- Registro de exportaÃ§Ã£o de relatÃ³rios
- IP do usuÃ¡rio registrado

### Multiempresa
- Isolamento completo por `company_id`
- Empresas nÃ£o visualizam dados umas das outras
- Cadastro e gerenciamento de empresas

---

## MÃ³dulos Implementados

| MÃ³dulo       | Status |
|--------------|--------|
| AutenticaÃ§Ã£o | âœ…      |
| UsuÃ¡rios     | âœ…      |
| CRM          | âœ…      |
| Produtos     | âœ…      |
| Estoque      | âœ…      |
| Fornecedores | âœ…      |
| Compras      | âœ…      |
| Vendas       | âœ…      |
| Financeiro   | âœ…      |
| Agendamentos | âœ…      |
| Dashboard    | âœ…      |
| RelatÃ³rios   | âœ…      |
| NotificaÃ§Ãµes | âœ…      |
| Auditoria    | âœ…      |
| Multiempresa | âœ…      |

---

## Tecnologias

### Backend
| Tecnologia   | Finalidade                  |
|--------------|-----------------------------|
| Node.js      | Runtime JavaScript          |
| Fastify      | Framework HTTP              |
| TypeScript   | Tipagem estÃ¡tica            |
| JWT          | AutenticaÃ§Ã£o stateless      |
| Zod          | ValidaÃ§Ã£o de schemas        |
| bcryptjs     | Hash de senhas              |
| mysql2       | Driver MySQL                |
| Prisma       | ORM (mÃ³dulo de auth)        |

### Frontend
| Tecnologia   | Finalidade                  |
|--------------|-----------------------------|
| React 18     | Biblioteca de UI            |
| Vite         | Bundler e dev server        |
| Tailwind CSS | Framework de estilos        |
| React Native | Aplicativo mobile           |
| Recharts     | GrÃ¡ficos e charts           |
| Axios        | HTTP client                 |

### Banco de Dados
| Tecnologia   | Finalidade                  |
|--------------|-----------------------------|
| MySQL 8+     | Banco relacional            |
| Migrations   | EvoluÃ§Ã£o do schema          |
| Seeds        | Dados iniciais              |

### DevOps
| Tecnologia     | Finalidade                  |
|----------------|-----------------------------|
| Git            | Controle de versÃ£o          |
| GitHub Actions | CI/CD                       |
| Vitest         | Testes unitÃ¡rios            |

---

## Estrutura de Pastas

```
nexusbusinessmanager/
â”œâ”€â”€ backend/           â†’ API REST (Fastify + TypeScript)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ modules/   â†’ 15 mÃ³dulos de negÃ³cio
â”‚   â”‚   â”œâ”€â”€ shared/    â†’ Middlewares, utils, conexÃ£o DB
â”‚   â”‚   â””â”€â”€ tests/     â†’ Testes unitÃ¡rios (Vitest)
â”‚   â””â”€â”€ database/
â”‚       â””â”€â”€ migrations/â†’ MigraÃ§Ãµes SQL versionadas
â”œâ”€â”€ frontend/          â†’ AplicaÃ§Ã£o web (React + Vite)
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ pages/     â†’ PÃ¡ginas por mÃ³dulo
â”‚       â”œâ”€â”€ components/â†’ Componentes reutilizÃ¡veis
â”‚       â””â”€â”€ contexts/  â†’ Contexto de autenticaÃ§Ã£o
â”œâ”€â”€ mobile/            â†’ Aplicativo mobile (React Native)
â”œâ”€â”€ database/          â†’ Schema SQL e scripts de backup
â”œâ”€â”€ docs/              â†’ DocumentaÃ§Ã£o completa
â”‚   â”œâ”€â”€ en/            â†’ DocumentaÃ§Ã£o em inglÃªs
â”‚   â””â”€â”€ screenshots/   â†’ Capturas de tela
â”œâ”€â”€ assets/            â†’ Recursos de branding
â””â”€â”€ .github/
    â””â”€â”€ workflows/     â†’ CI/CD (GitHub Actions)
```

---

## Multiempresa

O Nexus Business Manager foi projetado com suporte nativo a **mÃºltiplas empresas** (SaaS multi-tenant).

### Como funciona

1. Cada tabela de dados possui uma coluna `company_id`
2. Toda consulta SQL inclui `WHERE company_id = ?`
3. O token JWT contÃ©m o `companyId` do usuÃ¡rio logado
4. O middleware de autenticaÃ§Ã£o extrai e repassa o `company_id` automaticamente

### Isolamento

- Empresas **nÃ£o visualizam** dados de outras empresas
- UsuÃ¡rios pertencem a uma Ãºnica empresa
- O cadastro de empresas Ã© gerenciado pelo mÃ³dulo de administraÃ§Ã£o
- Ideal para franquias, grupos empresariais e prestadores de SaaS

---

## SeguranÃ§a

O projeto implementa mÃºltiplas camadas de seguranÃ§a:

| Camada          | DescriÃ§Ã£o                                      |
|-----------------|------------------------------------------------|
| **JWT**         | Tokens com expiraÃ§Ã£o configurÃ¡vel              |
| **bcryptjs**    | Hash seguro com salt para senhas               |
| **Rate Limit**  | 100 requisiÃ§Ãµes/min global, 5 tentativas de login |
| **Helmet**      | Headers HTTP de seguranÃ§a (XSS, CSP, HSTS)     |
| **Zod**         | ValidaÃ§Ã£o rigorosa de todas as entradas        |
| **PermissÃµes**  | Hierarquia admin > manager > operator > viewer |
| **Auditoria**   | Registro de todas as aÃ§Ãµes com IP e data       |
| **CORS**        | Controle de origens permitidas                 |

---

## Arquitetura

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Frontend Web      â”‚
â”‚ React + TypeScript  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚ HTTP + JWT
           â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   API REST          â”‚
â”‚ Fastify + Node.js   â”‚
â”‚ TypeScript + Zod    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚
           â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 15 MÃ³dulos ERP      â”‚
â”‚ CRM â€¢ Estoque       â”‚
â”‚ Compras â€¢ Vendas    â”‚
â”‚ Financeiro          â”‚
â”‚ Agenda â€¢ RelatÃ³rios â”‚
â”‚ Auditoria           â”‚
â”‚ Multiempresa        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚
           â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ MySQL               â”‚
â”‚ company_id          â”‚
â”‚ Auditoria           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### SeguranÃ§a

* JWT Authentication
* Rate Limiting
* Helmet
* CORS
* Hierarquia de PermissÃµes
* Isolamento Multiempresa

### Arquitetura

* Frontend React
* Backend Fastify
* Banco MySQL
* API REST
* Multiempresa por company_id

### Escalabilidade

* Arquitetura modular
* SeparaÃ§Ã£o por domÃ­nio
* Preparado para SaaS
* Preparado para integraÃ§Ãµes futuras

---

## Banco de Dados

O projeto utiliza **MySQL 8+** como banco de dados relacional.

### Migrations

As migrations estÃ£o em `backend/database/migrations/` e sÃ£o executadas em ordem numÃ©rica:

```bash
npm run migrate
```

### Seeds

O seed inicial cria o administrador e a empresa padrÃ£o:

```bash
npm run seed
```

O seed de demonstraÃ§Ã£o popula o banco com dados realistas (clientes, produtos, vendas, etc.):

```bash
npm run demo-seed
```

---

## InstalaÃ§Ã£o

### PrÃ©-requisitos

- Node.js >= 20
- MySQL >= 8.0
- Git
- npm (incluÃ­do com Node.js)

### Passo a passo

```bash
# 1. Clone o repositÃ³rio
git clone https://github.com/claytonmarcelo/Nexus-Business-Manager.git
cd nexusbusinessmanager

# 2. Configure o banco de dados MySQL
mysql -u root -p < database/schema.sql

# 3. Instale e inicie o backend
cd backend
npm install
cp .env.example .env
# Edite o arquivo .env com suas credenciais

npm run migrate
npm run seed
npm run dev

# 4. Em outro terminal, instale e inicie o frontend
cd frontend
npm install
npm run dev
```

A API estarÃ¡ disponÃ­vel em `http://localhost:3333` e o frontend em `http://localhost:5173`.

### Dados de demonstraÃ§Ã£o

```bash
cd backend
npm run demo-seed
```

Acesse com:
- **Email:** `admin@nexusdemo.com`
- **Senha:** `123456`

---

## ConfiguraÃ§Ã£o

### VariÃ¡veis de Ambiente

Crie um arquivo `.env` na pasta `backend/` baseado no `.env.example`:

```env
PORT=3333
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=8h
LOG_LEVEL=debug
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexus_business_manager
DB_USER=root
DB_PASSWORD=
```

---

## DocumentaÃ§Ã£o

A documentaÃ§Ã£o completa estÃ¡ disponÃ­vel na pasta `docs/`:

| Documento               | DescriÃ§Ã£o                          |
|-------------------------|------------------------------------|
| [Arquitetura](docs/arquitetura.md) | Diagramas e fluxos do sistema     |
| [Deploy](docs/deploy.md)            | Guia de implantaÃ§Ã£o em produÃ§Ã£o   |
| [Backup](docs/backup.md)            | Backup e restauraÃ§Ã£o do banco     |
| [Monitoramento](docs/monitoramento.md) | Health check e logs            |
| [Testes](docs/tests.md)             | ExecuÃ§Ã£o e cobertura de testes    |
| [Casos de Uso](docs/use-cases.md)   | Exemplos reais de aplicaÃ§Ã£o       |
| [Conta Demo](docs/demo-account.md)  | Credenciais de demonstraÃ§Ã£o       |
| [LicenÃ§a (PT)](docs/license-pt-br.md) | ExplicaÃ§Ã£o da licenÃ§a MIT       |

---

## HistÃ³rico de VersÃµes

Consulte o arquivo [CHANGELOG.md](CHANGELOG.md) para visualizar todas as alteraÃ§Ãµes do projeto.

---

## Roadmap

### Completed
- [x] Project foundation (structure, design system, database)
- [x] Authentication (login, JWT, permissions)
- [x] Dashboard with KPIs and charts
- [x] Full CRM (clients, history)
- [x] Inventory control (products, movements)
- [x] Financial management (accounts, cash flow)
- [x] Scheduling (calendar, events)
- [x] Multi-company architecture (SaaS)
- [x] Exportable reports (PDF, Excel)
- [x] Notifications and audit
- [x] CI/CD pipeline
- [x] Automated unit tests
- [x] Complete bilingual documentation
### Future

#### Phase 9 â€” App Marketplace

Ãrea futura para permitir integraÃ§Ã£o de mÃ³dulos, extensÃµes e serviÃ§os externos ao Nexus Business Manager.

**Possibilidades:**

- IntegraÃ§Ãµes com WhatsApp
- Google Calendar
- Google Drive
- PIX
- Stripe
- Mercado Pago
- Aplicativos internos
- Plugins empresariais
- ExtensÃµes por empresa

> Status: Planejado

#### Fase 10 â€” BI e InteligÃªncia de NegÃ³cios

Camada futura de anÃ¡lise estratÃ©gica para transformar dados operacionais em indicadores gerenciais.

**Possibilidades:**

- Dashboards avanÃ§ados
- KPIs personalizados
- GrÃ¡ficos comparativos
- AnÃ¡lise de vendas
- AnÃ¡lise financeira
- PrevisÃ£o de estoque
- RelatÃ³rios executivos
- ExportaÃ§Ã£o analÃ­tica

> Status: Planejado

---

## DemonstraÃ§Ã£o

### Demo Online

> *Em breve: link para demonstraÃ§Ã£o online.*

Enquanto isso, vocÃª pode rodar o projeto localmente:

```bash
git clone https://github.com/claytonmarcelo/Nexus-Business-Manager.git
cd nexusbusinessmanager
cd backend && npm install && npm run dev
# Em outro terminal:
cd frontend && npm install && npm run dev
```

Acesse `http://localhost:5173` e faÃ§a login com:
- **Email:** `admin@nexusdemo.com`
- **Senha:** `123456`

---

## ðŸ‘¨â€ðŸ’» Desenvolvedor

<table>
  <tr>
    <td width="90">
      <img src="https://github.com/claytonmarcelo.png" width="90" alt="Clayton Marcelo">
    </td>
    <td>
      <strong>C. Marcelo Dev.</strong><br>
      <strong>ðŸ“</strong> Brasil<br><br>
      <a href="https://github.com/claytonmarcelo" target="_blank"><img src="https://img.shields.io/badge/GitHub-claytonmarcelo-181717?style=flat-square&logo=github"></a>
      <a href="https://www.youtube.com/@c.marcelodev.brasil" target="_blank"><img src="https://img.shields.io/badge/YouTube-CMarceloDev-FF0000?style=flat-square&logo=youtube"></a>
      <a href="https://cmarcelodev.com" target="_blank"><img src="https://img.shields.io/badge/PortfÃ³lio-cmarcelodev.com-000000?style=flat-square"></a>
      <a href="https://www.linkedin.com/in/clayton-marcelo-dev/" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-claytonmarcelo-0A66C2?style=flat-square&logo=linkedin"></a><br><br>
      <em>Desenvolvedor Full Stack especializado em React, React Native, Node.js, Fastify, TypeScript, MySQL e desenvolvimento de soluÃ§Ãµes SaaS empresariais.</em>
    </td>
  </tr>
</table>

---

## LicenÃ§a

Este projeto estÃ¡ licenciado sob a **MIT License** â€” veja o arquivo [LICENSE](LICENSE) para detalhes.

Leia a explicaÃ§Ã£o simplificada:
- [PortuguÃªs](docs/license-pt-br.md)
- [English](docs/en/license-en.md)

---

<p align="center">
  <em>Desenvolvido com dedicaÃ§Ã£o por <strong>C. Marcelo Dev. Brasil</strong>.</em>
  <br>
  <a href="https://github.com/claytonmarcelo/Nexus-Business-Manager">ðŸ”— GitHub</a>
</p>
