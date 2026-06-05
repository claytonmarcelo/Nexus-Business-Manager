# 🚀 GUIA RÁPIDO - COMO INICIAR O NEXUS BUSINESS MANAGER

## ⚡ INÍCIO RÁPIDO (3 passos)

### 1️⃣ Iniciar WAMP (MySQL)
- Abra o **WAMP Control Panel**
- Clique em **"Start All Services"**
- Aguarde o ícone ficar **verde** 🟢

### 2️⃣ Iniciar Backend
```bash
cd backend
npm run dev
```

✅ Você deve ver:
```
Nexus Business Manager API rodando em http://localhost:3333
```

### 3️⃣ Iniciar Frontend
**Em outro terminal:**
```bash
cd frontend
npm run dev
```

✅ Você deve ver:
```
Local: http://localhost:5173
```

**🎉 Pronto! Acesse:** http://localhost:5173

---

## 🔧 PRIMEIRA VEZ? CONFIGURAÇÃO INICIAL

### Passo 1: Instalar Dependências

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Passo 2: Configurar Banco de Dados

**2.1. Criar o database:**
```bash
mysql -u root -p -P 3307
```

```sql
CREATE DATABASE nexus_business_manager;
EXIT;
```

**2.2. Executar migrations:**
```bash
cd backend
npm run migrate
```

**2.3. Criar dados iniciais (admin + empresa):**
```bash
npm run seed
```

**2.4. (Opcional) Criar dados de demonstração:**
```bash
npm run demo-seed
```

### Passo 3: Configurar .env

**Arquivo:** `backend/.env`

```env
PORT=3333

DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASS=
DB_NAME=nexus_business_manager

JWT_SECRET=nexus-business-manager-secret-key-2026
JWT_EXPIRES_IN=8h

DATABASE_URL="mysql://root@localhost:3307/nexus_business_manager"
```

✅ Ajuste `DB_PORT`, `DB_USER` e `DB_PASS` conforme sua configuração

---

## 🔐 CREDENCIAIS DE ACESSO

Após executar `npm run seed`:

**Email:** admin@nexusdemo.com  
**Senha:** 123456

---

## 🐛 PROBLEMAS COMUNS

### ❌ Backend não inicia - Erro de porta

**Erro:** `Port 3333 already in use`

**Solução:**
```bash
# Windows - Encontrar e matar processo
netstat -ano | findstr :3333
taskkill /PID [NÚMERO_DO_PID] /F
```

### ❌ Erro de conexão com MySQL

**Erro:** `connect ECONNREFUSED 127.0.0.1:3307`

**Soluções:**
1. Verificar se WAMP está rodando (ícone verde)
2. Verificar porta do MySQL no WAMP (painel de controle)
3. Ajustar `DB_PORT` no `.env` se necessário
4. Tentar porta 3306 se 3307 não funcionar

### ❌ Dashboard não carrega

**Sintoma:** Tela em branco ao clicar em Dashboard

**Soluções:**
1. Verificar se backend está rodando (porta 3333)
2. Verificar console do navegador (F12)
3. Fazer logout e login novamente
4. Limpar cache do navegador
5. Ver diagnóstico completo em `DIAGNOSTICO_DASHBOARD.md`

### ❌ Erro 401 (Token inválido)

**Solução:**
- Fazer logout
- Fazer login novamente
- Token expira em 8 horas

### ❌ Erro 403 (Permissão negada)

**Solução:**
- Verificar role do usuário
- Dashboard requer: admin, manager, operator ou viewer
- Recriar usuário com role adequado

---

## 📊 VERIFICAR SE TUDO ESTÁ FUNCIONANDO

### ✅ Checklist de Saúde

Execute estes comandos para verificar:

**1. MySQL rodando:**
```bash
netstat -ano | findstr :3307
# ou
netstat -ano | findstr :3306
```

**2. Backend rodando:**
```bash
netstat -ano | findstr :3333
```

**3. Testar health check:**
```bash
curl http://localhost:3333/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-06-05T..."
}
```

**4. Frontend acessível:**
- Abrir: http://localhost:5173
- Deve aparecer tela de login

---

## 📁 ESTRUTURA DE PASTAS

```
nexusbusinessmanager/
├── backend/              → API (porta 3333)
│   ├── src/
│   ├── .env             → ⚠️ Configurar isso!
│   └── package.json
│
├── frontend/            → Web App (porta 5173)
│   ├── src/
│   └── package.json
│
├── database/            → Scripts SQL
│   └── schema.sql
│
└── docs/                → Documentação
```

---

## 🆘 AINDA COM PROBLEMAS?

1. Ler o diagnóstico completo: `DIAGNOSTICO_DASHBOARD.md`
2. Verificar logs do backend no terminal
3. Verificar console do navegador (F12)
4. Verificar se todas as portas estão livres
5. Reiniciar WAMP, backend e frontend

---

## 🔄 COMANDOS ÚTEIS

### Reiniciar tudo do zero:

```bash
# 1. Parar tudo
Ctrl+C nos terminais

# 2. Recriar banco (⚠️ APAGA TODOS OS DADOS)
mysql -u root -p -P 3307
DROP DATABASE nexus_business_manager;
CREATE DATABASE nexus_business_manager;
EXIT;

# 3. Rodar migrations e seed
cd backend
npm run migrate
npm run seed

# 4. Iniciar backend
npm run dev

# 5. Em outro terminal, iniciar frontend
cd ../frontend
npm run dev
```

### Ver logs em tempo real:

**Backend:** Os logs aparecem no terminal onde rodou `npm run dev`

**Frontend:** Console do navegador (F12) → Aba Console

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- [Arquitetura do Sistema](docs/arquitetura.md)
- [Guia de Deploy](docs/deploy.md)
- [Backup e Restore](docs/backup.md)
- [Testes](docs/tests.md)

---

**🎯 Dica:** Mantenha sempre 3 terminais abertos:
1. Backend (`cd backend && npm run dev`)
2. Frontend (`cd frontend && npm run dev`)
3. Terminal livre para comandos

**Bom desenvolvimento! 🚀**
