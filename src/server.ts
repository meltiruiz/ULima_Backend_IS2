import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { registerEventObservers } from "./events/index.js";
import { registerModules } from "./modules/index.js";
import { errorHandler } from "./shared/middleware/error-handler.js";

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

export default app;
