import { nanoid } from 'nanoid';
import {
  BoxGeometry,
  EdgesGeometry,
  Euler,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { Card, CARD_THICKNESS, setCardData } from './card';
import { CardZone, getGlobalRotation, zonesById } from './globals';
import { animateObject } from './animations';

export class CardArea implements CardZone {
  public mesh: Mesh;

  constructor(public zone: string, public id: string = nanoid()) {
    // let geometry = new BoxGeometry(100, 75, CARD_THICKNESS / 2);
    let geometry = new BoxGeometry(200, 100, CARD_THICKNESS / 2);
    let material = new MeshStandardMaterial({ color: 0x686977 }); //#9d9eae
    this.mesh = new Mesh(geometry, material);
    this.mesh.userData.zone = zone;
    this.mesh.userData.zoneId = id;
    // this.mesh.position.set(12.5, -65, 0);
    this.mesh.position.setY(-50);
    this.mesh.receiveShadow = true;
    let edges = new EdgesGeometry(geometry);
    let lineSegments = new LineSegments(edges, new LineBasicMaterial({ color: 0xffffff }));
    lineSegments.position.setZ(0.125);
    this.mesh.add(lineSegments);
    // this.mesh.position.setX(-25);
    zonesById.set(id, this);

    this.mesh.position.setZ(2.5);
  }

  addCard(card: Card, { skipAnimation, position } = {}) {
    const initialPosition = card.mesh.getWorldPosition(new Vector3());
    this.mesh.worldToLocal(initialPosition);

    if (position) {
      position;
      console.log({ position: position.clone() });
      // position.z = CARD_THICKNESS;
    } else {
      position = new Vector3();
    }

    setCardData(card.mesh, 'zoneId', this.id);
    setCardData(card.mesh, 'location', this.zone);
    setCardData(card.mesh, 'isPublic', true);
    setCardData(card.mesh, 'isInteractive', true);
    this.mesh.add(card.mesh);

    let initialRotation = card.mesh.rotation;
    if (card.mesh.parent) {
      initialRotation = new Euler().setFromQuaternion(card.mesh.parent.quaternion.invert());
    }

    if (skipAnimation) {
      card.mesh.position.copy(position);
      card.mesh.rotation.set(0, 0, 0);
    } else {
      animateObject(card.mesh, {
        duration: 0.2,
        from: {
          rotation: initialRotation,
          position: initialPosition,
        },
        to: {
          rotation: new Euler(),
          position,
        },
      });
    }
  }

  removeCard(cardMesh: Mesh) {
    let worldPosition = new Vector3();
    cardMesh.getWorldPosition(worldPosition);

    let globalRotation = getGlobalRotation(cardMesh);

    cardMesh.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
    cardMesh.rotation.set(globalRotation.x, globalRotation.y, globalRotation.z);
    this.mesh.remove(cardMesh);
  }

  getSerializable(): { id: string } {
    return {
      id: this.id,
      cards: this.mesh.children
        .map(child => {
          if (!child.userData.card) return;
          return {
            userData: child.userData,
            position: child.position.toArray(),
            rotation: child.rotation.toArray(),
          };
        })
        .filter(Boolean),
    };
  }
}
