import { createEffect, createSignal, For, Match, Show, Switch, type Component } from 'solid-js';

import { Menubar, MenubarMenu, MenubarTrigger } from '../../components/ui/menubar';
import { focusRenderer, hoverSignal, playAreas, players, provider } from '../globals';
import CardBattlefieldMenu from './cardBattlefieldMenu';
import CounterDialog, { counters, setIsCounterDialogOpen } from './counterDialog';
import DeckMenu from './deckMenu';
import styles from './overlay.module.css';
import PeekMenu from './peekMenu';
import RevealMenu from './revealMenu';
import TokenSearchMenu from './tokenMenu';
import {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
} from '~/components/ui/number-field';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

const Overlay: Component = () => {
  let userData = () => hoverSignal()?.mesh?.userData;

  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider?.awareness?.clientID;
  const location = () => userData()?.location;
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = () => playAreas.get(provider?.awareness?.clientID)!;
  const focusCameraStyle = () => {
    if (hoverSignal()?.mouse?.x < 0) {
      return { right: `0px` };
    }
    return { left: `0px` };
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
        <div class='flex flex-wrap justify-start space-x-4 p-4 items-start'>
          <div
            class='bg-gray-100 p-4 rounded-lg shadow-md w-64 flex-shrink-0'
            style='pointer-events: initial'>
            <h2 class='text-lg font-bold mb-2'>You</h2>
            <p class='text-gray-700 mb-4 flex justify-center items-center gap-4'>
              Life:
              <NumberField
                style='width: 6rem'
                value={currentPlayer()?.entry?.life}
                onChange={value => {
                  let localState = provider.awareness.getLocalState();
                  provider.awareness.setLocalState({
                    ...localState,
                    life: parseInt(value, 10),
                  });
                }}>
                <div class='relative' style='display: inline-block'>
                  <NumberFieldInput />
                  <NumberFieldIncrementTrigger />
                  <NumberFieldDecrementTrigger />
                </div>
              </NumberField>
            </p>
            <ul class='space-y-2'>
              <For
                each={Object.keys(currentPlayer()?.entry?.counters ?? {}).sort((a, b) =>
                  a.localeCompare(b)
                )}>
                {counterId => {
                  let counter = counters().find(c => c.id === counterId);
                  return (
                    <li class='flex justify-between text-gray-600'>
                      <span style='text-align: start;'>{counter.name}</span>
                      <span class='font-semibold'>
                        <NumberField
                          style='width: 6rem'
                          onChange={value => {
                            let localState = provider.awareness.getLocalState();
                            provider.awareness.setLocalState({
                              ...localState,
                              counters: {
                                ...localState.counters,
                                [counterId]: parseInt(value, 10),
                              },
                            });
                          }}
                          value={currentPlayer()?.entry.counters[counterId]}>
                          <div class='relative'>
                            <NumberFieldInput />
                            <NumberFieldIncrementTrigger />
                            <NumberFieldDecrementTrigger />
                          </div>
                        </NumberField>
                      </span>
                    </li>
                  );
                }}
              </For>

              <DropdownMenu>
                <DropdownMenuTrigger>Add</DropdownMenuTrigger>
                <DropdownMenuContent>
                  <For each={counters()}>
                    {counter => {
                      return (
                        <DropdownMenuItem closeOnSelect={false}>
                          <div
                            style={`--color: ${counter.color}; width: 1rem; height: 1rem; background: var(--color); margin: 0 0.25rem;`}></div>
                          <div style='margin: 0 0.25rem;'>{counter.name}</div>
                          <DropdownMenuShortcut>
                            <NumberField
                              defaultValue={currentPlayer()?.entry?.counters?.[counter.id] ?? 0}
                              style='width: 6rem'
                              onChange={value => {
                                let localState = provider.awareness.getLocalState();
                                provider.awareness.setLocalState({
                                  ...localState,
                                  counters: {
                                    ...localState.counters,
                                    [counter.id]: parseInt(value, 10),
                                  },
                                });
                              }}>
                              <div class='relative'>
                                <NumberFieldInput />
                                <NumberFieldIncrementTrigger />
                                <NumberFieldDecrementTrigger />
                              </div>
                            </NumberField>
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                      );
                    }}
                  </For>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    closeOnSelect={false}
                    onClick={() => setIsCounterDialogOpen(true)}>
                    New
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ul>
          </div>
          <For each={players().filter(player => player.id !== provider.awareness.clientID)}>
            {player => (
              <div class='bg-gray-100 p-4 rounded-lg shadow-md w-64 flex-shrink-0'>
                <h2 class='text-lg font-bold mb-2'>{player.id}</h2>
                <p class='text-gray-700 mb-4'>
                  Life: <span class='font-semibold'>{player.entry.life}</span>
                </p>
                <ul class='space-y-2'>
                  <For
                    each={Object.keys(player?.entry?.counters ?? {}).sort((a, b) =>
                      a.localeCompare(b)
                    )}>
                    {counterId => {
                      let counter = counters().find(c => c.id === counterId);
                      return (
                        <li class='flex justify-between text-gray-600'>
                          <span>{counter.name}</span>
                          <span class='font-semibold'>{player?.entry?.counters[counterId]}</span>
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </div>
            )}
          </For>
        </div>
      </div>
      <div class={styles.focusCamera} style={focusCameraStyle()}>
        <Show when={isPublic() || (isOwner() && ['battlefield', 'peek'].includes(location()))}>
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
