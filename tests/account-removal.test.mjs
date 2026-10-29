import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadAccountRemovalApi() {
  const source = await readFile(new URL('../js/firebase.js', import.meta.url), 'utf8');
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Promise,
    TextEncoder,
    setTimeout,
    clearTimeout,
    TODAY: '2026-10-29',
    PRODUCTION_ADMIN_EMAIL: 'admin@example.test',
    nowStamp: () => '12:00:00'
  });
  vm.runInContext(`${source}\n;globalThis.accountRemovalTestApi = {
    configure(firebaseContext) {
      productionBackendReady = true;
      productionFirebaseUser = { uid: 'admin', email: PRODUCTION_ADMIN_EMAIL, emailVerified: true };
      productionFirebaseContextPromise = Promise.resolve(firebaseContext);
    },
    removeProductionUserProfile,
    profilesFromFirestore
  };`, context);
  return context.accountRemovalTestApi;
}

test('removed Firebase profiles are persisted as tombstones and hidden from admin lists', async () => {
  const writes = [];
  const api = await loadAccountRemovalApi();
  api.configure({
    db: {},
    doc: (_db, ...parts) => parts.join('/'),
    setDoc: async (...args) => writes.push(args)
  });

  await api.removeProductionUserProfile({
    id: 'pending-123',
    uid: 'pending-123',
    name: 'Tài khoản chờ duyệt',
    email: 'pending@example.test',
    status: 'PENDING',
    role: ''
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], 'users/pending-123');
  assert.equal(writes[0][1].status, 'REMOVED');
  assert.equal(writes[0][1].role, '');
  assert.match(writes[0][1].removedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(writes[0][2].merge, true);

  const visible = api.profilesFromFirestore({
    docs: [
      { id: 'pending-123', data: () => writes[0][1] },
      { id: 'active-456', data: () => ({ name: 'Host', status: 'APPROVED', role: 'HOST' }) }
    ]
  });
  assert.deepEqual(Array.from(visible, profile => profile.id), ['active-456']);
});
