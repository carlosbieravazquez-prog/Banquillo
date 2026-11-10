const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PlayerListImport = require('../js/player-list-import.js');

const example = [
  '- Oliver Atom – **10**',
  '- Santiago Muñez – **26**',
  '- Benji Price – **1**',
  '- Jamie Tartt – **9**',
  '- Mark Lenders – **9**',
  '- Dani Rojas – **14**',
  '- Gavin Harris – **10**',
  '- Roy Kent – **6**',
  '- Alex Hunter – **29**',
  '- Shunsuke Nakamura – **10**'
].join('\n');

test('lista de diez jugadores separa nombres y dorsales sin guiones o asteriscos', () => {
  const parsed = PlayerListImport.parseList(example);
  assert.deepEqual(parsed, [
    { name:'Oliver Atom', dorsal:10 },
    { name:'Santiago Muñez', dorsal:26 },
    { name:'Benji Price', dorsal:1 },
    { name:'Jamie Tartt', dorsal:9 },
    { name:'Mark Lenders', dorsal:9 },
    { name:'Dani Rojas', dorsal:14 },
    { name:'Gavin Harris', dorsal:10 },
    { name:'Roy Kent', dorsal:6 },
    { name:'Alex Hunter', dorsal:29 },
    { name:'Shunsuke Nakamura', dorsal:10 }
  ]);
});

test('conserva dorsal inicial, listas numeradas, formatos antiguos y nombres simples', () => {
  assert.deepEqual(PlayerListImport.parseLine('- **12** – Alistair Vance'), {name:'Alistair Vance',dorsal:12});
  assert.deepEqual(PlayerListImport.parseLine('9 – Jamie Tartt'), {name:'Jamie Tartt',dorsal:9});
  assert.deepEqual(PlayerListImport.parseLine('2. Marcus Blackstone'), {name:'Marcus Blackstone',dorsal:2});
  assert.deepEqual(PlayerListImport.parseLine('Oliver Atom - 10'), {name:'Oliver Atom',dorsal:10});
  assert.deepEqual(PlayerListImport.parseLine('1. Oliver Atom - **10**'), {name:'Oliver Atom',dorsal:10});
  assert.deepEqual(PlayerListImport.parseLine('Oliver Atom (#10)'), {name:'Oliver Atom',dorsal:10});
  assert.deepEqual(PlayerListImport.parseLine('• Alex Hunter'), {name:'Alex Hunter',dorsal:null});
  assert.deepEqual(PlayerListImport.parseLine('Benji Price'), {name:'Benji Price',dorsal:null});
  assert.equal(PlayerListImport.parseLine('•  '), null);
});

test('soporta saltos de línea Windows, espacios extra y viñetas', () => {
  assert.deepEqual(PlayerListImport.parseList('  -   Roy Kent   —  **6** \r\n\r\n*  Gavin Harris - #10  '), [
    {name:'Roy Kent',dorsal:6},
    {name:'Gavin Harris',dorsal:10}
  ]);
});

test('el asistente usa el módulo y mantiene dorsales repetidos con advertencia', () => {
  const src = fs.readFileSync(path.join(__dirname,'../js/views3.js'), 'utf8');
  assert.match(src,/PlayerListImport\.parseList\(UI\.wizPasteP/);
  assert.match(src,/repeatedDorsals\+\+/);
  assert.match(src,/dorsales repetidos conservados/);
  assert.match(src,/dorsal: row\.dorsal === null \? "" : String\(row\.dorsal\)/);
  for(const page of ['index.html','staging.html']){
    const html=fs.readFileSync(path.join(__dirname,'..',page),'utf8');
    const helper = html.indexOf('src="js/player-list-import.js"'), wizard = html.indexOf('src="js/views3.js"');
    assert.ok(helper>=0 && wizard>helper, page+' debe cargar el parser antes del asistente');
  }
});
