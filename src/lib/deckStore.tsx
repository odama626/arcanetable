import { createStore, SetStoreFunction, unwrap } from 'solid-js/store';
import { nanoid } from 'nanoid';
import { createContext, onMount, ParentProps, useContext } from 'solid-js';
import { CardEntry, Deck, DetailedCardEntry } from './constants';
import { loadCardList, fetchCardInfo } from './deck';
import { getCardArtImage } from './card';
import {
  CardSystem,
  DEFAULT_CARD_SYSTEM_URI,
  setCardSystem as setGlobaCardSystem,
} from './globals';
import { useSearchParams } from '@solidjs/router';

const defaultDeckStore = {
  decks: {},
  systems: {},
};

export const createDeckStore = () => {
  const [store, setStore] = createStore<DeckStore>(defaultDeckStore);

  let deckStore = getDeckStore();
  setStore(deckStore);

  const updateStore: typeof setStore = (...update: any[]) => {
    (setStore as any)(...update);
    let raw = unwrap(store);
    localStorage.setItem('decks', JSON.stringify(raw));
  };

  return [store, updateStore] as const;
};

interface DeckStore {
  decks: Record<string, Deck>;
  systems: Record<string, CardSystem[]>;
}

export function getDeckStore(): DeckStore {
  let storeString = localStorage.getItem('decks');
  if (!storeString) return defaultDeckStore;
  let store = JSON.parse(storeString) as DeckStore;

  if (Array.isArray(store.decks)) {
    let deckEntries = store.decks.map<[string, Deck]>(deck => [deck.id ?? nanoid(), deck]);
    store.decks = Object.fromEntries(deckEntries);
    store.systems ??= { unsorted: [] };
    store.systems.unsorted.push(...deckEntries.map(entry => entry[0]));
    localStorage.setItem('decks', JSON.stringify(store));
  }

  return store;
}

const DEFAULT_DECK = {
  cards: {},
  inPlay: {},
};

export function getCardKey(entry: CardEntry) {
  return entry.id;
}

export async function hydrateDeck(deck: Deck) {
  let cache = new Map();

  // migrate to deck v2
  if (deck.cardList) {
    let cardList = loadCardList(deck.cardList);
    deck.cardList = undefined;
    deck.deck = undefined;

    deck.cards = Object.fromEntries(cardList.map(card => [getCardKey(card), card]));
    if (!deck.system) {
      deck.system = 'mtg';
    }
    if (deck.inPlay && Array.isArray(deck.inPlay)) {
      deck.inPlay = Object.fromEntries(deck.inPlay.map(card => [getCardKey(card), card]));
    }
    deck.version = 2;
  }

  // populate all card details
  await Promise.all(
    [
      Object.values(deck.cards ?? {}).map(async card => {
        deck.cards[getCardKey(card)] = await fetchCardInfo(card, cache).catch(() => card);
      }),
      Object.values(deck.inPlay ?? {}).map(async card => {
        deck.inPlay[getCardKey(card)] = await fetchCardInfo(card, cache).catch(() => card);
      }),
    ].flat(),
  );

  deck = Object.assign({}, structuredClone(DEFAULT_DECK), deck);

  return deck;
}

export function serializeDeck(deck: Deck) {
  const serializedDeck = { ...deck, cards: {}, inPlay: {} };

  let mostPopularCard: DetailedCardEntry;

  for (const [name, card] of Object.entries(deck.cards)) {
    if (card.qty < 1) continue;
    serializedDeck.cards[name] = { ...card, detail: undefined };
    if (!mostPopularCard || card.detail.popularity > mostPopularCard?.detail?.popularity) {
      mostPopularCard = card;
    }
  }

  for (const [name, card] of Object.entries(deck.inPlay)) {
    if (card.qty < 1) continue;
    serializedDeck.inPlay[name] = { ...card, detail: undefined };
    if (!mostPopularCard || card.detail.popularity > mostPopularCard?.detail?.popularity) {
      mostPopularCard = card;
    }
  }
  serializedDeck.coverImage = getCardArtImage(mostPopularCard!);
  return serializedDeck;
}

function getCardSystemStore() {
  let state = localStorage.getItem(`card-systems`);
  if (!state) return { systems: {}, system: '' };
  return JSON.parse(state);
}

export function CardSystemProvider(props: ParentProps) {
  const [store, setStore] = createStore<CardSystemStore>({ systems: {}, system: '' });
  const [searchParams, setSearchParams] = useSearchParams();

  const init = getCardSystemStore();
  setStore(init);

  const updateStore: typeof setStore = (...update: any[]) => {
    (setStore as any)(...update);
    let raw = unwrap(store);
    localStorage.setItem('card-systems', JSON.stringify(raw));
  };

  async function initCardSystem(uri = DEFAULT_CARD_SYSTEM_URI) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Failed to load card system');
    const system = await response.json();
    system.uri = uri;

    updateStore('systems', system.id, system);
    updateStore('system', system.id);
    setGlobaCardSystem(system);
    return system;
  }

  onMount(async () => {
    let systemUri = searchParams.system;
    if (systemUri && typeof systemUri === 'string') {
      await initCardSystem(systemUri);
      setSearchParams({ system: undefined });
    } else {
      systemUri = store.systems[store.system]?.uri;
      await initCardSystem(systemUri);
    }
  });

  async function setCardSystem(systemId: string) {
    let system = store.systems[systemId];
    if (!system) {
      throw new Error(`system ${systemId} not found`);
    }
    return await initCardSystem(system.uri);
  }

  return (
    <CardSystemContext.Provider value={[store, { update: updateStore, setCardSystem }]}>
      {props.children}
    </CardSystemContext.Provider>
  );
}

interface CardSystemStore {
  systems: Record<string, CardSystem>;
  system: string;
}

type CardSystemStoreContextType = [
  CardSystemStore,
  {
    update: SetStoreFunction<CardSystemStore>;
    setCardSystem(name: string): Promise<CardSystem>;
  },
];
const CardSystemContext = createContext<CardSystemStoreContextType>();

export function useCardSystemContext() {
  return useContext(CardSystemContext) as CardSystemStoreContextType;
}
