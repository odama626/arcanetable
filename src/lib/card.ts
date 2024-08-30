import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Object3DEventMap,
  Vector3,
} from 'three';
import { cardsById, getProjectionVec, textureLoader } from './globals';

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
