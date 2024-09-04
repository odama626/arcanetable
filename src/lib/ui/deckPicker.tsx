import { Component, createSignal, For } from 'solid-js';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { RadioGroup, RadioGroupItem, RadioGroupItemLabel } from '~/components/ui/radio-group';
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from '~/components/ui/text-field';
import { createDeckStore } from '../deckStore';

const DeckPicker: Component = props => {
  const [deckStore, setDeckStore] = createDeckStore();
  const [selectedDeckIndex, setSelectedDeckIndex] = createSignal(0);
  const [createDialogOpen, setCreateDialogOpen] = createSignal(false);
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Deck</DialogTitle>
        </DialogHeader>
        <RadioGroup value={selectedDeckIndex()} onChange={setSelectedDeckIndex}>
          <For each={deckStore.decks}>
            {(deck, i) => (
              <RadioGroupItem value={i()}>
                <RadioGroupItemLabel>{deck.name}</RadioGroupItemLabel>
                <Button
                  onClick={() =>
                    setDeckStore('decks', decks => decks.filter((_, index) => index !== i()))
                  }>
                  delete
                </Button>
              </RadioGroupItem>
            )}
          </For>
        </RadioGroup>
        <DialogFooter>
          <Dialog open={createDialogOpen()} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger>
              <Button variant='outline'>Create A Deck</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Create A Deck</DialogTitle>
              <form
                class='flex flex-col gap-5'
                onSubmit={e => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const deck = Object.fromEntries(formData.entries());
                  setDeckStore('decks', decks => [...decks, deck]);
                  setCreateDialogOpen(false);
                }}>
                <TextField>
                  <TextFieldLabel for='name'>Name</TextFieldLabel>
                  <TextFieldInput type='text' id='name' name='name' />
                </TextField>

                <TextField>
                  <TextFieldLabel for='cardList'>Card List</TextFieldLabel>
                  <TextFieldTextArea
                    id='cardList'
                    rows='20'
                    name='cardList'
                    placeholder='1x Sol Ring'
                  />
                </TextField>
                <DialogFooter>
                  <Button type='submit'>Create Deck</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => props.onSelectDeck(selectedDeckIndex())}>Start Playtest</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default DeckPicker;
