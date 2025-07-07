import { createStore, unwrap } from 'solid-js/store';

export const createDeckStore = () => {
  const [store, setStore] = createStore({ decks: [] });

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

  return [store, updateStore];
};
