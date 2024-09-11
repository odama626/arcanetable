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
  mesh: Mesh;
  id: string;
  modifiers: {
    pt: Mesh;
    [id: string]: Mesh;
  };
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
  mesh.userData.isDoubleSided = card.detail.card_faces?.length > 1;
  if (mesh.userData.isDoubleSided) {
    mesh.userData.cardBack = new MeshStandardMaterial({
      map: textureLoader.load(card.detail.card_faces[1].image_uris.large),
      alphaMap: frontAlphaMap,
      color: 0xffffff,
    });
    mesh.userData.publicCardBack = cardBack;
  }
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

export function cloneCard(card: Card, newId: string): Card {
  let { mesh, ...shared } = card;
  let newCard = structuredClone(shared) as Card;

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

export function initializeCardMesh(card, clientId) {
  const mesh = createCardGeometry(card);
  mesh.userData.clientId = clientId;

  let result = {
    ...card,
    clientId: clientId,
    mesh,
  };
  cardsById.set(result.id, result);
  return result;
}

export function getCardArtImage(card: Card) {
  let image_uris = card?.detail?.card_faces?.[0].image_uris ?? card?.detail?.image_uris;
  return image_uris?.art_crop;
}

export function getCardMeshTetherPoint(cardMesh: Mesh) {
  let targetVertex = 6;
  if (cardMesh.userData.isTapped) {
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
      if (cardMesh.userData.isTapped) {
        targetVertex = 15;
      } else {
        targetVertex = 6;
      }
    } else {
      if (cardMesh.userData.isTapped) {
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

export function setCardData(cardMesh: Mesh, field: string, value: unknown) {
  cardMesh.userData[field] = value;

  if (field === 'isPublic') {
    if (cardMesh.userData.isDoubleSided) {
      cardMesh.material[cardMesh.material.length - 1] =
        cardMesh.userData[value ? 'cardBack' : 'publicCardBack'];
    }
  }
}

const textCanvas = document.createElement('canvas');
textCanvas.height = 55;

function createLabel(text, color?: string) {
  const ctx = textCanvas.getContext('2d')!;
  const font = '48px grobold';
  const textWidth = ctx.measureText(text).width;

  ctx.font = font;
  textCanvas.width = Math.ceil(textWidth + 24);

  ctx.font = font;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, textCanvas.width / 2 - textWidth / 2, textCanvas.height / 2);

  const texture = new Texture(ctx.getImageData(0, 0, textCanvas.width, textCanvas.height));
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return { texture, width: textCanvas.width / 30 };
}

function updateCounter(card: Card, counterId: string, index: number) {
  let counter = counters().find(counter => counter.id === counterId)!;
  let counterValue = card.mesh.userData.modifiers.counters?.[counterId];

  if (!card.modifiers[counterId]) {
    let geometry = new BoxGeometry(1, 1, 1);
    let mat = new MeshStandardMaterial({ color: new Color(counter.color) });
    let mesh = new Mesh(geometry, mat);
    mesh.scale.set(7, 3, CARD_THICKNESS);
    card.mesh.add(mesh);
    mesh.transparent = true;
    mesh.position.set(CARD_WIDTH / 2 + 3, CARD_HEIGHT / 2 - (index + 1) * 5, CARD_THICKNESS);
    card.modifiers[counter.id] = mesh;
  }
  if (counterValue !== 0) {
    if (!card.mesh.children.includes(card.modifiers[counterId])) {
      card.mesh.add(card.modifiers[counter.id]);
    }
    let mesh: Mesh = card.modifiers[counter.id];
    let label = createLabel(`${counterValue} ${counter.name}`, counter.color);
    mesh.material.map = label.texture;
    mesh.scale.setX(label.width);
    mesh.position.setY(CARD_HEIGHT / 2 - index * 3.25 - 2.5);
    mesh.position.setX(CARD_WIDTH / 2 + label.width / 2 - 0.5);
    mesh.material.needsUpdate = true;
  } else {
    card.mesh.remove(card.modifiers[counter.id]);
  }
}

export function renderModifiers(card: Card) {
  card.modifiers = card.modifiers ?? {};

  let modifiers = card.mesh.userData.modifiers;
  let { power, toughness } = modifiers;

  if (power !== 0 || toughness !== 0) {
    if (!card.modifiers.pt) {
      let geometry = new BoxGeometry(1, 1, 1);
      let mat = new MeshStandardMaterial({});
      let mesh = new Mesh(geometry, mat);
      mesh.scale.set(7, 3, CARD_THICKNESS);
      card.mesh.add(mesh);
      mesh.transparent = true;
      mesh.position.set(CARD_WIDTH / 2, -CARD_HEIGHT / 2 - 0.25, CARD_THICKNESS);
      card.modifiers.pt = mesh;
    }
    let mesh = card.modifiers.pt as Mesh;
    if (!card.mesh.children.includes(mesh)) {
      card.mesh.add(mesh);
    }
    let label = createLabel(
      `${power > 0 ? '+' : ''}${power} / ${toughness > 0 ? '+' : ''}${toughness}`
    );
    mesh.material.map = label.texture;
    mesh.scale.setX(label.width);
    mesh.position.setX(CARD_WIDTH / 2 - label.width / 2);
    mesh.material.needsUpdate = true;
  } else if (card.modifiers.pt) {
    card.mesh.remove(card.modifiers.pt);
  }

  Object.keys(card.mesh.userData.modifiers.counters)
    .sort((a, b) => a.localeCompare(b))
    .forEach((counterId, index) => {
      updateCounter(card, counterId, index);
    });
}
