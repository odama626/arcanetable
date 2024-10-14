import { Component, createSignal, Match, Show, Switch } from 'solid-js';
import { Command, CommandInput } from '~/components/ui/command';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '~/components/ui/menubar';
import { Card } from '../constants';
import {
  cardsById,
  doAfter,
  doXTimes,
  hoverSignal,
  playAreas,
  provider,
  sendEvent,
  setHoverSignal,
  setPeekFilterText,
  zonesById,
} from '../globals';
import styles from './peekMenu.module.css';
import { transferCard } from '../transferCard';

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
    drawWithoutRevealing(card);
    playArea().reveal(card);
  }

  function drawWithoutRevealing(card: Card) {
    transferCard(card, playArea().peekZone, playArea().hand);
  }

  function discard(card: Card) {
    transferCard(card, playArea().peekZone, playArea().graveyardZone);
  }

  function exile(card: Card) {
    transferCard(card, playArea().peekZone, playArea().exileZone);
  }

  function topOfDeck(card: Card) {
    transferCard(card, playArea().peekZone, playArea().deck);
  }

  function bottomOfDeck(card: Card) {
    transferCard(card, playArea().peekZone, playArea().deck, { location: 'bottom' });
  }

  function battlefield(card: Card) {
    transferCard(card, playArea().peekZone, playArea().battlefieldZone);
  }

  return (
    <>
      <Show when={location() === 'peek' && isOwner()}>
        <Show when={tether()}>
          <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
            <Menubar>
              <MenubarMenu>
                <MenubarItem class='whitespace-nowrap' onClick={() => drawAfterRevealing(card())}>
                  Reveal & Draw
                </MenubarItem>
                <MenubarItem class='whitespace-nowrap' onClick={() => drawWithoutRevealing(card())}>
                  Draw
                </MenubarItem>
                <MenubarTrigger class='whitespace-nowrap'>Move To</MenubarTrigger>
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
        <div class={styles.searchContainer}>
          <div class={styles.search}>
            <h2 class='text-white text-xl text-left mb-4'>
              Peek — from {userData().previousLocation}
            </h2>
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
                      await doXTimes(cardCount(), () => {
                        let card = playArea().peekZone.cards[0];
                        transferCard(card, playArea().peekZone, playArea().deck, {
                          location: 'bottom',
                        });
                      });
                      await doAfter(100, () => playArea().shuffleDeck());

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
                      doXTimes(cardCount(), () =>
                        drawWithoutRevealing(playArea().peekZone.cards[0])
                      )
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
                  <MenubarItem
                    onClick={async () => {
                      let events = playArea()
                        .peekZone.cards.map(card => ({
                          type: 'transferCard',
                          payload: {
                            userData: card.mesh.userData,
                            toZoneId: card.mesh.userData.previousZoneId,
                            fromZoneId: card.mesh.userData.zoneId,
                          },
                        }))
                        .reverse();
                      sendEvent({ type: 'bulk', timing: 50, events: events });
                      await doXTimes(
                        cardCount(),
                        () => {
                          let card = playArea().peekZone.cards.at(-1);
                          playArea().peekZone.removeCard(card.mesh);
                          let toZoneId = card?.mesh.userData.previousZoneId;
                          let zone = zonesById.get(card.mesh.userData.previousZoneId);
                          zone?.addCard(card);
                        },
                        50
                      );
                    }}>
                    Dismiss
                  </MenubarItem>
                </MenubarMenu>
              </Menubar>
            </Command>
          </div>
        </div>
      </Show>
    </>
  );
};

export default PeekMenu;
