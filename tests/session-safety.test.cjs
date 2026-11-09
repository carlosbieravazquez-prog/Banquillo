// Regresiones de sesión y privacidad: ejecutar con "node --test tests/session-safety.test.cjs"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
function defer() { let resolve, reject; const promise = new Promise((res, rej) => {resolve=res;reject=rej;});return {promise,resolve,reject}; }
function harness() {
  const ctx = vm.createContext({
    setTimeout: () => 1,
    clearTimeout: () => {}, console,
    localStorage: {setItem(){},getItem(){return null}},
    Cloud: {sb: {from: () => ({select: () => ({eq: () => Promise.resolve({data:[],error:null})})})}},
  });
  vm.runInContext(source + '\nthis.Store = Store;',ctx);
  return {ctx,Store:ctx.Store};
}
test('un resultado de roles antiguo no cambia permisos de otra sesión',async () => {
  const {ctx,Store} = harness();
  const waiting = defer();
  ctx.Cloud.sb.from = () => ({ select: () => ({eq: () => waiting.promise})});
  Store.user = {uid:'cuenta-A'};
  const old = Store.loadRoles();
  Store.reset();
  Store.user = {uid:'cuenta-B'};
  Store.roles = {'temporada-B':'owner'};
  waiting.resolve({data:[{season_id:'temporada-A',role:'owner'}],error:null});
  await old;
  assert.equal(Store.roles['temporada-A'],undefined);
  assert.equal(Store.roles['temporada-B'],'owner');
});
test('una petición antigua en vuelo no vacía ni altera la cola de nueva sesión',async () => {
  const {Store}=harness();
  const waiting=defer(), calls=[];
  Store.db={doc: p => ({set: async v => {calls.push(p);await waiting.promise;},delete: async()=>{}})};
  Store.sid='temporada-A'; Store.roles={'temporada-A':'owner'};
  Store.save('player',{id:'p1',name:'Ficticio-A'});
  const old=Store.flush();
  Store.reset();
  Store.db={doc: p=>({set:async()=>{calls.push(p)},delete:async()=>{}})};
  Store.sid='temporada-B'; Store.roles={'temporada-B':'owner'};
  Store.save('player',{id:'p2',name:'Ficticio-B'});
  waiting.resolve();
  await old;
  assert.equal(Store.pending.has('seasons/temporada-B/players/p2'),true);
  await Store.flush();
  assert.equal(Store.pending.size,0);
  assert.ok(calls.includes('seasons/temporada-B/players/p2'));
});
