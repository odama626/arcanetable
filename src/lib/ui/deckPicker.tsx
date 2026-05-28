import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js';
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
import { createDeckStore, useCardSystemContext } from '../deckStore';
import { cardSystem, colorHashDark, getCardSystem, startSpectating } from '../globals';
import PencilIcon from 'lucide-solid/icons/pencil';
import { cn } from '../utils';
import { Deck, DeckEditor } from './deckEditor';
import styles from './deckPicker.module.css';
import CopyLinkButton from '~/components/ui/copy-link-button';
import { LoadSettings } from '../constants';
import { useSearchParams } from '@solidjs/router';
import { unwrap } from 'solid-js/store';

interface Props {
  onStart(settings: LoadSettings): void;
}

export default function DeckPicker(props: Props) {
  const [deckStore, setDeckStore] = createDeckStore();
  const [searchParams] = useSearchParams();
  const [cardSystemStore, { setCardSystem }] = useCardSystemContext();
  const [selectedDeckId, setSelectedDeckId] = createSignal<string>();
  const [editingDeck, setEditingDeck] = createSignal<Deck>();
  const [startingLife, setStartingLife] = createSignal(40);

  // onMount(() => {
  //   setSelectedDeckId(Object.values(deckStore.decks)[0]?.id);
  // });

  createEffect(() => {
    const deck = deckStore.decks[selectedDeckId()];
    let startingLife = deck?.startingLife;
    if (startingLife) {
      setStartingLife(parseInt(startingLife));
    }
  });

  async function onSubmit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    e.currentTarget.reset();

    // todo: fix picking a deck that is not default system here
    const deck = deckStore.decks[data.deckId];

    props.onStart(data);
  }

  function shouldShowSystem(system: string) {
    if (cardSystemStore.system === 'unsorted' && system === 'unsorted') return false;
    return system !== cardSystemStore.system;
  }

  return (
    <>
      <Show when={editingDeck()} keyed>
        {deck => (
          <DeckEditor
            onClose={() => setEditingDeck()}
            deck={structuredClone(unwrap(deck))}
            onChange={updatedDeck => {
              let fromSystem = unwrap(editingDeck()?.system) || 'unsorted';
              let toSystem = updatedDeck.system || 'unsorted';

              setDeckStore('systems', fromSystem, (entries = []) =>
                entries.filter(id => id !== deck.id),
              );

              setDeckStore('systems', 'unsorted', (entries = []) =>
                entries.filter(id => id !== deck.id),
              );

              setDeckStore('systems', toSystem, (entries = []) => [
                updatedDeck.id,
                ...entries.filter(id => id !== updatedDeck.id),
              ]);
              setDeckStore('decks', { [updatedDeck.id]: updatedDeck });
            }}
            onDelete={() => {
              setDeckStore('decks', deck.id, undefined);
              let fromSystem = deck.system || 'unsorted';
              setDeckStore('systems', fromSystem, entries => entries.filter(id => id !== deck.id));
            }}
          />
        )}
      </Show>
      <Dialog open={!editingDeck()}>
        <DialogContent class='max-w-3xl' hideClose>
          <DialogHeader>
            <DialogTitle>Start Session</DialogTitle>
          </DialogHeader>
          <form class='flex flex-col gap-5' onSubmit={onSubmit}>
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
              <input type='hidden' name='deckId' value={selectedDeckId()} />
              <h2>{cardSystemStore.systems[cardSystemStore.system]?.name}</h2>
              <div class='grid grid-cols-3 gap-4 my-2'>
                <For each={deckStore.systems[cardSystemStore.system]}>
                  {(deckId, i) => {
                    let deck = () => deckStore.decks[deckId];
                    return (
                      <Show when={deck()}>
                        <DeckOption
                          deck={deck()}
                          isSelected={deck().id === selectedDeckId()}
                          onSelect={() => setSelectedDeckId(deck().id)}
                          onEdit={() => setEditingDeck(deck())}
                        />
                      </Show>
                    );
                  }}
                </For>
              </div>

              <For each={Object.entries(deckStore.systems)}>
                {([system, deckIds]) => (
                  <Show when={shouldShowSystem(system) && deckIds.length > 0}>
                    <h2>{cardSystemStore.systems[system]?.name ?? system}</h2>
                    <div class='grid grid-cols-3 gap-4 my-2'>
                      <For each={deckIds}>
                        {(deckId, i) => {
                          let deck = deckStore.decks[deckId];
                          return (
                            <Show when={deck}>
                              <DeckOption
                                deck={deck}
                                isSelected={deck.id === selectedDeckId()}
                                onSelect={() => setSelectedDeckId(deck.id)}
                                onEdit={() => setEditingDeck(deck)}
                              />
                            </Show>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                )}
              </For>
            </div>
            <DialogFooter>
              <CopyLinkButton variant='ghost' class='mr-auto' />
              <Button onClick={() => startSpectating()} variant='ghost'>
                Spectate
              </Button>
              <Button
                disabled={!selectedDeckId()}
                variant='ghost'
                onClick={() => setEditingDeck(deckStore.decks[selectedDeckId()])}>
                Edit Deck
              </Button>
              <Button variant='outline' type='button' onClick={() => setEditingDeck({})}>
                Create Deck
              </Button>
              <Button type='submit' disabled={!selectedDeckId()}>
                Start Playtest
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DeckOptionProps {
  onSelect(): void;
  onEdit(): void;
  isSelected: boolean;
  deck: Deck;
}

function DeckOption(props: DeckOptionProps) {
  return (
    <div
      style='position: relative; aspect-ratio: 626/457;'
      class='relative rounded-lg overflow-hidden shadow-lg'
      classList={{ [styles.selectedRadioItem]: props.isSelected }}>
      <button style='width: 100%; height: 100%;' type='button' onClick={props.onSelect}>
        <div
          class='bg-cover'
          style={`background-image: url(${
            props.deck.coverImage ?? '/arcane-table-back.webp'
          }); height: 100%;`}></div>
        <div class='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent py-4 px-2 text-left'>
          <h3 class='text-white text-xl font-semibold'>{props.deck?.name}</h3>
          <div class='flex flex-row gap-2 pt-2 flex-wrap'>
            <For each={props.deck.tags}>
              {tag => (
                <span
                  class='text-white rounded-md h-7 px-3 text-sm inline-flex items-center justify-center whitespace-nowrap'
                  style={`background-color: ${colorHashDark.hex(tag.name)};`}>
                  {tag.name}
                </span>
              )}
            </For>
          </div>
        </div>
      </button>
      <div class='absolute top-2 right-2'>
        <button type='button' style='cursor: pointer;' onClick={props.onEdit}>
          <PencilIcon style='color: white; filter: drop-shadow(2px 4px 6px black);' />
        </button>
      </div>
    </div>
  );
}
