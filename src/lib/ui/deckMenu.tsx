import { Component } from 'solid-js';
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
import NumberFieldMenuItem from '~/components/ui/number-field-menu-item';
import { doXTimes } from '../globals';
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
        <MenubarTrigger>Deck | {props.playArea.deck.observable.cardCount} cards</MenubarTrigger>
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
              <div class='py-1.5 px-2'>Draw</div>
              <NumberFieldMenuItem
                defaultValue={7}
                onSubmit={count => {
                  doXTimes(count, () => props.playArea.draw());
                }}
              />
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={discardTopDeck}>Discard</MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Discard</div>
              <NumberFieldMenuItem
                onSubmit={count => {
                  doXTimes(count, discardTopDeck);
                }}
              />
              <MenubarItem
                closeOnSelect={false}
                onClick={() => doXTimes(getNextLandIndex() + 1, discardTopDeck)}>
                Discard all cards to next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={exileTopDeck}>Exile</MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Exile</div>
              <NumberFieldMenuItem
                onSubmit={count => {
                  doXTimes(count, exileTopDeck);
                }}
              />
              <MenubarItem
                closeOnSelect={false}
                onClick={() => doXTimes(getNextLandIndex() + 1, exileTopDeck)}>
                Exile all cards to next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger onClick={peekTopDeck}>Peek</MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Peek</div>
              <NumberFieldMenuItem
                onSubmit={count => {
                  doXTimes(count, peekTopDeck);
                }}
              />
              <MenubarItem
                onClick={() => {
                  doXTimes(props.playArea.deck.cards.length, peekTopDeck, 50);
                }}>
                Peek All
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>Reveal</MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Reveal</div>
              <NumberFieldMenuItem
                onSubmit={async count => {
                  doXTimes(count, () => {
                    let card = props.playArea.deck.cards[0];
                    props.playArea.reveal(card);
                    peekTopDeck();
                  });
                }}
              />
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
                Reveal All
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
              <div class='py-1.5 px-2'>Mulligan for x cards</div>
              <NumberFieldMenuItem
                defaultValue={7}
                onSubmit={async count => {
                  props.playArea.mulligan(count);
                }}
              />
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
