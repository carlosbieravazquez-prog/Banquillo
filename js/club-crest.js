/* Escudo por temporada: se reduce en el navegador, sin subirlo a servicios externos. */
const ClubCrest = (() => {
  const MAX_FILE = 3 * 1024 * 1024, MAX_DATA = 75000;
  const clean = value => {
    const s = String(value || "");
    return s.length <= MAX_DATA && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(s) ? s : "";
  };
  const current = season => clean(season && season.settings && season.settings.crest);
  const preview = (data, alt = "Escudo del equipo") => {
    const src = clean(data);
    return src ? '<img src="' + src + '" alt="' + alt + '" class="club-crest" width="64" height="64">' : "";
  };
  const upload = async file => {
    if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_FILE || file.size === 0)
      throw new Error("Utiliza PNG, JPG o WebP de hasta 3 MB.");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("No se ha podido leer la imagen."));
        img.src = url;
      });
      if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth > 5000 || img.naturalHeight > 5000)
        throw new Error("Las dimensiones del escudo no son válidas.");
      const size = 220, ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Tu navegador no puede procesar imágenes.");
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, (size - img.naturalWidth * ratio) / 2, (size - img.naturalHeight * ratio) / 2,
        img.naturalWidth * ratio, img.naturalHeight * ratio);
      const data = canvas.toDataURL("image/png");
      if (!clean(data)) throw new Error("El escudo es demasiado complejo. Usa un PNG más sencillo.");
      return data;
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const addToPdf = (doc, season, x, y, width, height) => {
    const data = current(season);
    if (!data) return false;
    try { doc.addImage(data, "PNG", x, y, width, height, undefined, "FAST"); return true; }
    catch (err) { console.warn("No se pudo incluir el escudo en el PDF."); return false; }
  };
  return { clean, current, preview, upload, addToPdf };
})();
if (typeof module !== "undefined") module.exports = ClubCrest;
