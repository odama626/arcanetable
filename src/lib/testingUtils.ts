import { beforeEach } from 'vitest';
import { renderAnimations } from './animations';
import { clock, expect } from './globals';
import { Mesh } from 'three';
import { Card } from './constants';

export function useAnimations() {
  let time = 0;
  let animating = false;

  function animate() {
    renderAnimations(time);
    time += 1000;
    if (animating) setTimeout(animate, 10);
  }

  beforeEach(() => {
    expect(!!clock, 'headlessInit() required for useAnimations()');
    time = 0;
    animating = true;
    animate();

    return () => {
      animating = false;
    };
  });
}

export function createMockDecklist() {
  return new Array(20)
    .fill(0)
    .map((_, i) => ({ id: i, mesh: new Mesh(), detail: {} })) as unknown as Card[];
}
