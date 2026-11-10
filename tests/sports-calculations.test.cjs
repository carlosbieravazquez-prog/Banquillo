const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../js/calc.js');

test('resultados y descansos de la temporada', () => {
  const r = Calc.record([
    {date:'2025-04-03', ourGoals:3, rivalGoals:1},
    {date:'2025-04-10', ourGoals:0, rivalGoals:0},
    {date:'2025-04-17', ourGoals:1, rivalGoals:2},
    {rest:true},
    {date:'2099-01-01', ourGoals:9, rivalGoals:0}
  ]);
  assert.equal(r.pj,3);
  assert.equal(r.v,1); assert.equal(r.e,1); assert.equal(r.d,1);
  assert.equal(r.gf,4); assert.equal(r.gc,3); assert.equal(r.dg,1);
  assert.equal(r.descansos,1); assert.equal(r.pendientes,1);
});

test('una lesión no cuenta como descanso por decisión técnica', () => {
  const matches = [
    {callDone:true,noCall:[{p:'a',m:'LS'}],players:{}},
    {callDone:true,noCall:[{p:'a',m:'DT'}],players:{}},
    {rest:true},
    {callDone:true,players:{a:{role:'T',min:30,gk:true}},rivalGoals:0,ourGoals:1,scorers:['a']}
  ];
  const s = Calc.playerStats('a',matches);
  assert.equal(s.DT,1);assert.equal(s.LS,1);
  assert.equal(s.noconv,2);assert.equal(s.conv,1);
  assert.equal(s.goals,1);assert.equal(s.min,30);
  assert.equal(s.gk,1);assert.equal(s.clean,1);
});

test('minutos con cambios repetidos y cronología correcta', () => {
  const m={players:{a:{role:'T'},b:{role:'S'}},subs:[
    {min:20,out:'a',in:'b'},
    {min:40,out:'b',in:'a'}
  ]};
  assert.deepEqual(Calc.calcMinutes(m,60),{a:40,b:20});
});

test('cambios fuera de los límites del partido nunca generan minutos negativos o extra', () => {
  const m={players:{a:{role:'T'},b:{role:'S'}},subs:[
    {min:-10,out:'a',in:'b'},
    {min:999,out:'a',in:'b'}
  ]};
  assert.deepEqual(Calc.calcMinutes(m,60),{a:60,b:0});
});

test('asistencia y faltas distinguen entrenamiento cancelado', () => {
  const players=[{id:'a'},{id:'b'}];
  const sessions=['2026-01-05','2026-01-07','2026-01-12'];
  const training={skipped:['2026-01-07'],absences:{'2026-01-05':['b']}};
  const result=Calc.trainingStats(players,sessions,training,'2026-01-31');
  assert.equal(result.done,2);
  assert.equal(result.per.a.falts,0);
  assert.equal(result.per.b.falts,1);
  assert.equal(result.teamPct,0.75);
});

test('las alineaciones preparadas en jornadas pendientes no cuentan como partidos disputados', () => {
  const matches=[
    {date:'2099-02-10',callDone:true,ourGoals:3,rivalGoals:0,players:{a:{role:'T',min:50,gk:true}},scorers:['a','a']},
    {date:'2020-01-01',callDone:true,ourGoals:2,rivalGoals:1,players:{a:{role:'S',min:20,gk:false}},scorers:['a','og']}
  ];
  const st=Calc.playerStats('a',matches);
  assert.equal(st.conv,2);
  assert.equal(st.played,1);
  assert.equal(st.min,20);
  assert.equal(st.goals,1);
  assert.equal(st.gk,0);
  assert.equal(Calc.ownGoals(matches),1);
});
test('un marcador parcial no convierte minutos y goles en estadísticas oficiales',()=>{
  const m={date:'2020-01-01',callDone:true,ourGoals:3,rivalGoals:null,players:{a:{role:'T',min:50}},scorers:['a']};
  const st=Calc.playerStats('a',[m]);
  assert.equal(st.conv,1);
  assert.equal(st.played,0);
  assert.equal(st.goals,0);
  assert.equal(st.min,0);
});
