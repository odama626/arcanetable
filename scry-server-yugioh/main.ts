import app, { CACHE_TTL } from "./server.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const args = parseArgs(Deno.args, { default: { port: 8789 } });
const PORT = Number(args.port);
const kv = await Deno.openKv();

const fetching = new Set<string>();

type CachedEntry = { body: Uint8Array; headers: Record<string, string>; cachedAt: number };

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

async function fetchAndCache(req: Request, key: string[]): Promise<Response | null> {
  const keyStr = key.join(":");
  if (fetching.has(keyStr)) return null;
  fetching.add(keyStr);
  try {
    const res = await app.fetch(req);
    if (res.ok && res.headers.get("Content-Type")?.includes("application/json")) {
      const body = await res.text();
      const headers = Object.fromEntries(res.headers.entries());
      const compressed = await compress(body);
      await kv.set(key, { body: compressed, headers, cachedAt: Date.now() }, { expireIn: CACHE_TTL * 1000 });
      console.log(`KV set: ${key[1]} (${compressed.byteLength}b compressed)`);
      return new Response(body, { headers });
    }
    return res;
  } finally {
    fetching.delete(keyStr);
  }
}

async function cachedFetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const key = ["yugioh-v7", url.pathname + url.search];

  try {
    const hit = await kv.get<CachedEntry>(key);
    if (hit.value) {
      const age = (Date.now() - hit.value.cachedAt) / 1000;
      if (age > CACHE_TTL) {
        console.log(`KV stale: ${key[1]}, refreshing in background`);
        fetchAndCache(req.clone(), key).catch(console.error);
      } else {
        console.log(`KV hit: ${key[1]}`);
      }
      const body = await decompress(hit.value.body);
      return new Response(body, { headers: hit.value.headers });
    }

    // Cold miss — have to wait
    const res = await fetchAndCache(req, key);
    if (res) return res;

    return app.fetch(req);
  } catch (e) {
    console.error(`Error on ${url.pathname + url.search}:`, e);
    // Sentry.captureException(e); // ← add when ready
    return new Response("Internal Server Error", { status: 500 });
  }
}

console.log(`\nDev proxy listening on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, cachedFetch);
