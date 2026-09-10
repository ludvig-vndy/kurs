import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, privateDecrypt, createDecipheriv } from 'node:crypto';
import { kryptera, byggArkiv, kursPaBegaran } from '../prova-fraga-publikt.mjs';
import { kursText, valjLektioner } from '../../functions/api/fraga.js';
test('hela svar kan bara läsas med den lokala privata nyckeln', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const data = { answer: 'Privat provresultat' };
  const box = kryptera(data, publicKey);
  assert.ok(!JSON.stringify(box).includes(data.answer));
  const key = privateDecrypt({ key: privateKey, oaepHash: 'sha256' }, Buffer.from(box.key, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  assert.deepEqual(JSON.parse(Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()])), data);
});
test('ändrade eller ofullständiga källversioner avvisas före modellanrop', () => {
  assert.throws(() => byggArkiv([]));
  assert.throws(() => byggArkiv([{ id: 'volvo', sha256: 'ändrad' }, { id: 'traton', sha256: 'ändrad' }]));
});

test('kursprovet tar bara bort automatiska långutdrag och bevarar källor, katalog och verktyg', () => {
  const question = 'Granska Volvo Group Q2 2025 och operativt kassaflöde';
  const selected = valjLektioner(question);
  assert.ok(selected.length > 0);
  const request = { system: 'REGLER' + kursText(selected) + 'RAPPORTER OCH FAKTAREGISTER',
    messages: [{ role: 'user', content: question }], tools: [{ name: 'las_lektion' }],
    model: 'oförändrad', max_tokens: 4096 };
  const saved = structuredClone(request);
  const changed = kursPaBegaran(request, question);
  assert.deepEqual(request, saved);
  assert.deepEqual(changed, { ...saved, system: 'REGLER' + kursText([]) + 'RAPPORTER OCH FAKTAREGISTER' });
  assert.ok(changed.system.length < saved.system.length - 5000);
});

test('kursprovet avvisar oväntad prompt och lämnar uttryckliga lektionsfrågor orörda', () => {
  const question = 'Granska Volvo Group Q2 2025 och operativt kassaflöde';
  assert.throws(() => kursPaBegaran({ system: 'fel prompt' }, question), /kursavsnitt/);
  const request = { system: 'Lektionsfråga' };
  assert.deepEqual(kursPaBegaran(request, 'Förklara lektion 5.1'), request);
});
