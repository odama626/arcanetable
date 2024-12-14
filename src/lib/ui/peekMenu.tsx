import { Component, createEffect, createMemo, createSignal, Match, Show, Switch } from 'solid-js';
import { Button } from '~/components/ui/button';
import { Command, CommandInput } from '~/components/ui/command';
import { Menubar, MenubarMenu } from '~/components/ui/menubar';
import { Card } from '../constants';
import {
  cardsById,
  doAfter,
  doXTimes,
  hoverSignal,
  peekFilterText,
  playAreas,
  provider,
  setHoverSignal,
  setPeekFilterText,
} from '../globals';
import { transferCard } from '../transferCard';
import MoveMenu from './moveMenu';
import styles from './peekMenu.module.css';

const PeekMenu: Component = props => {
  let userData = () => hoverSignal()?.mesh?.userData;
  const isPublic = () => userData()?.isPublic;
  const isOwner = createMemo(() => userData()?.clientId === provider.awareness.clientID);
  const location = createMemo(() => userData()?.location);
  const tether = () => hoverSignal()?.tether;
  const playArea = playAreas[provider.awareness.clientID];
  const cardCount = () => playArea.peekZone.cards.length;
  const card = () => cardsById.get(hoverSignal()?.mesh?.userData.id);
  const [viewField, setViewField] = createSignal(false);
  let inputRef;

  function drawAfterRevealing(card: Card) {
    drawWithoutRevealing(card);
    playArea.reveal(card);
  }

  function drawWithoutRevealing(card: Card) {
    transferCard(card, playArea.peekZone, playArea.hand);
  }

  createEffect(() => {
    if (location() === 'peek' && isOwner() && inputRef) {
      inputRef.focus();
    }
  });

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
                  playArea={playArea}
                  fromZone={playArea.peekZone}
                />
              </MenubarMenu>
            </Menubar>
          </div>
        </Show>
        <div class={styles.searchContainer}>
          <div class={styles.search}>
            <h2 class='text-white text-xl text-left mb-4'>
              Peek — from {userData().previousLocation} | {playArea.peekZone.observable.cardCount}
            </h2>
            <Command>
              <CommandInput
                ref={inputRef}
                placeholder='Search'
                value={peekFilterText()}
                onKeyUp={e => {
                  if (e.code === 'Escape') {
                    playArea.dismissFromZone(playArea.peekZone);
                  }
                }}
                onValueChange={value => {
                  console.log({ value });
                  setPeekFilterText(value);
                }}
              />
              <Menubar>
                <MenubarMenu>
                  <Button
                    variant='ghost'
                    onClick={async () => {
                      await playArea.transferEntireZone(playArea.peekZone, playArea.deck);
                      await doAfter(100, () => playArea.shuffleDeck());

                      setHoverSignal();
                    }}>
                    Shuffle into deck
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() =>
                      doXTimes(cardCount(), () => drawAfterRevealing(playArea.peekZone.cards[0]))
                    }>
                    Reveal & Draw All
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() =>
                      doXTimes(cardCount(), () => drawWithoutRevealing(playArea.peekZone.cards[0]))
                    }>
                    Draw All
                  </Button>
                  <MoveMenu
                    text='Move All To'
                    cards={playArea.peekZone.cards}
                    playArea={playArea}
                    fromZone={playArea.peekZone}
                  />
                  <Switch>
                    <Match when={viewField()}>
                      <Button
                        variant='ghost'
                        onClick={() => {
                          playArea.peekZone.viewGrid();
                          setViewField(false);
                        }}>
                        View Grid
                      </Button>
                    </Match>
                    <Match when>
                      <Button
                        variant='ghost'
                        onClick={() => {
                          playArea.peekZone.viewField();
                          setViewField(true);
                        }}>
                        View Field
                      </Button>
                    </Match>
                  </Switch>
                  <Button
                    variant='ghost'
                    onClick={() => {
                      playArea.dismissFromZone(playArea.peekZone);
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
