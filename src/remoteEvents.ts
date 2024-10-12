import uniqBy from 'lodash-es/uniqBy';
import { nanoid } from 'nanoid';
import { Vector3 } from 'three';
import { animateObject, queueAnimationGroup } from './lib/animations';
import { cloneCard, createCardGeometry, setCardData } from './lib/card';
import { Card } from './lib/constants';
import {
  cardsById,
  expect,
  gameLog,
  logs,
  PLAY_AREA_ROTATIONS,
  playAreas,
  playerCount,
  processedEvents,
  provider,
  setLogs,
  setPlayerCount,
  setProcessedEvents,
  table,
  zonesById,
} from './lib/globals';
import { PlayArea } from './lib/playArea';
import { setCounters } from './lib/ui/counterDialog';
import { isLogMessageStackable } from './lib/ui/log';

interface Event {
  clientID: string;
  payload: unknown;
}

let processing = false;

export async function processEvents() {
  if (processing) return;
  processing = true;
  try {
    while (processedEvents() < gameLog.length) {
      const event = gameLog.get(processedEvents());
      addLogMessage(event);
      setProcessedEvents(e => e + 1);
      if (event.clientID === provider.awareness.clientID) continue;
      await handleEvent(event);
    }
  } finally {
    processing = false;
  }
}

export async function handleEvent(event) {
  console.log(event);
  expect(!!EVENTS[event.type], `${event.type} not implemented`);
  let playArea = playAreas.get(event.clientID);
  let card = cardsById.get(event.payload?.userData?.id);
  await EVENTS[event.type](event, playArea, card);
}

const EVENTS = {
  join(event: Event) {
    let playArea = new PlayArea(event.clientID, event.payload.cards, event.payload);

    table.add(playArea.mesh);
    playAreas.set(event.clientID, playArea);
    setPlayerCount(count => count + 1);

    console.log({ playerCount: playerCount() });
    // playArea.mesh.rotateZ((Math.PI / 2) * playerCount);
    const rotation = PLAY_AREA_ROTATIONS[playerCount()];
    playArea.mesh.rotateZ(rotation);
  },
  queueAnimationGroup(event: Event) {
    queueAnimationGroup();
  },
  draw(event: Event, playArea: PlayArea) {
    playArea?.draw();
  },
  addToHand(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea.addToHand(card);
  },
  removeFromHand(event: Event, playArea: PlayArea, card: Card) {
    playArea.removeFromHand(card.mesh);
  },
  addToBattlefield(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea.addToBattlefield(card);
  },
  modifyCard(event: Event, playArea: PlayArea, card: Card) {
    setCardData(card.mesh, 'modifiers', event.payload.userData.modifiers);
    playArea.modifyCard(card);
  },
  createCounter(event: Event) {
    setCounters(counters => uniqBy([...counters, event.counter], 'id'));
  },
  addCardBottomDeck(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea.addCardBottomDeck(card);
  },
  addCardTopDeck(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea.addCardTopDeck(card);
  },
  animateObject(event: Event, _playArea: PlayArea, card: Card) {
    animateObject(card.mesh, event.payload.animation);
  },
  destroy(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea?.destroy(card.mesh);
  },
  async transferCard(event: Event, playArea: PlayArea, card: Card) {
    let fromZone = zonesById.get(event.payload.fromZoneId);
    let toZone = zonesById.get(event.payload.toZoneId);
    await fromZone?.removeCard(card.mesh);
    let p = event?.payload?.addOptions?.position;
    let position = p ? new Vector3(p.x, p.y, p.z) : undefined;
    await toZone?.addCard(card, { position });
  },
  createCard(event: Event, playArea: PlayArea) {
    let card = structuredClone(event.payload.userData.card);
    card.id = event.payload.userData.id;
    card.mesh = createCardGeometry(card);
    card.mesh.userData = event.payload.userData;
    cardsById.set(card.id, card);

    let zone = zonesById.get(event.payload.zoneId);
    let options = {};

    let p = event.payload?.addOptions?.position;
    if (p) {
      options.position = new Vector3(p.x, p.y, p.z);
    }

    zone?.addCard(card, options);
  },
  tap(event: Event, playArea: PlayArea, card: Card) {
    playArea?.tap(card.mesh);
  },
  flip(event: Event, playArea: PlayArea, card: Card) {
    playArea?.flip(card.mesh);
  },
  clone(event: Event, playArea: PlayArea) {
    playArea?.clone(event.payload.id, event.payload.newId);
  },
  peek(event: Event, playArea: PlayArea, card: Card) {
    playArea.peek(card);
  },
  reveal(event: Event, remotePlayArea: PlayArea, card: Card) {
    expect(!!card, 'card not found');
    let cardProxy = cloneCard(card, nanoid());
    // remotePlayArea.peek();
    setCardData(cardProxy.mesh, 'isPublic', true);
    const playArea = playAreas.get(provider.awareness.clientID)!;
    playArea.reveal(cardProxy);
  },
  exileCard(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea?.exileCard(card.mesh);
  },
  deckFlipTop(event: Event, playArea: PlayArea) {
    playArea?.deckFlipTop(event.payload.toggle);
  },
  shuffleDeck(event: Event, playArea: PlayArea) {
    return playArea?.shuffleDeck(event.payload.order);
  },
  mulligan(event: Event, playArea: PlayArea) {
    return playArea.mulligan(event.payload.drawCount, event.payload.order);
  },
};

function addLogMessage(event) {
  if (event.type === 'animateObject') return;
  let index = logs.length;

  const { type, clientID, payload } = event;
  let count = 1;
  let lastEvent = logs[index - 1];
  if (isLogMessageStackable(lastEvent, event)) {
    count = lastEvent.count + 1;
    index--;
  }

  let logPayload = payload;
  if (type !== 'join') {
    if (payload?.userData) {
      logPayload = {
        ...logPayload,
        userData: { ...logPayload.userData, cardBack: undefined },
      };
    }
  }

  setLogs(index, {
    type,
    clientID,
    payload: logPayload,
    count,
  });
}
