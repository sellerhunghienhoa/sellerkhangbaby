import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import {
  appCredentials,
  decryptTokenRecord,
  encryptTokenRecord,
  normalizeTokenResponse,
  safeConnection
} from '../src/worker.js';

const encryptionKey = randomBytes(32).toString('base64');
const definition = {
  id: 'creator-affiliate',
  label: 'Creator Affiliate',
  kind: 'creator',
  expectedUserType: 1
};

test('token records are encrypted with a random IV and can be decrypted', async () => {
  const record = { accessToken: 'access-secret', refreshToken: 'refresh-secret', openId: 'creator-1' };
  const first = await encryptTokenRecord(record, encryptionKey);
  const second = await encryptTokenRecord(record, encryptionKey);
  assert.notEqual(first, second);
  assert.equal(first.includes('access-secret'), false);
  assert.equal(first.includes('refresh-secret'), false);
  assert.deepEqual(await decryptTokenRecord(first, encryptionKey), record);
});

test('creator token response rejects a seller identity', () => {
  assert.throws(() => normalizeTokenResponse({
    code: 0,
    data: { access_token: 'a', refresh_token: 'r', user_type: 0 }
  }, definition), /TIKTOK_TOKEN_IDENTITY_MISMATCH/);
});

test('shared app credentials support both OAuth flows without exposing the secret', () => {
  const env = { TIKTOK_APP_KEY: 'public-app-key', TIKTOK_APP_SECRET: 'private-app-secret' };
  assert.deepEqual(appCredentials(definition, env), {
    appKey: 'public-app-key',
    appSecret: 'private-app-secret'
  });
  assert.deepEqual(appCredentials({ ...definition, kind: 'seller' }, env), {
    appKey: 'public-app-key',
    appSecret: 'private-app-secret'
  });
});

test('safe API status never exposes access or refresh tokens', () => {
  const record = normalizeTokenResponse({
    code: 0,
    data: {
      access_token: 'access-secret',
      refresh_token: 'refresh-secret',
      user_type: 1,
      open_id: 'creator-open-id',
      granted_scopes: ['creator.analytics.read']
    }
  }, definition);
  const serialized = JSON.stringify(safeConnection(record, definition));
  assert.equal(serialized.includes('access-secret'), false);
  assert.equal(serialized.includes('refresh-secret'), false);
  assert.equal(serialized.includes('creator-open-id'), false);
  assert.equal(serialized.includes('pen-id'), true);
});
