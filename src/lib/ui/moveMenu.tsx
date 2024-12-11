import { Component } from 'solid-js';
import { Show } from 'solid-js/web';
import { MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '~/components/ui/menubar';
import { Card, CardZone } from '../constants';
import { doXTimes } from '../globals';
import { PlayArea } from '../playArea';
import { transferCard } from '../transferCard';

interface Props {
  cards: Card[];
  fromZone: CardZone;
  playArea: PlayArea;
  text: string;
}

const MoveMenu: Component<Props> = props => {
  function moveTo<T extends {}>(zone: CardZone<T>, addOptions?: T) {
    let cards = props.cards.slice();
    doXTimes(cards.length, () => {
      transferCard(cards.shift()!, props.fromZone, zone, { addOptions });
    });
  }

  function moveToFaceDown<T extends {}>(zone: CardZone<T>, addOptions?: T) {
    let cards = props.cards.slice();
    doXTimes(cards.length, () => {
      let card = cards.shift()!;
      transferCard(card, props.fromZone, zone, { addOptions, userData: { isFlipped: true } });
    });
  }

  return (
    <MenubarMenu>
      <MenubarTrigger class='whitespace-nowrap'>{props.text ?? 'Move to'}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onClick={() => moveTo(props.playArea.peekZone)}>Search</MenubarItem>
        <Show when={props.fromZone !== props.playArea.hand}>
          <MenubarItem onClick={() => moveTo(props.playArea.hand)}>Hand</MenubarItem>
        </Show>
        <MenubarItem onClick={() => moveTo(props.playArea.graveyardZone)}>Discard</MenubarItem>
        <MenubarItem onClick={() => moveTo(props.playArea.exileZone)}>Exile</MenubarItem>
        <MenubarItem onClick={() => moveTo(props.playArea.deck)}>Top of Deck</MenubarItem>
        <MenubarItem onClick={() => moveTo(props.playArea.deck, { location: 'bottom' })}>
          Bottom of Deck
        </MenubarItem>
        <Show when={props.fromZone !== props.playArea.battlefieldZone}>
          <MenubarItem onClick={() => moveTo(props.playArea.battlefieldZone)}>
            Battlefield
          </MenubarItem>
          <MenubarItem onClick={() => moveToFaceDown(props.playArea.battlefieldZone)}>
            Battlefield Face down
          </MenubarItem>
        </Show>
      </MenubarContent>
    </MenubarMenu>
  );
};

export default MoveMenu;
