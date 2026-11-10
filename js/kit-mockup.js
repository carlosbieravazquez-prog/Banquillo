/* Uniforme ilustrativo SVG vectorial: camiseta, pantalón y medias; sin marcas ni escudos. */
const KitMockup = (() => {
 const Theme = typeof ClubTheme !== "undefined" ? ClubTheme : require("./club-theme.js");
 const render = (kit, description = "Vista previa de la equipación") => {
  const k = Theme.normalizeKits({first:kit}).first;
  const safeLabel = String(description).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  return '<svg xmlns="http://www.w3.org/2000/svg" class="kit-mockup" viewBox="0 0 240 380" role="img" aria-label="'+safeLabel+'">'+
   '<defs><linearGradient id="kit-light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".19"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>'+
   // Camiseta y mangas, con cuello limpio y sin estampados ni patrocinadores
   '<path d="M77 33 L96 22 Q120 33 144 22 L163 33 190 47 213 91 181 105 165 78 164 207 76 207 75 78 59 105 27 91 50 47 Z" fill="'+k.shirt+'" stroke="#8393a5" stroke-width="1.8" stroke-linejoin="round"/>'+
   '<path d="M77 33 L96 22 Q120 33 144 22 L163 33 190 47 213 91 181 105 165 78 164 207 76 207 75 78 59 105 27 91 50 47 Z" fill="url(#kit-light)"/>'+
   '<path d="M100 24 Q120 42 140 24" fill="none" stroke="#c8d2dd" stroke-width="5" stroke-linecap="round"/>'+
   '<path d="M76 204 H164 M32 89 L62 100 M178 100 L208 89" fill="none" stroke="#fff" stroke-opacity=".36" stroke-width="3"/>'+
   '<path d="M76 65 L76 198 M164 65 L164 198" stroke="#000" stroke-opacity=".06" stroke-width="4"/>'+
   // Pantalón corto deportivo con dos perneras diferenciadas
   '<path d="M77 217 L163 217 177 279 127 279 119 250 111 279 63 279 Z" fill="'+k.shorts+'" stroke="#8393a5" stroke-width="1.8" stroke-linejoin="round"/>'+
   '<path d="M77 217 L163 217 177 279 127 279 119 250 111 279 63 279 Z" fill="url(#kit-light)"/>'+
   '<path d="M79 225 H161 M66 271 H107 M131 271 H173" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="3"/>'+
   // Medias altas, ligeramente curvadas. El fondo del SVG es transparente.
   '<path d="M72 290 H107 L105 339 111 354 Q108 363 94 361 L73 356 69 343 Z" fill="'+k.socks+'" stroke="#8393a5" stroke-width="1.8" stroke-linejoin="round"/>'+
   '<path d="M133 290 H168 L171 343 167 356 146 361 Q132 363 129 354 L135 339 Z" fill="'+k.socks+'" stroke="#8393a5" stroke-width="1.8" stroke-linejoin="round"/>'+
   '<path d="M74 298 H106 M135 298 H167 M73 307 H106 M135 307 H168" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="3"/>'+
   '<path d="M72 290 H107 L105 339 111 354 Q108 363 94 361 L73 356 69 343 Z M133 290 H168 L171 343 167 356 146 361 Q132 363 129 354 L135 339 Z" fill="url(#kit-light)"/>'+
   '</svg>';
 };
 return {render};
})();
if(typeof module!=="undefined") module.exports=KitMockup;
