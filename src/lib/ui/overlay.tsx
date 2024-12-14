import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
  type Component,
} from 'solid-js';

import { Mesh } from 'three';
import { Menubar, MenubarItem, MenubarMenu } from '../../components/ui/menubar';
import {
  cardsById,
  focusRenderer,
  hoverSignal,
  isSpectating,
  onConcede,
  playAreas,
  players,
  provider,
  zonesById,
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
import { Dialog } from '@kobalte/core/dialog';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import CommandPalette from '../shortcuts/command-palette';
import hotkeys from 'hotkeys-js';
import { untapAll } from '../shortcuts/commands/field';
import { drawCards, searchDeck } from '../shortcuts/commands/deck';
import { transferCard } from '../transferCard';

const Overlay: Component = () => {
  let userData = () => hoverSignal()?.mesh?.userData;
  let [isLogVisible, setIsLogVisible] = createSignal(false);
  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider?.awareness?.clientID;
  const location = createMemo(() => userData()?.location);
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = playAreas[provider?.awareness?.clientID];
  const focusCameraStyle = () => {
    if (hoverSignal()?.mouse?.y > 0) {
      return { right: `0px`, bottom: '0' };
    }
    return { right: `0px`, top: `0` };
  };

  let currentPlayer = () => players().find(player => player.id === provider?.awareness?.clientID);

  let [container, setContainer] = createSignal();

  createEffect(() => {
    hotkeys.setScope(location());
  });

  createEffect(() => {
    let parent = container() as HTMLDivElement;
    if (!parent) return;
    parent.appendChild(focusRenderer.domElement);
  });
  onMount(() => {
    hotkeys('shift+u', function () {
      untapAll(playArea);
    });

    hotkeys('d', function () {
      drawCards(playArea, 1);
    });

    hotkeys('ctrl+d,command+d', function (e) {
      e.preventDefault();
      if (!cardMesh()) return;
      const card = cardsById.get(cardMesh().userData.id);
      const previousZone = zonesById.get(card.mesh.userData.zoneId);
      transferCard(card, previousZone, playArea.graveyardZone);
    });

    hotkeys('e', function (e) {
      e.preventDefault();
      if (!cardMesh()) return;
      const card = cardsById.get(cardMesh().userData.id);
      const previousZone = zonesById.get(card.mesh.userData.zoneId);
      transferCard(card, previousZone, playArea.exileZone);
    });

    hotkeys('b', function (e) {
      e.preventDefault();
      if (!cardMesh()) return;
      const card = cardsById.get(cardMesh().userData.id);
      const previousZone = zonesById.get(card.mesh.userData.zoneId);
      transferCard(card, previousZone, playArea.battlefieldZone);
    });

    hotkeys('p', function (e) {
      e.preventDefault();
      if (!cardMesh()) return;
      const card = cardsById.get(cardMesh().userData.id);
      const previousZone = zonesById.get(card.mesh.userData.zoneId);
      transferCard(card, previousZone, playArea.peekZone);
    });

    hotkeys('s', function (e) {
      e.preventDefault();
      searchDeck(playArea);
    });

    hotkeys('escape', 'peek', function (e) {
      e.preventDefault();
      playArea.dismissFromZone(playArea.peekZone);
    });

    hotkeys('escape', 'tokenSearch', function (e) {
      e.preventDefault();
      playArea.dismissFromZone(playArea.tokenSearchZone);
    });

    hotkeys('escape', 'reveal', function (e) {
      e.preventDefault();
      playArea.dismissFromZone(playArea.revealZone);
    });

    hotkeys('t', 'battlefield', function () {
      if (!cardMesh()) return;
      playArea.tap(cardMesh());
    });

    hotkeys('c', 'battlefield', function () {
      if (!cardMesh()) return;
      playArea.clone(cardMesh().userData.id);
    });

    hotkeys('f', 'battlefield', function () {
      if (!cardMesh()) return;
      playArea.flip(cardMesh());
    });

    return () => {
      hotkeys.unbind();
    };
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
              <DeckMenu playArea={playArea} />
            </Match>
            <Match when={cardMesh()?.userData.location === 'battlefield'}>
              <CardBattlefieldMenu playArea={playArea} cardMesh={cardMesh()} />
            </Match>
            <Match when={cardMesh()?.userData.location === 'hand'}>
              <Menubar class='flex-col' style='height: auto; margin-left: -10px;'>
                <MenubarMenu>
                  <MenubarItem
                    onClick={() => {
                      playArea.reveal(cardsById.get(cardMesh().userData.id));
                    }}>
                    Reveal
                  </MenubarItem>
                </MenubarMenu>
                <MoveMenu
                  text='Move To'
                  cards={[cardsById.get(cardMesh().userData.id)]}
                  playArea={playArea}
                  fromZone={playArea.hand}
                />
              </Menubar>
            </Match>
            <Match when={cardMesh()?.userData.location === 'graveyard'}>
              <div
                class='flex-col bg-card px-3 py-2 rounded-sm'
                style='height: auto; margin-left: -10px;'>
                graveyard | {playArea.graveyardZone.observable.cardCount} cards
              </div>
            </Match>
            <Match when={cardMesh()?.userData.location === 'exile'}>
              <div
                class='flex-col bg-card px-3 py-2 rounded-sm'
                style='height: auto; margin-left: -10px;'>
                exile | {playArea.exileZone.observable.cardCount} cards
              </div>
            </Match>
          </Switch>
        </div>
      </Show>
      <div class={styles.mainMenu}>
        <Menubar
          style='height: auto; white-space: nowrap;'
          class={`${styles.menu} flex-col items-start`}>
          <MenubarMenu>
            <Show when={!isSpectating()}>
              <MenubarItem class='w-full flex' onClick={() => untapAll(playArea)}>
                Untap All
              </MenubarItem>
              <MenubarItem class='w-full flex' onClick={() => playArea.toggleTokenMenu()}>
                Add Tokens
              </MenubarItem>
              <MoveMenu
                text={`Battlefield (${playArea.battlefieldZone.observable.cardCount})`}
                cards={playArea.battlefieldZone.cards}
                playArea={playArea}
                fromZone={playArea.battlefieldZone}
              />
              <MoveMenu
                text={`Hand (${playArea.hand.observable.cardCount})`}
                cards={playArea.hand.cards}
                playArea={playArea}
                fromZone={playArea.hand}
              />
              <Dialog>
                <DialogTrigger>
                  <MenubarItem>Concede</MenubarItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>Are you sure you want to concede?</DialogHeader>
                  <DialogDescription>
                    Conceding will allow you to spectate until the session ends
                  </DialogDescription>
                  <DialogFooter>
                    <Button variant='ghost'>Cancel</Button>
                    <Button onClick={() => onConcede()}>Concede</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Show>
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
      <CommandPalette playArea={playArea} />
    </div>
  );
};

export default Overlay;
