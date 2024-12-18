import set from 'lodash-es/set';
import uniqBy from 'lodash-es/uniqBy';
import { splitProps } from 'solid-js';
import {
  BoxGeometry,
  Color,
  ImageBitmapLoader,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Raycaster,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import { Card, CARD_HEIGHT, CARD_STACK_OFFSET, CARD_THICKNESS, CARD_WIDTH } from './constants';
import { cardsById, getProjectionVec, scene, textureLoader, textureLoaderWorker } from './globals';
import { counters } from './ui/counterDialog';
import { cleanupFromNode } from './utils';

let cardBackTexture: Texture;
let alphaMap: Texture;
const blackMat = new MeshStandardMaterial({ color: 0x000000 });

const bitmapLoader = new ImageBitmapLoader();
bitmapLoader.setOptions({ imageOrientation: 'flipY' });

export function createCardGeometry(card: Card, cache?: Map<string, ImageBitmap>) {
  const geometry = new BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS);
  cardBackTexture = cardBackTexture || textureLoader.load('/arcane-table-back.webp');
  cardBackTexture.colorSpace = SRGBColorSpace;
  let cardBackMat = new MeshStandardMaterial({ map: cardBackTexture });
  let { mesh: _, modifiers, ...shared } = card;

  cardBackMat.transparent = true;

  alphaMap = alphaMap || textureLoader.load(`/alphaMap.webp`);

  const mesh = new Mesh(geometry, [blackMat, blackMat, blackMat, blackMat, blackMat, cardBackMat]);
  setCardData(mesh, 'isInteractive', true);
  setCardData(mesh, 'card', shared);
  setCardData(mesh, 'id', card.id);
  setCardData(
    mesh,
    'isDoubleSided',
    card.detail.card_faces?.length > 1 && card.detail.card_faces[1]?.image_uris
  );

  mesh.userData.card_face_urls = [getCardImage(card)];

  if (mesh.userData.isDoubleSided) {
    mesh.userData.card_face_urls.push(card.detail.card_faces[1].image_uris.large);
    setCardData(mesh, 'publicCardBack', cardBackMat);
  }
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

export async function loadCardTextures(
  card: Card,
  cache: Map<string, Promise<MeshStandardMaterial>>
) {
  const [front, back] = card.mesh.userData.card_face_urls;

  if (!cache.has(front)) {
    cache.set(
      front,
      textureLoaderWorker.loadTexture(front).then(image => {
        const map = new Texture(image);
        map.colorSpace = SRGBColorSpace;
        map.needsUpdate = true;

        let mat = new MeshStandardMaterial({
          color: 0xffffff,
          map,
          alphaMap,
        });
        mat.transparent = true;
        mat.needsUpdate = true;
        return mat;
      })
    );
  }

  let frontPromise = cache.get(front)!;

  frontPromise.then(mat => {
    card.mesh.material[4] = mat;
  });

  if (back) {
    if (!cache.has(back)) {
      cache.set(
        back,
        textureLoaderWorker.loadTexture(front).then(image => {
          const map = new Texture(image);
          map.colorSpace = SRGBColorSpace;
          map.needsUpdate = true;

          let mat = new MeshStandardMaterial({
            color: 0xffffff,
            map,
            alphaMap,
          });
          mat.transparent = true;
          mat.needsUpdate = true;

          return mat;
        })
      );
    }

    let backPromise = cache.get(back)!;

    backPromise.then(mat => {
      card.mesh.userData.cardBack = mat;
    });
    await backPromise;
  }
  await frontPromise;
}

export function getSearchLine(cardDetail) {
  return [
    cardDetail.name,
    cardDetail.type_line,
    cardDetail.cmc,
    cardDetail.mana_cost,
    cardDetail.oracle_text,
    cardDetail.mana_cost?.replace(/[\{\}]/g, ''),
    ...(cardDetail.card_faces?.map(cardFace => getSearchLine(cardFace)) ?? []),
  ]
    .join('\n')
    .toLowerCase();
}

export function cloneCard(card: Card, newId: string): Card {
  let { mesh, modifiers, ...shared } = card;
  let newCard = structuredClone(shared) as Card;

  newCard.id = newId;
  newCard.mesh = createCardGeometry(newCard);
  if (card.mesh) {
    const [transferable, _, cloneable] = splitProps(
      card.mesh.userData,
      ['cardBack', 'publicCardBack'],
      ['resting']
    );
    newCard.mesh.userData = structuredClone(cloneable);
    Object.assign(newCard.mesh.userData, transferable);

    newCard.mesh.position
      .copy(card.mesh.position)
      .add(new Vector3(CARD_STACK_OFFSET, -CARD_STACK_OFFSET, CARD_THICKNESS));
    newCard.mesh.rotation.copy(card.mesh.rotation);
  }
  setCardData(newCard.mesh, 'id', newCard.id);
  setCardData(newCard.mesh, 'isToken', true);
  updateModifiers(newCard);
  newCard.detail.search = card.detail.search ?? getSearchLine(newCard.detail);
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
    if (cardMesh.userData.isFlipped) {
      if (cardMesh.userData.isTapped) {
        targetVertex = 6;
      } else {
        targetVertex = 2;
      }
    } else {
      if (cardMesh.userData.isTapped) {
        targetVertex = 15;
      } else {
        targetVertex = 6;
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
  cleanupFromNode(card.mesh);
  cardsById.delete(card.id);
}

export function setCardData(cardMesh: Mesh, field: string, value: unknown) {
  let modifiersNeedUpdate = false;
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
    cardMesh.userData.previousZoneId = cardMesh.userData.zoneId;
  }

  if (field === 'isToken' && cardMesh.userData.isToken !== value) {
    modifiersNeedUpdate = true;
  }

  set(cardMesh.userData, field, value);

  // after setting value

  if (field === 'isFlipped') {
    modifiersNeedUpdate = true;
  }

  if (modifiersNeedUpdate) {
    let card = cardsById.get(cardMesh.userData.id);
    if (card) updateModifiers(card);
  }
}

const textCanvas = document.createElement('canvas');
textCanvas.height = 55;

export function createLabel(text: string, color?: string) {
  const ctx = textCanvas.getContext('2d', { willReadFrequently: true })!;
  const font = '48px grobold';

  ctx.font = font;
  const textWidth = ctx.measureText(text).width;

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

function getCounterLabel(value: number | string, name: string) {
  switch (typeof value) {
    case 'number':
      return `${value.toLocaleString()} ${name}`;
    case 'boolean':
      return value ? `is ${name}` : ``;
    default:
      return value.toString();
  }
}

function updateCounter(
  card: Card,
  counter: { id: string; name: string; color: string },
  value: number | string | boolean,
  index: number
) {
  if (!card.modifiers[counter.id]) {
    let geometry = new BoxGeometry(1, 1, 1);
    let mat = new MeshStandardMaterial({ color: new Color(counter.color) });
    let mesh = new Mesh(geometry, [blackMat, blackMat, blackMat, blackMat, mat, mat]);
    mesh.scale.set(1, 3, CARD_THICKNESS + 0.1);
    card.mesh.add(mesh);
    mesh.transparent = true;
    card.modifiers[counter.id] = mesh;
  }
  if (value) {
    if (!card.mesh.children.includes(card.modifiers[counter.id])) {
      card.mesh.add(card.modifiers[counter.id]);
    }
    let mesh: Mesh = card.modifiers[counter.id];
    let label = createLabel(getCounterLabel(value, counter.name), counter.color);
    mesh.material[4].map = label.texture;
    mesh.material[5].map = label.texture;
    mesh.scale.set(label.width, 3, CARD_THICKNESS);
    mesh.position.set(
      (CARD_WIDTH / 2 + label.width / 2) * (card.mesh.userData.isFlipped ? -1 : 1),
      CARD_HEIGHT / 2 - index * 3.25 - 2.5,
      0
    );
    mesh.material[4].needsUpdate = true;
    mesh.material[5].needsUpdate = true;
  } else {
    card.mesh.remove(card.modifiers[counter.id]);
  }
}

export function updateModifiers(card: Card) {
  card.modifiers = card.modifiers ?? {};

  let { power = 0, toughness = 0 } = card.mesh.userData.modifiers || {};

  if (power !== 0 || toughness !== 0) {
    if (!card.modifiers.pt) {
      let geometry = new BoxGeometry(1, 1, 1);
      let mat = new MeshStandardMaterial({});
      let mesh = new Mesh(geometry, [blackMat, blackMat, blackMat, blackMat, mat, mat]);
      mesh.scale.set(7, 3, CARD_THICKNESS + 0.1);
      card.mesh.add(mesh);
      mesh.transparent = true;
      mesh.position.set(CARD_WIDTH / 2, -CARD_HEIGHT / 2 - 0.25, 0);
      card.modifiers.pt = mesh;
    }
    let mesh = card.modifiers.pt as Mesh;
    if (!card.mesh.children.includes(mesh)) {
      card.mesh.add(mesh);
    }
    let label = createLabel(
      `${power > 0 ? '+' : ''}${power} / ${toughness > 0 ? '+' : ''}${toughness}`
    );
    mesh.material[4].map = label.texture;
    mesh.material[5].map = label.texture;
    mesh.scale.setX(label.width);
    let xPosition = (CARD_WIDTH / 2 - label.width / 2) * (card.mesh.userData.isFlipped ? -1 : 1);
    mesh.position.setX(xPosition);
    mesh.material[4].needsUpdate = true;
    mesh.material[5].needsUpdate = true;
  } else if (card.modifiers.pt) {
    card.mesh.remove(card.modifiers.pt);
  }

  const countersById = Object.fromEntries(counters().map(counter => [counter.id, counter]));

  let modifierCounters = new Set([
    ...Object.keys(card.mesh.userData.modifiers?.counters ?? {}),
    ...Object.keys(card.modifiers),
  ]);
  modifierCounters.delete('pt');
  modifierCounters.delete('token');

  const modifiers = Array.from(modifierCounters).map(counterId => {
    return {
      counter: countersById[counterId],
      value: card.mesh.userData.modifiers?.counters[counterId],
    };
  });

  if (card.mesh.userData.isToken) {
    modifiers.push({ counter: { name: 'token', id: 'token' }, value: card.mesh.userData.isToken });
  }

  if (!modifiers.length) return;

  modifiers
    .sort((a, b) => {
      if (a.value === b.value) return a.counter.name.localeCompare(b.counter.name);
      return b.value - a.value;
    })
    .forEach((modifier, index) => {
      updateCounter(card, modifier.counter, modifier.value, index);
    });
}

let raycaster = new Raycaster();

export function getYOffsetForTopOfStack(obj: Mesh) {
  let maxZ = obj.position.z - CARD_THICKNESS;
  let pointData = obj.geometry.attributes.position;
  let vector = new Vector3();
  let direction = obj.getWorldDirection(new Vector3()).normalize().multiplyScalar(-1);
  let intersections = [];

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

  return stackCount * CARD_THICKNESS;
}

export function getSerializableCard(cardMesh: Object3D) {
  return {
    detail: cardMesh.userData.card.detail,
    id: cardMesh.userData.id,
    userData: cardMesh.userData,
    position: cardMesh.position.toArray(),
    rotation: cardMesh.rotation.toArray(),
  };
}
