import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';
import { registerRoutes } from './routes';
import { logger } from './utils/logger';
import { ROUTE_PATHS, APP_SETTINGS, SERVER_MESSAGES } from './config/constants';

// ============================================================
// Express App Setup
// ============================================================

const app = express();

// ------- Global Middlewares -------

app.use(
  cors({
    origin: env.NODE_ENV === APP_SETTINGS.DEVELOPMENT
      ? true  // allow all origins in dev
      : [env.CLIENT_ADMIN_URL, env.CLIENT_MENU_URL, env.CLIENT_KITCHEN_URL],
    credentials: true,
  })
);

app.use(express.json({ limit: APP_SETTINGS.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (env.NODE_ENV === APP_SETTINGS.DEVELOPMENT) {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ------- Health Check -------
app.get(ROUTE_PATHS.HEALTH, (_req, res) => {
  res.json({ status: SERVER_MESSAGES.HEALTH_STATUS, timestamp: new Date().toISOString() });
});

// ------- API Routes -------
registerRoutes(app);

// ------- Global Error Handler (must be last) -------
app.use(errorMiddleware);

export default app;
