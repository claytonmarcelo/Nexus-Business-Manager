import { buildApp } from './app';

async function start() {
  const app = await buildApp();
  const port = Number(process.env.PORT) || 3333;

  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Nexus Business Manager API rodando em http://localhost:${port}`);
    console.log(`Documentacao disponivel em http://localhost:${port}/api/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
