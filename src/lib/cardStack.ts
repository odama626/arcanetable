import { nanoid } from 'nanoid';
import {
  BoxGeometry,
  CatmullRomCurve3,
  EdgesGeometry,
  Euler,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { animateObject } from './animations';
import { cleanupCard, getSerializableCard, setCardData } from './card';
import { Card, CARD_HEIGHT, CARD_THICKNESS, CARD_WIDTH, CardZone } from './constants';
import { setHoverSignal, zonesById } from './globals';
import { getGlobalRotation } from './utils';
import { createStore, SetStoreFunction } from 'solid-js/store';

export class CardStack implements CardZone {
  public mesh: Mesh;
  public cards: Card[] = [];
  public observable: CardZone['observable'];
  private setObservable: SetStoreFunction<CardZone['observable']>;

  constructor(public zone: string, public id: string = nanoid()) {
    let geometry = new BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS);
    let material = new MeshStandardMaterial({ color: 0x000000 });
    let edges = new EdgesGeometry(geometry);
    let lineSegments = new LineSegments(edges, new LineBasicMaterial({ color: 0xffffff }));
    lineSegments.scale.set(1.1, 1.1, 1);
    lineSegments.userData.isOrnament = true;
    material.opacity = 0;
    material.transparent = true;
    this.mesh = new Mesh(geometry, material);
    this.mesh.add(lineSegments);
    this.mesh.userData.zone = zone;
    this.mesh.userData.zoneId = id;

    [this.observable, this.setObservable] = createStore<CardZone['observable']>({
      cardCount: this.cards.length,
    });

    zonesById.set(id, this);
  }

  getSerializable() {
    return {
      id: this.id,
      cards: this.mesh.children
        .filter(child => !child.userData.isOrnament)
        .map(getSerializableCard),
    };
  }

  updateCardPositions() {
    let cummulativeZ = 0;
    this.mesh.children.forEach((card, i) => {
      card.position.setZ(cummulativeZ);
      cummulativeZ += CARD_THICKNESS;
    });
  }

  addCard(card: Card, { skipAnimation = false, destroy = false } = {}) {
    if (!card) return;
    let initialPosition = new Vector3();
    card.mesh.getWorldPosition(initialPosition);
    this.mesh.worldToLocal(initialPosition);
    setCardData(card.mesh, 'isInteractive', true);
    setCardData(card.mesh, 'zoneId', this.id);
    setCardData(card.mesh, 'location', this.zone);
    setCardData(card.mesh, 'isPublic', true);

    this.mesh.add(card.mesh);
    this.cards.push(card);
    this.setObservable('cardCount', this.cards.length);

    let initialRotation = card.mesh.rotation;
    if (card.mesh.parent) {
      initialRotation = new Euler().setFromQuaternion(card.mesh.parent.quaternion.invert());
    }

    animateObject(card.mesh, {
      duration: 0.2,
      path: new CatmullRomCurve3([
        initialPosition,
        new Vector3(0, 0, (skipAnimation ? 20 : 400) * 0.125),
        new Vector3(0, 0, CARD_THICKNESS * this.mesh.children.length),
      ]),
      from: {
        rotation: initialRotation,
      },
      to: {
        rotation: new Euler(),
      },
      onComplete: () => {
        if (destroy) {
          this.removeCard(card.mesh);
          cleanupCard(card);
          setHoverSignal();
        }
      },
    });
  }

  removeCard(cardMesh: Mesh) {
    let worldPosition = cardMesh.getWorldPosition(new Vector3());
    let globalRotation = getGlobalRotation(cardMesh);
    cardMesh.position.copy(worldPosition);
    cardMesh.rotation.copy(globalRotation);
    this.mesh.remove(cardMesh);
    
    let index = this.cards.findIndex(c => c.id === cardMesh.userData.id);
    this.cards.splice(index, 1);
    this.setObservable('cardCount', this.cards.length);
    this.updateCardPositions();
  }
}
