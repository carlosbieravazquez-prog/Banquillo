const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../js/club-planner.js');
const f={f11:2,f7:1,divisible:[true,false]};
const m=(extra={})=>({id:'m1',teamId:'a',date:'2026-11-14',time:'10:00',duration:90,home:true,modality:'F11',resource:'f11-1',...extra});

test('un campo F11 divisible equivale a dos F7 sin multiplicar un campo no divisible',()=>{
  assert.deepEqual(P.resourceList(f,'F11').map(x=>x.id),['f11-1','f11-2']);
  assert.deepEqual(P.resourceList(f,'F7').map(x=>x.id),['f11-1-a','f11-1-b','f7-1']);
});
test('el campo completo y sus mitades chocan si las horas se superponen',()=>{
  assert.equal(P.resourceConflict('f11-1','f11-1-a'),true);
  assert.equal(P.resourceConflict('f11-1-a','f11-1-b'),false);
  assert.equal(P.resourceConflict('f11-1','f11-2'),false);
  assert.equal(P.resourceConflict('f7-1','f11-1-a'),false);
  assert.equal(P.overlaps(m(),m({time:'11:30'})),false);
  assert.equal(P.overlaps(m(),m({time:'11:29'})),true);
});
test('partidos del mismo equipo no pueden coincidir aunque uno sea visitante',()=>{
  const existing=m();
  const visitor=m({id:'m2',home:false,resource:'',time:'10:10'});
  assert.equal(P.conflicts(visitor,[existing]).length,1);
});
test('dos partidos F7 pueden compartir mitades sin entrar en conflicto',()=>{
  const first=m({modality:'F7',resource:'f11-1-a'});
  const second=m({id:'m2',teamId:'b',modality:'F7',resource:'f11-1-b'});
  assert.equal(P.conflicts(second,[first]).length,0);
});
test('un partido ajeno no puede ocupar un campo ya reservado',()=>{
  const first=m({modality:'F7',resource:'f11-1-a'});
  const second=m({id:'m2',teamId:'b',modality:'F11',resource:'f11-1'});
  assert.equal(P.conflicts(second,[first]).length,1);
});
test('no se asignan modalidades a campos inexistentes o sin dividir',()=>{
  assert.ok(P.validate(m({resource:'f11-3'}),[],f).includes('campo'));
  assert.ok(P.validate(m({modality:'F7',resource:'f11-2-a'}),[],f).includes('campo'));
  assert.equal(P.validResource(f,m({modality:'F7',resource:'f11-1-b'})),true);
});
test('fechas, horas y duraciones inválidas son rechazadas antes de publicar',()=>{
  assert.equal(P.validDate('2026-02-30'),false);
  assert.equal(P.validDate('2026-11-14'),true);
  assert.equal(P.validTime('25:00'),false);
  assert.equal(P.validTime('09:30'),true);
  assert.ok(P.validate(m({time:'25:00'}),[],f));
  assert.ok(P.validate(m({date:'2026-02-30'}),[],f));
  assert.ok(P.validate(m({duration:0}),[],f));
});
test('el planificador ignora un partido al rectificar su propio horario',()=>{
  const first=m();
  assert.equal(P.validate(first,[first],f,first.id),'');
  const another=m({id:'m2',teamId:'b'});
  assert.ok(P.validate(another,[first],f,another.id));
});
