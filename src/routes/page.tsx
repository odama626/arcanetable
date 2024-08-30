import { A } from '@solidjs/router';
import { nanoid } from 'nanoid';
import { Component, createEffect, createSignal, For } from 'solid-js';
import { Button } from '~/components/ui/button';
import { RadioGroup, RadioGroupItem, RadioGroupItemLabel } from '~/components/ui/radio-group';
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from '~/components/ui/text-field';
import { createDeckStore } from '~/lib/deckStore';

const Page: Component = props => {
  const [deckStore, setDeckStore] = createDeckStore();
  const [selectedDeckIndex, setSelectedDeckIndex] = createSignal(0);

  createEffect(() => {
    console.log({ deckStore });
  });
  return (
    <div class='container mx-auto flex flex-col gap-5 py-10'>
      <div class='flex flex-col gap-5'>
        <h2>Decks</h2>
        <RadioGroup value={selectedDeckIndex()} onChange={setSelectedDeckIndex}>
          <For each={deckStore.decks}>
            {(deck, i) => (
              <RadioGroupItem value={i()}>
                <RadioGroupItemLabel>{deck.name}</RadioGroupItemLabel>
              </RadioGroupItem>
            )}
          </For>
        </RadioGroup>
        <Button as={A} href={`/game/${nanoid()}?deck=${selectedDeckIndex()}`}>
          Start a new Game
        </Button>
        <hr />
        <form
          class='flex flex-col gap-5'
          onSubmit={e => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const deck = Object.fromEntries(formData.entries());
            setDeckStore('decks', decks => [...decks, deck]);
          }}>
          <h3>Create a new Deck</h3>
          <TextField>
            <TextFieldLabel for='name'>Name</TextFieldLabel>
            <TextFieldInput id='name' name='name' />
          </TextField>

          <TextField>
            <TextFieldLabel for='cardList'>Card List</TextFieldLabel>
            <TextFieldTextArea id='cardList' rows='20' name='cardList' placeholder='1x Sol Ring' />
          </TextField>
          <Button type='submit'>Create Deck</Button>
        </form>
      </div>
    </div>
  );
};

export default Page;
