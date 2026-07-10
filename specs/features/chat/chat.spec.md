---
name: Chat en vivo por sección (HU23)
description: Puente de auth entre el JWT propio y Firebase (POST /chat/token) + espejo de membresía + derivación de rol para el chat en vivo por sección
targets:
  - ../../../src/modules/chat/**
  - ../../../src/services/firebase.service.ts
---

# Chat en vivo por sección

Chat grupal en vivo por sección (alumnos + profesor + JP) sobre **Firebase RTDB**, con Postgres como fuente de verdad académica (NO se migra). Issues: HU23 (frontend #123), HU23_Backend (backend #44), HU23_Frontend (frontend #124). Spec retroactiva: la implementación se mergeó a `main` (commits `69de468`, `c67c9c8`, `0d78e32`) antes de escribir esta spec.

Decisión de arquitectura (trade-off) y caveats completos en el issue padre #123. Aquí se especifica solo el plano de backend testeable en el stack: el puente `/chat/token`, el espejo de membresía y la derivación de rol. Las **reglas de seguridad de RTDB** viven en Firebase y se validan con **Firebase Emulator** (fuera de la suite Bun).

## User Stories

- **HU23**: Como estudiante (o profesor/JP) de una sección, quiero un chat grupal en vivo con los integrantes de mi sección, para comunicarnos dentro de la app sin depender de WhatsApp.

## Requisitos

### R-CHAT-1 — Puente de auth `POST /chat/token`
El backend verifica el JWT propio (`authMiddleware`), resuelve al solicitante como participante de la sección y firma un **custom token** de Firebase (`uid = app_user.id`) con claims `{ role, sectionId, moderator, weight }`.
- El rol del JWT decide la fuente: `teacher` ⇒ `findTeacherParticipant` (por `section.teacher_id`/`jp_id`); cualquier otro ⇒ `findStudentParticipant` (por `enrollment` activo + `section_representative`).
- Un solicitante sin participante en la sección, o cuyo `userId` del JWT no coincide con el del participante, recibe `403 CHAT_SECTION_FORBIDDEN` (anti-suplantación por parámetro).
  `[@test] ../../../test/chat.controller.test.ts` (docente sin teacherId, docente no-dictante, alumno sin studentId, userId ≠ participante, no escribe espejo al rechazar)
- Al autorizar, el backend escribe el espejo `/members/{sectionId}/{uid}` en RTDB **antes** de firmar el token, y devuelve `{ token, uid, displayName, role, roleLabel, isModerator, weight }`.
  `[@test] ../../../test/chat.controller.test.ts` (profesor válido, alumno raso, delegado)

### R-CHAT-2 — Derivación de rol/peso/moderador
El rol de chat determina etiqueta, peso y si es moderador (puede borrar cualquier mensaje):
- `teacher`=100, `jp`=90, `delegate`=70, `subdelegate`=60, `student`=10; moderador = todos salvo `student`.
- Un alumno se mapea a `delegate`/`subdelegate` según su `position` activa en `section_representative`, o `student` si no es representante.
  `[@test] ../../../test/chat.logic.test.ts` (roleLabel, roleWeight, isModeratorRole, studentRoleFromPosition, buildParticipant, canIssueToken)

### R-CHAT-3 — Postgres no se migra; el cliente nunca escribe membresía
Firebase RTDB guarda solo mensajes + el espejo `/members`. El backend es el ÚNICO que escribe `/members` (el cliente lo tiene denegado por reglas). Sin Cloud Functions (plan Spark).

## Fuera de alcance de esta spec (validado aparte)
- Reglas de seguridad de RTDB (lectura/escritura/borrado por membresía y por rol) → **Firebase Emulator**.
- Realtime del SDK y la pantalla FlutterFire → sub-issue frontend HU23_Frontend (#124).

## Notas de despliegue
- Fijar `firebase-admin@12.1.0`: v13/v14 arrastran `jwks-rsa`→`jose` (ESM) y rompen Vercel con `ERR_REQUIRE_ESM` (backend `type:"module"`). Ver `KNOWLEDGE.md`.
- Env requeridas: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`. Si faltan, el servicio no firma tokens (chat deshabilitado, sin romper el resto).
