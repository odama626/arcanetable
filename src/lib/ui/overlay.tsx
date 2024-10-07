import { createEffect, createSignal, For, Match, Show, Switch, type Component } from 'solid-js';

import { Menubar, MenubarMenu, MenubarTrigger } from '../../components/ui/menubar';
import { focusRenderer, hoverSignal, playAreas, players, provider } from '../globals';
import CardBattlefieldMenu from './cardBattlefieldMenu';
import CounterDialog from './counterDialog';
import DeckMenu from './deckMenu';
import styles from './overlay.module.css';
import PeekMenu from './peekMenu';
import { LocalPlayer, NetworkPlayer } from './playerMenu';
import RevealMenu from './revealMenu';
import TokenSearchMenu from './tokenMenu';

const Overlay: Component = () => {
  let userData = () => hoverSignal()?.mesh?.userData;

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
        <div class='flex flex-wrap justify-start space-x-2 p-2 items-start'>
          <LocalPlayer {...currentPlayer()?.entry} />
          <For each={players().filter(player => player.id !== provider.awareness.clientID)}>
            {player => <NetworkPlayer {...player?.entry} />}
          </For>
        </div>
      </div>
      <div class={styles.focusCamera} style={focusCameraStyle()}>
        <Show when={isPublic() || (isOwner() && ['battlefield', 'peek', 'hand'].includes(location()))}>
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
          </Switch>
        </div>
      </Show>
      <div class={styles.mainMenu}>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger onClick={() => playArea().openTokenMenu()}>Add Tokens</MenubarTrigger>
          </MenubarMenu>
        </Menubar>
      </div>
      <PeekMenu />
      <RevealMenu />
      <TokenSearchMenu />
      <CounterDialog />
    </div>
  );
};

export default Overlay;
