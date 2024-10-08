import { Component, createSignal, Match, Show, Switch } from 'solid-js';
import { Command, CommandInput } from '~/components/ui/command';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '~/components/ui/menubar';
import { Card } from '../card';
import {
  cardsById,
  doXTimes,
  hoverSignal,
  playAreas,
  provider,
  setHoverSignal,
  setPeekFilterText,
} from '../globals';
import styles from './peekMenu.module.css';

const PeekMenu: Component = props => {
  let userData = () => hoverSignal()?.mesh?.userData;
  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider.awareness.clientID;
  const location = () => userData()?.location;
  const tether = () => hoverSignal()?.tether;
  const playArea = () => playAreas.get(provider.awareness.clientID)!;
  const cardCount = () => playArea().peekZone.cards.length;
  const card = () => cardsById.get(hoverSignal()?.mesh?.userData.id);
  const [viewField, setViewField] = createSignal(false);

  function drawAfterRevealing(card: Card) {
    playArea().peekZone.removeCard(card.mesh);
    playArea().addToHand(card);
    playArea().reveal(card);
    if (!playArea().peekZone.cards.length) {
      setHoverSignal();
    }
  }

  function drawWithoutRevealing(card: Card) {
    playArea().peekZone.removeCard(card.mesh);
    playArea().addToHand(card);
    if (!playArea().peekZone.cards.length) {
      setHoverSignal();
    }
  }

  function discard(card: Card) {
    playArea().peekZone.removeCard(card.mesh);
    playArea().destroy(card.mesh);
    if (!playArea().peekZone.cards.length) {
      setHoverSignal();
    }
  }

  function exile(card: Card) {
    playArea().peekZone.removeCard(card.mesh);
    playArea().exileCard(card.mesh);
    if (!playArea().peekZone.cards.length) {
      setHoverSignal();
    }
  }

  function topOfDeck(card: Card) {
    playArea().peekZone.removeCard(card.mesh);
    playArea().addCardTopDeck(card);
    setHoverSignal();
  }

  function bottomOfDeck(card: Card) {
    playArea().peekZone.removeCard(card.mesh);
    playArea().addCardBottomDeck(card);
    setHoverSignal();
  }

  function battlefield(card: Card) {
    playArea().peekZone.removeCard(card.mesh);
    playArea().addToBattlefield(card);
    if (!playArea().peekZone.cards.length) {
      setHoverSignal();
    }
  }

  return (
    <>
      <Show when={location() === 'peek' && isOwner()}>
        <Show when={tether()}>
          <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
            <Menubar>
              <MenubarMenu>
                <MenubarItem onClick={() => drawAfterRevealing(card())}>Reveal & Draw</MenubarItem>
                <MenubarItem onClick={() => drawWithoutRevealing(card())}>Draw</MenubarItem>
                <MenubarTrigger>Move To</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => discard(card())}>Discard</MenubarItem>
                  <MenubarItem onClick={() => exile(card())}>Exile</MenubarItem>
                  <MenubarItem onClick={() => topOfDeck(card())}>Top of Deck</MenubarItem>
                  <MenubarItem onClick={() => bottomOfDeck(card())}>Bottom of Deck</MenubarItem>
                  <MenubarItem onClick={() => battlefield(card())}>Battlefield</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>
        </Show>
        <div class={styles.search}>
          <h2 class='text-white text-xl text-left mb-1'>Peek</h2>
          <Command>
            <CommandInput
              placeholder='Search'
              onValueChange={value => {
                setPeekFilterText(value);
              }}
            />
            <Menubar>
              <MenubarMenu>
                <MenubarItem
                  onClick={async () => {
                    function doOne() {
                      let card = playArea().peekZone.cards[0];
                      playArea().peekZone.removeCard(card.mesh);
                      playArea().addCardBottomDeck(card);
                      if (playArea().peekZone.cards.length) {
                        setTimeout(doOne, 50);
                      } else {
                        setTimeout(() => playArea().shuffleDeck(), 100);
                      }
                    }
                    doOne();
                    setHoverSignal();
                  }}>
                  Shuffle into deck
                </MenubarItem>
                <MenubarItem
                  onClick={() =>
                    doXTimes(cardCount(), () => drawAfterRevealing(playArea().peekZone.cards[0]))
                  }>
                  Reveal & Draw All
                </MenubarItem>
                <MenubarItem
                  onClick={() =>
                    doXTimes(cardCount(), () => drawWithoutRevealing(playArea().peekZone.cards[0]))
                  }>
                  Draw All
                </MenubarItem>
                <MenubarTrigger>Move All To</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem
                    onClick={() =>
                      doXTimes(cardCount(), () => discard(playArea().peekZone.cards[0]))
                    }>
                    Discard
                  </MenubarItem>
                  <MenubarItem
                    onClick={() =>
                      doXTimes(cardCount(), () => exile(playArea().peekZone.cards[0]))
                    }>
                    Exile
                  </MenubarItem>
                  <MenubarItem
                    onClick={() =>
                      doXTimes(cardCount(), () => topOfDeck(playArea().peekZone.cards[0]))
                    }>
                    Top of Deck
                  </MenubarItem>
                  <MenubarItem
                    onClick={() =>
                      doXTimes(cardCount(), () => bottomOfDeck(playArea().peekZone.cards[0]))
                    }>
                    Bottom of Deck
                  </MenubarItem>
                  <MenubarItem
                    onClick={() =>
                      doXTimes(cardCount(), () => battlefield(playArea().peekZone.cards[0]))
                    }>
                    Battlefield
                  </MenubarItem>
                </MenubarContent>
                <Switch>
                  <Match when={viewField()}>
                    <MenubarItem
                      onClick={() => {
                        playArea().peekZone.viewGrid();
                        setViewField(false);
                      }}>
                      View Grid
                    </MenubarItem>
                  </Match>
                  <Match when>
                    <MenubarItem
                      onClick={() => {
                        playArea().peekZone.viewField();
                        setViewField(true);
                      }}>
                      View Field
                    </MenubarItem>
                  </Match>
                </Switch>
              </MenubarMenu>
            </Menubar>
          </Command>
        </div>
      </Show>
    </>
  );
};

export default PeekMenu;
