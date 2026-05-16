import { Hono } from 'hono';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const HOSTNAME = 'ygoprodeck.com';
const SCRY_SERVER_ID = 'scry-server-yugioh';
const YGOPRODECK = 'https://db.ygoprodeck.com/api/v7';
export const CACHE_TTL = 86_400; // 24hr in seconds

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface YgoImage {
  id: number;
  image_url: string;
  image_url_small: string;
  image_url_cropped?: string;
}

interface YgoCard {
  id: number;
  name: string;
  type: string;
  frameType?: string;
  desc: string;
  race?: string;
  attribute?: string;
  atk?: number;
  def?: number;
  level?: number;
  scale?: number;
  linkval?: number;
  card_sets?: Array<{ set_name: string; set_code: string; set_rarity: string }>;
  card_images?: YgoImage[];
  card_prices?: Record<string, string>[];
  [key: string]: unknown;
}

interface YgoList {
  data: YgoCard[];
  meta?: {
    current_rows: number;
    total_rows: number;
    rows_remaining: number;
    total_pages: number;
    pages_remaining: number;
  };
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
    'Cache-Control': 'public, max-age=604800, s-maxage=604800',
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
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? url.host;
  return `${proto}://${host}`;
}

// ── YGOPRODECK FETCH ──────────────────────────────────────────────────────────

async function ygoFetch(path: string): Promise<Response> {
  const res = await fetch(`${YGOPRODECK}${path}`, {
    headers: { 'User-Agent': 'scry-server-yugioh/1.0' },
  });
  return res;
}

// ── MAPPING ───────────────────────────────────────────────────────────────────

function imageUris(
  card: YgoCard,
  baseUrl: string,
): { full: Record<string, string>; art: Record<string, string> } {
  const full: Record<string, string> = {};
  const art: Record<string, string> = {};

  (card.card_images ?? []).forEach((img, i) => {
    const key = i === 0 ? card.name : `${card.name}_${i}`;
    full[key] = `${baseUrl}/card_images/?uri=${encodeURIComponent(img.image_url)}`;
    if (img.image_url_cropped) {
      art[key] = `${baseUrl}/card_art/?uri=${encodeURIComponent(img.image_url_cropped)}`;
    } else {
      art[key] = `${baseUrl}/card_art/?uri=${encodeURIComponent(img.image_url_small)}`;
    }
  });

  return { full, art };
}

function mapCard(card: YgoCard, baseUrl: string): Record<string, unknown> {
  const { card_images: _ci, card_prices: _cp, ...rest } = card;
  return {
    ...rest,
    name: card.name,
    type: card.type,
    type_line: [card.type, card.race, card.attribute].filter(Boolean).join(' — '),
    effect: card.desc,
    flavor: '',
    atk: card.atk,
    def: card.def,
    level: card.level,
    image_uris: imageUris(card, baseUrl),
  };
}

function mapList(
  cards: YgoCard[],
  baseUrl: string,
  meta: { total?: number; page?: number; query?: Record<string, unknown> } = {},
): Record<string, unknown> {
  const total = meta.total ?? cards.length;
  const page = meta.page ?? 1;
  return {
    id: SCRY_SERVER_ID,
    object: 'list',
    total_cards: total,
    total_pages: Math.ceil(total / 50),
    page,
    query: meta.query ?? {},
    data: cards.map(c => mapCard(c, baseUrl)),
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
      name: 'Yugioh',
      uri: baseUrl,
      cardDetailEndpoint: `${baseUrl}/cards/named`,
      cardSearchEndpoint: `${baseUrl}/cards/search`,
      // cardBack: `${baseUrl}/res/card-back.webp`,
      imageUriFormat: 'standard',
      types: [
        'Effect Monster',
        'Normal Monster',
        'Fusion Monster',
        'Synchro Monster',
        'XYZ Monster',
        'Link Monster',
        'Pendulum Effect Monster',
        'Spell Card',
        'Trap Card',
      ],
      searchField: {
        filterEmpty: true,
        searchFields: [
          { field: 'name' },
          { field: 'type' },
          { field: 'type_line' },
          { field: 'race' },
          { field: 'attribute' },
          { field: 'effect' },
          { field: 'level' },
          { field: 'atk' },
          { field: 'def' },
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
    const res = await ygoFetch(`/cardinfo.php?${new URLSearchParams({ id })}`);
    if (res.status === 400) return errorResponse('not_found', `No card with id "${id}"`, 404);
    if (!res.ok) return errorResponse('upstream_error', `YGOProDeck returned ${res.status}`, 502);
    const list = (await res.json()) as YgoList;
    const card = list.data?.[0];
    if (!card) return errorResponse('not_found', `No card with id "${id}"`, 404);
    return new Response(JSON.stringify(mapCard(card, baseUrl)), {
      status: 200,
      headers: cacheHeaders(),
    });
  }

  if (!exact) return errorResponse('bad_request', "Missing 'exact' or 'id' parameter", 400);

  const params = new URLSearchParams({ name: exact });
  if (set) params.set('cardset', set);

  const res = await ygoFetch(`/cardinfo.php?${params}`);
  if (res.status === 400) return errorResponse('not_found', `No card found for "${exact}"`, 404);
  if (!res.ok) return errorResponse('upstream_error', `YGOProDeck returned ${res.status}`, 502);

  const list = (await res.json()) as YgoList;
  const card = list.data?.[0];
  if (!card) return errorResponse('not_found', `No card found for "${exact}"`, 404);

  return new Response(JSON.stringify(mapCard(card, baseUrl)), {
    status: 200,
    headers: cacheHeaders(),
  });
});

app.get('/cards/search', async c => {
  const q = c.req.query('q');
  const type = c.req.query('type');
  const page = Math.max(Number(c.req.query('page') ?? 1), 1);
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const offset = (page - 1) * limit;
  const baseUrl = getBaseUrl(c.req.raw);

  const params = new URLSearchParams();
  if (q) params.set('fname', q);
  if (type) params.set('type', type);
  params.set('num', String(limit));
  params.set('offset', String(offset));

  const res = await ygoFetch(`/cardinfo.php?${params}`);

  if (res.status === 400) {
    return new Response(JSON.stringify(mapList([], baseUrl, { total: 0, page, query: { q, type } })), {
      status: 200,
      headers: cacheHeaders(),
    });
  }
  if (!res.ok) return errorResponse('upstream_error', `YGOProDeck returned ${res.status}`, 502);

  const list = (await res.json()) as YgoList;
  const total = list.meta?.total_rows ?? list.data.length;
  return new Response(
    JSON.stringify(mapList(list.data, baseUrl, { total, page, query: { q, type } })),
    { status: 200, headers: cacheHeaders() },
  );
});

app.get('/draft', async c => {
  const count = Math.min(Number(c.req.query('count') ?? 10), 100);
  const seed = Number(c.req.query('seed') ?? 1);
  const baseUrl = getBaseUrl(c.req.raw);

  if (!Number.isFinite(seed)) return errorResponse('bad_request', 'Invalid seed', 400);

  // Pull a random page using seed-derived offset
  const offset = (Math.abs(seed) % 20) * 50;
  const params = new URLSearchParams({ num: '50', offset: String(offset) });

  const res = await ygoFetch(`/cardinfo.php?${params}`);
  if (!res.ok) return errorResponse('upstream_error', `YGOProDeck returned ${res.status}`, 502);

  const list = (await res.json()) as YgoList;
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
  if (!allowed.hostname.endsWith(HOSTNAME)) {
    return errorResponse('bad_request', 'URI not allowed', 400);
  }

  const res = await fetch(uri);
  if (!res.ok) return errorResponse('not_found', 'Image not found', 404);
  return new Response(res.body, {
    status: 200,
    headers: {
      ...imageCacheHeaders(),
      'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream,',
    },
  });
}

export default app;
