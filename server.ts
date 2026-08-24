import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './server/routes';

dotenv.config({ path: '.env.local' });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // JSON Body Parser & Cookie Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // API Routes (Intermediadas e Protegidas pelo Backend)
  app.use('/api', apiRoutes);

  // Health check & System info endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Sonax In Home — Portal Operacional',
      database: 'Local backend data store',
      auth: 'Internal Backend Auth (bcrypt + HttpOnly Cookie)',
      fusoHorario: 'America/Sao_Paulo',
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware for development vs static for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sonax In Home] Servidor operacional rodando na porta ${PORT}`);
  });
}

startServer();
