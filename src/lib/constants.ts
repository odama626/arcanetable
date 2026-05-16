import { EulerTuple, Mesh, Object3D, Vector2, Vector3, Vector3Tuple } from 'three';
import { CardSystem } from './globals';

export const CARD_WIDTH = 63 / 4;
export const CARD_HEIGHT = 88 / 4;
export const CARD_THICKNESS = 0.5 / 4;
export const CARD_STACK_OFFSET = 2;

export const ZONE_OUTLINE_COLOR = 0xffffff;
export const CARD_ZONE_COLOR = 0x1a1533;

interface CardDetailPart {
  name: string;
  component: 'token' | unknown;
  uri: string;
}

export interface CardEntryDetail {
  image_uris: Record<string, string>;
  name: string;
  search: string;
  type_line: string;
  popularity: number;
  all_parts?: CardDetailPart[];
  card_faces?: CardEntryDetail[];
}

export type HoverSignal = HoverSignalBase | HoverSignalWithTarget | undefined;

export interface HoverSignalBase {
  mouse: Vector2;
}

export interface HoverSignalWithTarget extends HoverSignalBase {
  mesh: Mesh;
  tether: Vector3;
}

export interface CardEntry {
  id: string;
  name: string;
  qty: number;
  categories: string[];
  set: string;
}

export interface DetailedCardEntry extends CardEntry {
  detail: CardEntryDetail;
}

export interface Card {
  mesh: Mesh;
  id: string;
  clientId: number;
  detail: CardEntryDetail;
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

export interface Counter {
  id: string;
  name: string;
  color: string;
}

export interface Deck {
  id: string;
  version: number;
  system: string;
  cards: Record<string, DetailedCardEntry>;
  inPlay: Record<string, DetailedCardEntry>;
  tags?: { name: string }[];
  startingLife: number;
  name: string;
  cardList?: string;
  coverImage?: string;
  counters?: Counter[];
}

export interface LoadSettings {
  name: string;
  startingLife: number;
  deck: Deck;
  cardSystem: CardSystem;
}

export interface GameOptions extends LoadSettings {
  gameId: string;
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
