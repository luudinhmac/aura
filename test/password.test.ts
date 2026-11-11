import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, isPasswordHash, verifyPassword } from '../server/auth/password.ts';

test('password hashes are salted and verifiable', async () => {
  const first = await hashPassword('Correct Horse Battery Staple');
  const second = await hashPassword('Correct Horse Battery Staple');

  assert.equal(isPasswordHash(first), true);
  assert.equal(isPasswordHash(second), true);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('Correct Horse Battery Staple', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
});

test('password verifier rejects legacy plaintext and malformed values', async () => {
  assert.equal(isPasswordHash('123'), false);
  assert.equal(await verifyPassword('123', '123'), false);
  assert.equal(await verifyPassword('123', 'scrypt-v1$broken'), false);
});
