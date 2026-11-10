/* Selector de prefijos con búsqueda y banderas.
   Número obligatorio en formulario Beta, NO almacenado ni verificado por SMS. */
const PhoneCountry=(()=>{
 const DATA="AF:93 AL:355 DE:49 AO:244 AI:1264 AG:1268 SA:966 DZ:213 AR:54 AM:374 AW:297 AU:61 AT:43 AZ:994 BS:1242 BD:880 BB:1246 BH:973 BZ:501 BJ:229 BM:1441 BY:375 BO:591 BA:387 BW:267 BR:55 BN:673 BG:359 BF:226 BI:257 BT:975 BE:32 CV:238 KH:855 CM:237 CA:1 QA:974 TD:235 CZ:420 CL:56 CN:86 CY:357 CO:57 KM:269 CG:242 KP:850 KR:82 CR:506 HR:385 CU:53 CI:225 DK:45 DM:1767 EC:593 EG:20 SV:503 AE:971 ER:291 SK:421 SI:386 ES:34 US:1 EE:372 SZ:268 ET:251 PH:63 FI:358 FJ:679 FR:33 GA:241 GM:220 GE:995 GH:233 GI:350 GD:1473 GR:30 GL:299 GP:590 GU:1671 GT:502 GF:594 GG:44 GN:224 GQ:240 GW:245 GY:592 HT:509 HN:504 HU:36 IN:91 ID:62 IQ:964 IE:353 IR:98 NF:672 IM:44 CX:61 IS:354 KY:1345 CC:61 CK:682 FO:298 GS:500 FK:500 MP:1670 MH:692 PN:64 SB:677 IL:972 IT:39 JM:1876 JP:81 JE:44 JO:962 KZ:7 KE:254 KG:996 KI:686 KW:965 LA:856 LS:266 LV:371 LR:231 LY:218 LI:423 LT:370 LU:352 LB:961 MK:389 MG:261 MY:60 MW:265 MV:960 ML:223 MT:356 MA:212 MQ:596 MU:230 MR:222 YT:262 FM:691 MD:373 MN:976 MS:1664 MZ:258 MX:52 MC:377 NA:264 NR:674 NP:977 NI:505 NG:234 NU:683 NO:47 NC:687 NZ:64 NE:227 OM:968 PK:92 PW:680 PA:507 PG:675 PY:595 NL:31 PE:51 PF:689 PL:48 PT:351 PR:1787 HK:852 MO:853 GB:44 CF:236 CD:243 DO:1809 RE:262 RW:250 RO:40 RU:7 WS:685 AS:1684 KN:1869 SM:378 PM:508 VC:1784 SH:290 LC:1758 ST:239 SN:221 RS:381 SC:248 SL:232 SG:65 SY:963 SO:252 LK:94 ZA:27 SD:249 SS:211 SE:46 CH:41 SR:597 SJ:4779 EH:212 TH:66 TW:886 TZ:255 TJ:992 IO:246 TL:670 TG:228 TK:690 TO:676 TT:1868 TM:993 TR:90 TV:688 TN:216 UA:380 UG:256 UY:598 UZ:998 VU:678 VE:58 VN:84 WF:681 YE:967 DJ:253 ZM:260 ZW:263 XK:383";
 const display=new Intl.DisplayNames(["es"],{type:"region"});
 const flag=iso=>String.fromCodePoint(...[...iso.toUpperCase()].map(ch=>127397+ch.charCodeAt(0)));
 const countries=DATA.split(" ").map(pair=>{
   const [iso,dial]=pair.split(":");
   return {iso,dial:"+"+dial,name:display.of(iso)||iso,flag:flag(iso)};
 }).sort((a,b)=>a.name.localeCompare(b.name,"es"));
 const byIso=Object.fromEntries(countries.map(c=>[c.iso,c]));
 const normalized=s=>String(s||"").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
 const validNumber=(value,iso="ES")=>{
   if(!byIso[iso])return false;
   const raw=String(value||"");
   if(!/^[0-9 ()-]+$/.test(raw))return false;
   const digits=raw.replace(/\D/g,"");
   return digits.length>=7 && digits.length+byIso[iso].dial.slice(1).length<=15;
 };
 const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const summary=iso=>{const c=byIso[iso]||byIso.ES;return c.flag+" "+c.name+" "+c.dial;};
 const render=(region="ES",number="")=>'<div class="phone-registration"><div class="fld"><span>Teléfono (obligatorio · sin verificar)</span>'+
   '<div class="phone-picker" data-phone-picker><button type="button" class="phone-country-toggle" data-phone-toggle aria-expanded="false" aria-label="Elegir país y prefijo"><span data-phone-selected>'+
   esc(summary(region))+'</span><span aria-hidden="true">⌄</span></button>'+
   '<div class="phone-country-menu" data-phone-menu hidden><label class="phone-search-label"><span>Buscar país o prefijo</span>'+
   '<input class="inp" type="search" data-phone-search autocomplete="off" placeholder="España, México, +34…" aria-label="Buscar país o prefijo"></label>'+
   '<div class="phone-country-options" role="listbox" aria-label="Lista de países">'+
   countries.map(c=>'<button type="button" role="option" data-phone-select="'+esc(c.iso)+'" data-phone-key="'+esc(normalized(c.name+" "+c.iso+" "+c.dial))+'" aria-selected="'+(c.iso===region)+'"><span class="phone-option-flag">'+c.flag+'</span><span>'+esc(c.name)+'</span><b>'+c.dial+'</b></button>').join("")+
   '</div><p class="phone-no-match" data-phone-empty hidden>No se encontraron países.</p></div></div></div>'+
   '<label class="fld"><span>Número de teléfono</span><input class="inp" type="tel" name="phone_optional" data-inp="authPhoneNumber" autocomplete="tel-national" required aria-required="true" inputmode="tel" maxlength="20" value="'+esc(number)+'" placeholder="Número sin prefijo"></label>'+
   '<p class="muted small">Obligatorio en el formulario de pruebas; no se guarda ni se envían SMS. Este número no acredita tu identidad. La recuperación sigue siendo por correo verificado.</p></div>';
 if(typeof document!=="undefined"){
   document.addEventListener("click",ev=>{
     const toggle=ev.target.closest?.("[data-phone-toggle]");
     if(toggle){
       const wrap=toggle.closest("[data-phone-picker]"),menu=wrap?.querySelector("[data-phone-menu]");
       if(!menu)return;
       menu.hidden=!menu.hidden;toggle.setAttribute("aria-expanded",String(!menu.hidden));
       if(!menu.hidden)menu.querySelector("[data-phone-search]")?.focus();
       return;
     }
     const chosen=ev.target.closest?.("[data-phone-select]");
     if(chosen){
       const wrap=chosen.closest("[data-phone-picker]"),c=byIso[chosen.dataset.phoneSelect];
       if(!c||!wrap)return;
       const label=wrap.querySelector("[data-phone-selected]");
       if(label)label.textContent=summary(c.iso);
       const menu=wrap.querySelector("[data-phone-menu]");
       if(menu)menu.hidden=true;
       const button=wrap.querySelector("[data-phone-toggle]");
       if(button){button.setAttribute("aria-expanded","false");button.focus();}
       wrap.querySelectorAll("[data-phone-select]").forEach(el=>el.setAttribute("aria-selected",String(el===chosen)));
       if(typeof Auth!=="undefined")Auth.ui.phoneCountry=c.iso;
       return;
     }
     // Cierra al pulsar fuera del selector.
     document.querySelectorAll?.("[data-phone-picker]").forEach(el=>{
       if(el.contains(ev.target))return;
       const m=el.querySelector("[data-phone-menu]"),b=el.querySelector("[data-phone-toggle]");
       if(m)m.hidden=true;if(b)b.setAttribute("aria-expanded","false");
     });
   });
   document.addEventListener("input",ev=>{
     if(!ev.target.matches?.("[data-phone-search]"))return;
     const list=ev.target.closest("[data-phone-menu]"),term=normalized(ev.target.value);
     let count=0;
     list?.querySelectorAll("[data-phone-select]").forEach(el=>{
       const show=el.dataset.phoneKey.includes(term);
       el.hidden=!show;if(show)count++;
     });
     const empty=list?.querySelector("[data-phone-empty]");
     if(empty)empty.hidden=count>0;
   });
   document.addEventListener("keydown",ev=>{
     if(ev.key!=="Escape")return;
     const menu=ev.target.closest?.("[data-phone-menu]");
     if(menu&&!menu.hidden){
       menu.hidden=true;
       const button=menu.closest("[data-phone-picker]")?.querySelector("[data-phone-toggle]");
       if(button){button.setAttribute("aria-expanded","false");button.focus();}
     }
   });
 }
 return {countries,byIso,flag,summary,normalized,validNumber,render};
})();
if(typeof module!=="undefined")module.exports=PhoneCountry;
