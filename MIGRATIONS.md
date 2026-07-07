# Runbook de Migraciones de Base de Datos

Estado real auditado el 2026-07-05 y protocolo vigente hasta el fin del ciclo 2026-1.

## Estado real de la BD (auditoría 2026-07-05)

- La BD productiva (PostgreSQL 18 en AWS RDS) **coincide con `src/db/schema/schema.ts`**: 28/28 tablas tras aplicar la 0003, sin tablas sobrantes ni faltantes.
- La tabla `__drizzle_migrations` **no existe** en la BD: ninguna migración se aplicó nunca vía `drizzle-kit migrate`; históricamente todo se aplicó a mano.
- El journal (`drizzle/meta/_journal.json`) registra las entradas 0000 y 0002 **cuyos archivos SQL no existen** en `drizzle/`; el snapshot 0000 está obsoleto (describe tablas que nunca llegaron a la BD final). El journal es registro histórico, no fuente de verdad.
- Consecuencia: `drizzle-kit generate` (diff automático) y `drizzle-kit migrate` producirían resultados incorrectos o destructivos. **No usarlos.**

## Protocolo vigente (hasta re-baseline post-demo)

1. **`drizzle-kit generate`/`migrate` congelados. `db:push` prohibido siempre** (diffea contra un snapshot obsoleto y puede generar DROPs de objetos reales).
2. Todo cambio de BD = **SQL aditivo escrito a mano**, numerado secuencialmente (`drizzle/000N_nombre.sql`), **dentro del PR** que lo necesita, con `IF NOT EXISTS` donde aplique. Solo `CREATE TABLE`, `ADD COLUMN` (nullable o con default) y `CREATE INDEX`; nada destructivo.
3. **Orden estricto: el SQL se aplica en la BD ANTES del merge/deploy del código que lo usa.**
4. **Una sola persona aplica** (Jeff), con backup previo (`pg_dump`, requiere cliente v18: `/opt/homebrew/opt/libpq/bin/pg_dump`), en transacción, y **avisa al equipo** con la evidencia de verificación (`to_regclass` + columnas + smoke test).
5. Todo lo aplicado se registra en la tabla de abajo. Esa lista es el insumo del **re-baseline post-demo** (recrear el journal desde el esquema real y adoptar `drizzle-kit migrate` con `__drizzle_migrations`).
6. **Freeze pre-demo:** nadie ejecuta DDL en las 48 horas previas a la exposición. Lo que no esté migrado 48h antes, no entra a la demo.

## Registro de migraciones aplicadas

| # | Archivo | Qué hace | Aplicada | Por | Verificación |
|---|---|---|---|---|---|
| 0001 | `0001_student_specialty_setup_completed.sql` | `student.specialty_setup_completed` | (histórico, junio 2026) | equipo | columna existe en BD ✔ |
| 0003 | `0003_password_reset_token.sql` | Tabla `password_reset_token` + índice + FK (HU20) | 2026-07-05 | Jeff | `to_regclass` ✔, 7 columnas ✔, índice ✔, FK ✔, smoke test local ✔. Backup previo con `pg_dump` ✔ |
| 0004 | `0004_advising_teacher_role.sql` | HU18: `teacher.user_id`; `section.jp_id` + CHECK + índice único parcial `uq_section_jp`; enum `advising_kind`; `course_advising_session.kind/session_date/capacity` + checks; **re-scope de `uq_course_advising_session_course/section` a `kind='recurring'`** + nuevo `uq_course_advising_session_extra`; tabla `advising_rsvp` + índice | **PENDIENTE** (aplicar con backup, en transacción, antes del deploy de HU18) | — | — |

> Nota: los números 0000 y 0002 del journal corresponden a archivos que ya no existen; no se reutilizan esos números para evitar ambigüedad.

### Aplicación de la 0004 (runbook)

```bash
# 1. Datos móviles (el wifi de la ULima bloquea el 5432). Backup primero:
/opt/homebrew/opt/libpq/bin/pg_dump "$DATABASE_URL" > backup_pre_0004_$(date +%Y%m%d).sql
# 2. Aplicar la migración en UNA transacción (psql aborta todo si algo falla):
/opt/homebrew/opt/libpq/bin/psql "$DATABASE_URL" -1 -f drizzle/0004_advising_teacher_role.sql
# 3. Seed de docentes: primero DRY-RUN (imprime el plan), luego --apply:
bun run db:seed:docentes                 # revisa la sección ISW2 y los usuarios derivados
bun run db:seed:docentes -- --apply      # aplica (transacción propia)
# 4. Verificar y recién entonces mergear/deployar el código HU18.
```

⚠️ El único paso no puramente aditivo es el `DROP INDEX`/`CREATE INDEX` de los dos únicos de asesorías (metadato, sin pérdida de filas): se reconstruyen con la condición `kind='recurring'`.

## Verificación rápida del despliegue

`GET /version` en el backend devuelve el SHA del commit desplegado (Vercel inyecta `VERCEL_GIT_COMMIT_SHA`). Si no coincide con `main`, el deploy está desactualizado — exactamente el incidente detectado el 2026-07-05 (producción sirviendo código de junio).
