import { nanoid } from 'nanoid';
import { Component, createEffect, createMemo, createSignal, Match, Show, Switch } from 'solid-js';
import { Button } from '~/components/ui/button';
import { Command, CommandInput } from '~/components/ui/command';
import { Menubar, MenubarContent, MenubarMenu, MenubarTrigger } from '~/components/ui/menubar';
import NumberFieldMenuItem from '~/components/ui/number-field-menu-item';
import { cleanupCard, cloneCard } from '../card';
import { Card } from '../constants';
import {
  cardsById,
  doXTimes,
  hoverSignal,
  playAreas,
  provider,
  sendEvent,
  setPeekFilterText,
} from '../globals';
import styles from './peekMenu.module.css';

const TokenSearchMenu: Component = props => {
  let userData = () => hoverSignal()?.mesh?.userData;
  const isPublic = () => userData()?.isPublic;
  const isOwner = createMemo(() => userData()?.clientId === provider.awareness.clientID);
  const location = createMemo(() => userData()?.location);
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = playAreas[provider.awareness.clientID];
  const [viewField, setViewField] = createSignal(false);
  let inputRef;

  function addToBattlefield(referenceCard: Card) {
    let card = cloneCard(referenceCard, nanoid());

    let battlefield = playArea.battlefieldZone;
    let tokenZone = playArea.tokenSearchZone;
    tokenZone.mesh.localToWorld(card.mesh.position);
    battlefield.addCard(card);

    sendEvent({
      type: 'createCard',
      payload: {
        userData: card.mesh.userData,
        zoneId: battlefield.id,
      },
    });
  }

  createEffect(() => {
    if (location() === 'tokenSearch' && inputRef) inputRef.focus();
  });

  return (
    <>
      <Show when={location() === 'tokenSearch'}>
        <Show when={tether()}>
          <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>Add</MenubarTrigger>
                <MenubarContent>
                  <div class='py-1.5 px-2'>Add Tokens</div>
                  <NumberFieldMenuItem
                    onSubmit={count => {
                      let card = cardsById.get(cardMesh().userData.id)!;
                      doXTimes(count, () => addToBattlefield(card), 50);
                    }}
                  />
                </MenubarContent>

                <Button
                  variant='ghost'
                  onClick={() => {
                    playArea.tokenSearchZone.removeCard(cardMesh());
                    cleanupCard(cardsById.get(cardMesh().userData.id));
                  }}>
                  Dismiss
                </Button>
              </MenubarMenu>
            </Menubar>
          </div>
        </Show>
        <div class={styles.searchContainer}>
          <div class={styles.search}>
            <h2 class='text-white text-xl text-left mb-4'>
              Add Tokens | {playArea.tokenSearchZone.observable.cardCount}
            </h2>
            <Command>
              <CommandInput
                ref={inputRef}
                placeholder='Search'
                onKeyUp={e => {
                  if (e.code === 'Escape') {
                    playArea.dismissFromZone(playArea.tokenSearchZone);
                  }
                }}
                onValueChange={value => {
                  setPeekFilterText(value);
                }}
              />
              <Menubar>
                <MenubarMenu>
                  <Switch>
                    <Match when={viewField()}>
                      <Button
                        variant='ghost'
                        onClick={() => {
                          playArea.tokenSearchZone.viewGrid();
                          setViewField(false);
                        }}>
                        View Grid
                      </Button>
                    </Match>
                    <Match when>
                      <Button
                        variant='ghost'
                        onClick={() => {
                          playArea.tokenSearchZone.viewField();
                          setViewField(true);
                        }}>
                        View Field
                      </Button>
                    </Match>
                  </Switch>
                  <Button
                    variant='ghost'
                    onClick={() => playArea.dismissFromZone(playArea.tokenSearchZone)}>
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

export default TokenSearchMenu;
