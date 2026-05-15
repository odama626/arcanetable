// dev.ts — local only, never deployed
import app, { CACHE_TTL } from "./server.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const args = parseArgs(Deno.args, { default: { port: 8788 } });
const PORT = Number(args.port);

const kv = await Deno.openKv();

type CachedEntry = { body: Uint8Array; headers: Record<string, string> };

async function compress(text: string): Promise<Uint8Array> {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(new TextEncoder().encode(text));
  writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function decompress(data: Uint8Array): Promise<string> {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(data);
  writer.close();
  return new Response(stream.readable).text();
}

// Wrap app.fetch with KV caching
async function cachedFetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const key = ["mtg-system-v10", url.pathname + url.search];

  const hit = await kv.get<CachedEntry>(key);
  if (hit.value) {
    console.log(`KV hit: ${key[1]}`);
    const body = await decompress(hit.value.body);
    return new Response(body, { headers: hit.value.headers });
  }

  const res = await app.fetch(req);

  // Only cache successful JSON responses
  if (res.ok && res.headers.get("Content-Type")?.includes("application/json")) {
    const body = await res.text();
    const headers = Object.fromEntries(res.headers.entries());
    const compressed = await compress(body);
    await kv.set(key, { body: compressed, headers }, { expireIn: CACHE_TTL * 1000 });
    console.log(`KV set: ${key[1]} (${compressed.byteLength}b compressed)`);
    return new Response(body, { headers });
  }

  return res;
}

console.log(`\nDev proxy listening on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, cachedFetch);
