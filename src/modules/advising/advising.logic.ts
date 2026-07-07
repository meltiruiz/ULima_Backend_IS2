// Lógica pura del módulo de asesorías (HU18). Sin acceso a BD ni efectos:
// todo es testeable con `bun test`. Es la superficie de las pruebas de caja
// blanca (complejidad ciclomática > 4 en validateCreateAdvising) y unitarias
// (solape de horarios: antes/después/contenido/bordes) exigidas por la rúbrica.

export type AdvisingModality = "classroom" | "virtual" | "hybrid";

export type TimeRange = { start: string; end: string };

/** Minutos desde medianoche de un "HH:MM" o "HH:MM:SS". */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** Día ISO de la semana (1=Lunes … 7=Domingo) de una fecha "YYYY-MM-DD". */
export function isoDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Mediodía UTC evita que el desfase horario mueva el día.
  const js = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=Domingo … 6=Sábado
  return js === 0 ? 7 : js;
}

/** startTime estrictamente antes de endTime. */
export function isValidTimeRange(start: string, end: string): boolean {
  return toMinutes(start) < toMinutes(end);
}

/**
 * Dos rangos se solapan si empiezan antes de que el otro termine. Tocar los
 * extremos (A termina justo cuando B empieza) NO es solape.
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** Fecha ISO dentro de [inicio, fin] inclusive (comparación lexicográfica válida para YYYY-MM-DD). */
export function isDateWithinPeriod(dateStr: string, periodStart: string, periodEnd: string): boolean {
  return dateStr >= periodStart && dateStr <= periodEnd;
}

/** dateStr anterior a today (ambos "YYYY-MM-DD"). */
export function isDateInPast(dateStr: string, today: string): boolean {
  return dateStr < today;
}

/** Fecha "hoy" en Lima (UTC-5) como "YYYY-MM-DD" a partir de un instante. */
export function limaDateString(now: Date): string {
  return new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** La modalidad determina qué ubicación es obligatoria. */
export function hasRequiredLocation(
  modality: AdvisingModality,
  classroom?: string | null,
  meetingUrl?: string | null,
): boolean {
  const hasRoom = !!classroom && classroom.trim().length > 0;
  const hasUrl = !!meetingUrl && meetingUrl.trim().length > 0;
  if (modality === "classroom") return hasRoom;
  if (modality === "virtual") return hasUrl;
  return hasRoom || hasUrl; // híbrida: al menos una
}

/**
 * Regla de ciclo del JP: una persona que ya es profesor (`teacher_id`) de
 * alguna sección del período activo no puede asignarse como JP en ese período.
 */
export function jpViolatesCycleRule(jpTeacherId: number, periodSectionTeacherIds: number[]): boolean {
  return periodSectionTeacherIds.includes(jpTeacherId);
}

export type CreateAdvisingInput = {
  sessionDate: string;
  startTime: string;
  endTime: string;
  modality: AdvisingModality;
  classroom?: string | null;
  meetingUrl?: string | null;
};

/** Asesoría existente del docente contra la que se chequea solape. */
export type ExistingAdvising = {
  kind: "recurring" | "extra";
  dayOfWeek: number;
  sessionDate: string | null;
  startTime: string;
  endTime: string;
};

export type CreateValidation =
  | { status: "ok"; dayOfWeek: number }
  | { status: "invalid_time" }
  | { status: "date_in_past" }
  | { status: "date_out_of_period" }
  | { status: "missing_location" }
  | { status: "overlap" };

/**
 * Valida la creación de una asesoría extra. El orden de los chequeos fija la
 * precedencia de errores (rango → pasado → período → ubicación → solape). El
 * solape se evalúa contra las extras propias de la misma fecha y las
 * recurrentes propias del mismo día de semana.
 */
export function validateCreateAdvising(params: {
  input: CreateAdvisingInput;
  today: string;
  periodStart: string;
  periodEnd: string;
  ownExisting: ExistingAdvising[];
}): CreateValidation {
  const { input, today, periodStart, periodEnd, ownExisting } = params;

  if (!isValidTimeRange(input.startTime, input.endTime)) return { status: "invalid_time" };
  if (isDateInPast(input.sessionDate, today)) return { status: "date_in_past" };
  if (!isDateWithinPeriod(input.sessionDate, periodStart, periodEnd)) return { status: "date_out_of_period" };
  if (!hasRequiredLocation(input.modality, input.classroom, input.meetingUrl)) return { status: "missing_location" };

  const dayOfWeek = isoDayOfWeek(input.sessionDate);
  const newRange: TimeRange = { start: input.startTime, end: input.endTime };
  const overlaps = ownExisting
    .filter((e) => (e.kind === "extra" ? e.sessionDate === input.sessionDate : e.dayOfWeek === dayOfWeek))
    .some((e) => rangesOverlap(newRange, { start: e.startTime, end: e.endTime }));
  if (overlaps) return { status: "overlap" };

  return { status: "ok", dayOfWeek };
}
