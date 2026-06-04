// Same-origin proxy: the browser never sees BRAIN_API_TOKEN. Forwards the
// chat request to the brain and streams the response straight back.
export const runtime = 'edge';

export async function POST(req: Request): Promise<Response> {
  const origin = new URL(req.url).origin;
  const body = await req.text();

  const res = await fetch(`${origin}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BRAIN_API_TOKEN ?? ''}`,
    },
    body,
  });

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
