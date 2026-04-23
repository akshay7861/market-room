export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  // CORS and security headers are applied at the router wrapper level (handleRequest),
  // not here, so every response path gets them exactly once.
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers
  });
}
