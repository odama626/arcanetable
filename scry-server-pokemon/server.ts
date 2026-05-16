import { Hono } from 'hono';

// ── CONFIG ────────────────────────────────────────────────────────────────────

const ALLOWED_HOSTS = ['pokemontcg.io', 'scrydex.com'];
const SCRY_SERVER_ID = 'scry-server-pokemon';
const TCGAPI = 'https://api.pokemontcg.io/v2';
export const CACHE_TTL = 2_592_000; // 30 days — cards don't change

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface TcgImage {
  small: string;
  large: string;
}

interface TcgAttack {
  name: string;
  cost: string[];
  convertedEnergyCost: number;
  damage: string;
  text: string;
}

interface TcgAbility {
  name: string;
  text: string;
  type: string;
}

interface TcgWeakness {
  type: string;
  value: string;
}

interface TcgResistance {
  type: string;
  value: string;
}

interface TcgSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: { symbol: string; logo: string };
}

interface TcgCard {
  id: string;
  name: string;
  supertype: string; // "Pokémon" | "Trainer" | "Energy"
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  abilities?: TcgAbility[];
  attacks?: TcgAttack[];
  weaknesses?: TcgWeakness[];
  resistances?: TcgResistance[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: TcgSet;
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  images: TcgImage;
  [key: string]: unknown;
}

interface TcgList {
  data: TcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

interface TcgSingle {
  data: TcgCard;
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
    'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
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

// ── TCG API FETCH ─────────────────────────────────────────────────────────────

async function tcgFetch(path: string): Promise<Response> {
  const res = await fetch(`${TCGAPI}${path}`, {
    headers: { 'User-Agent': 'scry-server-pokemon/1.0' },
  });
  return res;
}

// ── MAPPING ───────────────────────────────────────────────────────────────────

function imageUris(card: TcgCard, baseUrl: string): { full: string[]; art: string[] } {
  return {
    full: [`${baseUrl}/card_images/?uri=${encodeURIComponent(card.images.large)}`],
    art: [`${baseUrl}/card_art/?uri=${encodeURIComponent(card.images.small)}`],
  };
}

function effectText(card: TcgCard): string {
  const parts: string[] = [];
  for (const ab of card.abilities ?? []) {
    parts.push(`[${ab.type}] ${ab.name}: ${ab.text}`);
  }
  for (const atk of card.attacks ?? []) {
    const cost = atk.cost.join(', ');
    const dmg = atk.damage ? ` — ${atk.damage}` : '';
    parts.push(`(${cost}${dmg}) ${atk.name}: ${atk.text}`);
  }
  return parts.join('\n');
}

function mapCard(card: TcgCard, baseUrl: string): Record<string, unknown> {
  return {
    object: 'card',
    id: card.id,
    set: card.set.id,
    name: card.name,
    supertype: card.supertype,
    subtypes: card.subtypes ?? [],
    type: card.types?.[0]?.toLowerCase() ?? null,
    type_line: card.types?.join(' — ') ?? card.supertype,
    hp: card.hp ? Number(card.hp) : null,
    evolves_from: card.evolvesFrom ?? null,
    effect: effectText(card),
    flavor: card.flavorText ?? '',
    weaknesses: card.weaknesses ?? [],
    resistances: card.resistances ?? [],
    retreat_cost: card.convertedRetreatCost ?? null,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    number: card.number,
    pokedex_numbers: card.nationalPokedexNumbers ?? [],
    image_uris: imageUris(card, baseUrl),
  };
}

function mapList(
  cards: Record<string, unknown>[],
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
    data: cards,
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
      name: 'Pokemon',
      uri: baseUrl,
      cardDetailEndpoint: `${baseUrl}/cards/named`,
      cardSearchEndpoint: `${baseUrl}/cards/search`,
      imageUriFormat: 'standard',
      supertypes: ['Pokémon', 'Trainer', 'Energy'],
      types: [
        'colorless',
        'darkness',
        'dragon',
        'fairy',
        'fighting',
        'fire',
        'grass',
        'lightning',
        'metal',
        'psychic',
        'water',
      ],
      searchField: {
        filterEmpty: true,
        searchFields: [
          { field: 'name' },
          { field: 'type' },
          { field: 'type_line' },
          { field: 'supertype' },
          { field: 'subtypes' },
          { field: 'rarity' },
          { field: 'set.name' },
          { field: 'set.series' },
          { field: 'effect' },
          { field: 'flavor' },
          { field: 'hp' },
        ],
      },
    },
    200,
    cacheHeaders(),
  );
});

// GET /cards/named?exact=Charizard&set=sv6&id=sv6-234
// If id is provided, fetches that exact printing directly
// Otherwise falls back to name + optional set lookup
app.get('/cards/named', async c => {
  const id = c.req.query('id');
  const exact = c.req.query('exact');
  const set = c.req.query('set');
  const baseUrl = getBaseUrl(c.req.raw);

  if (id) {
    const res = await tcgFetch(`/cards/${encodeURIComponent(id)}`);
    if (res.status === 404) return errorResponse('not_found', `No card with id "${id}"`, 404);
    if (!res.ok) return errorResponse('upstream_error', `TCG API returned ${res.status}`, 502);
    const single = (await res.json()) as TcgSingle;
    return new Response(JSON.stringify(mapCard(single.data, baseUrl)), {
      status: 200,
      headers: cacheHeaders(),
    });
  }

  if (!exact) return errorResponse('bad_request', "Missing 'exact' or 'id' parameter", 400);

  const clauses = [`name:"${exact}"`];
  if (set) clauses.push(`set.id:${set}`);

  const params = new URLSearchParams({
    q: clauses.join(' '),
    orderBy: '-set.releaseDate',
    pageSize: '1',
  });

  const res = await tcgFetch(`/cards?${params}`);
  if (!res.ok) return errorResponse('upstream_error', `TCG API returned ${res.status}`, 502);

  const list = (await res.json()) as TcgList;
  const card = list.data?.[0];
  if (!card) return errorResponse('not_found', `No card found for "${exact}"`, 404);

  return new Response(JSON.stringify(mapCard(card, baseUrl)), {
    status: 200,
    headers: cacheHeaders(),
  });
});

// GET /cards/search?q=char&type=fire&supertype=Pokémon&set=base1&rarity=Rare&limit=20&page=1
app.get('/cards/search', async c => {
  const q = c.req.query('q');
  const type = c.req.query('type');
  const supertype = c.req.query('supertype');
  const set = c.req.query('set');
  const rarity = c.req.query('rarity');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 250);
  const page = Number(c.req.query('page') ?? 1);
  const baseUrl = getBaseUrl(c.req.raw);

  const clauses: string[] = [];
  if (q) clauses.push(`name:"${q}*"`);
  if (type) clauses.push(`types:${type}`);
  if (supertype) clauses.push(`supertype:${supertype}`);
  if (set) clauses.push(`set.id:${set}`);
  if (rarity) clauses.push(`rarity:"${rarity}"`);

  if (clauses.length === 0) {
    return new Response(
      JSON.stringify(mapList([], { total: 0, page, query: { q, type, supertype, set, rarity } })),
      {
        status: 200,
        headers: cacheHeaders(),
      },
    );
  }

  const params = new URLSearchParams({
    q: clauses.join(' '),
    pageSize: String(limit),
    page: String(page),
    orderBy: '-set.releaseDate',
  });

  const res = await tcgFetch(`/cards?${params}`);
  if (!res.ok) return errorResponse('upstream_error', `TCG API returned ${res.status}`, 502);

  const list = (await res.json()) as TcgList;
  return new Response(
    JSON.stringify(
      mapList(
        list.data.map(card => mapCard(card, baseUrl)),
        { total: list.totalCount, page: list.page, query: { q, type, supertype, set, rarity } },
      ),
    ),
    { status: 200, headers: cacheHeaders() },
  );
});


// GET /draft?count=10&seed=42&supertype=Pokémon
app.get('/draft', async c => {
  const count = Math.min(Number(c.req.query('count') ?? 10), 100);
  const seed = Number(c.req.query('seed') ?? 1);
  const supertype = c.req.query('supertype') ?? 'Pokémon';
  const baseUrl = getBaseUrl(c.req.raw);

  if (!Number.isFinite(seed)) return errorResponse('bad_request', 'Invalid seed', 400);

  const page = (Math.abs(seed) % 50) + 1;
  const params = new URLSearchParams({
    q: `supertype:${supertype}`,
    pageSize: '100',
    page: String(page),
  });

  const res = await tcgFetch(`/cards?${params}`);
  if (!res.ok) return errorResponse('upstream_error', `TCG API returned ${res.status}`, 502);

  const list = (await res.json()) as TcgList;
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
  if (!ALLOWED_HOSTS.some(h => allowed.hostname.endsWith(h))) {
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
