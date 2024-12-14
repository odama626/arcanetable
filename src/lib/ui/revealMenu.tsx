import { Component, createEffect, createMemo, Show } from 'solid-js';
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
  const isOwner = createMemo(() => userData()?.clientId === provider.awareness.clientID);
  const location = createMemo(() => userData()?.location);
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = playAreas[provider.awareness.clientID];
  let inputRef;

  createEffect(() => {
    if (location() === 'reveal' && inputRef) inputRef.focus();
  });

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
              ref={inputRef}
              placeholder='Search'
              onKeyUp={e => {
                if (e.code === 'Escape') {
                  playArea.dismissFromZone(playArea.revealZone);
                }
              }}
              onValueChange={value => {
                setPeekFilterText(value);
              }}
            />
            <Menubar>
              <MenubarMenu>
                <MenubarItem
                  onClick={() => {
                    let cards = playArea.revealZone.cards;

                    cards.forEach(card => {
                      playArea.revealZone.removeCard(card.mesh);
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
