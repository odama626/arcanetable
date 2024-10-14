import { Mesh } from 'three';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { Card } from './lib/constants';
import { PlayArea } from './lib/playArea';
import { headlessInit } from './lib/globals';
import { renderAnimations } from './lib/animations';

function createDeckList() {
  return new Array(20)
    .fill(0)
    .map((_, i) => ({ id: i, mesh: new Mesh(), detail: {} })) as unknown as Card[];
}

let time = 0;
let animating = false;

function animate() {
  renderAnimations(time);
  time += 1000;
  if (animating) setTimeout(animate, 10);
}

beforeEach(() => {
  headlessInit();
  time = 0;
  animating = true;
  animate();
});

afterEach(() => {
  animating = false;
});

test('mulligan', async () => {
  const playArea = new PlayArea(0, createDeckList(), { isLocalPlayer: true });

  await playArea.mulligan(7);
  await playArea.mulligan(7);
  await playArea.mulligan(7);

  expect(playArea.hand.cards.length).toEqual(7);
});
