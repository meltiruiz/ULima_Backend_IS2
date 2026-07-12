---
name: Chatbot Asistente Academico
description: Chatbot conversacional con IA (Cohere) que responde preguntas en lenguaje natural sobre la informacion academica del alumno autenticado.
targets:
  - ../../../src/modules/chatbot/**
  - ../../../src/services/cohere.client.ts
  - ../../../src/services/firebase.service.ts
  - ../../../src/db/schema/schema.ts
  - ../../../src/shared/middleware/rate-limit.ts
  - ../../../src/config/env.ts
---

# Chatbot Asistente Academico

Chatbot con IA (Cohere) embebido en la app. El alumno hace preguntas en lenguaje natural sobre su informacion academica y recibe respuestas directas basadas exclusivamente en sus datos reales. El backend actua como proxy seguro entre el frontend y Cohere, orquestando la recoleccion de datos, la clasificacion de intencion, la busqueda semantica en chat y la generacion de respuestas.

## User Stories

| ID | Description |
| --- | --- |
| HU-CHATBOT-01 | Como alumno quiero hacer preguntas sobre mis notas, horario, examenes, malla, anuncios, companeros, alertas y conversaciones del chat de mi seccion, y recibir respuestas precisas basadas en mis datos reales. |
| HU-CHATBOT-02 | Como alumno quiero mantener multiples sesiones de conversacion con el chatbot, poder volver a ellas, y crear nuevas cuando lo necesite. |

## Business Rules

### BR-CB-01: Autorizacion

- Todo el modulo requiere `Authorization: Bearer <JWT>` (`authMiddleware`) y rol de alumno (`requireRole('student','delegate','subdelegate')`); un token docente recibe `403 FORBIDDEN`.
- El `studentId` sale del contexto del JWT; si falta -> `401 STUDENT_NOT_FOUND`.

### BR-CB-02: Sesiones

- Cada alumno puede crear multiples sesiones de chatbot (`chatbot_session`).
- Una sesion contiene mensajes (`chatbot_message`) con `role = 'user' | 'assistant'`.
- El alumno solo puede ver, crear y eliminar sus propias sesiones.
- Al eliminar una sesion se eliminan en cascada sus mensajes.
- El endpoint `POST /chatbot/sessions/:id/ask` solo acepta preguntas en sesiones que pertenezcan al alumno autenticado; si no -> `404 SESSION_NOT_FOUND`.

### BR-CB-03: Titulo automatico de sesion

- Al crear una sesion via `POST /chatbot/sessions`, el titulo inicial es `"Nueva conversacion"`.
- Al responder la primera pregunta de una sesion, el backend genera un titulo descriptivo (max 100 caracteres) usando Cohere Chat (llamada ligera, sin contexto grande) basado en la pregunta del alumno y actualiza el campo `title`.
- Si falla la generacion del titulo, se mantiene `"Nueva conversacion"` (no bloquea la respuesta).

### BR-CB-04: Clasificacion de intencion

- Antes de recolectar datos, se clasifica la pregunta en uno o mas dominios: `grades`, `schedule`, `curriculum`, `alerts`, `announcements`, `classmates`, `chat`.
- **Primario:** Cohere Classify (endpoint `/classify`) con ejemplos etiquetados por dominio.
- **Fallback:** Keyword matching en espanol si Classify falla o excede timeout (500ms). Palabras clave por dominio:
  - `grades`: nota, promedio, saque, parcial, examen (de curso), calificacion
  - `schedule`: horario, hora, entro, clase, lunes, martes, miercoles, jueves, viernes, sabado, manana, examen (fecha/hora), evaluacion (fecha)
  - `curriculum`: malla, creditos, cursos (faltan/terminar), ciclo, llevar, prerrequisito
  - `alerts`: riesgo, alerta, carga, evaluaciones (cantidad), semana (carga)
  - `announcements`: anuncio, comunicado, aviso, publico
  - `classmates`: companero, companeros, seccion, quienes, alumnos
  - `chat`: chat, dijo, dijeron, hablo, comentaron, mensaje, conversacion
- Se toman los top-N intents con score > 0.3 (Cohere Classify) o todos los dominios con al menos 1 keyword match (fallback).

### BR-CB-05: Recoleccion de datos por intencion

Solo se consultan las fuentes necesarias segun los intents clasificados. Todas las queries se ejecutan en paralelo via `Promise.all`:

| Intent | Fuente | Query |
| --- | --- | --- |
| `grades` | Body del request | `localGrades` enviadas por el frontend |
| `schedule` | PostgreSQL | `schedule_session` + `academic_week` del periodo activo para las secciones matriculadas |
| `curriculum` | PostgreSQL | `student_course_progress` + `curriculum_course` + `course` + `enrollment` activo |
| `alerts` | PostgreSQL | `alert` del alumno en el periodo activo |
| `announcements` | PostgreSQL | `announcement` de las secciones donde el alumno esta matriculado |
| `classmates` | PostgreSQL | `enrollment` + `app_user` de las secciones del alumno (solo nombres, no datos sensibles) |
| `chat` | Firebase RTDB + Cohere Rerank | Mensajes recientes de `sections/{sectionId}/messages` filtrados por relevancia semantica |

### BR-CB-06: Busqueda semantica en chat

- Si el intent incluye `chat`, se obtienen los `sectionId` de las secciones activas del alumno.
- Para cada seccion relevante (filtrada por nombre de curso si se menciona en la pregunta), se leen los ultimos 200 mensajes desde Firebase RTDB.
- Se llama a Cohere Rerank (`/rerank`) con la pregunta como `query` y los mensajes como `documents`. Se toman los top-10 mensajes mas relevantes.
- Los mensajes relevantes se incluyen en el contexto con formato: `[Fecha] Nombre: mensaje`.
- Si Firebase RTDB no esta disponible, el intent `chat` se omite silenciosamente (no se bloquea la respuesta para otros intents).

### BR-CB-07: Ventana de contexto

- El contexto enviado a Cohere Chat incluye:
  1. System prompt (reglas de comportamiento, solo datos del contexto, no inventar).
  2. Perfil del alumno (nombre, carrera, ciclo -- derivado del JWT + DB, no del prompt).
  3. Ultimos 10 mensajes del historial de la sesion (user + assistant).
  4. Datos academicos recolectados segun intents (solo los bloques relevantes).
  5. Notas locales (`localGrades`) si el intent incluye `grades`.
  6. Mensajes de chat relevantes si el intent incluye `chat`.
  7. La pregunta actual del alumno.
- Si el historial tiene mas de 10 mensajes, solo se incluyen los ultimos 10 (los mas antiguos se descartan del contexto, pero permanecen en BD).

### BR-CB-08: Notas locales

- Las notas personales viajan en el body de cada request bajo la clave `localGrades`.
- El backend no persiste estas notas; solo las incluye en el contexto para que Cohere las use.
- Schema Zod para `localGrades`:
  ```ts
  z.array(z.object({
    id: z.string(),
    nombre: z.string(),
    notas: z.array(z.object({
      titulo: z.string(),
      peso: z.number(),
      valor: z.number().min(0).max(20),
    })),
  })).optional()
  ```

### BR-CB-09: System Prompt

```
Eres ULimaBot, un asistente academico personal para estudiantes de la
Universidad de Lima. Tu funcion es ayudar al alumno con informacion
sobre su vida academica.

REGLAS:
1. SOLO respondes con datos que aparecen en el contexto proporcionado.
   Si no hay informacion suficiente, di exactamente:
   "No tengo esa informacion en este momento."

2. NUNCA inventes notas, horarios, nombres de companeros, fechas de
   examenes ni ningun dato academico. Si el contexto no lo contiene,
   no lo sabes.

3. Responde en espanol, con tono amable y directo. Se conciso.

4. NO respondas preguntas sobre otros alumnos. Si te preguntan por
   datos de otra persona, di: "Solo puedo mostrarte tu propia
   informacion academica."

5. NO reveles informacion tecnica (IDs, tokens, codigos internos).
   Siempre traduce a lenguaje natural (ej. "Lunes" no "day_of_week=1").

6. Si la pregunta es ambigua, pide aclaracion brevemente en lugar de
   asumir.

7. NUNCA sugieras modificar datos, eliminar registros ni realizar
   acciones que cambien informacion del sistema. Solo consultas.

8. Usa bullet points o formato breve cuando listes informacion.
```

### BR-CB-10: Guardrails de seguridad

- El campo `question` tiene maximo 500 caracteres (Zod `.max(500)`).
- Se rechaza la pregunta si contiene intentos de prompt injection: cadenas como `<context>`, `[CONTEXTO]`, `[DATOS_`, `system:`, `assistant:` -> `400 INVALID_QUESTION`.
- Timeout de 8 segundos para la llamada a Cohere Chat.
- Si Cohere responde con texto que contiene IDs o datos que no corresponden al `studentId` del JWT, se descarta la respuesta y se retorna error 500 generico (no se guarda en BD).

### BR-CB-11: Rate Limiting

- Maximo 20 preguntas por alumno por hora (configurable via `CHATBOT_RATE_LIMIT` en env).
- Implementado como middleware `rate-limit.ts` en `src/shared/middleware/`, usando un `Map<studentId, {count, resetAt}>` en memoria (no requiere DB).
- Headers de respuesta: `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Excedido -> `429 RATE_LIMITED` con mensaje: "Demasiadas preguntas. Intenta de nuevo en X minutos."

### BR-CB-12: Manejo de errores Cohere

| Escenario | HTTP | Mensaje al alumno |
| --- | --- | --- |
| Classify falla | N/A (usa keyword fallback) | N/A |
| Chat timeout (>8s) | 503 | "Estoy teniendo dificultades tecnicas en este momento. Por favor intenta de nuevo en unos segundos." |
| Chat 429 (rate limit Cohere) | 503 | (mismo mensaje generico) |
| Chat 500 (error Cohere) | 503 | (mismo mensaje generico) |
| Rate limit propio | 429 | "Demasiadas preguntas. Intenta de nuevo en X minutos." |

- Nunca se exponen detalles del error de Cohere al frontend. Se loguea internamente con `console.error`.

## Endpoints

### POST /chatbot/sessions

Crea una nueva sesion de chatbot vacia para el alumno autenticado.

- **Auth**: Bearer (rol alumno).
- **Body**: vacio (sin body requerido).
- **Response** `201`:
  ```json
  {
    "session": {
      "id": "uuid",
      "title": "Nueva conversacion",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  }
  ```
- **Errors**: `401 MISSING_TOKEN` / `401 INVALID_TOKEN` / `401 STUDENT_NOT_FOUND` / `403 FORBIDDEN`.

### GET /chatbot/sessions

Lista todas las sesiones del alumno autenticado, ordenadas por `updated_at` descendente.

- **Auth**: Bearer (rol alumno).
- **Response** `200`:
  ```json
  {
    "sessions": [
      {
        "id": "uuid",
        "title": "Consulta sobre notas y horario",
        "createdAt": "ISO-8601",
        "updatedAt": "ISO-8601"
      }
    ]
  }
  ```
- **Errors**: `401` / `403 FORBIDDEN`.

### GET /chatbot/sessions/:id

Obtiene una sesion con todos sus mensajes.

- **Auth**: Bearer (rol alumno).
- **Response** `200`:
  ```json
  {
    "session": {
      "id": "uuid",
      "title": "Consulta sobre notas y horario",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    },
    "messages": [
      { "id": "uuid", "role": "user", "content": "Cual es mi promedio?", "createdAt": "ISO-8601" },
      { "id": "uuid", "role": "assistant", "content": "Tu promedio general es 15.3.", "createdAt": "ISO-8601" }
    ]
  }
  ```
- **Errors**: `404 SESSION_NOT_FOUND` (no existe o no pertenece al alumno).

### DELETE /chatbot/sessions/:id

Elimina una sesion y todos sus mensajes en cascada.

- **Auth**: Bearer (rol alumno).
- **Response** `200`:
  ```json
  { "message": "Sesion eliminada correctamente." }
  ```
- **Errors**: `404 SESSION_NOT_FOUND` (no existe o no pertenece al alumno).

### POST /chatbot/sessions/:id/ask

Envia una pregunta dentro de una sesion existente y obtiene una respuesta del chatbot.

- **Auth**: Bearer (rol alumno).
- **Body**:
  ```json
  {
    "question": "Cual es mi promedio en Soft II?",
    "localGrades": [
      {
        "id": "sectionId",
        "nombre": "INGENIERIA DE SOFTWARE II",
        "notas": [
          { "titulo": "Parcial 1", "peso": 30, "valor": 16.0 }
        ]
      }
    ]
  }
  ```
  - `question`: string, max 500 caracteres, requerido.
  - `localGrades`: array opcional. Solo se envia si el alumno tiene notas guardadas localmente.
- **Response** `200`:
  ```json
  {
    "answer": "En INGENIERIA DE SOFTWARE II tienes 16.0 en el Parcial 1. Solo tienes una nota registrada de 30% de peso, asi que tu promedio actual en ese curso es 16.0.",
    "sessionId": "uuid"
  }
  ```
- **Errors**:
  - `400 INVALID_QUESTION`: pregunta vacia, excede 500 chars, o contiene prompt injection.
  - `404 SESSION_NOT_FOUND`: sesion no existe o no pertenece al alumno.
  - `429 RATE_LIMITED`: excedio el limite de preguntas por hora.
  - `503 CHATBOT_UNAVAILABLE`: Cohere no disponible (timeout, error 429 de Cohere, error 500).

## Base de Datos

### Nuevas tablas (migracion requerida)

```sql
CREATE TABLE chatbot_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL DEFAULT 'Nueva conversacion',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE chatbot_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chatbot_session(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_session_student ON chatbot_session(student_id);
CREATE INDEX idx_chatbot_message_session ON chatbot_message(session_id);
```

### Variables de entorno nuevas

```env
COHERE_API_KEY=         # API key de Cohere (requerida)
CHATBOT_RATE_LIMIT=20   # Preguntas por alumno por hora (opcional, default 20)
```

## Arquitectura

- Capas `routes -> controller -> service -> repository` (modulo canonico).
- `chatbot.service.ts` es el orquestador central: recibe pregunta + localGrades + sesion, coordina clasificacion, recoleccion de datos y llamada a Cohere.
- `cohere.client.ts` (nuevo en `src/services/`): singleton que encapsula las APIs de Cohere (Chat, Classify, Rerank, Generate para titulos). Usa el SDK oficial `cohere-ai` o llamadas HTTP directas. Recibe `COHERE_API_KEY` via config.
- `firebase.service.ts`: se agrega metodo `getRecentMessages(sectionId, limit, since?)` que lee mensajes de `sections/{sectionId}/messages` desde Firebase RTDB.
- `intent-classifier.ts`: logica pura de clasificacion (Cohere Classify + keyword fallback), sin dependencias de BD.
- `chat-search.ts`: busca mensajes relevantes combinando Firebase RTDB + Cohere Rerank.
- `context-builder.ts`: logica pura que arma el string de contexto a partir de intents + datos + historial + localGrades + system prompt.
- `rate-limit.ts`: middleware reutilizable que trackea conteo de requests por `studentId` en memoria.

## Fuera de alcance

- NO se usa pgvector ni se almacenan embeddings en PostgreSQL.
- NO se usa streaming (Server-Sent Events). Las respuestas son one-shot.
- NO se usa Cohere Chat con tool-use (agents). Es llamada simple con contexto.
- NO se indexan ni se persisten embeddings de mensajes de chat.
- NO se modifica el esquema de Firebase RTDB.

## Test Links

- Clasificacion de intencion (keyword fallback): `[@test] ../../../test/chatbot/intent-classifier.test.ts`
- Construccion de contexto: `[@test] ../../../test/chatbot/context-builder.test.ts`
- Queries de repositorio: `[@test] ../../../test/chatbot/chatbot.repository.test.ts`
- Orquestacion del servicio: `[@test] ../../../test/chatbot/chatbot.service.test.ts`
- Validacion Zod y controller: `[@test] ../../../test/chatbot/chatbot.controller.test.ts`
- Rate limit middleware: `[@test] ../../../test/shared/rate-limit.test.ts`
- Firebase service getRecentMessages: `[@test] ../../../test/services/firebase.service.test.ts`
