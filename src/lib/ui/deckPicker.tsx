import { Component, createEffect, createSignal, For } from 'solid-js';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
  NumberFieldLabel,
} from '~/components/ui/number-field';
import {
  labelVariants,
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from '~/components/ui/text-field';
import { createDeckStore } from '../deckStore';
import { colorHashDark, startSpectating } from '../globals';
import PencilIcon from '../icons/pencil-solid.svg';
import { cn } from '../utils';
import { DeckEditor } from './deckEditor';
import styles from './deckPicker.module.css';
import CopyLinkButton from '~/components/ui/copy-link-button';

const DeckPicker: Component = props => {
  const [deckStore, setDeckStore] = createDeckStore();
  const [selectedDeckIndex, setSelectedDeckIndex] = createSignal(0);
  const [editingDeck, setEditingDeck] = createSignal(false);
  const [startingLife, setStartingLife] = createSignal(40);

  createEffect(() => {
    let startingLife = deckStore.decks[selectedDeckIndex()]?.startingLife;
    if (startingLife) {
      setStartingLife(startingLife);
    }
  });

  function selectDeck(index: number) {
    setSelectedDeckIndex(index);
    let deck = deckStore.decks[index];
    if (deck.startingLife) {
      console.log({ deck });
      setStartingLife(deck.startingLife);
    }
  }

  return (
    <>
      <DeckEditor
        open={!!editingDeck()}
        setOpen={setEditingDeck}
        deck={editingDeck()}
        onChange={deck => {
          setDeckStore('decks', decks => [deck, ...decks.filter(d => d.id !== deck.id)]);
        }}
        onDelete={id => {
          setDeckStore('decks', decks => decks.filter(deck => deck.id !== id));
        }}
      />
      <Dialog open={!editingDeck()}>
        <DialogContent class='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Start Session</DialogTitle>
          </DialogHeader>
          <form
            class='flex flex-col gap-5'
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              e.currentTarget.reset();

              props.onSelectDeck(data);
            }}>
            <TextField
              defaultValue={localStorage.getItem('arcanetable-name') ?? ''}
              onChange={value => localStorage.setItem('arcanetable-name', value)}>
              <TextFieldLabel for='name'>Name</TextFieldLabel>
              <TextFieldInput required type='text' id='name' name='name' />
            </TextField>
            <NumberField value={startingLife()} onChange={setStartingLife}>
              <NumberFieldLabel>Starting Life</NumberFieldLabel>
              <div class='relative'>
                <NumberFieldInput name='startingLife' />
                <NumberFieldIncrementTrigger />
                <NumberFieldDecrementTrigger />
              </div>
            </NumberField>
            <div>
              <label class={cn(labelVariants())}>Select a deck</label>
              <input type='hidden' name='deckIndex' value={selectedDeckIndex()} />
              <div class='grid grid-cols-3 gap-4 my-2'>
                <For each={deckStore.decks}>
                  {(deck, i) => (
                    <div
                      style='position: relative; aspect-ratio: 626/457;'
                      class='relative rounded-lg overflow-hidden shadow-lg'
                      classList={{ [styles.selectedRadioItem]: selectedDeckIndex() === i() }}>
                      <button
                        style='width: 100%; height: 100%;'
                        type='button'
                        onClick={() => selectDeck(i())}>
                        <div
                          class='bg-cover'
                          style={`background-image: url(${
                            deck.coverImage ?? '/arcane-table-back.webp'
                          }); height: 100%;`}></div>
                        <div class='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent py-4 px-2 text-left'>
                          <h3 class='text-white text-xl font-semibold'>{deck.name}</h3>
                          <div class='flex flex-row gap-2 pt-2'>
                            <For each={deck.tags}>
                              {tag => (
                                <span
                                  class='text-white rounded-md h-7 px-3 text-sm inline-flex items-center justify-center'
                                  style={`background-color: ${colorHashDark.hex(tag.name)};`}>
                                  {tag.name}
                                </span>
                              )}
                            </For>
                          </div>
                        </div>
                      </button>
                      <div class='absolute top-2 right-2'>
                        <button type='button' onClick={() => setEditingDeck(deck)}>
                          <PencilIcon style='height: 1.25rem; fill: white; stroke: black; stroke-width: 2px;' />
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <DialogFooter>
              <CopyLinkButton variant='ghost' class='mr-auto' />
              <Button onClick={() => startSpectating()} variant='ghost'>
                Spectate
              </Button>
              <Button
                variant='ghost'
                onClick={() => setEditingDeck(deckStore.decks[selectedDeckIndex()])}>
                Edit Deck
              </Button>
              <Button variant='outline' type='button' onClick={() => setEditingDeck(true)}>
                Create Deck
              </Button>
              <Button type='submit'>Start Playtest</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default DeckPicker;
