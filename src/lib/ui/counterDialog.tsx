import { nanoid } from 'nanoid';
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
import { deckIndex, sendEvent, sha1 } from '../globals';
import ColorHash from 'color-hash';

export const [isCounterDialogOpen, setIsCounterDialogOpen] = createSignal(false);
export const [counters, setCounters] = createSignal([]);

const colorHash = new ColorHash({ lightness: 0.7 });

function createCounter(counter) {
  setCounters(counters => [...counters, counter]);
  sendEvent({ type: 'createCounter', counter });

  let decks = JSON.parse(localStorage.getItem('decks') || `{}`);
  decks.decks[deckIndex()].counters = decks.decks[deckIndex()].counters ?? [];
  decks.decks[deckIndex()].counters.push(counter);
  localStorage.setItem('decks', JSON.stringify(decks));
}

const CounterDialog: Component = props => {
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
            formData.set('color', colorHash.hex(formData.get('name')));

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
};

export default CounterDialog;
