---
name: Carnet de networking (HU27)
description: Carnet/badge de networking opcional con redes sociales (LinkedIn, etc.) para alumnos y docentes; opt-in desde perfil, visible en contactos y compartible en chats de sección
targets:
  - ../../../src/modules/networking/**
  - ../../../src/db/schema/schema.ts
---

# Carnet de networking

> ⚠️ **Spec de DISEÑO — pendiente de implementar (asignada a meltiruiz, HU27).** La BD ya está preparada (migración `drizzle/0001_flowery_jack_flag.sql`, sin aplicar aún a prod). Este documento deja especificado el backend para que se implemente con facilidad.

Issues: HU27 (frontend padre), HU27_Backend (backend), HU27_Frontend (frontend). Aplica a **todos** los usuarios (alumnos y docentes) porque cuelga de `app_user`.

## User Stories

- **HU27**: Como **alumno o docente**, quiero un **carnet de networking** opcional donde comparto mis redes (LinkedIn, Instagram, GitHub, X, web), para **conectar** con compañeros/profesores dentro de la app sin intercambiar datos manualmente.

## Modelo de datos (ya en schema.ts)

- `app_user.networking_opt_in` (boolean, default false): opt-in explícito. El carnet solo es visible para otros si es `true`.
- `user_social_link` (una fila por red): `id`, `user_id → app_user`, `platform` (enum `social_platform`: `linkedin|instagram|github|x|website|other`), `url` (varchar 255), `label` (varchar 80, opcional para `website`/`other`). Único `(user_id, platform)`.

## Requisitos

### R-NET-1 — Editar mi carnet (desde el perfil)
- `GET /networking/me` → `{ optIn: boolean, links: [{ platform, url, label }] }` del usuario autenticado (alumno o docente).
- `PUT /networking/me` → body `{ optIn: boolean, links: [{ platform, url, label? }] }`. Hace upsert del set de enlaces (reemplaza el conjunto) y setea `networking_opt_in`. Validar con Zod: `platform` en el enum, `url` http(s) válida y ≤255, máx. 1 enlace por plataforma, `label` requerida solo si `platform ∈ {website, other}`.
- Sin `session`/rol especial: cualquier usuario logueado edita **solo el suyo** (derivado del JWT, no del body).

### R-NET-2 — Ver el carnet de otro usuario
- `GET /networking/users/:userId` → carnet **público** de ese usuario **solo si** su `networking_opt_in = true`; si no, `404 NETWORKING_NOT_PUBLIC` (o `{ optIn:false }` sin links). Response: `{ userId, fullName, roleLabel?, links: [...] }`.
- Se usa al abrir un contacto (módulo contactos) o al tocar el remitente en el chat.

### R-NET-3 — Compartir en el chat de sección
- El carnet se comparte como un mensaje del chat (Firebase RTDB) que referencia `userId`; el receptor obtiene los datos vía `GET /networking/users/:userId`. **No** se duplican las redes en Firebase (fuente de verdad = Postgres). Alternativa: el mensaje lleva un snapshot mínimo (fullName + links) para render offline; decidir en implementación. Solo se puede compartir el carnet propio, y solo en secciones a las que el usuario pertenece (misma regla de membresía del chat HU23, ver [[hu23-chat-firebase]] equivalente).

### R-NET-4 — Privacidad
- `networking_opt_in = false` (default) ⇒ el carnet no se expone en `GET /networking/users/:userId` ni es compartible. Quitar el opt-in oculta el carnet sin borrar los enlaces guardados.
- Capas routes→controller→service→repository, Zod, mensajes en español, `HttpError`; no exponer datos de usuarios que no dieron opt-in.

## Pruebas (a implementar con la feature)
- Caja blanca CC>4 en `PUT /networking/me` (opt-in on/off, enlace inválido, plataforma duplicada, label faltante en website/other, no-owner).
- Caja negra >4 campos en la validación del carnet.
- Unitaria ≥4 (lógica pura de validación/armado del carnet en `networking.logic.ts`).
- `GET /networking/users/:id` respeta `opt_in` (público vs 404).

## Fuera de alcance (v1)
- Búsqueda/directorio global de networking, solicitudes de conexión, mensajería 1-a-1 nueva (el chat de sección ya existe). QR del carnet (nice-to-have futuro).
