import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config/app-config";

const app = new Hono();

// --- Middleware global ---
app.use("*", cors());
app.use("*", logger());

// --- Health check ---
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Modules routes (placeholder) ---
// Cada módulo registrará sus rutas aquí cuando se implemente

// --- Server start ---
const PORT = config.server.port;

console.log(`ULima++ Backend iniciando en puerto ${PORT}...`);

export default {
  port: PORT,
  fetch: app.fetch,
};
