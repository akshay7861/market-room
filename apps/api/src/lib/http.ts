export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Client-Id, X-Admin-Token");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");

  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers
  });
}
