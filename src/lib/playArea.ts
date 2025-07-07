import uniqBy from 'lodash-es/uniqBy';
import { nanoid } from 'nanoid';
import { CatmullRomCurve3, Euler, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { animateObject } from './animations';
import {
  cloneCard,
  initializeCardMesh,
  loadCardTextures,
  setCardData,
  updateModifiers,
} from './card';
import { CardArea } from './cardArea';
import { CardGrid } from './cardGrid';
import { CardStack } from './cardStack';
import { Card, CARD_HEIGHT, CARD_WIDTH, CardZone, SerializableCard } from './constants';
import { Deck, loadCardList, loadDeckList } from './deck';
import { cardsById, doXTimes, focusCamera, provider, zonesById } from './globals';
import { Hand } from './hand';
import { transferCard } from './transferCard';
import { getFocusCameraPositionRelativeTo } from './utils';

interface RemoteZoneState {
  id: string;
  cards: SerializableCard[];
}

interface CardReference {
  id: string;
  clientId: number;
  detail: any;
}

interface State {
  isLocalPlayer?: boolean;
  clientId?: number;
  graveyard?: RemoteZoneState;
  exile?: RemoteZoneState;
  battlefield?: RemoteZoneState;
  peekZone?: RemoteZoneState;
  tokenSearchZone?: RemoteZoneState;
  hand?: RemoteZoneState;
  deck?: RemoteZoneState;
  cards: CardReference[];
}

export class PlayArea {
  public deck: Deck;
  public hand: Hand;
  public mesh: Group;
  public exileZone: CardStack;
  public graveyardZone: CardStack;
  private listeners: (() => void)[] = [];
  public battlefieldZone: CardArea;
  public peekZone;
  public isLocalPlayArea: boolean;
  public revealZone;
  public tokenSearchZone;
  public availableTokens?: CardReference[];
  private inProgressActions = new Set<string>();

  constructor(
    public clientId: number,
    public cards: CardReference[],
    cardsInDeck: Card[],
    state: State,
  ) {
    this.mesh = new Group();
    this.isLocalPlayArea = !!state.isLocalPlayer;

    this.battlefieldZone = new CardArea('battlefield', state.battlefield?.id);

    this.peekZone = new CardGrid(this.isLocalPlayArea, 'peek', state.peekZone?.id);
    this.revealZone = new CardGrid(this.isLocalPlayArea, 'reveal');
    this.tokenSearchZone = new CardGrid(
      this.isLocalPlayArea,
      'tokenSearch',
      state.tokenSearchZone?.id,
    );
    this.graveyardZone = new CardStack('graveyard', state.graveyard?.id);
    this.exileZone = new CardStack('exile', state.exile?.id);

    this.exileZone.mesh.position.set(88, -55, 2.5);
    this.graveyardZone.mesh.position.set(70, -80, 2.5);

    this.cards = cards.map(card => {
      card.id = card.id || nanoid();
      card.clientId = clientId;
      return card;
    });

    this.mesh.add(this.revealZone.mesh);
    this.mesh.add(this.peekZone.mesh);
    this.mesh.add(this.tokenSearchZone.mesh);
    this.mesh.add(this.exileZone.mesh);
    this.mesh.add(this.graveyardZone.mesh);

    let deckCards = (state?.deck?.cards || cardsInDeck).map(card =>
      initializeCardMesh(card, clientId),
    );

    this.deck = new Deck(deckCards, state?.deck?.id);
    this.hand = new Hand(state?.hand?.id, this.isLocalPlayArea);

    if (this.isLocalPlayArea) {
      this.deck.mesh.addEventListener('click', e => {
        this.draw();
      });
    }

    this.mesh.add(this.deck.mesh);
    this.mesh.add(this.hand.mesh);
    this.mesh.add(this.battlefieldZone.mesh);

    if (state?.battlefield?.cards) {
      state.battlefield.cards.forEach(mesh => {
        let card = initializeCardMesh(mesh.userData.card, clientId);
        setCardData(card.mesh, 'isPublic', true);
        this.battlefieldZone.addCard(card, {
          skipAnimation: true,
          positionArray: mesh.position,
        });
      });
    }
  }

  async dismissAllCardGrids() {
    const zones = ['peekZone', 'tokenSearchZone'] as const;
    await Promise.all(
      zones.map(name => {
        if (this[name].cards.length > 0) return this.dismissFromZone(this[name]);
      }),
    );
  }

  async transferEntireZone<A, B>(fromZone: CardZone<A>, toZone: CardZone<B>) {
    let events = fromZone.cards
      .map(card => ({
        type: 'transferCard',
        payload: {
          userData: card.mesh.userData,
          toZoneId: toZone.id,
          fromZoneId: fromZone.id,
          extendedOptions: {
            preventTransmit: true,
          },
        },
      }))
      .reverse();

    this.emitEvent({ type: 'bulk', timing: 50, events: events });
    await doXTimes(
      fromZone.cards.length,
      () => {
        let card = fromZone.cards.at(-1);
        transferCard(card, fromZone, toZone, { preventTransmit: true });
      },
      50,
    );
  }

  async dismissFromZone(zone: CardZone) {
    if (this.inProgressActions.has(`dismissFromZone.${zone.id}`)) return;
    this.inProgressActions.add(`dismissFromZone.${zone.id}`);
    let events = zone.cards
      .map(card => ({
        type: 'transferCard',
        payload: {
          userData: card.mesh.userData,
          toZoneId: card.mesh.userData.previousZoneId,
          fromZoneId: zone.id,
          extendedOptions: {
            preventTransmit: true,
          },
        },
      }))
      .reverse();

    this.emitEvent({ type: 'bulk', timing: 25, events: events });
    await doXTimes(
      zone.cards.length,
      () => {
        let card = zone.cards.at(-1);
        let previousZone = zonesById.get(card.mesh.userData.previousZoneId);
        transferCard(card, zone, previousZone, { preventTransmit: true });
      },
      25,
    );
    this.inProgressActions.delete(`dismissFromZone.${zone.id}`);
  }

  async toggleTokenMenu(payload?: { availableTokens: CardReference[]; ids: string[] }) {
    const isOpen = this.tokenSearchZone.cards.length > 0;
    await this.dismissAllCardGrids();
    if (isOpen) return;
    if (payload?.availableTokens) {
      this.availableTokens = payload.availableTokens;
    }
    if (!this.availableTokens) {
      let cardsInPlay = this.cards;
      let allTokens = new Set(
        cardsInPlay
          .map(card => (card.detail.all_parts ?? []).filter(part => part.component === 'token'))
          .flat()
          .map(part => part.uri),
      );

      this.availableTokens = await Promise.all(
        [...allTokens].map(async uri => {
          const payload = await fetch(uri, { cache: 'force-cache' }).then(r => r.json());
          return {
            ...payload,
            clientId: this.clientId,
          };
        }),
      ).then(cards => uniqBy(cards, 'oracle_id').sort((a, b) => a.name.localeCompare(b.name)));
    }

    let availableCards = this.availableTokens.map((detail, i) => {
      let card = cloneCard({ detail }, payload?.ids?.[i] ?? nanoid());
      setCardData(card.mesh, 'isPublic', true);
      setCardData(card.mesh, 'isInteractive', true);
      setCardData(card.mesh, 'location', 'tokenSearch');
      setCardData(card.mesh, 'clientId', provider.awareness.clientID);
      setCardData(card.mesh, 'isToken', true);
      return card;
    });

    this.emitEvent({
      type: 'toggleTokenMenu',
      payload: {
        availableTokens: this.availableTokens,
        ids: availableCards.map(card => card.id),
      },
    });

    for (let i = 0; i < availableCards.length; i++) {
      setTimeout(() => {
        this.tokenSearchZone.addCard(availableCards[i]);
      }, i * 50);
    }
  }

  modifyCard(card: Card, update = x => x) {
    card.mesh.userData.modifiers = update(
      card.mesh.userData.modifiers ?? { power: 0, toughness: 0, counters: {} },
    );
    this.emitEvent({ type: 'modifyCard', payload: { userData: card.mesh.userData } });

    updateModifiers(card);
  }

  draw() {
    transferCard(this.deck.cards[0], this.deck, this.hand);
  }

  async mulligan(drawCount: number, existingOrder?: number[]) {
    let cardsInHand = this.hand.cards;
    await doXTimes(
      cardsInHand.length,
      () => {
        let card = this.hand.cards[0];
        this.hand.removeCard(card.mesh);
        this.deck.addCardBottom(card);
      },
      50,
    );
    let order = await this.deck.shuffle(existingOrder);
    this.emitEvent({ type: 'mulligan', payload: { order, drawCount } });

    await doXTimes(
      drawCount,
      () => {
        transferCard(this.deck.cards[0], this.deck, this.hand, { preventTransmit: true });
      },
      50,
    );
  }

  reveal(card: Card) {
    if (provider.awareness.clientID !== card?.mesh.userData.clientId) {
      setCardData(card.mesh, 'isPublic', true);
      this.revealZone.addCard(card);
    } else {
      this.emitEvent({ type: 'reveal', payload: { userData: card.mesh.userData } });
    }
  }

  async peekGraveyard() {
    if (this.inProgressActions.has(`peekGraveyard`)) return;
    this.inProgressActions.add('peekGraveyard');
    if (this.tokenSearchZone.cards.length) {
      this.dismissFromZone(this.tokenSearchZone);
    }
    await Promise.all(
      this.graveyardZone.mesh.children.map((child, i) => {
        if (!child.userData.id) return;
        return new Promise<void>(resolve => {
          let card = cardsById.get(child.userData.id);

          setTimeout(
            () => {
              transferCard(card, this.graveyardZone, this.peekZone);
              resolve();
            },
            (this.graveyardZone.mesh.children.length - i) * 50,
          );
        });
      }),
    );
    this.inProgressActions.delete('peekGraveyard');
  }

  async peekExile() {
    if (this.inProgressActions.has(`peekExile`)) return;
    this.inProgressActions.add('peekExile');
    if (this.tokenSearchZone.cards.length) {
      this.dismissFromZone(this.tokenSearchZone);
    }
    await Promise.all(
      this.exileZone.mesh.children.map((child, i) => {
        if (!child.userData.id) return;
        return new Promise<void>(resolve => {
          let card = cardsById.get(child.userData.id);

          setTimeout(
            () => {
              transferCard(card, this.exileZone, this.peekZone);
              resolve();
            },
            (this.exileZone.mesh.children.length - i) * 50,
          );
        });
      }),
    );
    // this.exileZone.clear();
    this.inProgressActions.delete('peekExile');
  }
  async deckFlipTop(toggle = false) {
    let card = await this.deck.flipTop(toggle);
    this.emitEvent({ type: 'deckFlipTop', payload: { toggle, userData: card.mesh.userData } });
  }

  async shuffleDeck(existingOrder?: number[]) {
    let order = await this.deck.shuffle(existingOrder);
    this.emitEvent({ type: 'shuffleDeck', payload: { order } });
  }

  flip(cardMesh: Mesh) {
    let focusCameraTarget = getFocusCameraPositionRelativeTo(
      cardMesh,
      new Vector3(CARD_WIDTH / 4, 0, 0),
    );
    setCardData(cardMesh, 'isFlipped', !cardMesh.userData.isFlipped);
    this.emitEvent({ type: 'flip', payload: { userData: cardMesh.userData } });

    const zone = zonesById.get(cardMesh.userData.zoneId)!;

    let rotation = new Euler().fromArray(cardMesh.userData.zone[zone.id].rotation);
    let vec = new Vector3();
    cardMesh.getWorldDirection(vec);
    rotation.y += Math.PI;
    rotation.z *= -1;
    setCardData(cardMesh, `zone.${zone.id}.rotation`, rotation.toArray());

    animateObject(cardMesh, {
      duration: 0.4,
      path: new CatmullRomCurve3([
        cardMesh.position.clone(),
        cardMesh.position.clone().add(new Vector3(0, 0, 20)),
        new Vector3().fromArray(cardMesh.userData.zone[zone.id].position),
      ]),
      to: {
        rotation,
      },
    });

    if (focusCamera.userData.target === cardMesh.uuid) {
      animateObject(focusCamera, {
        duration: 0.4,
        to: focusCameraTarget,
      });
    }
  }

  tap(cardMesh: Mesh) {
    return new Promise<void>(onComplete => {
      let initialAngle = cardMesh.userData.isFlipped ? Math.PI : 0;
      let angleDelta = cardMesh.userData.isTapped ? 0 : -Math.PI / 2;

      if (cardMesh.userData.isFlipped) {
        angleDelta = -angleDelta;
      }

      let rotation = cardMesh.rotation.clone();
      rotation.z = angleDelta + initialAngle;
      setCardData(cardMesh, 'isTapped', !cardMesh.userData.isTapped);
      this.emitEvent({ type: 'tap', payload: { userData: cardMesh.userData } });

      animateObject(cardMesh, {
        to: { rotation },
        duration: 0.2,
        onComplete,
      });
    });
  }

  clone(id: string, newId = nanoid()) {
    this.emitEvent({ type: 'clone', payload: { id, newId } });
    let card = cardsById.get(id)!;
    let newCard = cloneCard(card, newId);
    card.mesh.parent?.add(newCard.mesh);
  }

  getLocalState(): State {
    const localState = {
      graveyard: this.graveyardZone.getSerializable(),
      exile: this.exileZone.getSerializable(),
      battlefield: this.battlefieldZone.getSerializable(),
      peekZone: this.peekZone.getSerializable(),
      tokenSearchZone: this.tokenSearchZone.getSerializable(),
      hand: this.hand.getSerializable(),
      deck: this.deck.getSerializable(),
      cards: this.cards.map(card => ({ ...card, mesh: undefined })),
    };

    return localState;
  }

  subscribeEvents(callback) {
    this.listeners.push(callback);
  }

  private emitEvent(event = {}) {
    this.listeners.forEach(callback => {
      callback(event);
    });
  }

  static async FromDeck(clientId: number, deck) {
    let deckList = deck?.deck ?? loadCardList(deck.cardList);
    let cardsInDeck = await loadDeckList(deckList);
    let cardsInPlay = deck?.inPlay ? await loadDeckList(deck?.inPlay) : [];

    let cards = cardsInDeck.concat(cardsInPlay);

    const playArea = new PlayArea(clientId, cards, cardsInDeck, { isLocalPlayer: true });

    if (deck?.inPlay) {
      cardsInPlay.forEach((card, i) => {
        card.id = card.id || nanoid();
        let initializedCard = initializeCardMesh(card, clientId);
        setCardData(initializedCard.mesh, 'isPublic', true);
        playArea.battlefieldZone.addCard(initializedCard, {
          skipAnimation: true,
          positionArray: [100 - (CARD_WIDTH + 2) * (i + 1), 50 - CARD_HEIGHT - 2, 0.125],
        });
      });
    }

    playArea.deck.shuffle();
    playArea.loadTextures();
    return playArea;
  }

  async loadTextures() {
    const cache = new Map<string, Promise<MeshStandardMaterial>>();
    const promises = this.battlefieldZone.cards.map(card => loadCardTextures(card, cache));
    promises.concat(
      ...this.deck.cards.map(
        (card, i) =>
          new Promise<void>(resolve =>
            setTimeout(() => {
              loadCardTextures(card, cache).then(resolve);
            }, i * 20),
          ),
      ),
    );
    await Promise.all(promises);
    cache.clear();
  }

  destroy() {
    this.mesh.remove(this.revealZone.mesh);
    this.mesh.remove(this.peekZone.mesh);
    this.mesh.remove(this.tokenSearchZone.mesh);
    this.mesh.remove(this.exileZone.mesh);
    this.mesh.remove(this.graveyardZone.mesh);
    this.mesh.remove(this.deck.mesh);
    this.mesh.remove(this.hand.mesh);
    this.mesh.remove(this.battlefieldZone.mesh);
    this.peekZone.destroy();
    this.revealZone.destroy();
    this.tokenSearchZone.destroy();
    this.graveyardZone.destroy();
    this.exileZone.destroy();
    this.battlefieldZone.destroy();
    this.deck.destroy();
    this.hand.destroy();
    this.cards = [];
  }

  static FromNetworkState(state: State) {
    let playArea = new PlayArea(state.clientId!, state.cards!, state.deck.cards!, state);
    playArea.loadTextures();
    return playArea;
  }
}
