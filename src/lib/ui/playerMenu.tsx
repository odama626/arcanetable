import { Component, createSignal, For, Show } from 'solid-js';
import { Card } from '~/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
} from '~/components/ui/number-field';
import { playAreas, provider } from '../globals';
import { counters, setIsCounterDialogOpen } from './counterDialog';
import ChevronDownIcon from 'lucide-solid/icons/chevron-down';

export const LocalPlayer: Component = props => {
  const [open, setOpen] = createSignal(true);
  const playArea = () => playAreas[provider?.awareness?.clientID];

  function changeCounter(counterId, callback) {
    let localState = provider.awareness.getLocalState();

    provider.awareness.setLocalState({
      ...localState,
      counters: {
        ...localState.counters,
        [counterId]:
          typeof callback === 'function'
            ? callback(localState?.counters?.[counterId] ?? 0)
            : callback,
      },
    });
  }

  return (
    <Card>
      <div class='p-2 rounded-lg shadow-md w-64 flex-shrink-0' style='pointer-events: initial'>
        <Collapsible onOpenChange={setOpen} open={open()}>
          <div class='flex gap-5 items-center justify-between'>
            You
            <NumberField
              style='width: 6rem'
              value={props?.life}
              onChange={value => {
                let localState = provider.awareness.getLocalState();
                provider.awareness.setLocalState({
                  ...localState,
                  life: parseInt(value, 10),
                });
              }}>
              <div class='relative rounded-md' style='display: inline-block;'>
                <NumberFieldInput />
                <NumberFieldIncrementTrigger />
                <NumberFieldDecrementTrigger />
              </div>
            </NumberField>
            <CollapsibleTrigger class='size-6'>
              <ChevronDownIcon
                style={`transform: rotate3d(1,0,0,${
                  open() ? 180 : 0
                }deg); transition: transform 250ms ease-in-out;`}
              />
            </CollapsibleTrigger>
          </div>
          <Show when={!open()}>
            <div class='flex gap-2 pt-2'>
              <For
                each={Object.entries(props?.counters ?? {})
                  .filter(entry => entry[1] !== 0)
                  .map(entry => entry[0])
                  .sort((a, b) => a.localeCompare(b))}>
                {counterId => {
                  let counter = counters().find(c => c.id === counterId);
                  return (
                    <button
                      class='rounded align-middle px-2'
                      onContextMenu={e => {
                        e.preventDefault();
                        changeCounter(counterId, x => x - 1);
                        return false;
                      }}
                      onClick={e => changeCounter(counterId, x => x + 1)}
                      style={`background-color: ${counter.color}; color: black; min-width: 2rem; height:2rem; line-height: 2rem;`}>
                      {props?.counters[counterId]}
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
          <CollapsibleContent>
            <hr class='my-3' />
            <DropdownMenu>
              <DropdownMenuTrigger class='mb-3'>Add Counters</DropdownMenuTrigger>
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
                            defaultValue={props?.counters?.[counter.id] ?? 0}
                            style='width: 6rem'
                            onChange={rawValue => {
                              let value = parseInt(rawValue, 10);
                              if (isNaN(value)) value = 0;
                              changeCounter(counter.id, value);
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
                <Show when={counters().length > 0}>
                  <DropdownMenuSeparator />
                </Show>
                <DropdownMenuItem
                  closeOnSelect={false}
                  onClick={() => setIsCounterDialogOpen(true)}>
                  Create New Counter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ul class='space-y-2'>
              <For
                each={Object.entries(props?.counters ?? {})
                  .map(entry => entry[0])
                  .sort((a, b) => a.localeCompare(b))}>
                {counterId => {
                  let counter = counters().find(c => c.id === counterId);
                  return (
                    <li class='flex justify-between items-center'>
                      <span style='text-align: start;'>{counter.name}</span>
                      <span class='font-semibold'>
                        <NumberField
                          class='rounded-md'
                          style={`width: 6rem; background-color: ${counter.color}; color: black`}
                          onChange={rawValue => {
                            let value = parseInt(rawValue, 10);
                            if (isNaN(value)) value = 0;
                            changeCounter(counterId, value);
                          }}
                          value={props?.counters[counterId]}>
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
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
};

export const NetworkPlayer: Component = props => {
  const [open, setOpen] = createSignal(false);

  return (
    <Card>
      <div class='rounded-lg shadow-md w-64 flex-shrink-0 p-2' style='pointer-events: initial'>
        <Collapsible onOpenChange={setOpen} open={open()}>
          <div class='flex gap-5 items-center justify-between' style='min-height: 40px;'>
            {props?.name}
            <div>{props?.life}</div>
            <CollapsibleTrigger class='size-6'>
              <ChevronDownIcon
                style={`transform: rotate3d(1,0,0,${
                  open() ? 180 : 0
                }deg); transition: transform 250ms ease-in-out;`}
              />
            </CollapsibleTrigger>
          </div>
          <Show when={!open()}>
            <div class='flex gap-2 pt-2'>
              <For
                each={Object.entries(props?.counters ?? {})
                  .filter(entry => entry[1] !== 0)
                  .map(entry => entry[0])
                  .sort((a, b) => a.localeCompare(b))}>
                {counterId => {
                  let counter = counters().find(c => c.id === counterId);
                  return (
                    <button
                      class='rounded align-middle px-2'
                      onContextMenu={e => {
                        e.preventDefault();
                        changeCounter(counterId, x => x - 1);
                        return false;
                      }}
                      onClick={e => changeCounter(counterId, x => x + 1)}
                      style={`background-color: ${counter.color}; color: black; min-width: 2rem; height:2rem; line-height: 2rem;`}>
                      {props?.counters[counterId]}
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
          <CollapsibleContent>
            <hr class='my-3' />
            <ul class='space-y-2'>
              <For
                each={Object.entries(props?.counters ?? {})
                  .map(entry => entry[0])
                  .sort((a, b) => a.localeCompare(b))}>
                {counterId => {
                  let counter = counters().find(c => c.id === counterId);
                  return (
                    <li class='flex justify-between items-center'>
                      <span style='text-align: start;'>{counter.name}</span>
                      <span class='font-semibold'>
                        <NumberField
                          disabled
                          style={`width: 6rem; background-color: ${counter.color}; color: black;`}
                          onChange={rawValue => {
                            let value = parseInt(rawValue, 10);
                            if (isNaN(value)) value = 0;
                          }}
                          value={props?.counters[counterId]}>
                          <div class='relative'>
                            <NumberFieldInput />
                          </div>
                        </NumberField>
                      </span>
                    </li>
                  );
                }}
              </For>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
};
