import { createSignal } from 'solid-js';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { colorHashLight, selectedDeckId, sendEvent } from '../globals';
import { sha1 } from '../utils';
import { getDeckStore, Counter } from '../deckStore';

export const [isCounterDialogOpen, setIsCounterDialogOpen] = createSignal(false);
export const [counters, setCounters] = createSignal<Counter[]>([]);

function createCounter(counter: Counter) {
  setCounters(counters => [...counters, counter]);
  sendEvent({ type: 'createCounter', counter });

  const deckId = selectedDeckId();
  if (!deckId) throw new Error(`selectedDeckId is undefiend`);

  const deckStore = getDeckStore();
  const deck = deckStore.decks[deckId];
  deck.counters ??= [];
  deck.counters.push(counter);
  localStorage.setItem('decks', JSON.stringify(deckStore));
}

export default function CounterDialog() {
  <Dialog open={isCounterDialogOpen()} onOpenChange={setIsCounterDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create A Counter</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={e => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          async function create() {
            let id = await sha1(formData.get('name'));
            formData.set('id', id);
            formData.set('color', colorHashLight.hex(formData.get('name')));

            const counter = Object.fromEntries(formData.entries());
            createCounter(counter);
          }
          create();
          e.currentTarget.reset();
          setIsCounterDialogOpen(false);
        }}>
        <TextField>
          <TextFieldLabel for='name'>Name</TextFieldLabel>
          <TextFieldInput type='text' id='name' name='name' />
        </TextField>
        <br />
        <DialogFooter>
          <Button type='submit'>Create</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
