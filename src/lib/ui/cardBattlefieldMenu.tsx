import { Component, createSignal, For, Show } from 'solid-js';
import { Mesh } from 'three';
import { Button } from '~/components/ui/button';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '~/components/ui/menubar';
import {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
} from '~/components/ui/number-field';
import NumberFieldMenuItem from '~/components/ui/number-field-menu-item';
import { cardsById, doXTimes, selection } from '../globals';
import { PlayArea } from '../playArea';
import { counters, setIsCounterDialogOpen } from './counterDialog';
import MoveMenu from './moveMenu';

const CardBattlefieldMenu: Component<{ playArea: PlayArea; cardMesh?: Mesh }> = props => {
  let card = () => cardsById.get(props.cardMesh?.userData.id)!;
  let meshes = () =>
    selection.selectedItems.length > 0 ? selection.selectedItems : [props.cardMesh];

  let cardText = () => {
    let count = selection.selectedItems.length;
    if (count > 1) return `${count} cards`;
    return `1 card`;
  };

  return (
    <div class='flex flex-col items-start'>
      <div class='text-shadow'>{cardText()} selected</div>
      <Menubar>
        <MenubarMenu overlap>
          <MenubarTrigger>Actions</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => {
                meshes().forEach(mesh => {
                  props.playArea.flip(mesh);
                });
              }}>
              Flip<MenubarShortcut>F</MenubarShortcut>
            </MenubarItem>
            <MenubarSub overlap>
              <MenubarSubTrigger>Counters</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem closeOnSelect={false} style='font-family: monospace;'>
                  <CoreCounters {...props} />
                </MenubarItem>

                <Show when={counters().length}>
                  <MenubarSeparator />
                </Show>
                <For each={counters()}>
                  {counter => {
                    return (
                      <MenubarItem closeOnSelect={false}>
                        <div
                          style={`--color: ${counter.color}; width: 1rem; height: 1rem; background: var(--color); margin: 0 0.25rem;`}></div>
                        <div style='margin: 0 0.25rem;'>{counter.name}</div>
                        <MenubarShortcut>
                          <NumberField
                            defaultValue={
                              props.cardMesh?.userData.modifiers?.counters?.[counter.id] ?? 0
                            }
                            style='width: 6rem'
                            onChange={value => {
                              let card = cardsById.get(props.cardMesh?.userData.id)!;
                              props.playArea.modifyCard(card, modifiers => ({
                                ...modifiers,
                                counters: {
                                  ...modifiers.counters,
                                  [counter.id]: parseInt(value.replace(/\,/g, ''), 10),
                                },
                              }));
                            }}>
                            <div class='relative'>
                              <NumberFieldInput />
                              <NumberFieldIncrementTrigger />
                              <NumberFieldDecrementTrigger />
                            </div>
                          </NumberField>
                        </MenubarShortcut>
                      </MenubarItem>
                    );
                  }}
                </For>
                <Show when={counters().length > 0}>
                  <MenubarSeparator />
                </Show>
                <MenubarItem closeOnSelect={false} onClick={() => setIsCounterDialogOpen(true)}>
                  Create New Counter
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub overlap>
              <MenubarSubTrigger onClick={() => props.playArea.clone(props.cardMesh?.userData.id)}>
                Clone<MenubarShortcut>C</MenubarShortcut>
              </MenubarSubTrigger>
              <MenubarSubContent>
                <div class='pt-1.5 px-2'>Clone {cardText()}</div>
                <div class='pb-1.5 px-2 text-sm'>consider using counters</div>
                <NumberFieldMenuItem
                  onSubmit={count =>
                    doXTimes(count, () => props.playArea.clone(props.cardMesh?.userData.id), 10)
                  }
                />
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MoveMenu
            text='Move To'
            onComplete={() => {
              selection.clearSelection();
            }}
            cards={meshes().map(mesh => cardsById.get(mesh?.userData.id))}
            fromZone={props.playArea.battlefieldZone}
            playArea={props.playArea}
          />
        </MenubarMenu>
      </Menubar>
    </div>
  );
};

const CoreCounters: Component = props => {
  let [power, setPower] = createSignal(props.cardMesh?.userData.modifiers?.power ?? 0);
  let [toughness, setToughness] = createSignal(props.cardMesh?.userData?.modifiers?.toughness ?? 0);

  return (
    <>
      <NumberField
        value={power()}
        style='width: 6rem'
        onChange={rawValue => {
          let card = cardsById.get(props.cardMesh?.userData.id)!;
          let value = parseInt(rawValue, 10);
          setPower(rawValue);
          props.playArea.modifyCard(card, modifiers => ({
            ...modifiers,
            power: value,
          }));
        }}>
        <div class='relative'>
          <NumberFieldInput />
          <NumberFieldIncrementTrigger />
          <NumberFieldDecrementTrigger />
        </div>
      </NumberField>

      <div style='display: flex; flex-direction: column;'>
        <Button
          variant='ghost'
          style='width: 1rem; height:  1rem; padding: 0; margin: 0 0.5rem'
          onClick={() => {
            let card = cardsById.get(props.cardMesh?.userData.id)!;
            setPower(power => parseInt(power.toString(), 10) + 1);
            setToughness(toughness => parseInt(toughness.toString(), 10) + 1);
            props.playArea.modifyCard(card, modifiers => ({
              ...modifiers,
              power: (modifiers.power ?? 0) + 1,
              toughness: (modifiers.toughness ?? 0) + 1,
            }));
          }}>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            stroke-width='2'
            stroke-linecap='round'
            stroke-linejoin='round'
            class='size-4'>
            <path d='M6 15l6 -6l6 6'></path>
          </svg>
        </Button>
        <Button
          variant='ghost'
          style='width: 1rem; height:  1rem; padding: 0; margin: 0 0.5rem'
          onClick={() => {
            let card = cardsById.get(props.cardMesh?.userData.id)!;
            setPower(power => parseInt(power.toString(), 10) - 1);
            setToughness(toughness => parseInt(toughness.toString(), 10) - 1);
            props.playArea.modifyCard(card, modifiers => ({
              ...modifiers,
              power: (modifiers.power ?? 0) - 1,
              toughness: (modifiers.toughness ?? 0) - 1,
            }));
          }}>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            stroke-width='2'
            stroke-linecap='round'
            stroke-linejoin='round'
            class='size-4'>
            <path d='M6 9l6 6l6 -6'></path>
          </svg>
        </Button>
      </div>
      <NumberField
        value={toughness()}
        style='width: 6rem'
        onChange={rawValue => {
          let card = cardsById.get(props.cardMesh?.userData.id)!;
          let value = parseInt(rawValue, 10);
          setToughness(rawValue);
          props.playArea.modifyCard(card, modifiers => ({
            ...modifiers,
            toughness: value,
          }));
        }}>
        <div class='relative'>
          <NumberFieldInput />
          <NumberFieldIncrementTrigger />
          <NumberFieldDecrementTrigger />
        </div>
      </NumberField>
    </>
  );
};

export default CardBattlefieldMenu;
