import { isIP } from 'node:net';

const inputHeaders = ['accept', 'content-type', 'cookie', 'origin', 'x-csrf-token', 'x-leyisa-role'];
const outputHeaders = ['content-disposition', 'content-type', 'retry-after'];
const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH'];
const apiPrefix = '/api/v1/';
const routeParameter = '__leyisa_path';

function failure(status, message, retryAfter) {
  return Response.json({ statusCode: status, message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(retryAfter ? { 'Retry-After': retryAfter } : {}) },
  });
}

function destinationFor(url, origin) {
  const paths = url.searchParams.getAll(routeParameter);
  const path = url.pathname.startsWith(apiPrefix)
    ? url.pathname.slice(apiPrefix.length)
    : url.pathname === '/api/leyisa-proxy' && paths.length === 1 ? paths[0] : '';
  if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(path)) return null;

  const destination = new URL(apiPrefix + path, origin);
  url.searchParams.delete(routeParameter);
  destination.search = url.searchParams.toString();
  return destination;
}

export default {
  async fetch(request) {
    if (!methods.includes(request.method)) return failure(405, 'Méthode non autorisée.');

    const secret = process.env.LEYISA_PROXY_SECRET ?? '';
    const origin = process.env.LEYISA_RENDER_ORIGIN ?? '';
    let backend;
    try {
      backend = new URL(origin);
      if (backend.protocol !== 'https:' || backend.origin !== origin ||
          !/^[a-z0-9-]+\.onrender\.com$/.test(backend.hostname) || !/^[a-f0-9]{64}$/.test(secret)) {
        throw new Error();
      }
    } catch {
      return failure(503, 'Le service est momentanément indisponible.');
    }

    const destination = destinationFor(new URL(request.url), backend);
    if (!destination) return failure(404, 'Route introuvable.');

    const headers = new Headers();
    for (const name of inputHeaders) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    headers.set('x-leyisa-proxy-secret', secret);
    const clientIp = request.headers.get('x-vercel-forwarded-for');
    if (clientIp && isIP(clientIp)) headers.set('x-leyisa-client-ip', clientIp);

    try {
      const signal = AbortSignal.timeout(55_000);
      const readOnly = request.method === 'GET' || request.method === 'HEAD';
      let upstream;
      for (;;) {
        upstream = await fetch(destination, {
          method: request.method,
          headers,
          ...(request.body ? { body: request.body, duplex: 'half' } : {}),
          redirect: 'manual',
          signal,
        });
        if (upstream.status >= 300 && upstream.status < 400) {
          await upstream.body?.cancel();
          return failure(502, 'Réponse inattendue du service.');
        }
        const mediaType = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        const isJson = mediaType === 'application/json' || mediaType.endsWith('+json');
        const isPdf = /^\/api\/v1\/bulletins\/[a-z0-9-]+\/pdf$/.test(destination.pathname) && mediaType === 'application/pdf';
        const noBody = upstream.status === 204 || upstream.status === 205 || (request.method === 'HEAD' && upstream.ok);
        if (noBody || isJson || (upstream.ok && isPdf)) break;
        await upstream.body?.cancel();
        // Render Free peut renvoyer sa page de réveil en HTML, même sous HTTP 200.
        // Ne rejouer JAMAIS une écriture : son résultat peut être incertain.
        if (readOnly && mediaType === 'text/html' && [200, 502, 503, 504].includes(upstream.status)) {
          await new Promise((resolve, reject) => {
            if (signal.aborted) return reject(signal.reason);
            const abort = () => { clearTimeout(timer); reject(signal.reason); };
            const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 2000);
            signal.addEventListener('abort', abort, { once: true });
          });
          continue;
        }
        return failure(503, readOnly ? 'Le serveur démarre ou répond de façon inattendue. Réessayez.' : 'Réponse non confirmée. Vérifiez l’état de l’opération avant de réessayer.', '5');
      }

      const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
      for (const name of outputHeaders) {
        if (upstream.headers.has(name)) responseHeaders.set(name, upstream.headers.get(name));
      }
      for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append('Set-Cookie', cookie);

      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch {
      const readOnly = request.method === 'GET' || request.method === 'HEAD';
      return failure(503, readOnly ? 'Le serveur démarre ou est indisponible. Réessayez.' : 'Réponse non confirmée. Vérifiez l’état de l’opération avant de réessayer.', '5');
    }
  },
};
