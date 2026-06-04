# Tests - Nexus Business Manager

## Test Stack
- **Framework**: Vitest
- **Location**: `backend/src/tests/`
- **Coverage**: v8 (via vitest)

## Running Tests
```bash
cd backend
npx vitest run        # Run once
npx vitest            # Watch mode
npx vitest --coverage # With coverage
```

## Current Coverage
| File                         | Description                          |
|------------------------------|--------------------------------------|
| `auth.test.ts`               | Authentication (login, JWT, bcrypt)  |
| `permissions.test.ts`        | Role hierarchy                       |
| `multi-tenant.test.ts`       | Company_id isolation                 |
| `stock.test.ts`              | Inventory movement                   |
| `sales.test.ts`              | Sales calculation                    |
| `financial.test.ts`          | Cash flow                            |

## CI/CD
Tests run automatically on GitHub Actions on every push via `.github/workflows/ci.yml`.

## Best Practices
- Isolated tests: never depend on an external database
- Mocks for `mysql2` and `prisma`
- Permission tests validate hierarchy without mocks
- New features should include corresponding tests
