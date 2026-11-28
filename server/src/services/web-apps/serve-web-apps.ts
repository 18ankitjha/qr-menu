import fs from 'fs';
import path from 'path';
import express, { Express, Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

// ============================================================
// Production: the API server also serves the four built front-ends, each under its own path
// (same layout as the dev gateway), so the whole system is one service on one host.
//   /admin/  /menu/  /kitchen/  /super-admin/   → client/<app>/dist (single-page apps)
//   /                                           → client/landing/index.html (static, shared with the dev gateway)
// ============================================================

const APP_PATHS = ['super-admin', 'admin', 'kitchen', 'menu'] as const;

// server/{src|dist}/services/web-apps → repo root → client/
const CLIENT_ROOT = path.resolve(__dirname, '../../../../client');
const LANDING_FILE = path.join(CLIENT_ROOT, 'landing', 'index.html');

export const serveWebApps = (app: Express): void => {
  const hasLanding = fs.existsSync(LANDING_FILE);
  if (!hasLanding) logger.warn(`Landing page missing — ${LANDING_FILE}; "/" will redirect to /admin/login`);

  app.get('/', (_req, res) => {
    if (!hasLanding) return res.redirect(302, '/admin/login');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(LANDING_FILE);
  });

  for (const appPath of APP_PATHS) {
    const distDir = path.join(CLIENT_ROOT, appPath, 'dist');
    const indexFile = path.join(distDir, 'index.html');

    if (!fs.existsSync(indexFile)) {
      logger.warn(`Web app /${appPath}/ not built — missing ${indexFile}`);
      continue;
    }

    const prefix = `/${appPath}`;

    // Vite emits content-hashed files under assets/ — safe to cache forever. index.html must always be fresh.
    app.use(
      prefix,
      express.static(distDir, {
        index: false,
        redirect: false,
        setHeaders: (res, filePath) => {
          const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
          res.setHeader('Cache-Control', isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      })
    );

    // Single-page app: any route under the prefix (except missing files) gets index.html
    app.get(`${prefix}*`, (req: Request, res: Response, next: NextFunction) => {
      const subPath = req.path.slice(prefix.length);
      if (subPath !== '' && !subPath.startsWith('/')) return next(); // e.g. "/adminfoo" isn't this app
      if (subPath === '') {
        const query = req.originalUrl.slice(req.path.length);
        return res.redirect(301, `${prefix}/${query}`);
      }
      if (path.extname(subPath)) return res.status(404).end();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexFile);
    });
  }
};
