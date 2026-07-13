// Seed — NOTAS OFICIALES (student_score) de la sección 855 "PROPUESTA DE
// INVESTIGACIÓN" (section.id = 5), con escenarios realistas para la demo.
//
// Human-gated: correr con datos móviles (el wifi de la ULima bloquea el 5432) y
// con backup previo (pg_dump de student_score).
//
//   bun run src/db/seed/notas_855.ts           # DRY-RUN: imprime el plan, no escribe
//   bun run src/db/seed/notas_855.ts --apply   # aplica en UNA transacción
//
// Contexto (semana 15): SOLO las evaluaciones de la semana 1..14 están
// publicadas por el profesor. La sección 855 tiene:
//   EV01 (semana 6,  peso 20%)  → publicada
//   EV02 (semana 11, peso 30%)  → publicada
//   EV03 (semana 15, peso 50%)  → NO publicada (se deja sin nota)
//
// Regla de la nota final (igual que el cliente): final = Σ(value·peso/100),
// contando lo no calificado como 0. Un alumno es CRÍTICO si, para llegar a la
// nota aprobatoria (10.5), necesitaría MÁS DE 15 en el peso restante (EV03).
import "dotenv/config";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const PASSING = 10.5;
const CRITICAL_REQUIRED = 15;

// code → [nota EV01, nota EV02].  0 = no se presentó / faltó a esa evaluación.
// Distribución pensada para cubrir: excelentes, buenos, regulares, en riesgo y
// críticos (incluidos algunos que "faltaron").
const NOTAS: Record<string, [number, number]> = {
  "20193755": [18, 17], // ALARCON      — excelente
  "20220208": [16, 18], // ARVORCO      — excelente
  "20200781": [15, 16], // FERNANDEZ    — bueno
  "20211088": [14, 15], // GARCIA       — bueno
  "20231396": [16, 13], // HERNANDEZ    — bueno
  "20204511": [13, 14], // HUARI        — regular
  "20201077": [12, 13], // JAUREGUI     — regular
  "20194233": [13, 11], // LAURA        — regular
  "20201377": [11, 12], // MISAGEL      — regular
  "20221730": [5, 6],   // NUÑEZ        — CRÍTICO
  "20215161": [10, 10], // PAUCAR       — en riesgo (no crítico)
  "20183055": [9, 10],  // PEREZ        — en riesgo (no crítico)
  "20191668": [6, 5],   // REVOREDO     — CRÍTICO
  "20215303": [4, 5],   // SAEZ         — CRÍTICO
  "20235218": [15, 14], // SANCHEZ (Jeff) — bueno
  "20212528": [8, 0],   // SANDOVAL     — CRÍTICO (faltó EV02)
  "20235471": [13, 12], // ZAVALAGA (subdelegado) — regular
};

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

/** Nota requerida en el peso restante para alcanzar la aprobatoria. */
function requiredOnRemaining(gradedWeight: number, weightedSum: number, totalWeight: number): number {
  const remaining = totalWeight - gradedWeight;
  if (remaining <= 0) return 0;
  return (PASSING * totalWeight - weightedSum) / remaining;
}

async function run(db: postgres.Sql | postgres.TransactionSql) {
  // 1) Resolver la sección y su offering.
  const [sec] = await db`
    select s.id as section_id, s.course_offering_id, c.name as course_name
    from section s
    join course_offering co on co.id = s.course_offering_id
    join course c on c.id = co.course_id
    where s.code = '855' and upper(c.name) like '%PROPUESTA%INVESTIGAC%'`;
  if (!sec) throw new Error("No se encontró la sección 855 de PROPUESTA");
  console.log(`Sección 855 → section.id = ${sec.section_id} (${sec.course_name})\n`);

  // 2) Resolver evaluaciones por código dentro del offering (robusto a cambios de id).
  const assessments = await db`
    select a.id, a.code, a.week_number, a.weight
    from assessment a
    join syllabus sy on sy.id = a.syllabus_id
    where sy.course_offering_id = ${sec.course_offering_id}
    order by a.week_number`;
  const byCode = new Map(assessments.map((a) => [a.code as string, a]));
  const ev01 = byCode.get("EV01");
  const ev02 = byCode.get("EV02");
  const ev03 = byCode.get("EV03");
  if (!ev01 || !ev02) throw new Error("Faltan EV01/EV02 en el sílabo de la 855");
  const totalWeight = assessments.reduce((t, a) => t + Number(a.weight), 0);
  console.log(`Evaluaciones: EV01(sem ${ev01.week_number}, ${ev01.weight}%), EV02(sem ${ev02.week_number}, ${ev02.weight}%)` +
    (ev03 ? `, EV03(sem ${ev03.week_number}, ${ev03.weight}%) → se deja SIN nota` : "") + `\n`);

  // 3) Matrículas activas por código.
  const enrollments = await db`
    select e.id as enrollment_id, au.code, au.full_name
    from enrollment e
    join student st on st.id = e.student_id
    join app_user au on au.id = st.user_id
    where e.section_id = ${sec.section_id} and e.status = 'active'`;
  const enrByCode = new Map(enrollments.map((e) => [e.code as string, e]));

  const report: Array<Record<string, unknown>> = [];
  let escritos = 0;

  for (const [code, [n1, n2]] of Object.entries(NOTAS)) {
    const enr = enrByCode.get(code);
    if (!enr) {
      console.warn(`⚠ Sin matrícula activa en 855 para ${code} — se omite`);
      continue;
    }
    // Upsert EV01 y EV02 (idempotente por unique (enrollment, assessment)).
    for (const [assess, value] of [[ev01, n1], [ev02, n2]] as const) {
      await db`
        insert into student_score (enrollment_id, assessment_id, value)
        values (${enr.enrollment_id}, ${assess.id}, ${value})
        on conflict (enrollment_id, assessment_id) do update set value = ${value}`;
      escritos++;
    }
    // EV03 (semana 15) NO publicada: borrar cualquier nota que existiera.
    if (ev03) {
      await db`delete from student_score where enrollment_id = ${enr.enrollment_id} and assessment_id = ${ev03.id}`;
    }

    const gradedWeight = Number(ev01.weight) + Number(ev02.weight);
    const weightedSum = n1 * Number(ev01.weight) + n2 * Number(ev02.weight);
    const finalParcial = weightedSum / 100; // EV03 = 0
    const req = requiredOnRemaining(gradedWeight, weightedSum, totalWeight);
    report.push({
      code,
      alumno: (enr.full_name as string).split(" ").slice(0, 2).join(" "),
      EV01: n1,
      EV02: n2,
      "final(EV03=0)": finalParcial.toFixed(2),
      "req.EV03→aprobar": req.toFixed(1),
      critico: req > CRITICAL_REQUIRED ? "🔴 SÍ" : "",
    });
  }

  console.log(`student_score escritos/actualizados: ${escritos} (EV01+EV02 × alumnos)\n`);
  console.table(report);
  const criticos = report.filter((r) => r.critico).length;
  console.log(`\nAlumnos CRÍTICOS (necesitan > ${CRITICAL_REQUIRED} en EV03 para aprobar): ${criticos}`);
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
