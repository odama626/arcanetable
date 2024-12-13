import { Card } from '~/lib/constants';
import { doXTimes } from '~/lib/globals';
import { PlayArea } from '~/lib/playArea';
import { transferCard } from '~/lib/transferCard';

export function drawCards(playArea: PlayArea, count: number = 1) {
  doXTimes(count, () => playArea.draw());
}

export function peekFromTop(playArea: PlayArea, count = 1) {
  doXTimes(count, () => transferCard(playArea.deck.cards[0], playArea.deck, playArea.peekZone), 25);
}

export function searchDeck(playArea: PlayArea) {
  peekFromTop(playArea, playArea.deck.cards.length);
}

export function discardFromTop(playArea: PlayArea, count = 1) {
  doXTimes(
    count,
    () => transferCard(playArea.deck.cards[0], playArea.deck, playArea.graveyardZone),
    25
  );
}

export function exileFromTop(playArea: PlayArea, count = 1) {
  doXTimes(
    count,
    () => transferCard(playArea.deck.cards[0], playArea.deck, playArea.exileZone),
    25
  );
}

export function getNextLandIndex(cards: Card[]) {
  const count = cards.findIndex(card => card.detail.type_line.toLowerCase().includes('land'));
  console.log(count);
  return count;
}

export function revealFromTop(playArea: PlayArea, count = 1) {
  doXTimes(
    count,
    () => {
      playArea.reveal(playArea.deck.cards[0]);
      transferCard(playArea.deck.cards[0], playArea.deck, playArea.peekZone);
    },
    25
  );
}
