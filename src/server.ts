import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { registerEventObservers } from "./events/index.js";
import { registerModules } from "./modules/index.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import { config } from "./config/app-config.js";

const app = new Hono();

registerEventObservers();

// --- Middleware global ---
// CORS restringido a los orígenes de `CORS_ORIGINS` (env). Si la lista está
// vacía se mantiene `*` para no romper desarrollo; en producción debe definirse.
app.use(
  "*",
  cors({
    origin: config.server.corsOrigins.length > 0 ? config.server.corsOrigins : "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("*", logger());
app.onError(errorHandler);

// --- Health check ---
app.get("/", (c) => {
  return c.json({
    name: "ULima++ Backend",
    status: "running",
    health: "/health",
    modules: [
      "/auth",
      "/academic-profile",
      "/curriculum",
      "/grades",
      "/schedule",
      "/course-detail",
      "/alerts",
      "/section-management",
    ],
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Modules routes ---
registerModules(app);

export default app;
