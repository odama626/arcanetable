import { expect, test } from 'vitest';
import { headlessInit } from './lib/globals';
import { PlayArea } from './lib/playArea';
import { createMockDecklist, useAnimations } from './lib/testingUtils';
import { handleEvent } from './remoteEvents';

headlessInit();
useAnimations();

test('mulligan', async () => {
  const playArea = new PlayArea(0, createMockDecklist(), { isLocalPlayer: true });

  await playArea.mulligan(7);
  await playArea.mulligan(7);
  await playArea.mulligan(7);

  expect(playArea.hand.cards.length).toEqual(7);
});

test('remote mulligan then join', async () => {
  const playArea = new PlayArea(0, createMockDecklist(), { isLocalPlayer: true });
  const remotePlayArea = PlayArea.FromNetworkState(playArea.getLocalState());
  let events = [];

  playArea.subscribeEvents(event => events.push(event));

  await playArea.mulligan(7);
  await playArea.mulligan(7);
  await playArea.mulligan(7);

  for (const event of events) {
    await handleEvent(event, remotePlayArea);
  }

  expect(playArea.hand.cards.length).toEqual(7);
  expect(remotePlayArea.hand.cards.length).toEqual(7);
  expect(playArea.hand.cards.map(card => card.id)).toEqual(
    remotePlayArea.hand.cards.map(card => card.id)
  );
});
