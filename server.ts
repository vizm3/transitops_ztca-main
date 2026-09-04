import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './backend/routes.ts';

const _dirname = (() => {
  try {
    if (typeof __dirname !== 'undefined') {
      return __dirname;
    }
  } catch (e) {}
  try {
    if (import.meta && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (e) {}
  return process.cwd();
})();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // In production, serve the compiled static build
  // In development, hook up Vite's dev server middleware
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[TransitOps] Express+Vite Full-stack server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
