import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/worker.js';
import { prefersMarkdown } from '../src/agent-resources.js';

const origin = 'https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev';
const assets = {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('<!doctype html><title>Khang Baby</title>', { headers: { 'Content-Type': 'text/html' } });
    return new Response(null, { status: 404 });
  }
};

test('Accept negotiation prefers the best supported representation', () => {
  assert.equal(prefersMarkdown('text/markdown'), true);
  assert.equal(prefersMarkdown('text/markdown, text/html;q=0.8'), true);
  assert.equal(prefersMarkdown('text/html, text/markdown;q=0.8'), false);
  assert.equal(prefersMarkdown('text/markdown;q=0, text/html'), false);
  assert.equal(prefersMarkdown('*/*'), false);
});

test('homepage negotiates Markdown while preserving HTML', async () => {
  const markdown = await worker.fetch(new Request(`${origin}/`, { headers: { Accept: 'text/markdown, text/html;q=0.8' } }), { ASSETS: assets });
  assert.equal(markdown.status, 200);
  assert.match(markdown.headers.get('Content-Type'), /^text\/markdown/);
  assert.equal(markdown.headers.get('Vary'), 'Accept');
  assert.match(await markdown.text(), /Khang Baby LIVE KPI[\s\S]+\/openapi\.json/);

  const html = await worker.fetch(new Request(`${origin}/`, { headers: { Accept: 'text/html' } }), { ASSETS: assets });
  assert.equal(html.status, 200);
  assert.match(html.headers.get('Content-Type'), /^text\/html/);
  assert.equal(html.headers.get('Vary'), 'Accept');
  assert.match(await html.text(), /<!doctype html>/);
});

test('Markdown 404 keeps status and links agents to documentation', async () => {
  const result = await worker.fetch(new Request(`${origin}/missing-agent-page`, { headers: { Accept: 'text/markdown' } }), { ASSETS: assets });
  assert.equal(result.status, 404);
  assert.match(result.headers.get('Content-Type'), /^text\/markdown/);
  assert.equal(result.headers.get('Vary'), 'Accept');
  assert.match(await result.text(), /Không tìm thấy trang[\s\S]+\/docs/);

  const html = await worker.fetch(new Request(`${origin}/missing-agent-page`, { headers: { Accept: 'text/html' } }), { ASSETS: assets });
  assert.equal(html.status, 404);
  assert.equal(html.headers.get('Vary'), 'Accept');
});

test('agent resources expose OpenAPI scopes, RFC 9728 metadata, and discoverable docs', async () => {
  const openapiResponse = await worker.fetch(new Request(`${origin}/openapi.json`), { ASSETS: assets });
  const openapi = await openapiResponse.json();
  assert.equal(openapi.openapi, '3.1.0');
  assert.equal(openapi.info.license.identifier, 'LicenseRef-Proprietary');
  assert.deepEqual(Object.keys(openapi.components.securitySchemes.googleOAuth.flows.authorizationCode.scopes), ['openid', 'email']);
  assert.deepEqual(openapi.security[0].googleOAuth, ['openid', 'email']);
  assert.ok(openapi.paths['/api/tiktok/live/sync']);
  assert.equal(openapi.paths['/api/tiktok/tokens/refresh'].post.requestBody, undefined);
  assert.equal(openapi.paths['/api/tiktok/tokens/refresh'].post.parameters[0].name, 'Origin');

  const metadataResponse = await worker.fetch(new Request(`${origin}/.well-known/oauth-protected-resource`), { ASSETS: assets });
  const metadata = await metadataResponse.json();
  assert.equal(metadata.resource, origin);
  assert.deepEqual(metadata.authorization_servers, ['https://accounts.google.com']);
  assert.deepEqual(metadata.scopes_supported, ['openid', 'email']);
  assert.deepEqual(metadata.bearer_methods_supported, ['header']);

  const discovery = await worker.fetch(new Request(`${origin}/.well-known/oauth-authorization-server`), { ASSETS: assets });
  assert.equal(discovery.status, 302);
  assert.equal(discovery.headers.get('Location'), 'https://accounts.google.com/.well-known/openid-configuration');

  for (const path of ['/llms.txt', '/docs', '/sitemap.xml']) {
    const response = await worker.fetch(new Request(origin + path), { ASSETS: assets });
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 20, path);
  }
});

test('API challenges advertise metadata and accept a verified Google OAuth token', async () => {
  const unauthorized = await worker.fetch(new Request(`${origin}/api/tiktok/status`), {});
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get('WWW-Authenticate'), `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="openid email"`);

  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push(String(url));
    if (String(url).includes('accounts:lookup')) return Response.json({ error: { message: 'INVALID_ID_TOKEN' } }, { status: 400 });
    if (String(url) === 'https://openidconnect.googleapis.com/v1/userinfo') {
      assert.equal(options.headers.Authorization, 'Bearer google-oauth-token');
      return Response.json({ sub: 'google-admin', email: 'sellerhunghienhoa@gmail.com', email_verified: true });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  try {
    const result = await worker.fetch(new Request(`${origin}/api/tiktok/status`, { headers: { Authorization: 'Bearer google-oauth-token' } }), {});
    assert.equal(result.status, 200);
    assert.deepEqual(calls, [
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=undefined',
      'https://openidconnect.googleapis.com/v1/userinfo'
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
