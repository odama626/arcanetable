import { createStore, unwrap } from 'solid-js/store';
import { nanoid } from 'nanoid';
import { Deck } from './ui/deckEditor';

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
  systems: Record<string, string[]>;
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

export function createCardSystemStore() {
  const [store, setStore] = createStore({ systems: {} });

  let state = localStorage.getItem(`card-systems`);
  setStore(store => {
    if (!state) return store;
    return JSON.parse(state);
  });

  function updateStore(...update) {
    console.log({ update });
    setStore(...update);
    let raw = unwrap(store);
    localStorage.setItem('card-systems', JSON.stringify(raw));
  }

  return [store, updateStore] as const;
}
