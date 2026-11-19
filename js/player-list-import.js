/* Importación de plantillas pegadas: nombres y dorsales por separado. */
const PlayerListImport = (() => {
  const cleanName = value => String(value || "")
    .replace(/(?:\*\*|__)/g, "")
    .replace(/\s+/gu, " ")
    .replace(/^\s*[-–—•*]+\s*/u, "")
    .trim();

  function parseLine(line) {
    let raw = String(line || "").replace(/\u00a0/g, " ").trim();
    if (!raw) return null;

    // Viñetas de Markdown o texto copiado de otras aplicaciones.
    raw = raw.replace(/^(?:[-*•●▪]\s+)+/u, "").trim();
    raw = raw.replace(/\*\*|__/gu, "").trim();
    if (!raw) return null;

    // Prioridad al dorsal final: "Nombre – 10", "Nombre - #10",
    // "Nombre (10)" o "Nombre 10". Si hay numeración de lista, no es dorsal.
    const end = raw.match(/^(.+?)(?:\s*[-–—:|]\s*|\s+\(\s*|\s+)#?(\d{1,2})\s*\)?$/u);
    if (end) {
      const name = cleanName(end[1].replace(/^\d{1,3}[.)]\s+/u, ""));
      if (name) return {name, dorsal: Number(end[2])};
    }

    // Compatibilidad con formatos existentes: "10 – Nombre",
    // "- **12** – Nombre", "9. Nombre".
    const start = raw.match(/^#?(\d{1,2})(?:\s*[-–—.:)]\s*|\s+)(.+)$/u);
    if (start) {
      const name = cleanName(start[2]);
      if (name) return {name, dorsal: Number(start[1])};
    }

    // Solo nombre, sin dorsal; nunca se guarda el separador como parte del nombre.
    const name = cleanName(raw.replace(/^\d{1,3}[.)]\s+/u, ""));
    return name ? {name, dorsal:null} : null;
  }

  const parseList = text => String(text || "").split(/\r?\n/u)
    .map(parseLine).filter(Boolean);

  return {parseLine, parseList};
})();
if (typeof module !== "undefined") module.exports = PlayerListImport;
