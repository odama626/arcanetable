import { expect, test } from 'vitest';
import { Deck } from './deck';
import { headlessInit } from './globals';
import { createMockDecklist, useAnimations } from './testingUtils';

headlessInit();
useAnimations();

test('deck sort', async () => {
  const deck = new Deck(createMockDecklist());
  const remoteDeck = new Deck(createMockDecklist());

  let order = await deck.shuffle();
  let secondOrder = await remoteDeck.shuffle(order);

  expect(order).toEqual(secondOrder);
  expect(deck.cards.map(card => card.mesh.position.toArray())).toEqual(
    remoteDeck.cards.map(card => card.mesh.position.toArray())
  );
});
