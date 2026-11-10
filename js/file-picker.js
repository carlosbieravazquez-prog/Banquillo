/* Selector visual compartido. Mantiene el <input type=file> nativo y sus validaciones. */
const FilePicker = (() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const render = ({title="Seleccionar archivo",formats="",help="Pulsa aquí para elegir un archivo",
    icon="📎",accept="",change="",inputId="",label="Seleccionar archivo"} = {}) => `
    <div class="file-picker" data-file-picker>
      <div class="file-picker-head"><span class="file-picker-title">${esc(title)}</span>${formats ? '<span class="file-picker-format">'+esc(formats)+'</span>' : ""}</div>
      <label class="file-picker-drop">
        <input class="file-picker-input" type="file" data-file-picker-input${inputId ? ' id="'+esc(inputId)+'"' : ""}${change ? ' data-chg="'+esc(change)+'"' : ""} accept="${esc(accept)}" aria-label="${esc(title)}">
        <span class="file-picker-symbol" aria-hidden="true">${esc(icon)}</span>
        <span class="file-picker-copy"><strong>Arrastra un archivo o selecciónalo</strong><small>${esc(help)}</small>
        <span class="file-picker-name" data-file-name aria-live="polite">Ningún archivo seleccionado</span></span>
        <span class="file-picker-button" aria-hidden="true">${esc(label)}</span>
      </label>
    </div>`;
  const filename = input => {
    const box = input.closest("[data-file-picker]");
    if (!box) return;
    const file = input.files && input.files[0];
    const el = box.querySelector("[data-file-name]");
    if (el) el.textContent = file ? file.name + " · " + (file.size >= 1024*1024 ?
      (file.size / (1024*1024)).toFixed(1)+" MB" : Math.max(1,Math.ceil(file.size / 1024))+" KB") : "Ningún archivo seleccionado";
    box.classList.toggle("has-file", !!file);
  };
  if (typeof document !== "undefined") {
    document.addEventListener("change",e=>{
      if (e.target.matches?.("input[data-file-picker-input]")) filename(e.target);
    },true);
    document.addEventListener("dragover",e=>{
      const zone=e.target.closest?.(".file-picker-drop");
      if(!zone)return;
      e.preventDefault();e.dataTransfer.dropEffect="copy";
      zone.classList.add("is-dragover");
    });
    document.addEventListener("dragleave",e=>{
      const zone=e.target.closest?.(".file-picker-drop");
      if(zone && !zone.contains(e.relatedTarget))zone.classList.remove("is-dragover");
    });
    document.addEventListener("drop",e=>{
      const zone=e.target.closest?.(".file-picker-drop");
      if(!zone)return;
      e.preventDefault();zone.classList.remove("is-dragover");
      const input=zone.querySelector("input[data-file-picker-input]");
      if(!input || input.disabled || !e.dataTransfer.files.length)return;
      try {
        input.files=e.dataTransfer.files;
        input.dispatchEvent(new Event("change",{bubbles:true}));
      } catch(err) {
        // El selector nativo sigue funcionando si el navegador no permite soltar archivos.
        console.warn("El navegador no admite soltar archivos en este selector.");
      }
    });
  }
  return {render};
})();
if (typeof module !== "undefined") module.exports=FilePicker;
