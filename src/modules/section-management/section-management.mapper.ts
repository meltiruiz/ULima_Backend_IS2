import type {
  AnnouncementResponse,
  AnnouncementRow,
  RepresentativePosition,
} from "./section-management.types.js";

const splitName = (fullName: string) => {
  if (fullName.includes(",")) {
    const parts = fullName.split(",");
    return {
      lastName: parts[0].trim(),
      firstName: parts.slice(1).join(",").trim(),
    };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 2) {
    return {
      lastName: parts.slice(0, 2).join(" "),
      firstName: parts.slice(2).join(" "),
    };
  }
  if (parts.length === 2) {
    return {
      lastName: parts[0],
      firstName: parts[1],
    };
  }

  return {
    firstName: fullName,
    lastName: "",
  };
};

const formatDate = (value: Date | string | null) => {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
};

export const mapRepresentativePositionToLabel = (position: RepresentativePosition) =>
  position === "subdelegate" ? "subdelegado" : "delegado";

export const mapAnnouncementRowToResponse = (
  row: AnnouncementRow,
): AnnouncementResponse => {
  const role = mapRepresentativePositionToLabel(row.position);
  return {
    id: String(row.id),
    idSeccion: String(row.section_id),
    titulo: row.title,
    mensaje: row.message,
    fecha: formatDate(row.published_at),
    autorCode: row.autor_code,
    autor: {
      code: row.autor_code,
      ...splitName(row.full_name),
      email: row.institutional_email,
      role,
      career_id: null,
      currentCycle: "2026-1",
      setupComplete: true,
    },
  };
};
