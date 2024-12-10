import { EulerTuple, Mesh, Object3D, Vector3Tuple } from 'three';

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
  position: Vector3Tuple;
  rotation: EulerTuple;
}
export interface CardZone<AddOptions = {} & { skipAnimation?: boolean; destroy?: boolean }> {
  id: string;
  zone: string;
  mesh: Object3D;
  removeCard(cardMesh: Mesh): void;
  addCard(card: Card, opts?: AddOptions): void;
  getSerializable(): { id: string };
  observable: { cardCount: number };
  cards: Card[];
}

export const FORMATS = [
  { name: 'Commander' },
  { name: 'Modern' },
  { name: 'Standard' },
  { name: 'Pauper' },
  { name: 'Alchemy' },
  { name: 'Amonkhet Block' },
  { name: 'Battle for Zendikar Block' },
  { name: 'Brawl' },
  { name: 'Duel Commander' },
  { name: 'Historic' },
  { name: 'Ice Age Block' },
  { name: 'Innistrad Block' },
  { name: 'Invasion Block' },
  { name: 'Ixalan Block' },
  { name: 'Kaladesh Block' },
  { name: 'Kamigawa Block' },
  { name: 'Legacy' },
  { name: 'Lorwyn Block' },
  { name: 'Masques Block' },
  { name: 'Mirage Block' },
  { name: 'Mirrodin Block' },
  { name: 'Odyssey Block' },
  { name: 'Onslaught Block' },
  { name: 'Penny Dreadful' },
  { name: 'Pioneer' },
  { name: 'Premodern' },
  { name: 'Ravnica Block' },
  { name: 'Return to Ravnica Block' },
  { name: 'Scars of Mirrodin Block' },
  { name: 'Shadows Over Innistrad Block' },
  { name: 'Shards of Alara Block' },
  { name: 'Tarkir Block' },
  { name: 'Tempest Block' },
  { name: 'Theros Block' },
  { name: 'Time Spiral Block' },
  { name: 'Unsets' },
  { name: 'Urza Block' },
  { name: 'Vintage' },
  { name: 'Zendikar Block' },
];
