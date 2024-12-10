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
import { COUNT_OPTIONS, doXTimes } from '../globals';
import { PlayArea } from '../playArea';
import { transferCard } from '../transferCard';

const DeckMenu: Component<{ playArea: PlayArea }> = props => {
  function getNextLandIndex() {
    return props.playArea.deck.cards.findIndex(card =>
      card.detail.type_line.toLowerCase().includes('land')
    );
  }

  function discardTopDeck() {
    transferCard(props.playArea.deck.cards[0], props.playArea.deck, props.playArea.graveyardZone);
  }

  function exileTopDeck() {
    transferCard(props.playArea.deck.cards[0], props.playArea.deck, props.playArea.exileZone);
  }

  function peekTopDeck() {
    transferCard(props.playArea.deck.cards[0], props.playArea.deck, props.playArea.peekZone);
  }

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Actions | {props.playArea.deck.observable.cardCount} cards</MenubarTrigger>
        <MenubarContent>
          <MenubarItem
            onClick={() => {
              doXTimes(props.playArea.deck.cards.length, peekTopDeck, 25);
            }}>
            Search
          </MenubarItem>
          <MenubarSub overlap>
            <MenubarSubTrigger openDelay={50} onClick={() => props.playArea.draw()}>
              Draw
            </MenubarSubTrigger>
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
            <MenubarSubTrigger onClick={discardTopDeck}>Discard</MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem
                    closeOnSelect={false}
                    onClick={() => doXTimes(value, discardTopDeck)}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                closeOnSelect={false}
                onClick={() => doXTimes(getNextLandIndex() + 1, discardTopDeck)}>
                To next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={exileTopDeck}>Exile</MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem closeOnSelect={false} onClick={() => doXTimes(value, exileTopDeck)}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                closeOnSelect={false}
                onClick={() => doXTimes(getNextLandIndex() + 1, exileTopDeck)}>
                To next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger onClick={peekTopDeck}>Peek</MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem closeOnSelect={false} onClick={() => doXTimes(value, peekTopDeck)}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                onClick={() => {
                  doXTimes(props.playArea.deck.cards.length, peekTopDeck, 50);
                }}>
                All
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>Reveal</MenubarSubTrigger>
            <MenubarSubContent>
              <For each={COUNT_OPTIONS}>
                {value => (
                  <MenubarItem
                    closeOnSelect={false}
                    onClick={async () => {
                      doXTimes(value, () => {
                        let card = props.playArea.deck.cards[0];
                        props.playArea.reveal(card);
                        peekTopDeck();
                      });
                    }}>
                    {value}
                  </MenubarItem>
                )}
              </For>
              <MenubarItem
                onClick={() => {
                  if (props.playArea.tokenSearchZone.cards.length) {
                    props.playArea.dismissFromZone(props.playArea.tokenSearchZone);
                  }
                  doXTimes(
                    props.playArea.deck.cards.length,
                    () => {
                      let card = props.playArea.deck.cards[0];
                      props.playArea.reveal(card);
                      peekTopDeck();
                    },
                    50
                  );
                }}>
                All
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
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
          </MenubarSub>
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
