import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";

type ProxyRequest = IncomingMessage & { leyisaClientIp?: string };

export function createRenderProxyMiddleware(secret: string | undefined) {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
    throw new Error("LEYISA_PROXY_SECRET invalide.");
  }
  const expected = Buffer.from(secret, "hex");

  return (request: ProxyRequest, response: ServerResponse, next: () => void) => {
    if (request.url === "/health" && (request.method === "GET" || request.method === "HEAD")) {
      next();
      return;
    }

    const supplied = request.headers["x-leyisa-proxy-secret"];
    if (typeof supplied !== "string" || !/^[a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(expected, Buffer.from(supplied, "hex"))) {
      response.writeHead(403, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ statusCode: 403, message: "Accès refusé." }));
      return;
    }

    const ip = request.headers["x-leyisa-client-ip"];
    if (typeof ip === "string" && isIP(ip)) request.leyisaClientIp = ip;
    next();
  };
}
