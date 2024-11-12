import { createEffect, createSignal, For, Match, Show, Switch, type Component } from 'solid-js';

import { Mesh } from 'three';
import { Menubar, MenubarItem, MenubarMenu } from '../../components/ui/menubar';
import {
  cardsById,
  focusRenderer,
  hoverSignal,
  isSpectating,
  playAreas,
  players,
  provider,
} from '../globals';
import CardBattlefieldMenu from './cardBattlefieldMenu';
import CounterDialog from './counterDialog';
import DeckMenu from './deckMenu';
import Log from './log';
import MoveMenu from './moveMenu';
import styles from './overlay.module.css';
import PeekMenu from './peekMenu';
import { LocalPlayer, NetworkPlayer } from './playerMenu';
import RevealMenu from './revealMenu';
import TokenSearchMenu from './tokenMenu';

const Overlay: Component = () => {
  let userData = () => hoverSignal()?.mesh?.userData;
  let [isLogVisible, setIsLogVisible] = createSignal(false);
  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider?.awareness?.clientID;
  const location = () => userData()?.location;
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = () => playAreas.get(provider?.awareness?.clientID)!;
  const focusCameraStyle = () => {
    if (hoverSignal()?.mouse?.y > 0) {
      return { right: `0px`, bottom: '0' };
    }
    return { right: `0px`, top: `0` };
  };

  let currentPlayer = () => players().find(player => player.id === provider?.awareness?.clientID);

  let [container, setContainer] = createSignal();

  createEffect(() => {
    let parent = container() as HTMLDivElement;
    if (!parent) return;
    parent.appendChild(focusRenderer.domElement);
  });

  return (
    <div
      class={styles.App}
      onClick={e => {
        e.stopImmediatePropagation();
      }}>
      <div class={styles.top}>
        <div class='flex flex-wrap justify-start p-2 gap-2 items-start'>
          <Show when={!isSpectating()}>
            <LocalPlayer {...currentPlayer()?.entry} />
          </Show>
          <For
            each={players().filter(
              player => player.id !== provider.awareness.clientID && !player.entry.isSpectating
            )}>
            {player => <NetworkPlayer {...player?.entry} />}
          </For>
        </div>
      </div>
      <div class={styles.focusCamera} style={focusCameraStyle()}>
        <Show
          when={
            hoverSignal()?.mesh &&
            (isPublic() ||
              isSpectating() ||
              (isOwner() && ['battlefield', 'peek', 'hand'].includes(location())))
          }>
          <div ref={setContainer} class={styles.focusCameraContainer} />
        </Show>
      </div>
      <Show when={tether() && cardMesh()?.userData?.clientId === provider.awareness.clientID}>
        <div
          class={styles.cardActions}
          style={`--x: ${tether().x}px; --y: ${tether().y}px`}
          onClick={e => {
            e.stopImmediatePropagation();
          }}>
          <Switch>
            <Match when={cardMesh()?.userData.location === 'deck'}>
              <DeckMenu playArea={playArea()} />
            </Match>
            <Match when={cardMesh()?.userData.location === 'battlefield'}>
              <CardBattlefieldMenu playArea={playArea()} cardMesh={cardMesh()} />
            </Match>
            <Match when={cardMesh()?.userData.location === 'hand'}>
              <Menubar class='flex-col' style='height: auto; margin-left: -10px;'>
                <MenubarMenu>
                  <MenubarItem
                    onClick={() => {
                      playArea().reveal(cardsById.get(cardMesh().userData.id));
                    }}>
                    Reveal
                  </MenubarItem>
                </MenubarMenu>
                <MoveMenu
                  text='Move To'
                  cards={[cardsById.get(cardMesh().userData.id)]}
                  playArea={playArea()}
                  fromZone={playArea().hand}
                />
              </Menubar>
            </Match>
          </Switch>
        </div>
      </Show>
      <div class={styles.mainMenu}>
        <Menubar
          style='height: auto; white-space: nowrap;'
          class={`${styles.menu} flex-col items-start`}>
          <MenubarMenu>
            <MenubarItem
              class='w-full flex'
              onClick={() => {
                let tappedCards = playArea().battlefieldZone.mesh.children.filter(
                  mesh => mesh.userData.isTapped
                ) as Mesh[];

                tappedCards.forEach(card => playArea().tap(card));
              }}>
              Untap All
            </MenubarItem>
            <MenubarItem class='w-full flex' onClick={() => playArea().openTokenMenu()}>
              Add Tokens
            </MenubarItem>
            <MoveMenu
              text='Move Battlefield To'
              cards={playArea().battlefieldZone.cards}
              playArea={playArea()}
              fromZone={playArea().battlefieldZone}
            />
            <MoveMenu
              text='Move Hand To'
              cards={playArea().hand.cards}
              playArea={playArea()}
              fromZone={playArea().hand}
            />
            <MenubarItem class='width-full' onClick={() => setIsLogVisible(visible => !visible)}>
              {isLogVisible() ? 'Hide Log' : 'Show Log'}
            </MenubarItem>
          </MenubarMenu>
        </Menubar>
        <Show when={isLogVisible()}>
          <Log />
        </Show>
      </div>
      <PeekMenu />
      <RevealMenu />
      <TokenSearchMenu />
      <CounterDialog />
    </div>
  );
};

export default Overlay;
