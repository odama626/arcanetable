import { Component, For } from 'solid-js';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '~/components/ui/menubar';
import { PlayArea } from '../playArea';
import { sendEvent } from '../globals';
import { queueAnimationGroup } from '../animations';

let COUNT_OPTIONS = [1, 3, 5, 7, 10];

const DeckMenu: Component<{ playArea: PlayArea }> = props => {
  function getNextLandIndex() {
    return props.playArea.deck.cards.findIndex(card =>
      card.detail.type_line.toLowerCase().includes('land')
    );
  }

  function doXTimes(x: number, callback, delay = 100) {
    new Array(x).fill(0).forEach((_, i) => setTimeout(callback, delay * i));
  }

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Actions</MenubarTrigger>
        <MenubarContent>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={() => props.playArea.draw()}>Draw</MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem
                    closeOnSelect={false}
                    onClick={() => doXTimes(value, () => props.playArea.draw())}>
                    {value}
                  </MenubarItem>
                )}
              </For>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={() => props.playArea.destroyTopDeck()}>
              Discard
            </MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem
                    closeOnSelect={false}
                    onClick={() => doXTimes(value, () => props.playArea.destroyTopDeck())}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                closeOnSelect={false}
                onClick={() =>
                  doXTimes(getNextLandIndex() + 1, () => props.playArea.destroyTopDeck())
                }>
                To next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={() => props.playArea.exileTopDeck()}>
              Exile
            </MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem
                    closeOnSelect={false}
                    onClick={() => doXTimes(value, () => props.playArea.exileTopDeck())}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                closeOnSelect={false}
                onClick={() =>
                  doXTimes(getNextLandIndex() + 1, () => props.playArea.exileTopDeck())
                }>
                To next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger onClick={() => props.playArea.peek()}>Peek</MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem
                    closeOnSelect={false}
                    onClick={() => doXTimes(value, () => props.playArea.peek())}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                onClick={() => {
                  doXTimes(props.playArea.deck.cards.length, () => props.playArea.peek(), 50);
                }}>
                All
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          {/* <MenubarSub>
            <MenubarSubTrigger>Reveal</MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem
                    closeOnSelect={false}
                    onClick={() => doXTimes(value, () => props.playArea.reveal())}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                onClick={() => {
                  doXTimes(props.playArea.deck.cards.length, () => props.playArea.reveal(), 50);
                }}>
                All
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub> */}
          <MenubarSub>
            <MenubarSubTrigger onClick={() => props.playArea.deckFlipTop()}>Flip</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem
                onClick={() => {
                  props.playArea.deckFlipTop();
                }}>
                Flip One
              </MenubarItem>
              <MenubarItem
                onClick={() => {
                  props.playArea.deckFlipTop(true);
                }}>
                Keep Flipped
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={() => props.playArea.mulligan(1)}>
              Mulligan for
            </MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem closeOnSelect={false} onClick={() => props.playArea.mulligan(value)}>
                    {value}
                  </MenubarItem>
                )}
              </For>
            </MenubarSubContent>
          </MenubarSub>{' '}
          <MenubarSeparator />
          <MenubarItem
            onClick={() => {
              props.playArea.shuffleDeck();
            }}>
            Shuffle
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
};

export default DeckMenu;
