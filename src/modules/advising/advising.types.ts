import type { AdvisingModality } from "./advising.logic.js";

/** Etiqueta del docente respecto de una sección: profesor titular o JP. */
export type DictanteRol = "Profesor" | "JP";

/** Sección donde el docente dicta (para el formulario de creación). */
export type TeacherSection = {
  sectionId: number;
  courseOfferingId: number;
  courseName: string;
  sectionCode: string;
  rol: DictanteRol;
};

/** Vista de una asesoría para el docente (recurrente o extra). */
export type AdvisingSessionView = {
  id: number;
  sectionId: number | null;
  courseOfferingId: number;
  courseName: string;
  sectionCode: string | null;
  kind: "recurring" | "extra";
  dia: string;
  fecha: string | null;
  inicio: string;
  fin: string;
  modality: AdvisingModality;
  aula: string;
  zoom: string;
  nota: string;
  cupo: number | null;
  asistentes: number;
  rol: DictanteRol;
};

export type Attendee = {
  code: string;
  firstName: string;
  lastName: string;
};

export type ActivePeriod = {
  id: number;
  startDate: string;
  endDate: string;
};
