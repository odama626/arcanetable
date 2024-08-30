import { Component, Show } from 'solid-js';
import { Raycaster, Vector3 } from 'three';
import { Command, CommandInput } from '~/components/ui/command';
import { Menubar, MenubarItem, MenubarMenu } from '~/components/ui/menubar';
import { cleanupCard } from '../card';
import {
  animateCardToNewLocalPosition,
  cardsById,
  hoverSignal,
  playAreas,
  provider,
  scene,
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

  function addToBattlefield(card: Card) {
    console.log({ card });

    let battlefield = playArea().battlefieldZone;
    let rayOrigin = battlefield.mesh.localToWorld(new Vector3(40, -55, 10));

    let intersections = new Raycaster(rayOrigin).intersectObject(scene);
    let position = battlefield.mesh.worldToLocal(intersections[0].point);

    battlefield.addCard(card, { position });

    

    console.log({ card });

    let { card: _, ...userData } = card.mesh;

    sendEvent({
      type: 'createCard',
      payload: {
        userData: card.mesh.userData,
        zoneId: battlefield.id,
        addOptions: { position },
      },
    });


    playArea().tokenSearchZone.removeCard(card.mesh);

    // card.mesh.userData.location = 'battlefield';
    // card.mesh.userData.isInteractive = true;
  }

  return (
    <>
      <Show when={location() === 'tokenSearch'}>
        <Show when={tether()}>
          <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
            <Menubar>
              <MenubarMenu>
                <MenubarItem
                  onClick={() => {
                    let card = cardsById.get(cardMesh().userData.id);
                    addToBattlefield(card);
                  }}>
                  Add
                </MenubarItem>
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
                      // card.mesh.geometry = undefined;
                      // card.mesh.material = undefined;
                    });
                    setHoverSignal();
                  }}>
                  Dismiss
                </MenubarItem>
              </MenubarMenu>
            </Menubar>
          </Command>
        </div>
      </Show>
    </>
  );
};

export default TokenSearchMenu;
