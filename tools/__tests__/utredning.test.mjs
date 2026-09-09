import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetFor, skapaUndersokning, giltigPeriod } from '../../functions/api/_utredning.js';

test('djup granskning har uttryckliga tak och vanlig fraga behaller sina', () => {
  assert.equal(budgetFor(false).modellanrop, 10);
  assert.equal(budgetFor(true).modellanrop, 14);
  assert.equal(budgetFor(true).verktyg, 12);
  assert.equal(budgetFor(true).ms, 120000);
});
test('planen ar avgransad och sokning ar inte bevis pa ett besvarat delmoment', () => {
  const u = skapaUndersokning();
  assert.equal(u.planera({delar:[{omrade:'kassaflode',fraga:'Hur utvecklas kassaflödet?'}]}).ok,true);
  assert.equal(u.planera({delar:[{omrade:'tes',fraga:'Byt plan?'}]}).ok,false);
  assert.equal(u.notera('d9','las_mer',3),false);
  assert.equal(u.notera('d1','las_mer',0),true);
  assert.deepEqual(u.status()[0], {id:'d1',omrade:'kassaflode',rubrik:'Kassaflöde',status:'undersokt',anrop:1,nyaPoster:0});
  assert.ok(!JSON.stringify(u.status()).includes('Hur utvecklas'));
});
test('planen avvisar for manga eller okanda moment utan delvis mutation', () => {
  const u = skapaUndersokning();
  assert.equal(u.planera({delar:Array(5).fill({omrade:'tes',fraga:'Vad stöder tesen?'})}).ok,false);
  assert.equal(u.planera({delar:[{omrade:'garanterad_vinst',fraga:'Varför?'}]}).ok,false);
  assert.deepEqual(u.status(),[]);
});
test('sokperiod kraver verkliga datum och ratt ordning', () => {
  assert.equal(giltigPeriod({fran:'2025-02-29',till:'2025-12-31'}),false);
  assert.equal(giltigPeriod({fran:'2026-01-01',till:'2025-12-31'}),false);
  assert.equal(giltigPeriod({fran:'2024-02-29',till:'2025-12-31'}),true);
});
