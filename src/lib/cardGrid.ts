import { nanoid } from 'nanoid';
import { createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { CatmullRomCurve3, Euler, Group, Object3D, Vector3 } from 'three';
import { animateObject } from './animations';
import { getSerializableCard, setCardData } from './card';
import { Card, CARD_HEIGHT, CARD_WIDTH, CardZone } from './constants';
import {
  getProjectionVec,
  peekFilterText,
  setHoverSignal,
  setScrollTarget,
  zonesById,
} from './globals';
import { getGlobalRotation, isVectorEqual } from './utils';

const CARDS_PER_ROW = 5;
export const [cardGridStore, setCardGridStore] = createStore({
  active: false,
  cards: [],
  tether: {},
});

export class CardGrid implements CardZone {
  public mesh: Group;
  public cards: Card[] = [];
  public filteredCards?: Card[];
  private cardMap: Map<string, Card>;
  private scrollContainer;
  private minScroll: number;
  private maxScroll: number;
  private isLocalPlayArea: boolean;
  public mode: 'grid' | 'field' = 'grid';

  constructor(isLocalPlayArea: boolean, public zone: string, public id: string = nanoid()) {
    const POSITION = new Vector3(-((CARD_WIDTH + 1) * CARDS_PER_ROW) / 2 + CARD_WIDTH / 2, -95, 50);
    this.mesh = new Group();
    zonesById.set(this.id, this);
    this.mesh.userData.isInteractive = true;
    this.mesh.userData.zone = zone;
    this.mesh.rotateX(Math.PI * 0.25);
    this.mesh.position.copy(POSITION);
    this.scrollContainer = new Group();
    this.scrollContainer.userData.isScrollable = true;
    this.mesh.add(this.scrollContainer);
    this.minScroll = CARD_HEIGHT * 1.5;
    this.isLocalPlayArea = isLocalPlayArea;
    this.cardMap = new Map<string, Card>();

    this.mesh.userData.restingPosition = this.mesh.position.clone();

    if (this.isLocalPlayArea) {
      this.scrollContainer.addEventListener('scroll', event => {
        let position = this.scrollContainer.position
          .clone()
          .add(new Vector3(0, event.event.deltaY * 0.25, 0));

        position.y = Math.min(position.y, this.maxScroll);
        position.y = Math.max(position.y, this.minScroll);

        animateObject(this.scrollContainer, { duration: 0.2, to: { position } });
      });

      createEffect(() => {
        let filterText = peekFilterText().toLowerCase();

        if (filterText.length) {
          let filterScores = this.cards
            .map(card => {
              let indexOf = card.detail.search.indexOf(filterText);
              let indexScore = indexOf < 0 ? 0 : 1 - indexOf / card.detail.search.length;
              return {
                score: indexScore,
                card,
              };
            })
            .filter(card => card.score > 0)
            .sort((a, b) => b.score - a.score);
          this.filteredCards = filterScores.map(score => score.card);
        } else {
          this.filteredCards = undefined;
        }
        animateObject(this.scrollContainer, {
          duration: 0.2,
          to: { position: new Vector3(0, this.minScroll, 0) },
        });
        this.updateCardPositions();
      });
    }
  }

  viewField() {
    this.mode = 'field';
    this.updateCardPositions();
  }

  viewGrid() {
    this.mode = 'grid';
    this.updateCardPositions();
  }

  private updateCardPositions() {
    let missed = 0;
    for (let i = 0; i < this.cards.length; i++) {
      let cardMesh = this.cards[i].mesh;
      if (cardMesh.userData.location !== this.zone) continue;
      let index = i;
      if (this.filteredCards) {
        index = this.filteredCards?.findIndex(card => card.id === this.cards[i].id);
      }

      if (index < 0) {
        let { position, rotation } = this.getCardPosition(
          (this.filteredCards?.length ?? 0) + missed,
          true
        );
        if (
          !isVectorEqual(position, cardMesh.userData.resting.position) ||
          !isVectorEqual(rotation, cardMesh.userData.resting.rotation)
        ) {
          cardMesh.userData.resting.position = position;
          cardMesh.userData.resting.rotation = rotation;
          animateObject(cardMesh, {
            path: new CatmullRomCurve3([
              cardMesh.position.clone(),
              cardMesh.position.clone().add(new Vector3(0, 0, -2.5)),
              position,
            ]),
            to: {
              rotation,
            },
            duration: 0.2,
          });
        }
        missed++;
        continue;
      }

      const { position, rotation } = this.getCardPosition(index);
      if (
        !isVectorEqual(position, cardMesh.userData.resting.position) ||
        cardMesh.rotation.y !== 0
      ) {
        cardMesh.userData.resting.position = position;
        cardMesh.userData.resting.rotation = rotation;
        animateObject(cardMesh, {
          path: new CatmullRomCurve3([
            cardMesh.position.clone(),
            cardMesh.position.clone().add(new Vector3(0, 0, -2.5)),
            position,
          ]),
          to: {
            rotation,
          },
          duration: 0.2,
        });
      }
    }
  }

  adjustHandPosition() {
    animateObject(this.mesh, {
      to: this.mesh.userData.resting,
      duration: 0.2,
    });
  }

  getSerializable() {
    return {
      id: this.id,
      cards: this.cards.map(card => getSerializableCard(card.mesh)),
    };
  }

  private getCardPosition(index: number, isFlipped?: boolean) {
    let position = new Vector3(
      (index % CARDS_PER_ROW) * (CARD_WIDTH + 1),
      -((index / CARDS_PER_ROW) | 0) * (CARD_HEIGHT + 1),
      0
    );
    switch (this.mode) {
      case 'grid':
        return { position, rotation: new Euler(0, isFlipped ? Math.PI : 0, 0) };
      case 'field': {
        let isEven = index % 2 === 0;
        let x = isEven ? 115 : -60;
        x += (index % CARDS_PER_ROW) * 3;
        position.x = x;
        position.z = -20;
        let yRot = (Math.PI / 4) * (isEven ? -1 : 1);
        if (isFlipped) {
          yRot += Math.PI;
        }

        return {
          position,
          rotation: new Euler(0, yRot, 0),
        };
      }
    }
  }

  addCard(card: Card) {
    if (!card) return;
    let initialPosition = new Vector3();
    let indexPosition = this.cards.length;
    card.mesh.getWorldPosition(initialPosition);
    setCardData(card.mesh, 'isInGrid', true);
    setCardData(card.mesh, 'zoneId', this.id);
    setCardData(card.mesh, 'isInteractive', true);
    setCardData(card.mesh, 'location', this.zone);
    this.scrollContainer.worldToLocal(initialPosition);

    if (this.cards.length < 1) {
      this.scrollContainer.position.y = this.minScroll;
    }

    if (this.isLocalPlayArea) {
      setScrollTarget(this.scrollContainer);
    }

    if (!cardGridStore.active) {
      setCardGridStore(
        'tether',
        getProjectionVec(
          this.scrollContainer.localToWorld(
            new Vector3(CARD_WIDTH * CARDS_PER_ROW, -CARD_HEIGHT / 2 - 1, 0)
          )
        )
      );
      setCardGridStore('active', true);
    }
    setCardGridStore('zone', this.zone);

    setCardGridStore('cards', this.cards.slice(0));

    this.scrollContainer.add(card.mesh);
    this.cards.push(card);
    this.maxScroll = (this.cards.length / CARDS_PER_ROW) * (CARD_HEIGHT + 1);
    this.cardMap.set(card.id, card);

    this.adjustHandPosition();

    let { position, rotation } = this.getCardPosition(indexPosition);
    card.mesh.userData.resting = {
      position,
      rotation,
    };

    const path = new CatmullRomCurve3([
      initialPosition,
      new Vector3((this.cards.length / 2) * 5, 100, 10),
      new Vector3((this.cards.length / 2) * 5, 50, indexPosition * -0.25),
      position,
    ]);

    let initialRotation = getGlobalRotation(card.mesh);

    animateObject(card.mesh, {
      path,
      to: {
        rotation,
      },
      from: {
        rotation: initialRotation,
      },
      duration: 0.5,
    });
  }

  removeCard(cardMesh: Object3D) {
    let worldPosition = new Vector3();
    cardMesh.getWorldPosition(worldPosition);
    setCardData(cardMesh, 'isInGrid', false);

    let globalRotation = getGlobalRotation(cardMesh);

    cardMesh.position.copy(worldPosition);
    cardMesh.rotation.copy(globalRotation);

    this.scrollContainer.remove(cardMesh);
    this.cards = this.cards.filter(c => c.id !== cardMesh.userData.id);
    this.cardMap.delete(cardMesh.userData.id);

    if (this.cards.length < 1) {
      setCardGridStore('active', false);
      setHoverSignal();
    }
    if (this.filteredCards) {
      this.filteredCards = this.filteredCards.filter(card => card.id !== cardMesh.userData.id);
    }

    this.updateCardPositions();
  }
}
