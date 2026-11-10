const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/acta-excel.js'),'utf8');

function setup({readOnly=false,closed=false,seasonId='season-test',roster='p1|p2'}={}){
  const match={id:'match-test',n:4,players:{},scorers:[],closed,ourGoals:0};
  const players=[{id:'p1',name:'Jugador 1'},{id:'p2',name:'Jugador 2'}];
  const saves=[],notices=[],context={
    ACT:{},CHG:{},UI:{route:{arg:'match-test'}},
    Store:{sid:seasonId,match:()=>match,season:()=>({settings:{format:'F7',matchMinutes:50}}),
      activePlayers:()=>roster==='p1|p2'?players:players.slice(0,1),
      readOnly:()=>readOnly,save:(type,data)=>saves.push({type,data})},
    Calc:{noCallMap:()=>({})},
    toast:(message,kind)=>notices.push({message,kind}),
    confirm:()=>true,
    render:()=>{},
    loadLib:()=>{},saveFile:()=>{}
  };
  vm.runInNewContext(source,context);
  context.UI.actaImport={
    matchId:'match-test',seasonId:'season-test',rosterKey:'p1|p2',
    rows:[{id:'p1',role:'T',minutes:35,goals:2,gk:false},{id:'p2',role:'S',minutes:15,goals:0,gk:true}]
  };
  return {context,match,saves,notices};
}

test('importación confirmada ajusta roles, minutos y goles en partido de prueba',()=>{
  const {context,match,saves}=setup();
  context.ACT.applyActaXlsx();
  assert.equal(saves.length,1);
  assert.equal(saves[0].type,'match');
  assert.equal(match.players.p1.role,'T');
  assert.equal(match.players.p2.min,15);
  assert.equal(match.ourGoals,2);
  assert.equal(match.scorers.length,2);
});

test('un lector no puede aplicar cambios con llamadas directas',()=>{
  const {context,saves,notices}=setup({readOnly:true});
  context.ACT.applyActaXlsx();
  assert.equal(saves.length,0);
  assert.equal(notices[0].kind,'err');
});
test('un acta cerrada no acepta importaciones',()=>{
  const {context,saves}=setup({closed:true});
  context.ACT.applyActaXlsx();
  assert.equal(saves.length,0);
});
test('cambio de temporada invalida la importación pendiente',()=>{
  const {context,saves}=setup({seasonId:'otra-temporada'});
  context.ACT.applyActaXlsx();
  assert.equal(saves.length,0);
  assert.equal(context.UI.actaImport,null);
});
test('un cambio de convocatoria invalida la importación pendiente',()=>{
  const {context,saves}=setup({roster:'p1'});
  context.ACT.applyActaXlsx();
  assert.equal(saves.length,0);
});
test('un Excel distinto de jornada no puede aplicarse',()=>{
  const {context,saves}=setup();
  context.UI.actaImport.matchId='otra-jornada';
  context.ACT.applyActaXlsx();
  assert.equal(saves.length,0);
});
test('validación previa limita tamaño y estructura del archivo',()=>{
  assert.match(source,/file\.size > 5\*1024\*1024/);
  assert.match(source,/ws\.rowCount > 120 \|\| ws\.columnCount > 20/);
  assert.match(source,/Number\(value\(ws,2,4\)\) !== Number\(m\.n\)/);
});
