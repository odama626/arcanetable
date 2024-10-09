import { Mesh } from 'three';
import { expect, test } from 'vitest';
import { Deck } from './deck';
import { headlessInit } from './globals';
import { renderAnimations } from './animations';

function createDeckList() {
  return new Array(20).fill(0).map((_, i) => ({ id: i, mesh: new Mesh() }));
}

headlessInit();

test('deck sort', async () => {
  const deck = new Deck(createDeckList());
  const remoteDeck = new Deck(createDeckList());

  let order = await deck.shuffle();
  let secondOrder = await remoteDeck.shuffle(order);

  renderAnimations(20000);

  expect(order).toEqual(secondOrder);
  expect(deck.cards.map(card => card.mesh.position.toArray())).toEqual(
    remoteDeck.cards.map(card => card.mesh.position.toArray())
  );
});
