---
name: Platform Runtime Compatibility
description: Adaptar el runtime HTTP de Hono para Bun local y Vercel serverless sin arranque manual
targets:
  - ../../../src/server.ts
  - ../../../package.json
  - ../../../tsconfig.json
  - ../../../vercel.json
  - ../../../README.md
---

# Platform Runtime Compatibility

## Scope

Esta spec cubre la migracion del entrypoint HTTP para que el backend siga funcionando con Bun en local y pueda desplegarse en Vercel como funcion serverless basada en el `default export` de Hono.

No cambia reglas de negocio, modulos funcionales, base de datos, autenticacion ni contratos REST existentes.

## Background

- El estado actual mezcla composicion de app con arranque de servidor:
  - exporta `{ port, fetch }` para Bun.
  - intenta iniciar `@hono/node-server` cuando `Bun` no existe.
- Ese patron depende de un proceso persistente y no es compatible con el modelo serverless esperado por Vercel.
- El repo ya expone `GET /` y `GET /health`; esos endpoints deben conservarse.

## Business Rules

### BR-PLATFORM-01: Hono app como export por defecto
- `src/server.ts` debe exportar la instancia `Hono` como `default export`.
- `src/server.ts` debe conservar:
  - middleware global (`cors`, `logger`, `errorHandler`).
  - `registerEventObservers()`.
  - `GET /`.
  - `GET /health`.
  - `registerModules(app)`.
- `src/server.ts` no debe iniciar listeners, puertos ni adapters de servidor manuales.

### BR-PLATFORM-02: Compatibilidad Bun local
- El backend debe seguir ejecutandose localmente con Bun usando el `default export` de Hono.
- No se debe depender de `Bun.serve()` explicito dentro del codigo de aplicacion.
- No se debe exportar `{ port, fetch }`.

### BR-PLATFORM-03: Compatibilidad Vercel serverless
- El deploy en Vercel debe usar el `default export` de Hono como entrypoint serverless.
- La ruta publica `/health` debe seguir respondiendo:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
  ```
- No se debe usar `app.listen`, `serve(...)`, `Bun.serve()` ni bootstrap equivalente dentro del codigo de runtime HTTP.

### BR-PLATFORM-04: Sin cambios de contrato REST
- `GET /` y `GET /health` mantienen sus respuestas actuales salvo ajustes no funcionales menores.
- Las rutas de modulos existentes deben conservar su path publico actual.
- Esta migracion no introduce prefijos `/api` en el contrato publico.

### BR-PLATFORM-05: Configuracion de despliegue minima
- Se puede agregar `vercel.json` solo si hace falta documentar o fijar el comportamiento de despliegue.
- La primera implementacion no debe agregar un adapter adicional si el `default export` de Hono cubre Bun local y Vercel segun la documentacion oficial actual.
- Si se documenta el despliegue en `README.md`, debe quedar claro que Vercel usa funciones serverless y no un servidor persistente.

### BR-PLATFORM-06: Build de produccion sin seeds
- El build de TypeScript usado para despliegue no debe compilar `src/db/seed/**`.
- Los scripts de seed pueden seguir existiendo para uso manual, pero no deben bloquear `bun run build`.
- No se debe resolver este problema agregando JSON externos faltantes al repo ni ejecutando seeds.

## Implementation Plan

### src/server.ts

- Mantener la composicion actual del app.
- Eliminar:
  - lectura de `config.server.port` para el runtime HTTP.
  - logs de arranque de servidor.
  - import dinamico de `@hono/node-server`.
  - export `{ port, fetch }`.
- Exportar solo `default app`.

### package.json

- Mantener `bun run build`.
- Ajustar scripts solo si alguno queda inconsistente con el nuevo runtime:
  - `dev` debe seguir funcionando con Bun.
  - `start` no debe depender de `node dist/server.js` si `src/server.ts` deja de arrancar un servidor manualmente.
- No agregar dependencia de adapter Vercel salvo que la implementacion realmente la use.

### vercel.json

- Agregarlo solo si es necesario para explicitar configuracion de despliegue.
- No introducir rewrites que cambien el path publico de los endpoints existentes.

### tsconfig.json

- Excluir `src/db/seed/**` del build de TypeScript usado para deploy.
- Mantener la compilacion de `src/**` para el backend real.

### README.md

- Actualizar la seccion de ejecucion/despliegue solo si cambia el flujo recomendado.

## API Contract Impact

- No requiere cambio en `docs/specs/api-contracts.md` porque no cambia endpoints, auth, payloads ni errores.

## Acceptance Criteria

- `src/server.ts` exporta `default app`.
- No existe `Bun.serve()`, `serve(...)`, `app.listen(...)` ni export `{ port, fetch }` en el runtime HTTP.
- `bun run build` no falla por archivos de seed fuera del runtime productivo.
- `GET /health` sigue respondiendo correctamente.
- Los modulos siguen registrados bajo sus rutas actuales.
- `bun run build` compila sin introducir errores nuevos.

## Notes

- La documentacion oficial actual de Vercel para Hono soporta `src/server.ts` como entrypoint valido mediante `export default app`.
- Por eso esta spec propone una migracion minima y evita agregar `api/index.ts` o un adapter dedicado salvo que la verificacion real del deploy lo exija en una revision posterior.

## Test Links

*(No hay tests existentes enlazados a esta migracion todavia.)*
