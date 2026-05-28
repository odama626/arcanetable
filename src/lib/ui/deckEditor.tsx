import { nanoid } from 'nanoid';
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  splitProps,
} from 'solid-js';
import { Button } from '~/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemLabel,
  ComboboxTrigger,
} from '~/components/ui/combobox';
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
import { getCardArtImage, getCardImage } from '../card';
import { CardEntry, CardEntryDetail, DetailedCardEntry, Deck, FORMATS } from '../constants';
import { fetchCardInfo, loadCardList, populateCardInfo } from '../deck';
import { CardSystem, cardSystem, colorHashDark } from '../globals';
import CircleInfoIcon from 'lucide-solid/icons/info';
import CloseIcon from 'lucide-solid/icons/x';
import { cn } from '../utils';
import styles from './deckEditor.module.css';
import CardList from './deckEditor/cardList';
import random from 'lodash-es/random';
import { Command, CommandInput, CommandItem, CommandList } from '~/components/ui/command';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { capitalize, create, debounce, isSafeInteger } from 'lodash-es';
import { createStore, SetStoreFunction, unwrap } from 'solid-js/store';
import { getCardKey, hydrateDeck, serializeDeck, useCardSystemContext } from '../deckStore';
import AddIcon from 'lucide-solid/icons/plus';
import SubIcon from 'lucide-solid/icons/minus';
import SearchIcon from 'lucide-solid/icons/search';
import { useSearchParams } from '@solidjs/router';
import { trackStore, trackDeep } from '@solid-primitives/deep';
import DownloadIcon from 'lucide-solid/icons/download';
import {
  Select,
  SelectContent,
  SelectHiddenSelect,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Portal } from 'solid-js/web';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { toast } from 'solid-sonner';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { AlertDialog, AlertDialogContent } from '~/components/ui/alert-dialog';
import intersectionObserver from '../intersectionObserver';

interface Props {
  onClose(): void;
  onChange(deck: Deck): void;
  onDelete(): void;
  deck: Deck;
}

let cache = new Map();

export const DeckEditor: Component<Props> = props => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchResults, setSearchResults] = createSignal();
  const [cardSystemStore, { setCardSystem }] = useCardSystemContext();
  const [isDirty, setIsDirty] = createSignal(false);
  let formRef: HTMLFormElement;

  const [deck, setDeck] = createStore<Deck>(
    props.deck?.name ? unwrap(props.deck) : { cards: {}, inPlay: {} },
  );

  const getDeckList = createMemo(() => {
    trackDeep(deck.cards);

    return Object.values(deck?.cards || {});
  });

  const getInPlayList = createMemo(() => {
    trackDeep(deck.inPlay);
    return Object.values(deck?.inPlay || {});
  });

  onMount(async () => {
    if (deck.system) {
      await setCardSystem(deck.system);
      await rehydrateDeck(deck);
    }
  });

  createEffect(
    on(
      () => deck.system,
      () => {
        rehydrateDeck(unwrap(deck));
        setSearchParams({ q: undefined, type: undefined }, { replace: true });
      },
    ),
  );

  let hydrationCount = 0;
  async function rehydrateDeck(deck: Deck) {
    let currentHydration = ++hydrationCount;
    return hydrateDeck(structuredClone(unwrap(deck))).then(deck => {
      // ignore old hydrations (if the card system toggle changing fast)
      if (hydrationCount !== currentHydration) return;
      setDeck(deck);
    });
  }

  function closeCurrentDialog() {
    setSearchParams({ dialog: undefined, src: undefined }, { replace: true });
  }

  const updateDeck: SetStoreFunction<Deck> = (...params: any[]) => {
    (setDeck as any)(...params);
    setIsDirty(true);
  };

  let isEditing = () => !!props?.deck?.id;

  function onSaveDeck(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    for (let [field, value] of formData.entries()) {
      if (field === 'startingLife') value = parseInt(value);
      setDeck(field, value);
    }

    const serializedDeck = serializeDeck(unwrap(deck));

    props.onChange(serializedDeck);
    props.onClose();
    e.currentTarget.reset();
  }

  async function parseDeckList(cardListText: string) {
    let newCardEntries = loadCardList(cardListText);
    let newCardList = await Promise.all(newCardEntries.map(entry => fetchCardInfo(entry, cache)));
    for (const card of newCardList) {
      if (deck.cards[card.id]) {
        updateDeck('cards', card.id, 'qty', qty => qty + card.qty);
      } else {
        updateDeck('cards', card.id, card);
      }
    }
  }

  onMount(() => {
    window.addEventListener('drop', handleDrop, { passive: false });
    window.addEventListener('paste', handlePaste, { passive: false });
  });

  onCleanup(() => {
    window.removeEventListener('drop', handleDrop);
    window.removeEventListener('paste', handlePaste);
    setSearchParams(
      {
        page: undefined,
        totalPages: undefined,
        dialog: undefined,
        src: undefined,
        q: undefined,
        type: undefined,
      },
      { replace: true },
    );
  });

  function handlePaste(event) {
    const text = event.clipboardData.getData('text');
    parseDeckList(text);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer) return;
    let { files } = event.dataTransfer;
    if (files.length > 0) {
      let file = files[0];
      let name = file.name.slice(0, file.name.lastIndexOf('.')).replace(/^Deck\s\-\s/, '');
      updateDeck('name', name);
      file.text().then(result => {
        parseDeckList(result);
      });
    }
  }

  function getSearchString(systemId: string, params: URLSearchParams) {
    return [systemId, params.get('q'), params.getAll('type').sort()].join(':');
  }

  async function loadMoreResults(entry: IntersectionObserverEntry) {
    const q = (unwrap(searchParams.q) ?? '') as string;
    const t = unwrap(searchParams.type);
    const page = unwrap(searchParams.page) as string;
    if (!q?.length && !t?.length) return;
    if (!page?.length) return;

    debouncedOnSearch(q, t, parseInt(page) + 1);
  }

  let lastSearchString: string | undefined;

  function onSearch(q?: string, t?: string | string[], page?: number) {
    const url = new URL(cardSystem.cardSearchEndpoint);

    if (q) {
      url.searchParams.set('q', q);
    }

    if (Array.isArray(t)) {
      t.forEach(t => url.searchParams.append('type', t));
    } else if (t) {
      url.searchParams.append('type', t);
    }
    if (page) {
      url.searchParams.set('page', page.toString());
    }

    let searchString = getSearchString(cardSystem.id, url.searchParams);

    const isSearchSame = searchString === lastSearchString;
    lastSearchString = searchString;

    let outdatedSearch = page
      ? page <= parseInt(searchParams.page ?? '')
      : searchParams.page && !page;

    if (isSearchSame && outdatedSearch) {
      console.log('tried outdated search');
      return;
    }

    function fetchPage(append?: true) {
      fetch(url)
        .then(r => r.json())
        .then(result => {
          if (result.code === 'error') {
            toast(`failed to load search results. Try again later`);
            return;
          }

          const newResults = result.data.map(detail => populateCardInfo(detail));

          const isSearchSame =
            getSearchString(cardSystem.id, new URLSearchParams(location.search)) ===
            getSearchString(result.id, url.searchParams);

          // search changed while paging, stop
          if (append && !isSearchSame) return;

          if (append) {
            setSearchResults((results = []) => [...results, ...newResults]);
          } else {
            setSearchResults(newResults);
          }

          setSearchParams({ page: result.page, totalPages: result.total_pages }, { replace: true });

          if (isSearchSame && result.page < result.total_pages) {
            url.searchParams.set('page', result.page + 1);
            // fetchPage(true);
          }
        });
    }
    fetchPage(isSearchSame);
  }
  let debouncedOnSearch = debounce(onSearch, 750, { trailing: true });

  createEffect(() => {
    cardSystem.uri;
    const q = unwrap(searchParams.q) ?? '';
    const t = unwrap(searchParams.type);
    if (!q?.length && !t?.length) {
      lastSearchString = '';
      return setSearchResults();
    }
    debouncedOnSearch(q, t);
  });

  function onDownloadDeckList() {
    let params = {
      name: 'unnamed deck',
    };
    if (formRef) {
      params.name = formRef.elements['name'].value;
    }

    let cards = Object.values(deck.cards).map(card =>
      [card.qty, card.name, card.set && `[${card.set}]`].filter(Boolean).join(' '),
    );
    let inPlayCards = Object.values(deck.inPlay).map(card =>
      [card.qty, card.name, card.set && `[${card.set}]`].filter(Boolean).join(' '),
    );

    let content = [cards].flat().join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <form ref={formRef} onSubmit={onSaveDeck}>
        <div class={styles.container} onDragOver={e => e.preventDefault()}>
          <div
            style='grid-area: header;'
            class='px-7 p-4 text-2xl flex flex-row gap-2 items-center bg-background'>
            <div class='ml-auto' />
            <Button
              class='cursor-pointer'
              variant='outline'
              type='button'
              onClick={() => {
                if (isDirty()) return setSearchParams({ dialog: 'editor-confirm-close' });
                props.onClose();
              }}>
              Close
            </Button>
          </div>
          <div class={`gap-5 pt-4 ${styles.formContainer}`}>
            <input type='hidden' value={props?.deck?.id ?? nanoid()} name='id' />
            <TextField
              class='px-4'
              value={deck?.name ?? ''}
              onChange={name => updateDeck('name', name)}>
              <TextFieldLabel for='name'>Deck Name</TextFieldLabel>
              <TextFieldInput required type='text' id='name' name='name' placeholder='deck name' />
            </TextField>

            <Select
              value={cardSystem}
              class='px-4'
              name='system'
              optionValue='id'
              optionTextValue='name'
              onChange={async system => {
                await setCardSystem(system?.id);
                updateDeck('system', system?.id);
              }}
              options={(() =>
                Object.values(cardSystemStore.systems).sort((a, b) =>
                  a.name.localeCompare(b.name),
                ))()}
              itemComponent={props => (
                <SelectItem item={props.item}>{props.item.rawValue?.name}</SelectItem>
              )}>
              <SelectHiddenSelect />
              <label>Card System</label>
              <SelectTrigger aria-label='system'>
                <SelectValue<CardSystem>>{state => state.selectedOption()?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>

            <NumberField
              class='px-4'
              value={deck?.startingLife ?? 40}
              onChange={value => updateDeck('startingLife', parseInt(value))}>
              <NumberFieldLabel for='startingLife'>Starting Life Total</NumberFieldLabel>
              <div class='relative'>
                <NumberFieldInput required id='startingLife' name='startingLife' />
                <NumberFieldIncrementTrigger />
                <NumberFieldDecrementTrigger />
              </div>
            </NumberField>
            <div class='px-4'>
              <label class={cn(labelVariants())}>Deck Tags</label>
              <Combobox
                multiple
                triggerMode='focus'
                options={FORMATS}
                onChange={value => updateDeck('tags', value)}
                value={deck.tags}
                onsubmit={e => {
                  e.preventDefault();
                }}
                optionValue='name'
                optionTextValue='name'
                placeholder='tags'
                itemComponent={props => (
                  <ComboboxItem item={props.item}>
                    <ComboboxItemLabel>{props.item.rawValue.name}</ComboboxItemLabel>
                  </ComboboxItem>
                )}>
                <ComboboxControl>
                  {state => (
                    <>
                      <div class={styles.multiSelectControl}>
                        <For each={state.selectedOptions()}>
                          {option => (
                            <span
                              class={styles.multiSelectItem}
                              onPointerDown={e => e.stopPropagation()}>
                              <Button
                                size='xs'
                                variant='secondary'
                                style={`background-color: ${colorHashDark.hex(option.name)}; color: white;`}
                                onClick={() => state.remove(option)}>
                                {option.name}
                              </Button>
                            </span>
                          )}
                        </For>
                        <div class={styles.multiSelectInput}>
                          <ComboboxInput
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                              }
                            }}
                          />
                          <ComboboxTrigger />
                        </div>
                      </div>
                    </>
                  )}
                </ComboboxControl>
                <ComboboxContent style='max-height: 50lvh; overflow: auto;' />
              </Combobox>
            </div>
            <Show when={getDeckList()}>
              <CardList
                entries={getDeckList()}
                addCard={entry => {
                  updateDeck('cards', entry.id, 'qty', number => number + 1);
                }}
                removeCard={entry =>
                  updateDeck('cards', entry.id, 'qty', number => Math.max(number - 1, 0))
                }
              />
            </Show>

            <div class='px-4'>
              <label class={cn(labelVariants())}>Start in play</label>
              <Combobox
                multiple
                options={getDeckList()}
                value={getInPlayList()}
                optionValue={card => {
                  return card.name;
                }}
                onChange={cards => {
                  updateDeck({
                    inPlay: Object.fromEntries(cards.map(card => [card.name, card])),
                  });
                }}
                optionTextValue={(card: DetailedCardEntry) => {
                  return card.name;
                }}
                optionLabel={card => card.name}
                placeholder='Card in play'
                itemComponent={props => (
                  <ComboboxItem item={props.item}>
                    <ComboboxItemLabel>{props.item.rawValue.name}</ComboboxItemLabel>
                  </ComboboxItem>
                )}>
                <ComboboxControl>
                  {state => (
                    <>
                      <div class={styles.multiSelectControl}>
                        <For each={state.selectedOptions()}>
                          {option => (
                            <span
                              class={styles.multiSelectItem}
                              onPointerDown={e => e.stopPropagation()}>
                              <Button
                                size='xs'
                                variant='secondary'
                                onClick={() => state.remove(option)}>
                                {option.name}
                              </Button>
                            </span>
                          )}
                        </For>
                        <div class={styles.multiSelectInput}>
                          <ComboboxInput />
                          <ComboboxTrigger />
                        </div>
                      </div>
                    </>
                  )}
                </ComboboxControl>
                <ComboboxContent style='max-height: 50lvh; overflow: auto;' />
              </Combobox>
            </div>
            <div class='flex gap-1 justify-end px-4 pb-4'>
              <Button variant='ghost' size='icon' class='mr-auto' onClick={onDownloadDeckList}>
                <DownloadIcon />
              </Button>
              <Show when={isEditing()}>
                <Button
                  variant='ghost'
                  onClick={() => setSearchParams({ dialog: 'editor-confirm-delete' })}>
                  Delete Deck
                </Button>
              </Show>
              <Button type='submit'>{isEditing() ? 'Update Deck' : 'Create Deck'}</Button>
            </div>
          </div>
          <div class={styles.cardListScrollContainer} aria-hidden='false'>
            <div
              class='top-0 sticky z-10 backdrop-blur-xl p-2'
              style='background: hsla(var(--background) / .7);'>
              <Command style='background: transparent;' value={searchParams.q || ''}>
                <CommandInput
                  wrapperStyle='border-bottom-color: var(--color-gray-400);'
                  style='background: transparent;'
                  placeholder='Type a command or search...'
                  value={searchParams.q ?? ''}
                  onValueChange={q => setSearchParams({ q })}
                />
              </Command>
              <ToggleGroup
                class='inline-flex py-2 gap-1'
                multiple
                value={
                  Array.isArray(searchParams.type)
                    ? searchParams.type
                    : [searchParams.type].filter(Boolean)
                }
                onChange={type => setSearchParams({ type })}>
                <For each={cardSystem.types}>
                  {cardType => (
                    <ToggleGroupItem
                      class='data-[pressed]:bg-muted-foreground/20 hover:bg-muted-foreground/10'
                      value={cardType}>
                      {capitalize(cardType)}
                    </ToggleGroupItem>
                  )}
                </For>
              </ToggleGroup>
            </div>
            <div class={`p-4 ${styles.cardList}`}>
              <For each={searchResults() || getDeckList()} fallback={EmptyGridContainer}>
                {(card, i) => {
                  const deckCard = () => deck.cards?.[getCardKey(card)];
                  return (
                    <div
                      data-index={i()}
                      id={card.id}
                      style={`
                    position: relative;
                    --timing: ${random(400, 600)}ms;
                    --delay: ${random(250, 500)}ms;
                    --distance: ${random(20, 100)}px;
                    content-visibility: auto;
                  `}
                      class='fade-in-from-below'>
                      <img
                        crossOrigin=''
                        src={
                          getCardImage(card) ??
                          cardSystem.fallbackImage ??
                          '/unknown-card-image.webp'
                        }
                        style={`anchor-name: --card-${i()}; height: 100%;`}
                      />
                      <div
                        class='absolute inset-0 fade-in'
                        style={`
                      position-anchor: --card-${i()};
                      right: anchor(right);
                      // width: anchor-size(width);
                      height: anchor-size(height);
                      container-type: size;
                      --delay: ${random(1000, 1250)}ms;
                      --timing: ${random(500, 1250)}ms;
                    `}>
                        <div
                          class='grid place-items-center justify-end'
                          style={`
                        height: 100%;
                        padding-inline: 10cqw;
                        padding-bottom: 10cqh;
                      `}>
                          <div
                            class='dark gap-2 font-bold text-white flex items-center rounded'
                            style={`background: hsla(var(--background) / .4);`}>
                            <Show
                              when={!card.detail?.name || !getCardImage(card)}
                              fallback={
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() =>
                                    setSearchParams({
                                      dialog: 'card-preview',
                                      src: getCardImage(card),
                                    })
                                  }>
                                  <SearchIcon />
                                </Button>
                              }>
                              <div class='pl-2'>{card.name}</div>
                            </Show>
                            <Show when={deckCard()?.qty > 0}>
                              <Button
                                size='icon'
                                variant='ghost'
                                type='button'
                                onClick={() => {
                                  let id = getCardKey(unwrap(card));
                                  if (deck.cards[id]) {
                                    return updateDeck('cards', id, 'qty', (qty = 1) =>
                                      Math.max(qty - 1, 0),
                                    );
                                  }
                                }}>
                                <SubIcon
                                  class='text-white'
                                  style='filter: drop-shadow(2px 4px 6px black);'
                                />
                              </Button>
                            </Show>
                            <Show when={deckCard()?.qty > 0}>{deckCard()?.qty}</Show>

                            <Button
                              size='icon'
                              variant='ghost'
                              type='button'
                              onClick={() => {
                                let id = getCardKey(unwrap(card));
                                if (deck.cards[id]) {
                                  return updateDeck('cards', id, 'qty', (qty = 1) => qty + 1);
                                }
                                updateDeck('cards', id, { ...unwrap(card), qty: 1 });
                              }}>
                              <AddIcon
                                class='text-white'
                                style='filter: drop-shadow(2px 4px 6px black);'
                              />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
              <div use:intersectionObserver={{ onIntersect: loadMoreResults }}>
                <Show when={searchParams.pages < searchParams.totalPages}>
                  Loading more results
                </Show>
              </div>
            </div>
          </div>
        </div>
      </form>

      <Portal>
        <Show when={searchParams.dialog === 'editor-confirm-close'}>
          <Dialog open onOpenChange={isOpen => !isOpen && closeCurrentDialog()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unsaved Changes</DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to close the deck editor?</p>
              <p>
                All <b>unsaved changes</b> will <b>be lost</b>
              </p>
              <DialogFooter>
                <Button variant='ghost' onclick={closeCurrentDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    closeCurrentDialog();
                    props.onClose();
                  }}>
                  Close Without Saving
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Show>
        <Show when={searchParams.dialog === 'editor-confirm-delete'}>
          <ConfirmDeleteDialog
            name={deck.name}
            onClose={closeCurrentDialog}
            onDelete={() => {
              closeCurrentDialog();
              props.onDelete();
              props.onClose();
            }}
          />
        </Show>
        <Show when={searchParams.dialog === 'card-preview'}>
          <AlertDialog open onOpenChange={isOpen => !isOpen && closeCurrentDialog()}>
            <AlertDialogContent>
              <AlertTitle />
              <img src={searchParams.src} />
            </AlertDialogContent>
          </AlertDialog>
        </Show>
      </Portal>
    </>
  );
};

function EmptyGridContainer() {
  return (
    <div class='p-8'>
      <Alert class='inline-block'>
        <AlertTitle>Welcome to the Deck Editor</AlertTitle>
        <AlertDescription>
          <p>
            If you already have a deck list you can paste it here, or drop the file in the window.
          </p>
          <p>Or start fresh by searching for cards above</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function ConfirmDeleteDialog(props: { name: string; onClose(): void; onDelete(): void }) {
  let [value, setValue] = createSignal('');

  return (
    <Dialog open onOpenChange={isOpen => !isOpen && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Deck?</DialogTitle>
        </DialogHeader>
        <p>
          Are you sure you want to delete <b>{props.name}</b>
        </p>
        <p>
          To delete deck <b>{props.name}</b> type it's name and click delete
        </p>
        <TextField value={value()} onChange={value => setValue(value)}>
          <TextFieldInput required type='text' />
        </TextField>

        <DialogFooter>
          <Button variant='ghost' onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            disabled={value()?.toLowerCase() !== props.name?.toLowerCase()}
            variant='destructive'
            onClick={props.onDelete}>
            Delete {props.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
