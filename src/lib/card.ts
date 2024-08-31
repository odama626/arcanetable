import {
  BoxGeometry,
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Object3DEventMap,
  Texture,
  Vector3,
} from 'three';
import { cardsById, getProjectionVec, textureLoader } from './globals';
import { counters } from './ui/counterDialog';

export interface Card {
  mesh: Mesh<BoxGeometry, (MeshBasicMaterial | MeshPhongMaterial)[], Object3DEventMap>;
}

let cardBackTexture: MeshBasicMaterial;
let frontAlphaMap;

export const CARD_WIDTH = 63 / 4;
export const CARD_HEIGHT = 88 / 4;
export const CARD_THICKNESS = 0.5 / 4;

export function createCardGeometry(card: Card) {
  const geometry = new BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS);
  cardBackTexture = cardBackTexture || textureLoader.load('/arcane-table-back.webp');
  let cardBack = new MeshStandardMaterial({ map: cardBackTexture });

  cardBack.transparent = true;

  frontAlphaMap = frontAlphaMap || textureLoader.load(`/alphaMap.webp`);
  let front = textureLoader.load(getCardImage(card));

  let frontMesh = new MeshStandardMaterial({
    color: 0xffffff,
    map: front,
    alphaMap: frontAlphaMap,
  });
  frontMesh.transparent = true;

  let materials = [null, null, null, null, frontMesh, cardBack].map(img => {
    if (!img) return new MeshStandardMaterial({ color: 0x000000 });
    return img;
  });
  const mesh = new Mesh(geometry, materials);
  mesh.userData.isInteractive = true;
  mesh.userData.card = card;
  mesh.userData.id = card.id;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  // mesh.scale.set(0.25, 0.25, 0.25);
  return mesh;
}

export function getSearchLine(cardDetail) {
  return [cardDetail.name, cardDetail.type_line, cardDetail.mana_cost, cardDetail.oracle_text]
    .join('\n')
    .toLowerCase();
}

export function cloneCard(card: Card, newId: string) {
  let { mesh, ...shared } = card;
  let newCard = structuredClone(shared);

  newCard.id = newId;
  newCard.mesh = createCardGeometry(newCard);
  newCard.mesh.userData = structuredClone(card.mesh.userData);
  newCard.mesh.userData.id = newCard.id;
  newCard.mesh.position.copy(card.mesh.position).add(new Vector3(2, -2, 0.125));
  newCard.mesh.rotation.copy(card.mesh.rotation);
  cardsById.set(newCard.id, newCard);
  return newCard;
}

export function shuffle(cards: Card[]) {
  for (let i = 0; i < cards.length - 2; i++) {
    let j = (Math.random() * i) | 0;
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

export function getCardImage(card: Card) {
  let image_uris = card?.detail?.card_faces?.[0].image_uris ?? card?.detail?.image_uris;
  return image_uris?.large;
}

export function getCardMeshTetherPoint(cardMesh: Mesh) {
  let targetVertex = 6;
  if (cardMesh.userData.tapped) {
    targetVertex = 15;
  }

  if (cardMesh.userData.location === 'deck') {
    if (cardMesh.userData.isPublic) {
      targetVertex = 8;
    } else {
      targetVertex = 1;
    }
  }

  if (cardMesh.userData.location === 'battlefield') {
    if (cardMesh.userData.isPublic) {
      if (cardMesh.userData.tapped) {
        targetVertex = 15;
      } else {
        targetVertex = 6;
      }
    } else {
      if (cardMesh.userData.tapped) {
        targetVertex = 1;
      } else {
        targetVertex = 2;
      }
    }
  }

  let vec = new Vector3().fromArray(
    cardMesh.geometry.attributes.position.array.slice(targetVertex * 3)
  );
  cardMesh.localToWorld(vec);
  const tether = getProjectionVec(vec);
  return tether;
}

export function cleanupCard(card: card) {
  card.mesh.geometry.dispose();
  cardsById.delete(card.id);
}

const textCanvas = document.createElement('canvas');
textCanvas.height = 34;

function createLabel(text, color?: string) {
  const ctx = textCanvas.getContext('2d')!;
  const font = '24px grobold';

  ctx.font = font;
  textCanvas.width = Math.ceil(ctx.measureText(text).width + 16);

  ctx.font = font;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.fillStyle = 'white';
  ctx.fillText(text, 8, 26);

  const texture = new Texture(ctx.getImageData(0, 0, textCanvas.width, textCanvas.height));
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return { texture, width: textCanvas.width };
}

function updateCounter(card, counterId: string, index: number) {
  let counter = counters().find(counter => counter.id === counterId)!;
  let counterValue = card.mesh.userData.modifiers.counters?.[counterId];

  if (!card.modifiers[counterId]) {
    let geometry = new BoxGeometry(1, 1, 1);
    let mat = new MeshStandardMaterial({ color: new Color(counter.color) });
    card.modifiers[counter.id] = new Mesh(geometry, mat);
    card.modifiers[counter.id].scale.set(7, 3, CARD_THICKNESS);
    card.mesh.add(card.modifiers[counter.id]);
    card.modifiers[counter.id].transparent = true;
    card.modifiers[counter.id].position.set(
      CARD_WIDTH / 2 + 3,
      CARD_HEIGHT / 2 - (index + 1) * 5,
      CARD_THICKNESS
    );
  }
  if (counterValue !== 0) {
    if (!card.mesh.children.includes(card.modifiers[counterId])) {
      card.mesh.add(card.modifiers[counter.id]);
    }
    let mesh: Mesh = card.modifiers[counter.id];
    let label = createLabel(`${counterValue} ${counter.name}`, counter.color);
    let width = label.width / 15;
    mesh.material.map = label.texture;
    mesh.scale.setX(width);
    // mesh.scale.setZ(Math.min(35, counterValue) * CARD_THICKNESS);
    // mesh.position.setZ((Math.min(35, counterValue) * CARD_THICKNESS) / 2);
    mesh.position.setX(CARD_WIDTH / 2 + width / 2 - 2);
    mesh.material.needsUpdate = true;
  } else {
    card.mesh.remove(card.modifiers[counter.id]);
  }
}

export function renderModifiers(card) {
  card.modifiers = card.modifiers ?? {};

  let modifiers = card.mesh.userData.modifiers;
  let { power, toughness, ...rest } = modifiers;

  if (power !== 0 || toughness !== 0) {
    if (!card.modifiers.pt) {
      let geometry = new BoxGeometry(1, 1, 1);
      let mat = new MeshStandardMaterial({});
      card.modifiers.pt = new Mesh(geometry, mat);
      card.modifiers.pt.scale.set(7, 3, CARD_THICKNESS);
      card.mesh.add(card.modifiers.pt);
      card.modifiers.pt.transparent = true;
      card.modifiers.pt.position.set(0, -CARD_HEIGHT / 2 + 1, CARD_THICKNESS);
    }
    if (!card.mesh.children.includes(card.modifiers.pt)) {
      card.mesh.add(card.modifiers.pt);
    }
    let label = createLabel(
      `${power > 0 ? '+' : ''}${power} / ${toughness > 0 ? '+' : ''}${toughness}`
    );
    let width = label.width / 15;
    card.modifiers.pt.material.map = label.texture;
    card.modifiers.pt.scale.setX(width);
    card.modifiers.pt.material.needsUpdate = true;
  } else if (card.modifiers.pt) {
    card.mesh.remove(card.modifiers.pt);
  }

  Object.keys(card.mesh.userData.modifiers.counters).forEach((counterId, index) => {
    updateCounter(card, counterId, index);
  });
}
