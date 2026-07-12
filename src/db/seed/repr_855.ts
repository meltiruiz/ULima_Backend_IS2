// Seed — representantes de la sección 855 de PROPUESTA DE INVESTIGACIÓN (section.id 5).
//   Delegado:    SANCHEZ PALACIOS JEFFERSON ANGELO (20235218)  [ya existía]
//   Subdelegado: ZAVALAGA TRUJILLO JESUS AUGUSTO   (20235471)
//
//   bun run src/db/seed/repr_855.ts           # DRY-RUN (rollback, no escribe)
//   bun run src/db/seed/repr_855.ts --apply   # aplica en UNA transacción
//
// Idempotente: un solo delegado y un solo subdelegado ACTIVO por sección
// (índice uq_active_section_representative_position). Reasigna desactivando al
// anterior si hiciera falta; `enrollment_id` es único en section_representative.
import "dotenv/config";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const SECTION_CODE = "855";
const ASSIGN: Array<{ code: string; position: "delegate" | "subdelegate" }> = [
  { code: "20235218", position: "delegate" },
  { code: "20235471", position: "subdelegate" },
];

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function run(db: postgres.TransactionSql) {
  const [sec] = await db`
    select s.id from section s
    join course_offering co on co.id = s.course_offering_id
    join course c on c.id = co.course_id
    where s.code = ${SECTION_CODE} and upper(c.name) like '%PROPUESTA%INVESTIGAC%'`;
  if (!sec) throw new Error(`No se encontró la sección ${SECTION_CODE} de PROPUESTA`);
  const sectionId = sec.id as number;
  console.log(`Sección ${SECTION_CODE} → section.id = ${sectionId}\n`);

  for (const { code, position } of ASSIGN) {
    const [enr] = await db`
      select e.id as enrollment_id, au.full_name
      from enrollment e
      join student st on st.id = e.student_id
      join app_user au on au.id = st.user_id
      where e.section_id = ${sectionId} and au.code = ${code}`;
    if (!enr) throw new Error(`El alumno ${code} no está matriculado en la sección ${sectionId}`);

    // Desactivar cualquier otro representante ACTIVO de esa posición (distinto enrollment).
    await db`
      update section_representative
      set is_active = false
      where section_id = ${sectionId} and position = ${position}
        and is_active = true and enrollment_id <> ${enr.enrollment_id}`;

    // Upsert del representante (enrollment_id es único).
    await db`
      insert into section_representative (section_id, enrollment_id, position, is_active)
      values (${sectionId}, ${enr.enrollment_id}, ${position}, true)
      on conflict (enrollment_id)
        do update set position = excluded.position, is_active = true`;

    console.log(`  ${position.padEnd(11)} → ${code}  ${enr.full_name}`);
  }

  console.log(`\nRepresentantes ACTIVOS de la sección ${sectionId}:`);
  const reps = await db`
    select sr.position, au.code, au.full_name, sr.is_active
    from section_representative sr
    join enrollment e on e.id = sr.enrollment_id
    join student st on st.id = e.student_id
    join app_user au on au.id = st.user_id
    where sr.section_id = ${sectionId} and sr.is_active = true
    order by sr.position`;
  console.table(reps.map((r) => ({ position: r.position, code: r.code, full_name: r.full_name })));
}

try {
  if (APPLY) {
    console.log("== APLICANDO (transacción) ==\n");
    await sql.begin((tx) => run(tx));
    console.log("\n✅ Aplicado.");
  } else {
    console.log("== DRY-RUN (rollback, no escribe) ==\n");
    try {
      await sql.begin(async (tx) => { await run(tx); throw new Error("__DRYRUN__"); });
    } catch (e) {
      if ((e as Error).message !== "__DRYRUN__") throw e;
    }
    console.log("\n(DRY-RUN: nada se escribió. Correr con --apply.)");
  }
} catch (e) {
  console.error("ERROR:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
