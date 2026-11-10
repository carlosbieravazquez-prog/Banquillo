/* Pantallas de equipaciones e identidad visual de Banquillo. */
const ClubKitsEditor = (() => {
  const Theme=typeof ClubTheme!=="undefined"?ClubTheme:require("./club-theme.js");
  const Mockup=typeof KitMockup!=="undefined"?KitMockup:require("./kit-mockup.js");
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const parts=[["shirt","Camiseta"],["shorts","Pantalón"],["socks","Medias"]];
  function renderKits(data,prefix) {
    const kits=Theme.normalizeKits(data?.kits),change=prefix==="w"?"wKit":"setKit",toggle=prefix==="w"?"wToggleThird":"setToggleThird";
    const card=(key,title)=>{
      const k=kits[key];if(!k)return "";
      return '<article class="club-kit-set"><div class="club-kit-card-head"><h4>'+esc(title)+'</h4><span class="club-kit-hint">Vista previa</span></div>'+
        '<div class="club-kit-layout"><div class="club-kit-model">'+Mockup.render(k,title)+'</div>'+
        '<div class="club-kit-controls"><p class="muted small">Colores reales de la equipación</p>'+
        '<div class="club-kit-fields">'+parts.map(([part,label])=>'<label class="club-kit-part"><span>'+label+
          '</span><input type="color" data-chg="'+change+'" data-kit="'+key+'" data-part="'+part+
          '" value="'+esc(k[part])+'" aria-label="'+label+' · '+esc(title)+'"><small>'+esc(k[part])+'</small></label>').join("")+
        '</div><div class="club-kit-strip" aria-hidden="true">'+parts.map(([part])=>'<i style="background:'+esc(k[part])+'"></i>').join("")+'</div></div></div></article>';
    };
    return '<section class="club-kit-panel" aria-label="Equipaciones del equipo">'+
      '<div class="club-kit-head"><div><h3>Equipaciones del club</h3><p>Configura camiseta, pantalón y medias. La silueta muestra cómo combinan los tres colores, sin logos ni patrocinadores.</p></div>'+
      '<span class="club-kit-tag">Colores del uniforme</span></div>'+
      '<div class="club-kit-grid">'+card("first","1ª equipación · Principal")+card("second","2ª equipación · Alternativa")+
      (kits.third?card("third","3ª equipación · Opcional"):"")+'</div>'+
      '<button type="button" class="club-kit-add" data-act="'+toggle+'">'+
      (kits.third?"− Quitar tercera equipación":"＋ Añadir tercera equipación (opcional)")+'</button></section>';
  }
  function renderPalette(data,prefix){
    const palette=Theme.cleanPalette(data?.palette),kits=Theme.normalizeKits(data?.kits);
    const select=prefix==="w"?"wPalettePreset":"setPalettePreset";
    const choose=prefix==="w"?"wPaletteChoice":"setPaletteChoice";
    const isAuto=palette.mode==="auto";
    const sample=Theme.derive(kits,palette).light;
    const option=(mode,title,desc)=>{
      const selected=mode==="auto"?isAuto:!isAuto;
      return '<button type="button" data-act="'+choose+'" data-mode="'+mode+'" aria-pressed="'+selected+
        '" class="club-theme-option'+(selected?" selected":"")+'"><span class="club-theme-option-check" aria-hidden="true">'+
        (selected?"✓":"○")+'</span><span><strong>'+title+'</strong><small>'+desc+'</small></span></button>';
    };
    const preset= !isAuto?'<label class="fld club-theme-preset"><span>Elige una paleta profesional</span><select class="sel" data-chg="'+select+'">'+
       Object.entries(Theme.presets).map(([id,p])=>'<option value="'+esc(id)+'"'+(palette.preset===id?" selected":"")+'>'+esc(p.name)+'</option>').join("")+
       '</select></label>':"";
    return '<section class="club-kit-panel club-theme-panel" aria-label="Identidad visual de Banquillo">'+
      '<div class="club-kit-head"><div><h3>Identidad visual</h3><p>Elige cómo quieres ver Banquillo. No se copiarán los colores fluorescentes literalmente.</p></div>'+
      '<span class="club-kit-tag">Estilo de la web</span></div>'+
      '<div class="club-theme-options">'+option("auto","Automática","Una paleta sobria inspirada en la primera equipación.")+
      option("preset","Profesional","Elige entre ocho combinaciones elegantes y equilibradas.")+'</div>'+preset+
      (palette.mode==="custom"?'<p class="muted small">Tienes colores personalizados guardados de una versión anterior. Para cambiarlos, elige uno de los dos estilos.</p>':"")+
      '<div class="club-theme-preview" aria-label="Vista previa de la web">'+
      '<div class="club-theme-preview-nav" style="background:'+esc(sample["--brand"])+'"><span class="club-theme-preview-logo">B</span><strong>'+esc(data?.club||"Mi club")+'</strong><span class="club-theme-preview-small">Banquillo</span></div>'+
      '<div class="club-theme-preview-body"><div><strong>Panel del equipo</strong><p>Organización de la temporada</p></div>'+
      '<div class="club-theme-preview-tile"><span>Próximo partido</span><b>Jornada 1 · Preparación</b></div>'+
      '<div class="club-theme-preview-actions"><span style="background:'+esc(sample["--accent"])+';color:'+esc(sample["--accent-ink"])+'">Ver plantilla</span><span class="club-theme-preview-secondary">Calendario</span></div></div></div>'+
      '<p class="club-kit-note">Los colores de la camiseta no cambiarán. Solo cambia el estilo visual de Banquillo.</p></section>';
  }
  const render=(data,prefix)=>renderKits(data,prefix)+renderPalette(data,prefix);
  return {render,renderKits,renderPalette};
})();
if(typeof module!=="undefined")module.exports=ClubKitsEditor;
