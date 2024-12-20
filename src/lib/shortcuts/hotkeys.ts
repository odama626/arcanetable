import hotkeys from 'hotkeys-js';
import { onMount } from 'solid-js';
import { selection, cardsById, zonesById, playAreas, provider, hoverSignal } from '../globals';
import { transferCard } from '../transferCard';
import { drawCards, searchDeck } from './commands/deck';
import { untapAll } from './commands/field';

export function HotKeys() {
  const cardMesh = () => hoverSignal()?.mesh;
  const playArea = playAreas[provider?.awareness?.clientID];
  const cards = () => {
    let items = selection.selectedItems;
    if (items.length) return items.map(item => cardsById.get(item.userData.id));
    if (!cardMesh()) return [];

    return [cardsById.get(cardMesh().userData.id)];
  };

  onMount(() => {
    hotkeys('shift+u', function () {
      untapAll(playArea);
    });

    hotkeys('d', function () {
      drawCards(playArea, 1);
    });

    hotkeys('ctrl+d,command+d', function (e) {
      e.preventDefault();
      cards().map(card => {
        const previousZone = zonesById.get(card.mesh.userData.zoneId);
        transferCard(card, previousZone, playArea.graveyardZone);
      });
      selection.clearSelection();
    });

    hotkeys('e', function (e) {
      e.preventDefault();
      cards().map(card => {
        const previousZone = zonesById.get(card.mesh.userData.zoneId);
        transferCard(card, previousZone, playArea.exileZone);
      });
      selection.clearSelection();
    });

    hotkeys('b', function (e) {
      e.preventDefault();
      cards().map(card => {
        const previousZone = zonesById.get(card.mesh.userData.zoneId);
        transferCard(card, previousZone, playArea.battlefieldZone);
      });
    });

    hotkeys('p', function (e) {
      e.preventDefault();
      cards().map(card => {
        const previousZone = zonesById.get(card.mesh.userData.zoneId);
        transferCard(card, previousZone, playArea.peekZone);
      });
      selection.clearSelection();
    });

    hotkeys('s', function (e) {
      e.preventDefault();
      searchDeck(playArea);
    });

    hotkeys('escape', 'peek', function (e) {
      e.preventDefault();
      playArea.dismissFromZone(playArea.peekZone);
    });

    hotkeys('escape', 'tokenSearch', function (e) {
      e.preventDefault();
      playArea.dismissFromZone(playArea.tokenSearchZone);
    });

    hotkeys('escape', 'reveal', function (e) {
      e.preventDefault();
      playArea.dismissFromZone(playArea.revealZone);
    });

    hotkeys('t', 'battlefield', function (e) {
      e.preventDefault();
      cards().forEach(card => playArea.tap(card.mesh));
    });

    hotkeys('c', 'battlefield', function (e) {
      e.preventDefault();
      cards().forEach(card => playArea.clone(card?.mesh.userData.id));
    });

    hotkeys('f', 'battlefield', function (e) {
      e.preventDefault();
      cards().forEach(card => playArea.flip(card.mesh));
    });

    return () => {
      hotkeys.unbind();
    };
  });
  return null;
}
