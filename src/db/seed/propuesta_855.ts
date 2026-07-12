// Seed — roster de la sección 855 de PROPUESTA DE INVESTIGACIÓN (section.id = 5).
//
// Human-gated: correr con datos móviles (el wifi de la ULima bloquea el 5432) y
// con backup previo (pg_dump de app_user/student/enrollment/…).
//
//   bun run src/db/seed/propuesta_855.ts           # DRY-RUN: imprime el plan, no escribe
//   bun run src/db/seed/propuesta_855.ts --apply   # aplica en UNA transacción
//
// Deja la sección con EXACTAMENTE los 17 alumnos de la lista (matrícula activa):
//  - crea los que falten (app_user + student + enrollment), password `ulima2026`.
//  - conserva a los que ya estén en la lista (p.ej. Jeff, delegado con notas).
//  - QUITA la matrícula en la sección 5 de cualquier alumno que NO esté en la
//    lista (borra solo su enrollment en la 5; su cuenta y sus otras secciones
//    quedan intactas). Si esa matrícula tuviera notas/representante, se limpian
//    también sus filas hijas para poder borrarla.
import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const APPLY = process.argv.includes("--apply");
const BCRYPT_COST = 10;
const STUDENT_PASSWORD = "ulima2026";
const CAREER_ID = 1;      // Ingeniería de Sistemas
const CURRICULUM_ID = 1;  // Malla Curricular Ingeniería de Sistemas
const CURRENT_LEVEL = 8;
const EMAIL_DOMAIN = "aloe.ulima.edu.pe";

// Orden, código, "Apellidos Nombres" (formato del app_user existente, sin coma).
const TARGET: Array<[string, string]> = [
  ["20193755", "ALARCON CUENCA ANDRES JOSUE"],
  ["20220208", "ARVORCO LEON BRIGITTE ZARELLA"],
  ["20200781", "FERNANDEZ LUNA JEAN FRANCO"],
  ["20211088", "GARCIA CASTRO AURO FABIAN"],
  ["20231396", "HERNANDEZ MONSEFU KEITEL MANUEL"],
  ["20204511", "HUARI VIVAR JOSE EMILIO"],
  ["20201077", "JAUREGUI SIFUENTES GABRIEL ANTONIO"],
  ["20194233", "LAURA JULCA ALEXANDER JESUS"],
  ["20201377", "MISAGEL HUASHUAYO JOSE LUIS"],
  ["20221730", "NUÑEZ DEL PRADO VEGA JOSE FRANCISCO"],
  ["20215161", "PAUCAR MONTES KRISTEL ALEXANDRA"],
  ["20183055", "PEREZ BUENDIA NATALIA MARIA"],
  ["20191668", "REVOREDO VOJVODICH GABRIEL IGNACIO"],
  ["20215303", "SAEZ OLIN GABRIEL ENRIQUE"],
  ["20235218", "SANCHEZ PALACIOS JEFFERSON ANGELO"],
  ["20212528", "SANDOVAL RAMOS GARY GABRIEL"],
  ["20235471", "ZAVALAGA TRUJILLO JESUS AUGUSTO"],
];
const TARGET_CODES = TARGET.map((t) => t[0]);

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function resolveSection(db: postgres.Sql | postgres.TransactionSql): Promise<number> {
  const rows = await db`
    select s.id
    from section s
    join course_offering co on co.id = s.course_offering_id
    join course c on c.id = co.course_id
    where s.code = '855' and upper(c.name) like '%PROPUESTA%INVESTIGAC%'`;
  if (rows.length !== 1) {
    throw new Error(`Se esperaba 1 sección 855 de PROPUESTA; encontradas: ${rows.length}`);
  }
  return rows[0].id as number;
}

async function run(db: postgres.Sql | postgres.TransactionSql) {
  const sectionId = await resolveSection(db);
  console.log(`Sección 855 → section.id = ${sectionId}\n`);

  const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, BCRYPT_COST);
  const created: string[] = [];
  const kept: string[] = [];

  // 1) Alta/asegurado de los 17 objetivo.
  for (const [code, fullName] of TARGET) {
    const email = `${code}@${EMAIL_DOMAIN}`;
    const existing = await db`select id from app_user where code = ${code}`;
    let userId: number;
    if (existing.length === 0) {
      const [u] = await db`
        insert into app_user (code, full_name, institutional_email, password_hash, token_version)
        values (${code}, ${fullName}, ${email}, ${passwordHash}, 1)
        returning id`;
      userId = u.id;
      created.push(code);
    } else {
      userId = existing[0].id;
      kept.push(code);
    }

    // student (crear si el app_user no tenía fila student)
    let studentRows = await db`select id from student where user_id = ${userId}`;
    if (studentRows.length === 0) {
      studentRows = await db`
        insert into student (user_id, career_id, curriculum_id, current_level)
        values (${userId}, ${CAREER_ID}, ${CURRICULUM_ID}, ${CURRENT_LEVEL})
        returning id`;
    }
    const studentId = studentRows[0].id as number;

    // enrollment en la sección (idempotente; reactiva si estaba withdrawn)
    await db`
      insert into enrollment (student_id, section_id, status)
      values (${studentId}, ${sectionId}, 'active')
      on conflict (student_id, section_id) do update set status = 'active'`;
  }

  // 2) Quitar de la sección a quienes NO están en la lista (solo su enrollment aquí).
  const toRemove = await db`
    select e.id as enrollment_id, au.code, au.full_name, e.status
    from enrollment e
    join student st on st.id = e.student_id
    join app_user au on au.id = st.user_id
    where e.section_id = ${sectionId}
      and au.code <> all(${TARGET_CODES})`;

  for (const r of toRemove) {
    // Limpiar hijas de ESE enrollment (no de otras secciones del alumno).
    await db`delete from section_representative where enrollment_id = ${r.enrollment_id}`;
    await db`delete from student_score where enrollment_id = ${r.enrollment_id}`;
    await db`delete from enrollment where id = ${r.enrollment_id}`;
  }

  // 3) Reporte del estado final.
  const finalRoster = await db`
    select au.code, au.full_name, e.status
    from enrollment e
    join student st on st.id = e.student_id
    join app_user au on au.id = st.user_id
    where e.section_id = ${sectionId}
    order by au.code`;

  console.log(`Creados (${created.length}):`, created.join(", ") || "—");
  console.log(`Ya existían (${kept.length}):`, kept.join(", ") || "—");
  console.log(`\nQuitados de la sección (${toRemove.length}):`);
  console.table(toRemove.map((r) => ({ code: r.code, full_name: r.full_name, status: r.status })));
  console.log(`Roster final de la sección (${finalRoster.length}):`);
  console.table(finalRoster.map((r) => ({ code: r.code, full_name: r.full_name, status: r.status })));

  if (finalRoster.length !== TARGET.length) {
    throw new Error(`El roster final tiene ${finalRoster.length}, se esperaban ${TARGET.length}`);
  }
}

try {
  if (APPLY) {
    console.log("== APLICANDO (transacción) ==\n");
    await sql.begin(async (tx) => { await run(tx); });
    console.log("\n✅ Aplicado.");
  } else {
    console.log("== DRY-RUN (rollback al final, no escribe) ==\n");
    try {
      await sql.begin(async (tx) => {
        await run(tx);
        throw new Error("__DRYRUN_ROLLBACK__");
      });
    } catch (e) {
      if ((e as Error).message !== "__DRYRUN_ROLLBACK__") throw e;
    }
    console.log("\n(DRY-RUN: nada se escribió. Correr con --apply para aplicar.)");
  }
} catch (e) {
  console.error("ERROR:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
