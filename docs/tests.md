# Testes - Nexus Business Manager

## Stack de testes
- **Framework**: Vitest
- **Localização**: `backend/src/tests/`
- **Cobertura**: v8 (via vitest)

## Executar testes
```bash
cd backend
npx vitest run        # Executar uma vez
npx vitest            # Modo watch
npx vitest --coverage # Com cobertura
```

## Cobertura atual
| Arquivo                      | Descrição                          |
|------------------------------|------------------------------------|
| `auth.test.ts`               | Autenticação (login, JWT, bcrypt)  |
| `permissions.test.ts`        | Hierarquia de cargos               |
| `multi-tenant.test.ts`       | Isolamento por company_id          |
| `stock.test.ts`              | Movimentação de estoque            |
| `sales.test.ts`              | Cálculo de vendas                  |
| `financial.test.ts`          | Fluxo de caixa                     |

## CI/CD
Os testes são executados automaticamente no GitHub Actions a cada push via `.github/workflows/ci.yml`.

## Boas práticas
- Testes isolados: nunca dependem de banco externo
- Mocks para `mysql2` e `prisma`
- Testes de permissão validam hierarquia sem mock
- Novas features devem incluir testes correspondentes
