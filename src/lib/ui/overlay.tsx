import hotkeys from 'hotkeys-js';
import {
  createEffect,
  createSelector,
  createSignal,
  For,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from '~/components/ui/dialog';
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
  selection,
} from '../globals';
import CommandPalette from '../shortcuts/command-palette';
import { untapAll } from '../shortcuts/commands/field';
import HotkeysTable from '../shortcuts/hotkeys-table';
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
  const [visibleDialog, setVisibleDialog] = createSignal();
  const isVisibleDialog = createSelector(visibleDialog);
  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider?.awareness?.clientID;
  const location = () => userData()?.location;
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = playAreas[provider?.awareness?.clientID];
  const focusCameraStyle = () => {
    if (hoverSignal()?.mouse?.y > 0) {
      return { right: `0px`, bottom: '0' };
    }
    return { right: `0px`, top: `0` };
  };

  const cards = () => {
    let items = selection.selectedItems;
    if (items.length) return items.map(item => cardsById.get(item.userData.id));
    if (!cardMesh()) return [];

    return [cardsById.get(cardMesh().userData.id)];
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
              player => player.id !== provider.awareness.clientID && !player.entry.isSpectating,
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
              <Dialog
                open={isVisibleDialog('concede')}
                onOpenChange={isOpen => setVisibleDialog(isOpen ? 'concede' : undefined)}>
                <DialogTrigger>
                  <MenubarItem class='width-full'>Concede</MenubarItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>Are you sure you want to concede?</DialogHeader>
                  <DialogDescription>
                    Conceding will allow you to spectate until the session ends
                  </DialogDescription>
                  <DialogFooter>
                    <Button onClick={() => setVisibleDialog()} variant='ghost'>
                      Cancel
                    </Button>
                    <Button onClick={() => onConcede()}>Concede</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Show>
            <MenubarItem class='width-full' onClick={() => setIsLogVisible(visible => !visible)}>
              {isLogVisible() ? 'Hide Log' : 'Show Log'}
            </MenubarItem>
            <Dialog
              open={isVisibleDialog('shortcuts')}
              onOpenChange={isOpen => setVisibleDialog(isOpen ? 'shortcuts' : undefined)}>
              <DialogTrigger>
                <MenubarItem class='width-full'>Shortcuts</MenubarItem>
              </DialogTrigger>
              <DialogContent class='max-w-xl'>
                <DialogHeader>Shortcuts</DialogHeader>
                <DialogDescription>
                  <HotkeysTable />
                </DialogDescription>
                <DialogFooter>
                  <Button onClick={() => setVisibleDialog()}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isVisibleDialog('donate')}
              onOpenChange={isOpen => setVisibleDialog(isOpen ? 'donate' : undefined)}>
              <DialogTrigger>
                <MenubarItem class='width-full'>Support Us</MenubarItem>
              </DialogTrigger>
              <DialogContent class='max-w-xl'>
                <DialogHeader>Support Arcanetable Development</DialogHeader>
                <DialogDescription>
                  <iframe
                    id='kofiframe'
                    src='https://ko-fi.com/sparkstonepdx/?hidefeed=true&widget=true&embed=true&preview=true'
                    style='border:none;width:100%; border-radius: 8px;'
                    height='712'
                    title='sparkstonepdx'></iframe>
                </DialogDescription>
                <DialogFooter>
                  <Button onClick={() => setVisibleDialog()}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
