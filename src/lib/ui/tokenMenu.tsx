import { nanoid } from 'nanoid';
import { Component, createSignal, For, Match, Show, Switch } from 'solid-js';
import { Vector3 } from 'three';
import { Command, CommandInput } from '~/components/ui/command';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '~/components/ui/menubar';
import { cleanupCard, cloneCard } from '../card';
import { Card } from '../constants';
import {
  cardsById,
  COUNT_OPTIONS,
  doXTimes,
  hoverSignal,
  playAreas,
  provider,
  sendEvent,
  setHoverSignal,
  setPeekFilterText,
} from '../globals';
import styles from './peekMenu.module.css';

const TokenSearchMenu: Component = props => {
  let userData = () => hoverSignal()?.mesh?.userData;
  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider.awareness.clientID;
  const location = () => userData()?.location;
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = () => playAreas.get(provider.awareness.clientID)!;
  const [viewField, setViewField] = createSignal(false);

  function addToBattlefield(referenceCard: Card) {
    let card = cloneCard(referenceCard, nanoid());

    let battlefield = playArea().battlefieldZone;
    let rayOrigin = new Vector3(40, 60, 65);
    let direction = new Vector3(0, -1, 0);
    battlefield.addCard(card);

    sendEvent({
      type: 'createCard',
      payload: {
        userData: card.mesh.userData,
        zoneId: battlefield.id,
      },
    });
  }

  return (
    <>
      <Show when={location() === 'tokenSearch'}>
        <Show when={tether()}>
          <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>Add</MenubarTrigger>
                <MenubarContent>
                  <For each={COUNT_OPTIONS}>
                    {value => (
                      <MenubarItem
                        closeOnSelect={false}
                        onClick={() =>
                          doXTimes(
                            value,
                            () => addToBattlefield(cardsById.get(cardMesh().userData.id)),
                            200
                          )
                        }>
                        {value}
                      </MenubarItem>
                    )}
                  </For>
                </MenubarContent>

                <MenubarItem
                  onClick={() => {
                    playArea().tokenSearchZone.removeCard(cardMesh());
                    cleanupCard(cardsById.get(cardMesh().userData.id));
                  }}>
                  Dismiss
                </MenubarItem>
              </MenubarMenu>
            </Menubar>
          </div>
        </Show>
        <div class={styles.search}>
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
                  onClick={() => {
                    let cards = playArea().tokenSearchZone.cards;

                    cards.forEach(card => {
                      playArea().tokenSearchZone.removeCard(card.mesh);
                      card.mesh.geometry.dispose();
                      cardsById.delete(card.id);
                    });
                    setHoverSignal();
                  }}>
                  Dismiss
                </MenubarItem>
                <Switch>
                  <Match when={viewField()}>
                    <MenubarItem
                      onClick={() => {
                        playArea().tokenSearchZone.viewGrid();
                        setViewField(false);
                      }}>
                      View Grid
                    </MenubarItem>
                  </Match>
                  <Match when>
                    <MenubarItem
                      onClick={() => {
                        playArea().tokenSearchZone.viewField();
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

export default TokenSearchMenu;
