import { uniqBy } from 'lodash-es';
import {
  BoxGeometry,
  Color,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import { cardsById, cleanupFromNode, getProjectionVec, scene, textureLoader } from './globals';
import { counters } from './ui/counterDialog';

export interface Card {
  mesh: Mesh;
  id: string;
  modifiers: {
    pt: Mesh;
    [id: string]: Mesh;
  };
}

let cardBackTexture: Texture;
let alphaMap: Texture;

export const CARD_WIDTH = 63 / 4;
export const CARD_HEIGHT = 88 / 4;
export const CARD_THICKNESS = 0.5 / 4;
export const CARD_STACK_OFFSET = 2;

export function createCardGeometry(card: Card) {
  const geometry = new BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS);
  cardBackTexture = cardBackTexture || textureLoader.load('/arcane-table-back.webp');
  cardBackTexture.colorSpace = SRGBColorSpace;
  let cardBack = new MeshStandardMaterial({ map: cardBackTexture });

  cardBack.transparent = true;

  alphaMap = alphaMap || textureLoader.load(`/alphaMap.webp`);
  let front = textureLoader.load(getCardImage(card));

  front.colorSpace = SRGBColorSpace;

  let frontMesh = new MeshStandardMaterial({
    color: 0xffffff,
    map: front,
    alphaMap,
  });
  frontMesh.transparent = true;

  let materials = [null, null, null, null, frontMesh, cardBack].map(img => {
    if (!img) return new MeshStandardMaterial({ color: 0x000000 });
    return img;
  });
  const mesh = new Mesh(geometry, materials);
  setCardData(mesh, 'isInteractive', true);
  setCardData(mesh, 'card', card);
  setCardData(mesh, 'id', card.id);
  setCardData(
    mesh,
    'isDoubleSided',
    card.detail.card_faces?.length > 1 && card.detail.card_faces[1]?.image_uris
  );
  if (mesh.userData.isDoubleSided) {
    let map = textureLoader.load(card.detail.card_faces[1].image_uris.large);
    map.colorSpace = SRGBColorSpace;
    mesh.userData.cardBack = new MeshStandardMaterial({
      map,
      alphaMap,
      color: 0xffffff,
    });
    mesh.userData.cardBack.transparent = true;
    setCardData(mesh, 'publicCardBack', cardBack);
  }
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

export function getSearchLine(cardDetail) {
  return [cardDetail.name, cardDetail.type_line, cardDetail.mana_cost, cardDetail.oracle_text]
    .join('\n')
    .toLowerCase();
}

export function cloneCard(card: Card, newId: string): Card {
  let { mesh, modifiers, ...shared } = card;
  let newCard = structuredClone(shared) as Card;

  newCard.id = newId;
  newCard.mesh = createCardGeometry(newCard);
  newCard.mesh.userData = structuredClone(card.mesh.userData);
  setCardData(newCard.mesh, 'id', newCard.id);
  newCard.mesh.position
    .copy(card.mesh.position)
    .add(new Vector3(CARD_STACK_OFFSET, -CARD_STACK_OFFSET, CARD_THICKNESS));
  newCard.mesh.rotation.copy(card.mesh.rotation);
  updateModifiers(newCard);
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
  setCardData(mesh, 'clientId', clientId);

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

  if (['deck', 'hand'].includes(cardMesh.userData.location)) {
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
  // before setting value
  if (field === 'isPublic') {
    if (cardMesh.userData.isDoubleSided) {
      cardMesh.material[cardMesh.material.length - 1] =
        cardMesh.userData[value ? 'cardBack' : 'publicCardBack'];
    }
  }
  if (
    field === 'location' &&
    cardMesh.userData.previousValue === 'battlefield' &&
    value !== 'battlefield'
  ) {
    cleanupFromNode(cardMesh);
    cardMesh.userData.isFlipped = false;
    cardMesh.userData.modifiers = undefined;
  }

  if (field === 'location') {
    cardMesh.userData.previousLocation = cardMesh.userData.location;
  }

  if (field === 'isPublic') {
    cardMesh.userData.wasPublic = cardMesh.userData.isPublic;
  }

  if (field === `zoneId`) {
    cardMesh.userData.previousZoneId = cardMesh.userData.zoneId
  }

  cardMesh.userData[field] = value;

  // after setting value

  if (field === 'isFlipped') {
    let card = cardsById.get(cardMesh.userData.id);
    updateModifiers(card);
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
  return { texture, width: textCanvas.width / 31 };
}

function updateCounter(card: Card, counterId: string, index: number) {
  let counter = counters().find(counter => counter.id === counterId)!;
  let counterValue = card.mesh.userData.modifiers.counters?.[counterId];
  let zOffset = CARD_THICKNESS * (card.mesh.userData.isFlipped ? -2 : 1);

  if (!card.modifiers[counterId]) {
    let geometry = new BoxGeometry(1, 1, 1);
    let mat = new MeshStandardMaterial({ color: new Color(counter.color) });
    let mesh = new Mesh(geometry, mat);
    mesh.scale.set(7, 3, CARD_THICKNESS);
    card.mesh.add(mesh);
    mesh.transparent = true;
    card.modifiers[counter.id] = mesh;
  }
  if (counterValue !== 0) {
    if (!card.mesh.children.includes(card.modifiers[counterId])) {
      card.mesh.add(card.modifiers[counter.id]);
    }
    let mesh: Mesh = card.modifiers[counter.id];
    let label = createLabel(`${counterValue} ${counter.name}`, counter.color);
    mesh.material.map = label.texture;
    mesh.position.set(
      (CARD_WIDTH / 2 + label.width / 2 - 1) * (card.mesh.userData.isFlipped ? -1 : 1),
      CARD_HEIGHT / 2 - index * 3.25 - 2.5,
      zOffset
    );
    mesh.material.needsUpdate = true;
  } else {
    card.mesh.remove(card.modifiers[counter.id]);
  }
}

export function updateModifiers(card: Card) {
  card.modifiers = card.modifiers ?? {};
  let zPosition = CARD_THICKNESS * (card.mesh.userData.isFlipped ? -5 : 1);

  let modifiers = card.mesh.userData.modifiers;
  let { power = 0, toughness = 0 } = modifiers || {};

  if (power !== 0 || toughness !== 0) {
    if (!card.modifiers.pt) {
      let geometry = new BoxGeometry(1, 1, 1);
      let mat = new MeshStandardMaterial({});
      let mesh = new Mesh(geometry, mat);
      mesh.scale.set(7, 3, CARD_THICKNESS);
      card.mesh.add(mesh);
      mesh.transparent = true;
      mesh.position.set(CARD_WIDTH / 2, -CARD_HEIGHT / 2 - 0.25, zPosition);
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
    mesh.position.setZ(zPosition);
    let xPosition = (CARD_WIDTH / 2 - label.width / 2) * (card.mesh.userData.isFlipped ? -1 : 1);
    mesh.position.setX(xPosition);
    mesh.material.needsUpdate = true;
  } else if (card.modifiers.pt) {
    card.mesh.remove(card.modifiers.pt);
  }

  if (!card.mesh.userData?.modifiers?.counters) return;

  Object.keys(card.mesh.userData.modifiers.counters)
    .sort((a, b) => a.localeCompare(b))
    .forEach((counterId, index) => {
      updateCounter(card, counterId, index);
    });
}

let raycaster = new Raycaster();

export function getYOffsetForTopOfStack(obj: Mesh) {
  let maxZ = obj.position.z - CARD_THICKNESS;
  let pointData = obj.geometry.attributes.position;
  let vector = new Vector3();
  let direction = obj.getWorldDirection(new Vector3()).normalize().multiplyScalar(-1);
  let intersections = [];

  console.log(direction);

  console.log(obj, direction);

  for (
    let pointOffset = 0;
    pointOffset < pointData.array.length;
    pointOffset += pointData.itemSize
  ) {
    vector.fromArray(pointData.array, pointOffset);
    obj.localToWorld(vector);
    raycaster.set(vector.clone().add(direction.clone().multiplyScalar(-1000)), direction);
    intersections.push(...raycaster.intersectObject(scene).filter(i => i.object.id !== obj.id));
    if (intersections.length) {
      maxZ = Math.max(intersections[0].object.position.z, maxZ);
    }
  }

  let stack = uniqBy(intersections, intersection => intersection.object.id);
  let stackCount = stack.length - 1;

  console.log(stack);

  return stackCount * CARD_THICKNESS;
}
