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
import { Button } from '~/components/ui/button';
import MoveMenu from './moveMenu';

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

  return (
    <>
      <Show when={location() === 'peek' && isOwner()}>
        <Show when={tether()}>
          <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
            <Menubar>
              <MenubarMenu>
                <Button
                  variant='ghost'
                  class='whitespace-nowrap'
                  onClick={() => drawAfterRevealing(card())}>
                  Reveal & Draw
                </Button>
                <Button
                  variant='ghost'
                  class='whitespace-nowrap'
                  onClick={() => drawWithoutRevealing(card())}>
                  Draw
                </Button>
                <MoveMenu
                  text='Move To'
                  cards={[card()]}
                  playArea={playArea()}
                  fromZone={playArea().peekZone}
                />
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
                  <Button
                    variant='ghost'
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
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() =>
                      doXTimes(cardCount(), () => drawAfterRevealing(playArea().peekZone.cards[0]))
                    }>
                    Reveal & Draw All
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() =>
                      doXTimes(cardCount(), () =>
                        drawWithoutRevealing(playArea().peekZone.cards[0])
                      )
                    }>
                    Draw All
                  </Button>
                  <MoveMenu
                    text='Move All To'
                    cards={playArea().peekZone.cards}
                    playArea={playArea()}
                    fromZone={playArea().peekZone}
                  />
                  <Switch>
                    <Match when={viewField()}>
                      <Button
                        variant='ghost'
                        onClick={() => {
                          playArea().peekZone.viewGrid();
                          setViewField(false);
                        }}>
                        View Grid
                      </Button>
                    </Match>
                    <Match when>
                      <Button
                        variant='ghost'
                        onClick={() => {
                          playArea().peekZone.viewField();
                          setViewField(true);
                        }}>
                        View Field
                      </Button>
                    </Match>
                  </Switch>
                  <Button
                    variant='ghost'
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
                  </Button>
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
