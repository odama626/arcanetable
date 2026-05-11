import { createStore, unwrap } from 'solid-js/store';
import { Deck } from './deck';

export const createDeckStore = () => {
  const [store, setStore] = createStore<{ decks: Deck[]}>({ decks: [] });

  let decks = localStorage.getItem(`decks`);
  setStore(store => {
    if (!decks) return store;
    return JSON.parse(decks);
  });

  function updateStore(...update) {
    setStore(...update);
    let raw = unwrap(store);
    localStorage.setItem('decks', JSON.stringify(raw));
  }

  return [store, updateStore] as const;
};

export function createCardSystemStore() {
  const [store, setStore] = createStore({ systems: {} });

  let state = localStorage.getItem(`card-systems`);
  setStore(store => {
    if (!state) return store;
    return JSON.parse(state);
  });

  function updateStore(...update) {
    console.log({ update})
    setStore(...update);
    let raw = unwrap(store);
    localStorage.setItem('card-systems', JSON.stringify(raw));
  }

  return [store, updateStore] as const;
}
