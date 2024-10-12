import { Mesh } from 'three';

export const CARD_WIDTH = 63 / 4;
export const CARD_HEIGHT = 88 / 4;
export const CARD_THICKNESS = 0.5 / 4;
export const CARD_STACK_OFFSET = 2;

export interface Card {
  mesh: Mesh;
  id: string;
  modifiers: {
    pt: Mesh;
    [id: string]: Mesh;
  };
}
