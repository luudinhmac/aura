import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccessToken, createJwtConfig, verifyAccessToken } from '../server/auth/jwt.ts';

test('JWT access token signs and verifies claims', () => {
  const config = { ...createJwtConfig(false), secret: 'test-secret-that-is-long-enough-for-unit-tests' };
  const token = createAccessToken('7', config);
  const claims = verifyAccessToken(token, config);

  assert.equal(claims.sub, '7');
  assert.equal(claims.iss, config.issuer);
  assert.equal(claims.aud, config.audience);
  assert.notEqual(claims.jti, '');
});

test('JWT verifier rejects tampered tokens and wrong audience', () => {
  const config = { ...createJwtConfig(false), secret: 'test-secret-that-is-long-enough-for-unit-tests' };
  const token = createAccessToken('7', config);
  const [header, payload] = token.split('.');

  assert.throws(() => verifyAccessToken(`${header}.${payload}.tampered`, config));
  assert.throws(() => verifyAccessToken(token, { ...config, audience: 'other-audience' }));
});
