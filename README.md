<p align="center">
  <img
    src="assets/branding/Logo.png"
    alt="Nexus Business Manager"
    width="320"
  >
</p>

<h1 align="center">Nexus Business Manager</h1>

<p align="center">
  <strong>ERP SaaS Completo para GestÃƒÂ£o Empresarial</strong><br>
  Sistema moderno para centralizar CRM, Estoque, Compras, Vendas, Financeiro, Agendamentos, RelatÃƒÂ³rios e Multiempresa em uma ÃƒÂºnica plataforma.
</p>

<p align="center">
  <img src="https://flagcdn.com/w20/br.png" width="20" alt="Brasil">
  <strong>PortuguÃƒÂªs</strong>
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

|                                 Financeiro                                 |                                 RelatÃƒÂ³rios                                 |
| :------------------------------------------------------------------------: | :------------------------------------------------------------------------: |
| <img src="assets/screenshots/financeiro.png" alt="Financeiro" width="300"> | <img src="assets/screenshots/relatorios.png" alt="RelatÃƒÂ³rios" width="300"> |

</div>

---
---

## Sobre o Projeto

O **Nexus Business Manager** ÃƒÂ© um sistema ERP SaaS completo desenvolvido para atender pequenas e mÃƒÂ©dias empresas que precisam de uma soluÃƒÂ§ÃƒÂ£o unificada de gestÃƒÂ£o.

### Problema que resolve

Pequenas empresas frequentemente utilizam ferramentas isoladas para cada ÃƒÂ¡rea: um sistema para clientes, uma planilha para estoque, outro para finanÃƒÂ§as e uma agenda separada. Isso gera retrabalho, dados inconsistentes e perda de tempo.

O Nexus unifica **tudo em um ÃƒÂºnico sistema**, com dados centralizados, acesso web e mobile, suporte a mÃƒÂºltiplos usuÃƒÂ¡rios e isolamento completo entre empresas.

### PÃƒÂºblico-alvo

- Lojas de varejo e atacado
- Prestadores de serviÃƒÂ§os (oficinas, consultÃƒÂ³rios, escritÃƒÂ³rios)
- Pequenas indÃƒÂºstrias e distribuidoras
- Profissionais autÃƒÂ´nomos
- EscritÃƒÂ³rios de contabilidade

### BenefÃƒÂ­cios

- **CentralizaÃƒÂ§ÃƒÂ£o**: Todos os dados em um sÃƒÂ³ lugar
- **Economia**: Substitui mÃƒÂºltiplas ferramentas pagas
- **Escalabilidade**: Arquitetura preparada para crescer
- **Multiempresa**: Gerencie quantas empresas precisar
- **CÃƒÂ³digo aberto**: Liberdade para customizar e estender

---

## Funcionalidades

### AutenticaÃƒÂ§ÃƒÂ£o
- Login seguro com JWT
- Controle de sessÃƒÂ£o por token
- Suporte a recuperaÃƒÂ§ÃƒÂ£o de senha

### UsuÃƒÂ¡rios
- Cadastro completo com perfis
- Hierarquia de permissÃƒÂµes: admin, manager, operator, viewer
- AtivaÃƒÂ§ÃƒÂ£o/desativaÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rios

### CRM
- Cadastro de clientes com busca e paginaÃƒÂ§ÃƒÂ£o
- HistÃƒÂ³rico de vendas por cliente
- Status de cliente (ativo/inativo)

### Produtos
- Cadastro com SKU ÃƒÂºnico
- Categorias e preÃƒÂ§os
- Controle de imagem do produto

### Estoque
- MovimentaÃƒÂ§ÃƒÂµes de entrada e saÃƒÂ­da
- Controle de quantidade por produto
- Alerta de estoque baixo
- HistÃƒÂ³rico completo de movimentaÃƒÂ§ÃƒÂµes

### Fornecedores
- Cadastro com dados de contato
- Busca por nome e documento

### Compras
- Pedidos com mÃƒÂºltiplos itens
- Recebimento parcial
- Status: pendente, recebida, cancelada
- AtualizaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica de estoque ao receber

### Vendas
- Registro com mÃƒÂºltiplos itens
- Baixa automÃƒÂ¡tica de estoque
- VÃƒÂ­nculo com cliente
- Status: aberta, concluÃƒÂ­da, cancelada

### Financeiro
- Receitas e despesas
- Fluxo de caixa
- Categorias personalizÃƒÂ¡veis
- Status: pendente, pago, vencido, cancelado
- RelatÃƒÂ³rio de fluxo de caixa

### Agendamentos
- CalendÃƒÂ¡rio de serviÃƒÂ§os
- VÃƒÂ­nculo com clientes
- Filtro por data
- Status: agendado, concluÃƒÂ­do, cancelado

### Dashboard
- Indicadores: clientes, produtos, vendas, estoque baixo
- GrÃƒÂ¡fico de receitas x despesas por mÃƒÂªs
- GrÃƒÂ¡fico de vendas por mÃƒÂªs
- GrÃƒÂ¡fico de produtos por categoria
- Valor total em estoque

### RelatÃƒÂ³rios
- RelatÃƒÂ³rios em JSON, PDF e Excel
- Tipos: clientes, produtos, financeiro, estoque, vendas
- Download direto pelo navegador

### NotificaÃƒÂ§ÃƒÂµes
- Alertas de estoque baixo
- Alertas de contas a vencer
- Alertas de agenda do dia
- Marcar como lida / ler todas

### Auditoria
- Registro de todas as aÃƒÂ§ÃƒÂµes (criaÃƒÂ§ÃƒÂ£o, alteraÃƒÂ§ÃƒÂ£o, exclusÃƒÂ£o)
- Registro de login e logout
- Registro de exportaÃƒÂ§ÃƒÂ£o de relatÃƒÂ³rios
- IP do usuÃƒÂ¡rio registrado

### Multiempresa
- Isolamento completo por `company_id`
- Empresas nÃƒÂ£o visualizam dados umas das outras
- Cadastro e gerenciamento de empresas

---

## MÃƒÂ³dulos Implementados

| MÃƒÂ³dulo       | Status |
|--------------|--------|
| AutenticaÃƒÂ§ÃƒÂ£o | Ã¢Å“â€¦      |
| UsuÃƒÂ¡rios     | Ã¢Å“â€¦      |
| CRM          | Ã¢Å“â€¦      |
| Produtos     | Ã¢Å“â€¦      |
| Estoque      | Ã¢Å“â€¦      |
| Fornecedores | Ã¢Å“â€¦      |
| Compras      | Ã¢Å“â€¦      |
| Vendas       | Ã¢Å“â€¦      |
| Financeiro   | Ã¢Å“â€¦      |
| Agendamentos | Ã¢Å“â€¦      |
| Dashboard    | Ã¢Å“â€¦      |
| RelatÃƒÂ³rios   | Ã¢Å“â€¦      |
| NotificaÃƒÂ§ÃƒÂµes | Ã¢Å“â€¦      |
| Auditoria    | Ã¢Å“â€¦      |
| Multiempresa | Ã¢Å“â€¦      |

---

## Tecnologias

### Backend
| Tecnologia   | Finalidade                  |
|--------------|-----------------------------|
| Node.js      | Runtime JavaScript          |
| Fastify      | Framework HTTP              |
| TypeScript   | Tipagem estÃƒÂ¡tica            |
| JWT          | AutenticaÃƒÂ§ÃƒÂ£o stateless      |
| Zod          | ValidaÃƒÂ§ÃƒÂ£o de schemas        |
| bcryptjs     | Hash de senhas              |
| mysql2       | Driver MySQL                |
| Prisma       | ORM (mÃƒÂ³dulo de auth)        |

### Frontend
| Tecnologia   | Finalidade                  |
|--------------|-----------------------------|
| React 18     | Biblioteca de UI            |
| Vite         | Bundler e dev server        |
| Tailwind CSS | Framework de estilos        |
| React Native | Aplicativo mobile           |
| Recharts     | GrÃƒÂ¡ficos e charts           |
| Axios        | HTTP client                 |

### Banco de Dados
| Tecnologia   | Finalidade                  |
|--------------|-----------------------------|
| MySQL 8+     | Banco relacional            |
| Migrations   | EvoluÃƒÂ§ÃƒÂ£o do schema          |
| Seeds        | Dados iniciais              |

### DevOps
| Tecnologia     | Finalidade                  |
|----------------|-----------------------------|
| Git            | Controle de versÃƒÂ£o          |
| GitHub Actions | CI/CD                       |
| Vitest         | Testes unitÃƒÂ¡rios            |

---

## Estrutura de Pastas

```
nexusbusinessmanager/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ backend/           Ã¢â€ â€™ API REST (Fastify + TypeScript)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ src/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ modules/   Ã¢â€ â€™ 15 mÃƒÂ³dulos de negÃƒÂ³cio
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ shared/    Ã¢â€ â€™ Middlewares, utils, conexÃƒÂ£o DB
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ tests/     Ã¢â€ â€™ Testes unitÃƒÂ¡rios (Vitest)
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ database/
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ migrations/Ã¢â€ â€™ MigraÃƒÂ§ÃƒÂµes SQL versionadas
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ frontend/          Ã¢â€ â€™ AplicaÃƒÂ§ÃƒÂ£o web (React + Vite)
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ src/
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ pages/     Ã¢â€ â€™ PÃƒÂ¡ginas por mÃƒÂ³dulo
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/Ã¢â€ â€™ Componentes reutilizÃƒÂ¡veis
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ contexts/  Ã¢â€ â€™ Contexto de autenticaÃƒÂ§ÃƒÂ£o
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ mobile/            Ã¢â€ â€™ Aplicativo mobile (React Native)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ database/          Ã¢â€ â€™ Schema SQL e scripts de backup
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ docs/              Ã¢â€ â€™ DocumentaÃƒÂ§ÃƒÂ£o completa
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ en/            Ã¢â€ â€™ DocumentaÃƒÂ§ÃƒÂ£o em inglÃƒÂªs
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ screenshots/   Ã¢â€ â€™ Capturas de tela
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ assets/            Ã¢â€ â€™ Recursos de branding
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ .github/
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ workflows/     Ã¢â€ â€™ CI/CD (GitHub Actions)
```

---

## Multiempresa

O Nexus Business Manager foi projetado com suporte nativo a **mÃƒÂºltiplas empresas** (SaaS multi-tenant).

### Como funciona

1. Cada tabela de dados possui uma coluna `company_id`
2. Toda consulta SQL inclui `WHERE company_id = ?`
3. O token JWT contÃƒÂ©m o `companyId` do usuÃƒÂ¡rio logado
4. O middleware de autenticaÃƒÂ§ÃƒÂ£o extrai e repassa o `company_id` automaticamente

### Isolamento

- Empresas **nÃƒÂ£o visualizam** dados de outras empresas
- UsuÃƒÂ¡rios pertencem a uma ÃƒÂºnica empresa
- O cadastro de empresas ÃƒÂ© gerenciado pelo mÃƒÂ³dulo de administraÃƒÂ§ÃƒÂ£o
- Ideal para franquias, grupos empresariais e prestadores de SaaS

---

## SeguranÃƒÂ§a

O projeto implementa mÃƒÂºltiplas camadas de seguranÃƒÂ§a:

| Camada          | DescriÃƒÂ§ÃƒÂ£o                                      |
|-----------------|------------------------------------------------|
| **JWT**         | Tokens com expiraÃƒÂ§ÃƒÂ£o configurÃƒÂ¡vel              |
| **bcryptjs**    | Hash seguro com salt para senhas               |
| **Rate Limit**  | 100 requisiÃƒÂ§ÃƒÂµes/min global, 5 tentativas de login |
| **Helmet**      | Headers HTTP de seguranÃƒÂ§a (XSS, CSP, HSTS)     |
| **Zod**         | ValidaÃƒÂ§ÃƒÂ£o rigorosa de todas as entradas        |
| **PermissÃƒÂµes**  | Hierarquia admin > manager > operator > viewer |
| **Auditoria**   | Registro de todas as aÃƒÂ§ÃƒÂµes com IP e data       |
| **CORS**        | Controle de origens permitidas                 |

---

## Arquitetura

```text
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š   Frontend Web      Ã¢â€â€š
Ã¢â€â€š React + TypeScript  Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
           Ã¢â€â€š HTTP + JWT
           Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š   API REST          Ã¢â€â€š
Ã¢â€â€š Fastify + Node.js   Ã¢â€â€š
Ã¢â€â€š TypeScript + Zod    Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
           Ã¢â€â€š
           Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š 15 MÃƒÂ³dulos ERP      Ã¢â€â€š
Ã¢â€â€š CRM Ã¢â‚¬Â¢ Estoque       Ã¢â€â€š
Ã¢â€â€š Compras Ã¢â‚¬Â¢ Vendas    Ã¢â€â€š
Ã¢â€â€š Financeiro          Ã¢â€â€š
Ã¢â€â€š Agenda Ã¢â‚¬Â¢ RelatÃƒÂ³rios Ã¢â€â€š
Ã¢â€â€š Auditoria           Ã¢â€â€š
Ã¢â€â€š Multiempresa        Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
           Ã¢â€â€š
           Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š MySQL               Ã¢â€â€š
Ã¢â€â€š company_id          Ã¢â€â€š
Ã¢â€â€š Auditoria           Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

### SeguranÃƒÂ§a

* JWT Authentication
* Rate Limiting
* Helmet
* CORS
* Hierarquia de PermissÃƒÂµes
* Isolamento Multiempresa

### Arquitetura

* Frontend React
* Backend Fastify
* Banco MySQL
* API REST
* Multiempresa por company_id

### Escalabilidade

* Arquitetura modular
* SeparaÃƒÂ§ÃƒÂ£o por domÃƒÂ­nio
* Preparado para SaaS
* Preparado para integraÃƒÂ§ÃƒÂµes futuras

---

## Banco de Dados

O projeto utiliza **MySQL 8+** como banco de dados relacional.

### Migrations

As migrations estÃƒÂ£o em `backend/database/migrations/` e sÃƒÂ£o executadas em ordem numÃƒÂ©rica:

```bash
npm run migrate
```

### Seeds

O seed inicial cria o administrador e a empresa padrÃƒÂ£o:

```bash
npm run seed
```

O seed de demonstraÃƒÂ§ÃƒÂ£o popula o banco com dados realistas (clientes, produtos, vendas, etc.):

```bash
npm run demo-seed
```

---

## InstalaÃƒÂ§ÃƒÂ£o

### PrÃƒÂ©-requisitos

- Node.js >= 20
- MySQL >= 8.0
- Git
- npm (incluÃƒÂ­do com Node.js)

### Passo a passo

```bash
# 1. Clone o repositÃƒÂ³rio
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

A API estarÃƒÂ¡ disponÃƒÂ­vel em `http://localhost:3333` e o frontend em `http://localhost:5173`.

### Dados de demonstraÃƒÂ§ÃƒÂ£o

```bash
cd backend
npm run demo-seed
```

Acesse com:
- **Email:** `admin@nexusdemo.com`
- **Senha:** `123456`

---

## ConfiguraÃƒÂ§ÃƒÂ£o

### VariÃƒÂ¡veis de Ambiente

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

## DocumentaÃƒÂ§ÃƒÂ£o

A documentaÃƒÂ§ÃƒÂ£o completa estÃƒÂ¡ disponÃƒÂ­vel na pasta `docs/`:

| Documento               | DescriÃƒÂ§ÃƒÂ£o                          |
|-------------------------|------------------------------------|
| [Arquitetura](docs/arquitetura.md) | Diagramas e fluxos do sistema     |
| [Deploy](docs/deploy.md)            | Guia de implantaÃƒÂ§ÃƒÂ£o em produÃƒÂ§ÃƒÂ£o   |
| [Backup](docs/backup.md)            | Backup e restauraÃƒÂ§ÃƒÂ£o do banco     |
| [Monitoramento](docs/monitoramento.md) | Health check e logs            |
| [Testes](docs/tests.md)             | ExecuÃƒÂ§ÃƒÂ£o e cobertura de testes    |
| [Casos de Uso](docs/use-cases.md)   | Exemplos reais de aplicaÃƒÂ§ÃƒÂ£o       |
| [Conta Demo](docs/demo-account.md)  | Credenciais de demonstraÃƒÂ§ÃƒÂ£o       |
| [LicenÃƒÂ§a (PT)](docs/license-pt-br.md) | ExplicaÃƒÂ§ÃƒÂ£o da licenÃƒÂ§a MIT       |

---

## HistÃƒÂ³rico de VersÃƒÂµes

Consulte o arquivo [CHANGELOG.md](CHANGELOG.md) para visualizar todas as alteraÃƒÂ§ÃƒÂµes do projeto.

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

#### Phase 9 Ã¢â‚¬â€ App Marketplace

ÃƒÂrea futura para permitir integraÃƒÂ§ÃƒÂ£o de mÃƒÂ³dulos, extensÃƒÂµes e serviÃƒÂ§os externos ao Nexus Business Manager.

**Possibilidades:**

- IntegraÃƒÂ§ÃƒÂµes com WhatsApp
- Google Calendar
- Google Drive
- PIX
- Stripe
- Mercado Pago
- Aplicativos internos
- Plugins empresariais
- ExtensÃƒÂµes por empresa

> Status: Planejado

#### Fase 10 Ã¢â‚¬â€ BI e InteligÃƒÂªncia de NegÃƒÂ³cios

Camada futura de anÃƒÂ¡lise estratÃƒÂ©gica para transformar dados operacionais em indicadores gerenciais.

**Possibilidades:**

- Dashboards avanÃƒÂ§ados
- KPIs personalizados
- GrÃƒÂ¡ficos comparativos
- AnÃƒÂ¡lise de vendas
- AnÃƒÂ¡lise financeira
- PrevisÃƒÂ£o de estoque
- RelatÃƒÂ³rios executivos
- ExportaÃƒÂ§ÃƒÂ£o analÃƒÂ­tica

> Status: Planejado

---

## DemonstraÃƒÂ§ÃƒÂ£o

### Demo Online

> *Em breve: link para demonstraÃƒÂ§ÃƒÂ£o online.*

Enquanto isso, vocÃƒÂª pode rodar o projeto localmente:

```bash
git clone https://github.com/claytonmarcelo/Nexus-Business-Manager.git
cd nexusbusinessmanager
cd backend && npm install && npm run dev
# Em outro terminal:
cd frontend && npm install && npm run dev
```

Acesse `http://localhost:5173` e faÃƒÂ§a login com:
- **Email:** `admin@nexusdemo.com`
- **Senha:** `123456`

---

## Ã°Å¸â€˜Â¨Ã¢â‚¬ÂÃ°Å¸â€™Â» Desenvolvedor

<table>
  <tr>
    <td width="90">
      <img src="https://github.com/claytonmarcelo.png" width="90" alt="Clayton Marcelo">
    </td>
    <td>
      <strong>C. Marcelo Dev.</strong><br>
      <strong>Ã°Å¸â€œÂ</strong> Brasil<br><br>
      <a href="https://github.com/claytonmarcelo" target="_blank"><img src="https://img.shields.io/badge/GitHub-claytonmarcelo-181717?style=flat-square&logo=github"></a>
      <a href="https://www.youtube.com/@c.marcelodev.brasil" target="_blank"><img src="https://img.shields.io/badge/YouTube-CMarceloDev-FF0000?style=flat-square&logo=youtube"></a>
      <a href="https://cmarcelodev.com" target="_blank"><img src="https://img.shields.io/badge/PortfÃƒÂ³lio-cmarcelodev.com-000000?style=flat-square"></a>
      <a href="https://www.linkedin.com/in/clayton-marcelo-dev/" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-claytonmarcelo-0A66C2?style=flat-square&logo=linkedin"></a><br><br>
      <em>Desenvolvedor Full Stack especializado em React, React Native, Node.js, Fastify, TypeScript, MySQL e desenvolvimento de soluÃƒÂ§ÃƒÂµes SaaS empresariais.</em>
    </td>
  </tr>
</table>

---

## LicenÃƒÂ§a

Este projeto estÃƒÂ¡ licenciado sob a **MIT License** Ã¢â‚¬â€ veja o arquivo [LICENSE](LICENSE) para detalhes.

Leia a explicaÃƒÂ§ÃƒÂ£o simplificada:
- [PortuguÃƒÂªs](docs/license-pt-br.md)
- [English](docs/en/license-en.md)

---

<p align="center">
  <em>Desenvolvido com dedicaÃƒÂ§ÃƒÂ£o por <strong>C. Marcelo Dev. Brasil</strong>.</em>
  <br>
  <a href="https://github.com/claytonmarcelo/Nexus-Business-Manager">Ã°Å¸â€â€” GitHub</a>
</p>

