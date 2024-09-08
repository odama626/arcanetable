import { CatmullRomCurve3, Euler, Group, Quaternion, Vector3 } from 'three';
import { Card, CARD_WIDTH, getSearchLine } from './card';
import { expect, sha1, zonesById } from './globals';
import { animateObject } from './animations';
import { queueAnimationGroup } from './animations';
import { deck as deckParser } from './deckParser';
import { nanoid } from 'nanoid';

export class Deck {
  public mesh: Group;
  public isTopPublic = false;
  public id: string;

  constructor(public cards: Card[], id = nanoid()) {
    this.mesh = new Group();
    this.id = id;
    zonesById.set(this.id, this);

    this.mesh.rotation.set(0, Math.PI, 0);
    this.mesh.position.set(70, -55, cards.length * 0.125 + 2.5);
    this.mesh.userData.isInteractive = true;
    this.mesh.userData.zone = 'deck';

    cards.forEach((card, i) => {
      card.mesh.userData.location = 'deck';
      card.mesh.userData.isPublic = false;
      card.mesh.userData.zoneId = id;
      card.mesh.position.set(0, 0, i * 0.125);
      this.mesh.add(card.mesh);
    });
  }

  addCardBottom(card: Card) {
    card.mesh.userData.isPublic = false;
    card.mesh.userData.zoneId = this.id;
    this.cards.push(card);

    let initialPosition = card.mesh.getWorldPosition(new Vector3());
    this.mesh.worldToLocal(initialPosition);
    this.mesh.add(card.mesh);

    let yPos = this.cards.length - 1;
    let position = new Vector3(0, 0, yPos * 0.125);

    let path = new CatmullRomCurve3([
      initialPosition,
      new Vector3(CARD_WIDTH, 0, yPos * 0.125),
      position,
    ]);

    this.mesh.position.copy(new Vector3(70, -55, this.cards.length * 0.125 + 2.5));

    animateObject(this.mesh, {
      path: new CatmullRomCurve3([
        this.mesh.position.clone(),
        this.mesh.position.clone().add(new Vector3(0, 0, 5)),
        this.mesh.position.clone(),
      ]),
      duration: 0.5,
    });

    animateObject(card.mesh, {
      path,
      duration: 0.2,
      to: {
        rotation: new Euler(0, 0, 0),
      },
      onComplete() {
        card.mesh.userData.location = 'deck';
      },
    });
  }

  async addCardTop(card: Card) {
    if (this.cards[0].mesh.userData.isPublic) {
      await this.flipTop();
    }

    card.mesh.userData.location = 'deck';
    card.mesh.userData.isPublic = false;
    card.mesh.userData.zoneId = this.id;
    this.cards.unshift(card);

    let initialPosition = card.mesh.getWorldPosition(new Vector3());
    this.mesh.worldToLocal(initialPosition);
    this.mesh.add(card.mesh);

    let position = new Vector3(0, 0, 0);
    let path = new CatmullRomCurve3([initialPosition, new Vector3(0, 0, -5), position]);

    this.mesh.position.copy(new Vector3(70, -55, this.cards.length * 0.125 + 2.5));

    let promises = [];

    for (let i = 1; i < this.cards.length; i++) {
      this.mesh.remove(this.cards[i].mesh);
      this.mesh.add(this.cards[i].mesh);
      promises.push(
        new Promise<void>(resolve => {
          animateObject(this.cards[i].mesh, {
            duration: 0.2,
            to: {
              position: new Vector3(0, 0, i * 0.125),
              // rotation: new Euler(0, 0, 0),
            },
            onComplete: () => {
              this.cards[i].mesh.userData.location = 'deck';
              resolve();
            },
          });
        })
      );
    }

    promises.push(
      new Promise<void>(resolve => {
        animateObject(card.mesh, {
          path,
          duration: 0.2,
          to: {
            rotation: new Euler(0, 0, 0),
          },
          onComplete() {
            card.mesh.userData.location = 'deck';
            resolve();
          },
        });
      })
    );

    await Promise.all(promises);

    if (this.isTopPublic) {
      await this.flipTop();
    }
  }

  addCard(card: Card) {
    return this.addCardTop(card);
  }

  async shuffle(order?: number[]) {
    let newOrder = [];
    if (this.cards[0].mesh.userData.isPublic) {
      this.flipTop();
    }

    for (let i = 0; i < this.cards.length - 2; i++) {
      let j = order?.[i] ?? (Math.random() * i) | 0;
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      newOrder[i] = j;
    }

    await this.animateReorder().then(() => {
      if (this.isTopPublic) {
        this.flipTop();
      }
    });
    return newOrder;
  }

  async animateReorder() {
    queueAnimationGroup();
    animateObject(this.mesh, {
      duration: 0.2,
      to: {
        position: new Vector3(70, -55, this.cards.length * 0.125 + 2.5),
      },
    });

    await Promise.all(
      this.cards.map((card, i) => {
        return new Promise<void>(resolve => {
          this.mesh.remove(card.mesh);
          this.mesh.add(card.mesh);
          let z = card.mesh.position.clone().z;
          animateObject(card.mesh, {
            duration: 0.4,
            path: new CatmullRomCurve3([
              card.mesh.position.clone(),
              new Vector3((i % 2) * 20 - 10, 0, card.mesh.position.z),
              new Vector3((i % 2) * 20 - 10, 0, i * 0.125),
              new Vector3(0, 0, i * 0.125),
            ]),
            onComplete: resolve,
          });
        });
      })
    );
    queueAnimationGroup();
  }

  flipTop(toggle = false) {
    return new Promise(resolve => {
      let card = this.cards[0];
      if (!card) return;
      let isVisible = !card.mesh.userData.isPublic;

      card.mesh.userData.isPublic = isVisible;

      console.log({ isVisible, position: card.mesh.position.clone() });

      animateObject(card.mesh, {
        duration: 0.2,
        path: new CatmullRomCurve3([
          card.mesh.position.clone(),
          new Vector3(0, 0, card.mesh.position.z - 15),
          card.mesh.position.clone(),
        ]),
        to: {
          rotation: new Euler(0, isVisible ? Math.PI : 0, 0),
        },
        onComplete() {
          resolve(card);
        },
      });
      if (toggle) {
        this.isTopPublic = !this.isTopPublic;
      }
      return card;
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

  draw() {
    let card = this.cards.shift();
    expect(!!card, 'deck must have card to draw');
    if (!card) return;

    let worldPosition = new Vector3();
    card.mesh.getWorldPosition(worldPosition);
    let worldQuaternion = new Quaternion();
    card.mesh.getWorldQuaternion(worldQuaternion);
    let worldEuler = new Euler().setFromQuaternion(worldQuaternion);

    card.mesh.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
    card.mesh.rotation.set(worldEuler.x, worldEuler.y, worldEuler.z);

    this.mesh.remove(card.mesh);

    if (this.isTopPublic) {
      this.flipTop();
    }

    return card;
  }
}

interface CardEntry {
  name: string;
  qty: number;
  categories: string[];
  set: string;
}

export function loadCardList(cardList: string): CardEntry[] {
  return deckParser.run(cardList).result;
}

export async function fetchCardInfo(entry: CardEntry, cache?: Map<string, any>) {
  const url = new URL(`https://api.scryfall.com/cards/named`);
  url.searchParams.set('exact', entry.name);
  if (entry.set) {
    url.searchParams.set('set', entry.set);
  }

  let urlString = url.toString();

  if (cache && cache.has(urlString + entry.qty)) {
    return cache.get(urlString + entry.qty);
  }

  let result = fetch(urlString, { cache: 'force-cache' })
    .then(r => r.json())
    .then(async payload => {
      payload.search = getSearchLine(payload);
      return {
        ...entry,
        detail: payload,
      };
    });

  if (cache) {
    cache.set(urlString + entry.qty, result);
  }

  return result;
}

export async function loadDeckList(cardEntries: CardEntry[], cache?: Map<string, any>) {
  const uniqueCards = await Promise.all(cardEntries.map(entry => fetchCardInfo(entry, cache)));

  let cards = [];

  console.log({ uniqueCards });

  uniqueCards.forEach(card => {
    for (let i = 0; i < card.qty; i++) {
      cards.push({
        state: {},
        detail: card.detail,
        categories: card.categories ?? [],
      });
    }
  });

  console.log({ cards });
  return cards;
}
