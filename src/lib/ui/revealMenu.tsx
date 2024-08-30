import { Component, Show } from 'solid-js';
import { Command, CommandInput } from '~/components/ui/command';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '~/components/ui/menubar';
import {
  cardsById,
  hoverSignal,
  playAreas,
  provider,
  setHoverSignal,
  setPeekFilterText,
} from '../globals';
import styles from './peekMenu.module.css';
import { cleanupCard } from '../card';

const RevealMenu: Component = props => {
  let userData = () => hoverSignal()?.mesh?.userData;
  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider.awareness.clientID;
  const location = () => userData()?.location;
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = () => playAreas.get(provider.awareness.clientID)!;

  return (
    <>
      <Show when={location() === 'reveal'}>
        <Show when={tether()}>
          {/* <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
          </div> */}
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
                    let cards = playArea().revealZone.cards;

                    cards.forEach(card => {
                      playArea().revealZone.removeCard(card.mesh);
                      cleanupCard(card);
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

export default RevealMenu;
