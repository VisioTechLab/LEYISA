import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';
import proxy from '../../frontend/api/leyisa-proxy.mjs';
import { createRenderProxyMiddleware } from '../dist/common/render-proxy.js';

const origin = 'https://leyisa-local-test.onrender.com';
const secret = randomBytes(32).toString('hex');

test('Render refuse les en-têtes clients et conserve le contrôle de santé', async () => {
  assert.throws(() => createRenderProxyMiddleware(undefined));
  const middleware = createRenderProxyMiddleware(secret);
  const server = createServer((request, response) => {
    middleware(request, response, () => {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ ip: request.leyisaClientIp ?? null }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.equal((await fetch(base + '/health')).status, 200);
    const protectedRoute = base + '/api/v1/auth/me';
    const untrusted = await fetch(protectedRoute, { headers: { 'x-leyisa-client-ip': '192.0.2.10' } });
    assert.equal(untrusted.status, 403);
    assert.equal(untrusted.headers.get('cache-control'), 'no-store');
    await untrusted.body.cancel();

    const authenticated = await fetch(protectedRoute, {
      headers: { 'x-leyisa-proxy-secret': secret, 'x-leyisa-client-ip': '192.0.2.20' },
    });
    assert.equal(authenticated.status, 200);
    assert.deepEqual(await authenticated.json(), { ip: '192.0.2.20' });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Vercel transmet une requête de même origine et préserve les cookies et le PDF', async (t) => {
  process.env.LEYISA_RENDER_ORIGIN = origin;
  process.env.LEYISA_PROXY_SECRET = secret;
  const responseHeaders = new Headers({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment' });
  responseHeaders.append('Set-Cookie', 'session=fictive; Secure; HttpOnly; Path=/');
  responseHeaders.append('Set-Cookie', 'csrf=fictif; Secure; HttpOnly; Path=/');
  responseHeaders.set('x-leyisa-proxy-secret', 'interne');
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.toString(), origin + '/api/v1/bulletins/id/pdf?format=A4');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.get('x-leyisa-proxy-secret'), secret);
    assert.equal(options.headers.get('x-leyisa-client-ip'), '192.0.2.11');
    assert.equal(options.headers.get('cookie'), 'leyisa_session=fictive');
    assert.equal(options.headers.get('origin'), 'https://demo.invalid');
    assert.equal(options.headers.get('authorization'), null);
    return new Response('%PDF-1.7', { headers: responseHeaders });
  });
  const request = new Request('https://demo.invalid/api/leyisa-proxy?__leyisa_path=bulletins%2Fid%2Fpdf&format=A4', {
    headers: { Cookie: 'leyisa_session=fictive', Origin: 'https://demo.invalid', Authorization: 'fictif',
      'x-leyisa-proxy-secret': 'fictif', 'x-leyisa-client-ip': '192.0.2.12', 'x-vercel-forwarded-for': '192.0.2.11' },
  });
  const response = await proxy.fetch(request);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('x-leyisa-proxy-secret'), null);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal(await response.text(), '%PDF-1.7');
});

test('Vercel réserve le relais à /api/v1 et refuse les redirections amont', async (t) => {
  process.env.LEYISA_RENDER_ORIGIN = origin;
  process.env.LEYISA_PROXY_SECRET = secret;
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    new Response(null, { status: 302, headers: { Location: 'https://autre.invalid' } }));

  assert.equal((await proxy.fetch(new Request('https://demo.invalid/api/leyisa-proxy'))).status, 404);
  assert.equal((await proxy.fetch(new Request('https://demo.invalid/api/leyisa-proxy?__leyisa_path=../health'))).status, 404);
  const unexpected = await proxy.fetch(new Request('https://demo.invalid/api/v1/auth/me'));
  assert.equal(unexpected.status, 502);
  assert.equal(unexpected.headers.get('location'), null);
  assert.equal(fetchMock.mock.callCount(), 1);
  process.env.LEYISA_RENDER_ORIGIN = 'http://leyisa-local-test.onrender.com';
  assert.equal((await proxy.fetch(new Request('https://demo.invalid/api/v1/auth/me'))).status, 503);
  assert.equal(fetchMock.mock.callCount(), 1);
});
