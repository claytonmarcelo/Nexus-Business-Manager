# Deploy - Nexus Business Manager

## Stack
- **Backend**: Node.js 20 + Fastify + TypeScript + MySQL
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Banco**: MySQL 8+

## Pré-requisitos
- Node.js >= 20
- MySQL >= 8
- Git
- (Opcional) PM2 `npm install -g pm2`

## 1. Clonar
```bash
git clone <repo-url> nexus-business-manager
cd nexus-business-manager
```

## 2. Configurar variáveis de ambiente
```bash
cp backend/.env.example backend/.env
# Editar backend/.env com suas credenciais
```

## 3. Banco de dados
```bash
mysql -u root -p < database/migrations/001_initial.sql
# Executar demais migrations em ordem numérica
# ou importar dump completo:
mysql -u root -p nexus_business_manager < database/seed.sql
```

## 4. Instalar dependências
```bash
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
```

## 5. Iniciar produção
```bash
# Opção 1: PM2
cd backend
pm2 start dist/server.js --name nexus-api
pm2 save

# Opção 2: Direct
NODE_ENV=production node backend/dist/server.js

# Servir frontend via Nginx ou CDN (dist/ esta em frontend/dist/)
```

## 6. Nginx (proxy reverso)
```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name app.seudominio.com;
    root /var/www/nexus/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```
