import { Component, createSignal, For } from 'solid-js';
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
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { createDeckStore } from '../deckStore';
import { DeckEditor } from './deckEditor';
import styles from './deckPicker.module.css';

const DeckPicker: Component = props => {
  const [deckStore, setDeckStore] = createDeckStore();
  const [selectedDeckIndex, setSelectedDeckIndex] = createSignal(0);
  const [editingDeck, setEditingDeck] = createSignal(false);
  return (
    <>
      <DeckEditor
        open={!!editingDeck()}
        setOpen={setEditingDeck}
        deck={editingDeck()}
        onChange={deck => {
          setDeckStore('decks', decks => decks.filter(d => d.id !== deck.id).concat(deck));
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
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              console.log({ data });
              e.currentTarget.reset();

              props.onSelectDeck(data);
            }}>
            <TextField>
              <TextFieldLabel for='name'>Name</TextFieldLabel>
              <TextFieldInput required type='text' id='name' name='name' />
            </TextField>
            <NumberField defaultValue={40}>
              <NumberFieldLabel>Starting Life</NumberFieldLabel>
              <div class='relative'>
                <NumberFieldInput name='startingLife' />
                <NumberFieldIncrementTrigger />
                <NumberFieldDecrementTrigger />
              </div>
            </NumberField>
            <h2>Select a deck</h2>
            <input type='hidden' name='deckIndex' value={selectedDeckIndex()} />
            <div class='grid grid-cols-3 gap-4 w-11/12 my-4 m-auto'>
              <For each={deckStore.decks}>
                {(deck, i) => (
                  <div
                    style='position: relative; aspect-ratio: 626/457;'
                    class='relative rounded-lg overflow-hidden shadow-lg'
                    classList={{ [styles.selectedRadioItem]: selectedDeckIndex() === i() }}>
                    <button
                      style='width: 100%; height: 100%;f'
                      type='button'
                      onClick={() => setSelectedDeckIndex(i())}>
                      <div
                        class='bg-cover'
                        style={`background-image: url(${
                          deck.coverImage ?? '/arcane-table-back.webp'
                        }); height: 100%;`}></div>
                      <div class='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4'>
                        <h3 class='text-white text-xl font-semibold'>{deck.name}</h3>
                      </div>
                    </button>
                    <div class='absolute top-2 right-2'>
                      <button type='button' onClick={() => setEditingDeck(deck)}>
                        ✏️
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
            <DialogFooter>
              <Button onClick={() => props.setIsSpectating(true)} variant='ghost'>
                Spectate
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
