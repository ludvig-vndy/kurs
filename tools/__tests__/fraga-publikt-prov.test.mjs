import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, privateDecrypt, createDecipheriv } from 'node:crypto';
import { kryptera, byggArkiv } from '../prova-fraga-publikt.mjs';
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
