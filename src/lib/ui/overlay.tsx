import { createEffect, createSignal, Match, Show, Switch, type Component } from 'solid-js';

import styles from './overlay.module.css';
import { getCardImage } from '../card';
import CardBattlefieldMenu from './cardBattlefieldMenu';
import { focusRenderer, hoverSignal, playAreas, provider } from '../globals';
import DeckMenu from './deckMenu';
import PeekMenu from './peekMenu';
import RevealMenu from './revealMenu';
import { Menubar, MenubarMenu, MenubarTrigger } from '../../components/ui/menubar';
import TokenSearchMenu from './tokenMenu';
import CounterDialog from './counterDialog';

const Overlay: Component = () => {
  let userData = () => hoverSignal()?.mesh?.userData;

  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider?.awareness?.clientID;
  const location = () => userData()?.location;
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = () => playAreas.get(provider?.awareness?.clientID)!;

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
      <div class={styles.topRight}>
        <Show when={isPublic() || (isOwner() && ['battlefield', 'peek'].includes(location()))}>
          {/* <img style='height: 50vh;' src={getCardImage(cardMesh()?.userData?.card)}></img> */}
          <div ref={setContainer} />
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
        40
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
