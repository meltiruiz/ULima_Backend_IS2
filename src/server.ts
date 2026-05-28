import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config/app-config";
import { registerEventObservers } from "./events";
import { registerModules } from "./modules";
import { errorHandler } from "./shared/middleware/error-handler";

const app = new Hono();

registerEventObservers();

// --- Middleware global ---
app.use("*", cors());
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

// --- Server start ---
const PORT = config.server.port;

console.log(`ULima++ Backend iniciando en puerto ${PORT}...`);

export default {
  port: PORT,
  fetch: app.fetch,
};
