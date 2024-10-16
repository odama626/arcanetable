import { Mesh, Object3D } from 'three';

export const CARD_WIDTH = 63 / 4;
export const CARD_HEIGHT = 88 / 4;
export const CARD_THICKNESS = 0.5 / 4;
export const CARD_STACK_OFFSET = 2;

export interface Card {
  mesh: Mesh;
  id: string;
  clientId: number;
  modifiers: {
    pt: Mesh;
    [id: string]: Mesh;
  };
}

export interface SerializableCard {
  id: string;
  userData: Record<string, any>;
  position: [number, number, number];
  rotation: [number, number, number];
}
export interface CardZone<AddOptions = {} & { skipAnimation?: boolean; destroy?: boolean }> {
  id: string;
  zone: string;
  mesh: Object3D;
  removeCard(cardMesh: Mesh): void;
  addCard(card: Card, opts?: AddOptions): void;
  getSerializable(): { id: string };
}
