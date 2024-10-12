import { nanoid } from 'nanoid';
import { CatmullRomCurve3, Euler, Group, Object3D, Vector3 } from 'three';
import { animateObject } from './animations';
import { setCardData } from './card';
import { Card } from './constants';
import { cardsById, CardZone, getGlobalRotation, zonesById } from './globals';

export class Hand implements CardZone {
  public mesh: Group;
  public cards: Card[] = [];
  private cardMap: Map<string, Card>;
  public id: string;
  public isInteractive: boolean = true;

  constructor(id = nanoid(), public isLocalHand: boolean) {
    this.mesh = new Group();
    this.mesh.userData.isInteractive = true;
    this.mesh.userData.zone = 'hand';
    this.mesh.rotateX(Math.PI * 0.25);
    this.mesh.position.set(0, -120, 40);
    this.mesh.userData.restingPosition = this.mesh.position.clone();

    this.id = id;
    zonesById.set(this.id, this);

    this.cardMap = new Map<string, Card>();
  }

  adjustHandPosition() {
    this.mesh.userData.resting = {
      position: new Vector3(this.cards.length * -2.5, this.mesh.position.y, this.mesh.position.z),
      rotation: new Euler(Math.PI * 0.25, 0, 0),
    };

    animateObject(this.mesh, {
      to: this.mesh.userData.resting,
      duration: 0.2,
    });
  }

  getSerializable() {
    return {
      id: this.id,
      cards: this.cards.map(card => {
        let { mesh, ...rest } = card;
        return {
          ...rest,
          userData: mesh.userData,
        };
      }),
    };
  }

  addCard(card: Card, { skipAnimation } = {}) {
    let initialPosition = new Vector3();
    card.mesh.getWorldPosition(initialPosition);
    this.mesh.worldToLocal(initialPosition);
    setCardData(card.mesh, 'zoneId', this.id);
    setCardData(card.mesh, 'isDragging', false);
    setCardData(card.mesh, 'isPublic', false);

    this.mesh.add(card.mesh);
    this.cards.push(card);
    this.cardMap.set(card.mesh.uuid, card);

    let index = this.cards.length - 1;

    this.adjustHandPosition();

    if (this.isLocalHand) {
      card.mesh.addEventListener('mousein', this.cardMouseIn);
      card.mesh.addEventListener('mouseout', this.cardMouseOut);
    }

    let restingPosition = new Vector3(index * 5, 0, index * -0.125);

    setCardData(card.mesh, 'resting', {
      position: restingPosition,
      rotation: new Euler(0, 0, 0),
    });

    let initialRotation = getGlobalRotation(card.mesh);

    if (skipAnimation) {
      setCardData(card.mesh, 'location', 'hand');
      card.mesh.position.copy(restingPosition);
      card.mesh.rotation.set(0, 0, 0);
    } else {
      setCardData(card.mesh, 'location', 'hand');
      this.isInteractive = false;
      animateObject(card.mesh, {
        path: new CatmullRomCurve3([
          initialPosition,
          new Vector3((this.cards.length / 2) * 5, 100, 10),
          new Vector3((this.cards.length / 2) * 5, 50, index * -0.25),
          restingPosition,
        ]),
        to: {
          rotation: new Euler(0, 0, 0),
        },
        from: {
          rotation: initialRotation,
        },
        duration: 0.5,
        onComplete: () => {
          this.isInteractive = true;
        },
      });
    }
  }

  cardMouseIn = event => {
    if (!this.isInteractive) return;
    if (event.mesh.userData.location !== 'hand') return;
    if (event.mesh.userData.isDragging) return;

    let card = cardsById.get(event.mesh.userData.id)!;
    let index = this.cards.indexOf(card);
    animateFocusCard(this.mesh, this.cards, index);
  };

  cardMouseOut = event => {
    if (!this.isInteractive) return;
    if (event.mesh.userData.location !== 'hand') return;
    if (event.mesh.userData.isDragging) return;

    let card = cardsById.get(event.mesh.userData.id)!;
    let index = this.cards.indexOf(card);
    animateUnfocusCard(this.mesh, this.cards, index);
  };

  removeCard(cardMesh: Object3D) {
    let worldPosition = new Vector3();
    cardMesh.getWorldPosition(worldPosition);

    let globalRotation = getGlobalRotation(cardMesh);

    cardMesh.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
    cardMesh.rotation.set(globalRotation.x, globalRotation.y, globalRotation.z);

    cardMesh.removeEventListener('mousein', this.cardMouseIn);
    cardMesh.removeEventListener('mouseout', this.cardMouseOut);
    setCardData(cardMesh, 'resting', undefined);
    this.mesh.remove(cardMesh);
    let card = this.cardMap.get(cardMesh.uuid);
    let index = this.cards.findIndex(c => c === card);
    this.cards = this.cards.filter(c => c !== card);
    this.cardMap.delete(cardMesh.uuid);

    this.adjustHandPosition();
    for (let i = index; i < this.cards.length; i++) {
      let cardMesh = this.cards[i].mesh;
      if (cardMesh.userData.location !== 'hand') continue;
      cardMesh.userData.resting.position = new Vector3(i * 5, 0, i * -0.125);
      animateObject(cardMesh, {
        to: cardMesh.userData.resting,
        duration: 0.2,
      });
    }
  }
}

function animateFocusCard(handMesh: Group, cards: Card[], index: number) {
  animateObject(cards[index].mesh, {
    to: {
      position: new Vector3().addVectors(
        cards[index].mesh.userData.resting.position,
        new Vector3(10, 13, 5)
      ),
      rotation: cards[index].mesh.userData.resting.rotation,
    },
    duration: 0.2,
  });
  animateObject(handMesh, {
    to: {
      position: handMesh.userData.resting.position.clone().add(new Vector3(-10, 0, 0)),
    },
    duration: 0.2,
  });

  for (let i = index + 1; i < cards.length; i++) {
    let cardMesh = cards[i].mesh;
    let resting = cardMesh.userData.resting;
    if (cardMesh.userData.location !== 'hand') continue;
    animateObject(cardMesh, {
      to: {
        position: resting.position.clone().add(new Vector3(20, 0, 0)),
        rotation: resting.rotation,
      },
      duration: 0.2,
    });
  }
}

function animateUnfocusCard(handMesh: Group, cards: Card[], index: number) {
  let card = cards[index];

  animateObject(card.mesh, {
    to: card.mesh.userData.resting,
    duration: 0.2,
  });
  animateObject(handMesh, {
    to: handMesh.userData.resting,
    duration: 0.2,
  });
  for (let i = index + 1; i < cards.length; i++) {
    let cardMesh = cards[i].mesh;
    if (cardMesh.userData.location !== 'hand') continue;
    animateObject(cardMesh, { to: cardMesh.userData.resting, duration: 0.2 });
  }
}
