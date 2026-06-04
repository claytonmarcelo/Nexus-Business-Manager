# Deployment - Nexus Business Manager

## Stack
- **Backend**: Node.js 20 + Fastify + TypeScript + MySQL
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: MySQL 8+

## Prerequisites
- Node.js >= 20
- MySQL >= 8
- Git
- (Optional) PM2 `npm install -g pm2`

## 1. Clone
```bash
git clone <repo-url> nexus-business-manager
cd nexus-business-manager
```

## 2. Configure environment variables
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

## 3. Database
```bash
mysql -u root -p < database/migrations/001_initial.sql
# Run remaining migrations in numeric order
# or import a full dump:
mysql -u root -p nexus_business_manager < database/seed.sql
```

## 4. Install dependencies
```bash
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
```

## 5. Start production
```bash
# Option 1: PM2
cd backend
pm2 start dist/server.js --name nexus-api
pm2 save

# Option 2: Direct
NODE_ENV=production node backend/dist/server.js

# Serve frontend via Nginx or CDN (dist/ is at frontend/dist/)
```

## 6. Nginx (reverse proxy)
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

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
    server_name app.yourdomain.com;
    root /var/www/nexus/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```
