import type { ChatbotIntent, ChatbotMessageRow } from "./chatbot.types.js";

const SYSTEM_PROMPT = `Eres ULimaBot, un asistente academico personal para estudiantes de la
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

8. Usa bullet points o formato breve cuando listes informacion.`;

export function buildContext(params: {
  studentName: string;
  careerName: string;
  currentLevel: number | null;
  history: ChatbotMessageRow[];
  intents: ChatbotIntent[];
  scheduleData?: unknown;
  curriculumData?: unknown;
  alertsData?: unknown;
  announcementsData?: unknown;
  classmatesData?: unknown;
  chatSearchResults?: unknown;
  localGrades?: unknown;
  question: string;
}): { preamble: string; message: string } {
  const blocks: string[] = [];

  blocks.push(`PERFIL DEL ALUMNO:`);
  blocks.push(`- Nombre: ${params.studentName}`);
  blocks.push(`- Carrera: ${params.careerName}`);
  if (params.currentLevel != null) {
    blocks.push(`- Ciclo actual: ${params.currentLevel}`);
  }

  if (params.history.length > 0) {
    const recent = params.history.slice(-10);
    blocks.push(`\nHISTORIAL DE LA CONVERSACION (ultimos mensajes):`);
    for (const msg of recent) {
      const role = msg.role === "user" ? "Alumno" : "ULimaBot";
      blocks.push(`${role}: ${msg.content}`);
    }
  }

  if (params.intents.includes("schedule") && params.scheduleData) {
    blocks.push(`\nDATOS DE HORARIO Y EVALUACIONES:`);
    blocks.push(JSON.stringify(params.scheduleData, null, 2));
  }

  if (params.intents.includes("curriculum") && params.curriculumData) {
    blocks.push(`\nDATOS DE MALLA CURRICULAR:`);
    blocks.push(JSON.stringify(params.curriculumData, null, 2));
  }

  if (params.intents.includes("alerts") && params.alertsData) {
    blocks.push(`\nDATOS DE ALERTAS:`);
    blocks.push(JSON.stringify(params.alertsData, null, 2));
  }

  if (params.intents.includes("announcements") && params.announcementsData) {
    blocks.push(`\nDATOS DE ANUNCIOS:`);
    blocks.push(JSON.stringify(params.announcementsData, null, 2));
  }

  if (params.intents.includes("classmates") && params.classmatesData) {
    blocks.push(`\nDATOS DE COMPANEROS:`);
    blocks.push(JSON.stringify(params.classmatesData, null, 2));
  }

  if (params.intents.includes("grades") && params.localGrades) {
    blocks.push(`\nDATOS DE NOTAS PERSONALES:`);
    blocks.push(JSON.stringify(params.localGrades, null, 2));
  }

  if (params.intents.includes("chat") && params.chatSearchResults) {
    blocks.push(`\nRESULTADOS DE BUSQUEDA EN CHATS DE SECCION:`);
    blocks.push(JSON.stringify(params.chatSearchResults, null, 2));
  }

  blocks.push(`\nPREGUNTA DEL ALUMNO:`);
  blocks.push(params.question);

  return {
    preamble: SYSTEM_PROMPT,
    message: blocks.join("\n"),
  };
}
