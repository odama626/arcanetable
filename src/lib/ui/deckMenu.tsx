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
import { PlayArea } from '../playArea';
import {
  discardFromTop,
  drawCards,
  exileFromTop,
  peekFromTop,
  revealFromTop,
  searchDeck,
} from '../shortcuts/commands/deck';

const DeckMenu: Component<{ playArea: PlayArea }> = props => {
  function getNextLandIndex() {
    return props.playArea.deck.cards.findIndex(card =>
      card.detail.type_line.toLowerCase().includes('land'),
    );
  }

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Deck | {props.playArea.deck.observable.cardCount} cards</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={() => searchDeck(props.playArea)}>Search</MenubarItem>
          <MenubarSub overlap>
            <MenubarSubTrigger openDelay={50} onClick={() => props.playArea.draw()}>
              Draw
            </MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Draw</div>
              <NumberFieldMenuItem
                defaultValue={7}
                onSubmit={count => drawCards(props.playArea, count)}
              />
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={() => discardFromTop(props.playArea)}>
              Discard
            </MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Discard</div>
              <NumberFieldMenuItem onSubmit={count => discardFromTop(props.playArea, count)} />
              <MenubarItem
                closeOnSelect={false}
                onClick={() => discardFromTop(props.playArea, getNextLandIndex() + 1)}>
                Discard all cards to next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub overlap>
            <MenubarSubTrigger onClick={() => exileFromTop(props.playArea)}>
              Exile
            </MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Exile</div>
              <NumberFieldMenuItem
                onSubmit={count => {
                  exileFromTop(props.playArea, count);
                }}
              />
              <MenubarItem
                closeOnSelect={false}
                onClick={() => exileFromTop(props.playArea, getNextLandIndex() + 1)}>
                Exile all cards to next land
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger onClick={() => peekFromTop(props.playArea)}>Peek</MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Peek</div>
              <NumberFieldMenuItem onSubmit={count => peekFromTop(props.playArea, count)} />
              <MenubarItem
                onClick={() => peekFromTop(props.playArea, props.playArea.deck.cards.length)}>
                Peek All
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>Reveal</MenubarSubTrigger>
            <MenubarSubContent>
              <div class='py-1.5 px-2'>Reveal</div>
              <NumberFieldMenuItem onSubmit={async count => revealFromTop(props.playArea, count)} />
              <MenubarItem
                onClick={() => {
                  if (props.playArea.tokenSearchZone.cards.length) {
                    props.playArea.dismissFromZone(props.playArea.tokenSearchZone);
                  }
                  revealFromTop(props.playArea, props.playArea.deck.cards.length);
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
                onSubmit={async count => props.playArea.mulligan(count)}
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
