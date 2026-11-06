import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const firebase = await readFile(new URL('../js/firebase.js', import.meta.url), 'utf8');

function logoutContext(save) {
  const events = [];
  const ctx = createContext({ console, Promise, clearTimeout: () => {}, save, events });
  runInContext(firebase + `
    productionBackendReady = true;
    productionSaveTimer = 42;
    productionFirebaseAuthContextPromise = Promise.resolve({ auth: {}, signOut: async () => events.push('signout') });
    writeProductionState = () => { events.push('save'); return save(); };
    globalThis.ready = () => productionBackendReady;
  `, ctx);
  return { ctx, events };
}

test('logout waits for the last debounced edit before ending the authenticated session', async () => {
  let finish;
  const app = logoutContext(() => new Promise(resolve => { finish = resolve; }));
  const pending = app.ctx.signOutProduction();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(app.events, ['save']);
  assert.equal(app.ctx.ready(), true);
  finish();
  await pending;
  assert.deepEqual(app.events, ['save', 'signout']);
  assert.equal(app.ctx.ready(), false);
});

test('a failed last save keeps the user signed in so the edit can be retried', async () => {
  let offline = true;
  const app = logoutContext(async () => { if (offline) throw Error('offline'); });
  await assert.rejects(app.ctx.signOutProduction(), /offline/);
  assert.deepEqual(app.events, ['save']);
  assert.equal(app.ctx.ready(), true);
  offline = false;
  await app.ctx.signOutProduction();
  assert.deepEqual(app.events, ['save', 'save', 'signout']);
});

test('service worker install precaches only assets that exist in the build inputs', async () => {
  const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const events = {};
  let precached = false;
  runInContext(source, createContext({
    console: { warn() {} },
    self: { addEventListener: (name, fn) => { events[name] = fn; }, skipWaiting: async () => {} },
    caches: { open: async () => ({ addAll: async urls => {
      for (const url of urls) await access(path.join(root, url === '/' ? 'index.html' : url.slice(1)));
      precached = true;
    } }) }
  }));
  let installation;
  events.install({ waitUntil: promise => { installation = promise; } });
  await installation;
  assert.equal(precached, true);
});

test('iOS project generation preserves Swift interpolation and safely encodes notification actions', async () => {
  const source = await readFile(new URL('../scripts/generate-ios-project.mjs', import.meta.url), 'utf8');
  const outputs = new Map();
  runInContext(source.replace(/^import .*;\r?\n/gm, ''), createContext({
    fs: { mkdirSync() {}, existsSync: () => false, writeFileSync: (name, data) => outputs.set(name, data) },
    path, console: { log() {} }
  }));
  const generated = outputs.get(path.resolve('ios/KhangBabyLIVE/ViewController.swift'));
  assert.match(generated, /JSONSerialization\.data\(withJSONObject: \[act\]\)/);
  assert.ok(generated.includes('handleNotificationAction(\\(encodedAction)[0])'));
  assert.doesNotMatch(generated, /removeObserver\(self, forKeyPath:/);
  const checkedIn = await readFile(new URL('../ios/KhangBabyLIVE/ViewController.swift', import.meta.url), 'utf8');
  assert.equal(generated, checkedIn);
});
