import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadTargetApi() {
  const source = await readFile(new URL('../js/firebase.js', import.meta.url), 'utf8');
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Promise,
    TextEncoder,
    setTimeout,
    clearTimeout,
    TODAY: '2026-10-30',
    PRODUCTION_ADMIN_EMAIL: 'admin@example.test',
    nowStamp: () => '12:00:00'
  });
  vm.runInContext(`${source}\n;globalThis.targetTestApi = {
    configure(firebaseContext, user) {
      productionBackendReady = true;
      productionFirebaseUser = user;
      productionFirebaseContextPromise = Promise.resolve(firebaseContext);
    },
    saveProductionHostTarget: typeof saveProductionHostTarget === 'function' ? saveProductionHostTarget : undefined,
    profileForFirestore,
    profilesFromFirestore
  };`, context);
  return context.targetTestApi;
}

test('Host target persists immediately and survives a Firebase profile round trip', async () => {
  const writes = [];
  const api = await loadTargetApi();
  api.configure({
    db: {},
    doc: (_db, ...parts) => parts.join('/'),
    setDoc: async (...args) => writes.push(args)
  }, { uid: 'host-1', email: 'host@example.test', emailVerified: true });

  assert.equal(typeof api.saveProductionHostTarget, 'function');
  await api.saveProductionHostTarget({
    id: 'host-1', uid: 'host-1', name: 'Host', email: 'host@example.test',
    status: 'APPROVED', role: 'HOST', targetGmv: 1_200_000_000,
    targetUpdatedAt: '2026-10-30'
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], 'users/host-1');
  assert.equal(writes[0][1].targetGmv, 1_200_000_000);
  assert.equal(writes[0][1].targetUpdatedAt, '2026-10-30');
  assert.equal(writes[0][2].merge, true);

  const stored = api.profileForFirestore({
    id: 'host-1', role: 'HOST', status: 'APPROVED', targetGmv: 1_200_000_000,
    targetUpdatedAt: '2026-10-30'
  });
  const [loaded] = api.profilesFromFirestore({docs:[{id:'host-1',data:()=>stored}]});
  assert.equal(loaded.targetGmv, 1_200_000_000);
  assert.equal(loaded.targetUpdatedAt, '2026-10-30');
});

test('Firestore permits only a Host to update their own target fields', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /function validOwnTargetUpdate\(uid\)/);
  assert.match(rules, /affectedKeys\(\)[\s\S]*hasOnly\(\['targetGmv', 'targetUpdatedAt', 'updatedAt'\]\)/);
  assert.match(rules, /allow update: if isBootstrapAdmin\(\) \|\| validOwnTargetUpdate\(uid\)/);
});
