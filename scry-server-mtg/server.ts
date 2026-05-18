import { Hono } from 'hono';

// ── CONFIG ────────────────────────────────────────────────────────────────────

const SCRYFALL = 'https://api.scryfall.com';
export const CACHE_TTL = 12 * 3600; // 12hr in seconds
const SCRY_SERVER_ID = 'scry-server-mtg';

const TYPE_ALIASES: Record<string, string> = {
  creature: '(t:creature or t:summon)',
  land: '(t:land)', // "Basic Land" already matches t:land — Scryfall includes subtypes
  instant: '(t:instant or t:interrupt)', // covers legacy "Interrupt" cards
  artifact: 't:artifact',
  enchantment: 't:enchantment',
  sorcery: 't:sorcery',
  planeswalker: 't:planeswalker',
};

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface ScryfallCard {
  name: string;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  image_uris: Record<string, string>;
  card_faces?: Array<{ image_uris?: Record<string, string>; name: string }>;
  all_parts?: Array<{
    id: string;
    name: string;
    uri: string;
    component: string;
    type_line: string;
  }>;
  [key: string]: unknown;
}

interface ImageUris {
  full: Record<string, string>;
  art: Record<string, string>;
}

interface ScryfallList {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
  total_cards?: number;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function cacheHeaders(ttl = CACHE_TTL): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
  };
}

function imageCacheHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=604800, s-maxage=604800`,
  };
}

function errorResponse(code: string, details: string, status: number): Response {
  return new Response(JSON.stringify({ object: 'error', code, details }), {
    status,
    headers: cacheHeaders(0),
  });
}

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto =
    req.headers.get('x-forwarded-scheme') ??
    req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ??
    'http';
  const host = req.headers.get('x-forwarded-host')?.split(',')[0].trim() ?? url.host;
  return `${proto}://${host}`;
}

// ── SCRYFALL FETCH ────────────────────────────────────────────────────────────
const cache = typeof caches !== 'undefined' ? caches.default : null;

async function scryfallFetch(path: string): Promise<Response> {
  const url = path.startsWith('http') ? path : `${SCRYFALL}${path}`;
  const cacheKey = new Request(url);

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      return new Response(hit.body, {
        ...hit,
        headers: {
          ...Object.fromEntries(hit.headers),
          'x-cache': 'HIT',
        },
      });
    }
  }

  const res = await fetch(url, { headers: { 'User-Agent': 'scry-server-mtg/1.0' } });

  if (cache && res.ok) {
    const toCache = new Response(res.clone().body, res);
    toCache.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    await cache.put(cacheKey, toCache);
  }

  return res;
}
// ── MAPPING ───────────────────────────────────────────────────────────────────

function imageUris(
  card: { name: string; image_uris?: Record<string, string> },
  baseUrl: string,
): ImageUris | undefined {
  const normal = card.image_uris?.normal ?? card.image_uris?.large;
  const crop = card.image_uris?.art_crop;
  if (!normal && !crop) return undefined;
  return {
    full: normal
      ? { [card.name]: `${baseUrl}/card_images/?uri=${encodeURIComponent(normal)}` }
      : {},
    art: crop ? { [card.name]: `${baseUrl}/card_art/?uri=${encodeURIComponent(crop)}` } : {},
  };
}

function mapCard(card: ScryfallCard, baseUrl: string): Record<string, unknown> {
  const { image_uris: _iu, card_faces: _cf, ...rest } = card;
  return {
    id: card.id,
    ...rest,
    card_faces: (card.card_faces ?? []).map(face => ({
      ...face,
      image_uris: imageUris(face, baseUrl),
    })),
    name: card.name,
    all_parts: (card.all_parts ?? []).map(part => ({
      ...part,
      uri: `${baseUrl}/cards/named?id=${part.id}`,
    })),
    type: (card.type_line ?? '').replace(/^Summon\b/i, 'Creature —'),
    effect: card.oracle_text ?? '',
    flavor: card.flavor_text ?? '',
    image_uris: imageUris(card, baseUrl),
  };
}

// ── DRAFT PRNG ────────────────────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── APP ───────────────────────────────────────────────────────────────────────

const app = new Hono();

app.get('/', c => {
  const baseUrl = getBaseUrl(c.req.raw);
  return c.json(
    {
      id: SCRY_SERVER_ID,
      name: 'Magic The Gathering',
      uri: `${baseUrl}`,
      cardDetailEndpoint: `${baseUrl}/cards/named`,
      cardSearchEndpoint: `${baseUrl}/cards/search`,
      // cardBack: `${baseUrl}/res/card-back.webp`,
      imageUriFormat: 'standard',
      types: ['creature', 'planeswalker', 'land', 'instant', 'sorcery', 'enchantment', 'artifact'],
      searchField: {
        filterEmpty: true,
        searchFields: [
          { field: 'name' },
          { field: 'type_line' },
          { field: 'cmc' },
          { field: 'mana_cost' },
          { field: 'oracle_text' },
          { field: 'mana_cost', transform: 'stripBracces' },
          { field: 'card_faces', recurse: true },
        ],
      },
    },
    200,
    cacheHeaders(),
  );
});

app.get('/cards/named', async c => {
  const id = c.req.query('id');
  const exact = c.req.query('exact');
  const set = c.req.query('set');
  const baseUrl = getBaseUrl(c.req.raw);

  if (id) {
    const res = await scryfallFetch(`/cards/${encodeURIComponent(id)}`);
    if (res.status === 404) return errorResponse('not_found', `No card with id "${id}"`, 404);
    if (res.status === 429) return errorResponse('rate_limited', 'Scryfall rate limit hit', 503);
    if (!res.ok) return errorResponse('upstream_error', `Scryfall returned ${res.status}`, 502);
    const card = (await res.json()) as ScryfallCard;
    return new Response(JSON.stringify(mapCard(card, baseUrl)), {
      status: 200,
      headers: cacheHeaders(),
    });
  }

  if (!exact) return errorResponse('bad_request', "Missing 'exact' or 'id' parameter", 400);

  const params = new URLSearchParams({ exact });
  if (set) params.set('set', set);

  const res = await scryfallFetch(`/cards/named?${params}`);
  if (res.status === 404) return errorResponse('not_found', `No card found for "${exact}"`, 404);
  if (res.status === 429) return errorResponse('rate_limited', 'Scryfall rate limit hit', 503);
  if (!res.ok) return errorResponse('upstream_error', `Scryfall returned ${res.status}`, 502);

  const card = (await res.json()) as ScryfallCard;
  return new Response(JSON.stringify(mapCard(card, baseUrl)), {
    status: 200,
    headers: cacheHeaders(),
  });
});

app.get('/cards/search', async c => {
  const q = c.req.query('q') ?? '';
  const types = c.req.queries('type') ?? [];
  const page = c.req.query('page') ?? '1';
  const baseUrl = getBaseUrl(c.req.raw);

  let sfQuery = q;
  let typeQuery = types.map(t => TYPE_ALIASES[t.toLowerCase()] ?? `t:${t}`).join(' or ');

  if (types.length >1) {
    typeQuery = `(${typeQuery})`
  }
  sfQuery += ` ${typeQuery}`
  
  sfQuery = sfQuery.trim() || '*';
  const params = new URLSearchParams({ q: sfQuery, order: 'name', page });
  const res = await scryfallFetch(`/cards/search?${params}`);

  const baseBody = { id: SCRY_SERVER_ID, object: 'list', page: Number(page), query: { q, types } };

  if (res.status === 404)
    return new Response(JSON.stringify({ ...baseBody, total_cards: 0, total_pages: 0, data: [] }), {
      status: 200,
      headers: cacheHeaders(),
    });

  if (res.status === 429) return errorResponse('rate_limited', 'Scryfall rate limit hit', 503);
  if (!res.ok) return errorResponse('upstream_error', `Scryfall returned ${res.status}`, 502);

  const list = (await res.json()) as ScryfallList;
  const totalCards = list.total_cards ?? list.data.length;

  return new Response(
    JSON.stringify({
      ...baseBody,
      total_cards: totalCards,
      total_pages: Math.ceil(totalCards / 175),
      data: list.data.map(card => minimalCard(mapCard(card, baseUrl))),
    }),
    { status: 200, headers: cacheHeaders() },
  );
});

function minimalCard(card: Record<string, unknown>) {
  const faces = card.card_faces as any[];
  return {
    id: card.id,
    name: card.name,
    type: card.type,
    type_line: card.type_line,
    cmc: card.cmc,
    mana_cost: card.mana_cost,
    oracle_text: card.oracle_text,
    image_uris: card.image_uris,
    card_faces: faces?.map(face => ({
      name: face.name,
      type_line: face.type_line,
      cmc: face.cmc,
      mana_cost: face.mana_cost,
      oracle_text: face.oracle_text,
      image_uris: face.image_uris,
    })),
  };
}

app.get('/draft', async c => {
  const count = Math.min(Number(c.req.query('count') ?? 10), 100);
  const seed = Number(c.req.query('seed') ?? 1);
  const baseUrl = getBaseUrl(c.req.raw);

  if (!Number.isFinite(seed)) return errorResponse('bad_request', 'Invalid seed', 400);

  const page = (Math.abs(seed) % 10) + 1;
  const params = new URLSearchParams({ q: '*', order: 'name', page: String(page) });
  const res = await scryfallFetch(`/cards/search?${params}`);
  if (!res.ok) return errorResponse('upstream_error', `Scryfall returned ${res.status}`, 502);

  const list = (await res.json()) as ScryfallList;
  const pool = seededShuffle(list.data, seed).slice(0, count);

  return new Response(JSON.stringify(pool.map(card => mapCard(card, baseUrl))), {
    status: 200,
    headers: cacheHeaders(),
  });
});
app.get('/card_images/', handleImageRequest);
app.get('/card_art/', handleImageRequest);

async function handleImageRequest(c) {
  const uri = c.req.query('uri');
  if (!uri) return errorResponse('bad_request', 'Missing uri parameter', 400);

  let allowed: URL;
  try {
    allowed = new URL(uri);
  } catch {
    return errorResponse('bad_request', 'Invalid URI', 400);
  }
  if (!allowed.hostname.endsWith('scryfall.io')) {
    return errorResponse('bad_request', 'URI not allowed', 400);
  }

  const res = await scryfallFetch(uri);
  if (!res.ok) return errorResponse('not_found', 'Image not found', 404);
  return new Response(res.body, {
    status: 200,
    headers: {
      ...imageCacheHeaders(),
      'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream,',
    },
  });
}

// ── START ─────────────────────────────────────────────────────────────────────

console.log(`  GET /cards/named?exact=Black+Lotus`);
console.log(`  GET /cards/search?q=dragon&type=creature&limit=20`);
console.log(`  GET /draft?count=10&seed=42`);
console.log(`  GET /card_images/?uri=<scryfall_image_uri>\n`);

export default app;
