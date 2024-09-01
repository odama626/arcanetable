import { nanoid } from 'nanoid';
import { CatmullRomCurve3, Euler, Group, Mesh, Vector3 } from 'three';
import {
  Card,
  CARD_WIDTH,
  cloneCard,
  createCardGeometry,
  getSearchLine,
  renderModifiers,
} from './card';
import { CardGrid } from './cardGrid';
import { CardStack } from './cardStack';
import { Deck, loadDeckList } from './deck';
import {
  animateObject,
  cardsById,
  focusCamera,
  getFocusCameraPositionRelativeTo,
  provider,
  updateFocusCamera,
  zonesById,
} from './globals';
import { Hand } from './hand';
import { CardArea } from './cardArea';
import { uniqBy } from 'lodash-es';

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

  constructor(public clientId: number, public cards: Card[], state?) {
    this.mesh = new Group();
    this.isLocalPlayArea = clientId === provider.awareness.clientID;

    console.log({ state });

    this.battlefieldZone = new CardArea('battlefield', state?.battlefield?.id);

    this.peekZone = new CardGrid(this.isLocalPlayArea, 'peek');
    this.revealZone = new CardGrid(this.isLocalPlayArea, 'reveal');
    this.tokenSearchZone = new CardGrid(this.isLocalPlayArea, 'tokenSearch');
    this.graveyardZone = new CardStack('graveyard', state?.graveyard?.id);
    this.exileZone = new CardStack('exile', state?.exile?.id);

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

    let deckCards = (state?.deck?.cards || cards).map(card => {
      const mesh = createCardGeometry(card);
      mesh.userData.clientId = clientId;

      let result = {
        ...card,
        clientId: clientId,
        mesh,
      };
      cardsById.set(result.id, result);
      return result;
    });

    this.deck = new Deck(deckCards, state?.deck?.id);
    this.hand = new Hand(state?.hand?.id);

    this.deck.mesh.addEventListener('click', e => {
      this.draw();
    });

    this.mesh.add(this.deck.mesh);
    this.mesh.add(this.hand.mesh);
    this.mesh.add(this.battlefieldZone.mesh);
  }

  async openTokenMenu() {
    let cardsInPlay = this.cards; //this.battlefieldZone.children.map(card => cardsById.get(card.userData.id));

    let allTokens = new Set(
      cardsInPlay
        .map(card => (card.detail.all_parts ?? []).filter(part => part.component === 'token'))
        .flat()
        .map(part => part.uri)
    );

    let availableTokens = await Promise.all(
      [...allTokens].map(uri => fetch(uri, { cache: 'force-cache' }).then(r => r.json()))
    );

    let availableCards = uniqBy(availableTokens, 'oracle_id')
      .map(detail => {
        let card = { detail, id: nanoid() };
        card.mesh = createCardGeometry(structuredClone(card));
        card.mesh.userData.isPublic = true;
        card.mesh.userData.isInteractive = true;
        card.mesh.userData.location = 'tokenSearch';
        card.mesh.userData.clientId = provider.awareness.clientID;
        card.detail.search = getSearchLine(card.detail);
        cardsById.set(card.id, card);
        return card;
      })
      .sort((a, b) => a.detail.name.localeCompare(b.detail.name));

    for (let i = 0; i < availableCards.length; i++) {
      setTimeout(() => {
        this.tokenSearchZone.addCard(availableCards[i]);
      }, i * 50);
    }
  }

  modifyCard(card: Card, update = x => x) {
    card.mesh.userData.modifiers = update(
      card.mesh.userData.modifiers ?? { power: 0, toughness: 0, counters: {} }
    );
    this.emitEvent('modifyCard', { userData: card.mesh.userData });

    renderModifiers(card);
  }

  draw() {
    this.hand.addCard(this.deck.draw());
    this.emitEvent('draw');
  }

  addToHand(card: Card) {
    this.emitEvent('addToHand', { userData: card.mesh.userData });
    this.hand.addCard(card);
  }

  peek() {
    this.emitEvent('peek');
    let card = this.deck.draw()!;
    this.peekZone.isPublic = false;
    this.peekZone.addCard(card);
  }

  reveal(card = this.deck.draw()) {
    if (provider.awareness.clientID !== card?.mesh.userData.clientId) {
      this.revealZone.addCard(card);
    } else {
      this.emitEvent('reveal', { userData: card.mesh.userData });
    }
  }

  async peekGraveyard() {
    await Promise.all(
      this.graveyardZone.mesh.children.map((child, i) => {
        if (!child.userData.id) return;
        return new Promise<void>(resolve => {
          let card = cardsById.get(child.userData.id);

          setTimeout(() => {
            this.graveyardZone.removeCard(card.mesh);
            this.peekZone.addCard(card);
            resolve();
          }, (this.graveyardZone.mesh.children.length - i) * 50);
        });
      })
    );
    // this.graveyardZone.mesh();
  }

  async peekExile() {
    await Promise.all(
      this.exileZone.mesh.children.map((child, i) => {
        if (!child.userData.id) return;
        return new Promise<void>(resolve => {
          let card = cardsById.get(child.userData.id);

          setTimeout(() => {
            this.exileZone.removeCard(card.mesh);
            this.peekZone.addCard(card);
            resolve();
          }, (this.exileZone.mesh.children.length - i) * 50);
        });
      })
    );
    // this.exileZone.clear();
  }
  async deckFlipTop(toggle = false) {
    let card = await this.deck.flipTop(toggle);
    this.emitEvent('deckFlipTop', { toggle, userData: card.mesh.userData });
  }

  destroyTopDeck() {
    let card = this.deck.draw();
    if (!card) throw new Error('no card to draw');
    this.destroy(card.mesh);
  }

  reorderDeck(order: number[]) {
    if (this.deck.cards[0].mesh.userData.isPublic) {
      this.deck.flipTop();
    }
    for (let i = 0; i < order.length - 2; i++) {
      let j = order[i];
      [this.deck.cards[i], this.deck.cards[j]] = [this.deck.cards[j], this.deck.cards[i]];
    }
    this.deck.animateReorder().then(() => {
      if (this.deck.isTopPublic) {
        this.deck.flipTop();
      }
    });
  }

  shuffleDeck() {
    let order = this.deck.shuffle();
    this.emitEvent('shuffleDeck', { order });
  }

  flip(cardMesh: Mesh) {
    this.emitEvent('flip', { userData: cardMesh.userData });

    let rotation = cardMesh.rotation.clone();
    let vec = new Vector3();
    cardMesh.getWorldDirection(vec);
    rotation.y += Math.PI;

    let focusCameraTarget = getFocusCameraPositionRelativeTo(
      cardMesh,
      new Vector3(-CARD_WIDTH / 4, 0, 0)
    );
    cardMesh.userData.isPublic = !cardMesh.userData.isPublic;
    cardMesh.userData.isFlipped = !cardMesh.userData.isPublic;

    animateObject(cardMesh, {
      duration: 0.4,
      path: new CatmullRomCurve3([
        cardMesh.position.clone(),
        cardMesh.position.clone().add(new Vector3(0, 0, 20)),
        cardMesh.position.clone(),
      ]),
      to: {
        rotation,
      },
    });

    if (focusCamera.userData.target === cardMesh.uuid) {
      console.log('flip', { focusCamera });
      animateObject(focusCamera, {
        duration: 0.4,
        to: focusCameraTarget,
      });
    }
  }

  addCardTopDeck(card: Card) {
    this.emitEvent('addCardTopDeck', { userData: card.mesh.userData });
    this.deck.addCardTop(card);
  }

  addCardBottomDeck(card: Card) {
    this.emitEvent('addCardBottomDeck', { userData: card.mesh.userData });
    this.deck.addCardBottom(card);
  }

  tap(cardMesh: Mesh) {
    return new Promise<void>(onComplete => {
      let angleDelta = cardMesh.userData.tapped ? Math.PI / 2 : Math.PI / -2;
      let rotation = cardMesh.rotation.clone();
      rotation.z += angleDelta;
      cardMesh.userData.tapped = !cardMesh.userData.tapped;
      this.emitEvent('tap', { userData: cardMesh.userData });

      animateObject(cardMesh, {
        to: { rotation },
        duration: 0.2,
        onComplete,
      });
    });
  }

  clone(id: string, newId = nanoid()) {
    this.emitEvent('clone', { id, newId });
    let card = cardsById.get(id)!;
    let newCard = cloneCard(card, newId);
    card.mesh.parent?.add(newCard.mesh);
  }

  destroy(cardMesh: Mesh) {
    this.emitEvent('destroy', { userData: cardMesh.userData });

    let card = cardsById.get(cardMesh.userData.id)!;
    let zone = zonesById.get(cardMesh.userData.zoneId);

    // if (zone?.removeCard) zone.removeCard(card.mesh);
    this.graveyardZone.addCard(card);
  }

  exileTopDeck() {
    let card = this.deck.draw();
    if (!card) throw new Error('no card to draw');
    this.exileCard(card.mesh);
  }

  exileCard(cardMesh: Mesh) {
    this.emitEvent('exileCard', { userData: cardMesh.userData });
    let card = cardsById.get(cardMesh.userData.id)!;
    this.exileZone.addCard(card);
  }

  getLocalState() {
    return {
      graveyard: this.graveyardZone.getSerializable(),
      exile: this.exileZone.getSerializable(),
      battlefield: this.battlefieldZone.getSerializable(),
      hand: this.hand.getSerializable(),
      deck: this.deck.getSerializable(),
      cards: this.cards.map(card => {
        const { mesh, ...rest } = card;
        return {
          ...rest,
          userData: mesh?.userData,
        };
      }),
    };
  }

  subscribeEvents(callback) {
    this.listeners.push(callback);
  }

  private emitEvent(type: string, payload = {}) {
    this.listeners.forEach(callback => {
      callback({ type, payload });
    });
  }

  static async FromCardList(clientId, text: string) {
    let cards = await loadDeckList(text);

    const playArea = new PlayArea(clientId, cards);
    playArea.deck.shuffle();
    return playArea;
  }

  static FromNetworkState(state) {
    let playArea = new PlayArea(state.clientId, state.cards, state);

    return playArea;
  }
}
