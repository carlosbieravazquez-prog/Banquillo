/* Editor visible de equipaciones y de las paletas elegantes por club. */
const ClubKitsEditor=(()=>{
  const escape=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const parts=[["shirt","Camiseta"],["shorts","Pantalón"],["socks","Medias"]];
  const render=(data,prefix)=>{
    const kits=ClubTheme.normalizeKits(data.kits),palette=ClubTheme.cleanPalette(data.palette);
    const changeKit=prefix==="w"?"wKit":"setKit";
    const changeMode=prefix==="w"?"wPaletteMode":"setPaletteMode";
    const changePreset=prefix==="w"?"wPalettePreset":"setPalettePreset";
    const changeCustom=prefix==="w"?"wPaletteCustom":"setPaletteCustom";
    const toggle=prefix==="w"?"wToggleThird":"setToggleThird";
    const kitCard=(key,title)=>{
      const k=kits[key];
      if(!k)return "";
      return '<div class="club-kit-set"><h4>'+escape(title)+'</h4>'+
        '<div class="club-kit-strip">'+parts.map(p=>'<i style="background:'+escape(k[p[0]])+'"></i>').join("")+'</div>'+
        '<div class="club-kit-fields">'+parts.map(([part,label])=>'<label class="club-kit-part"><span>'+label+
          '</span><input type="color" data-chg="'+changeKit+'" data-kit="'+key+'" data-part="'+part+
          '" value="'+escape(k[part])+'" aria-label="'+label+' · '+escape(title)+'"><small>'+escape(k[part])+'</small></label>').join("")+
        '</div></div>';
    };
    const sample=ClubTheme.derive(kits,palette).light;
    const options=[["auto","Automática · Según la primera equipación"],
      ["preset","Elegir una paleta profesional"],["custom","Personalizar los colores de referencia"]];
    let extra="";
    if(palette.mode==="preset"){
      extra='<label class="fld"><span>Paleta</span><select class="sel" data-chg="'+changePreset+'">'+
        Object.entries(ClubTheme.presets).map(([id,item])=>'<option value="'+escape(id)+'"'+
          (palette.preset===id?' selected':'')+'>'+escape(item.name)+'</option>').join("")+
        '</select></label>';
    }
    if(palette.mode==="custom"){
      extra='<div class="club-kit-palette-grid">'+
        [['customPrimary','Color principal de referencia'],['customAccent','Color de apoyo']].map(([k,label])=>
          '<label class="club-kit-part"><span>'+label+'</span><input type="color" data-chg="'+changeCustom+
          '" data-part="'+k+'" value="'+escape(palette[k])+'"></label>').join("")+
        '</div>';
    }
    return '<section class="club-kit-panel" aria-label="Colores de las equipaciones y del club">'+
      '<div class="club-kit-head"><div><h3>🎨 Colores de las equipaciones</h3>'+
      '<p>Elige los colores del uniforme. La primera equipación ayudará a crear una identidad visual elegante para Banquillo.</p></div>'+
      '<span class="club-kit-tag">Personaliza tu equipo</span></div>'+
      '<div class="club-kit-grid">'+kitCard("first","1ª equipación · Principal")+
      kitCard("second","2ª equipación · Alternativa")+
      (kits.third?kitCard("third","3ª equipación · Opcional"):"")+'</div>'+
      '<button type="button" class="club-kit-add" data-act="'+toggle+'">'+
      (kits.third?"− Quitar tercera equipación":"＋ Añadir tercera equipación (opcional)")+'</button>'+
      '<div class="club-kit-palette"><h4>Paleta de Banquillo</h4>'+
      '<p class="muted small">No usaremos colores fluorescentes directamente. Transformamos tus colores en tonos sobrios, con buen contraste y fondos neutros.</p>'+
      '<label class="fld"><span>Estilo de la interfaz</span><select class="sel" data-chg="'+changeMode+'">'+
      options.map(([id,label])=>'<option value="'+id+'"'+(palette.mode===id?' selected':'')+'>'+label+'</option>').join("")+
      '</select></label>'+extra+
      '<div class="club-kit-sample"><div class="club-kit-sample-top" style="background:'+escape(sample["--brand"])+
      '">Vista previa · '+escape(data.club||"Tu club")+'</div>'+
      '<div class="club-kit-sample-inner"><span class="club-kit-sample-pill" style="background:'+escape(sample["--accent"])+
      ';color:#fff">Botón principal</span><small>Paleta equilibrada · Los colores exactos de la equipación se mantienen</small></div></div>'+
      '<p class="club-kit-note">La paleta se aplicará al guardar los ajustes o al crear la temporada. Puedes cambiarla cuando quieras.</p></div></section>';
  };
  return {render};
})();
if(typeof module!=="undefined")module.exports=ClubKitsEditor;
