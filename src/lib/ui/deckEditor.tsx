import { nanoid } from 'nanoid';
import { Component, createSignal, For, onMount, Show, splitProps } from 'solid-js';
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
import { DialogFooter } from '~/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '~/components/ui/hover-card';
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
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from '~/components/ui/text-field';
import { getCardArtImage, getCardImage } from '../card';
import { CardEntry, CardEntryDetail, DetailedCardEntry, FORMATS } from '../constants';
import { fetchCardInfo, loadCardList } from '../deck';
import { colorHashDark } from '../globals';
import CircleInfoIcon from 'lucide-solid/icons/info';
import { cn } from '../utils';
import styles from './deckEditor.module.css';

export interface Counter {
  id: string;
  name: string;
  color: string;
}

export interface Deck {
  id: string;
  deck: CardEntry[];
  inPlay: CardEntry[];
  tags?: {name: string}[];
  startingLife: string;
  name: string;
  cardList: string;
  coverImage?: string;
  counters?: Counter[];
}

function sortByPopularity(a: { detail: CardEntryDetail }, b: { detail: CardEntryDetail }) {
  return a.detail.popularity - b.detail.popularity;
}

interface Props {
  onClose(): void;
  onChange(deck: Deck): void;
  onDelete(id: string): void;
  deck: Deck;
}

let cache = new Map();

function stripDetail(card: DetailedCardEntry | CardEntry): CardEntry {
  if ('detail' in card) return splitProps(card, ['detail'])[1];
  return card;
}

export const DeckEditor: Component<Props> = props => {
  const [cardListText, setCardListText] = createSignal(props?.deck?.cardList ?? '');
  const [name, setName] = createSignal(props.deck?.name ?? '');
  const [cardList, setCardList] = createSignal<DetailedCardEntry[]>([]);
  const [cardsInPlay, setCardsInPlay] = createSignal<DetailedCardEntry[]>(
    props?.deck?.inPlay ?? [],
  );
  const [isCardsInPlayDirty, setIsCardsInPlayDirty] = createSignal(false);
  const [tags, setTags] = createSignal(props?.deck?.tags ?? []);
  let isEditing = () => !!props?.deck?.id;

  function onSaveDeck(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const deck = Object.fromEntries(formData.entries()) as unknown as Deck;

    let cards = cardList();
    let inPlayCards = cardsInPlay();

    deck.deck = cards.filter(card => !inPlayCards.includes(card)).map(stripDetail);
    deck.inPlay = inPlayCards.map(stripDetail);
    deck.tags = tags();

    let cardForArt = inPlayCards.sort(sortByPopularity)[0] ?? cards.sort(sortByPopularity)[0];

    deck.coverImage = getCardArtImage(cardForArt);

    console.log(deck);

    props.onChange(deck as Deck);
    props.onClose();
    e.currentTarget.reset();
  }

  onMount(() => {
    if (!props.deck?.cardList) {
      setName('');
      setCardListText('');
      setCardList([]);
      setTags([]);
      setCardsInPlay([]);
      setIsCardsInPlayDirty(false);
      return;
    }
    if (props.deck?.inPlay) {
      setCardsInPlay(props.deck.inPlay);
    }
    if (props.deck?.tags) {
      setTags(props.deck.tags);
    }
    setName(props.deck.name);
    updateCardList(props.deck.cardList);
  });

  async function updateCardList(cardListText: string) {
    setCardListText(cardListText);
    let newCardEntries = loadCardList(cardListText);
    console.log({ newCardEntries });
    let newCardList = await Promise.all(newCardEntries.map(entry => fetchCardInfo(entry, cache)));
    setCardList(newCardList);

    if (cardsInPlay().length) {
      let cards = await Promise.all(cardsInPlay().map(entry => fetchCardInfo(entry, cache)));
      setCardsInPlay(cards);
    }

    if (!isCardsInPlayDirty() && !cardsInPlay().length) {
      setCardsInPlay(
        newCardList.filter(
          card => card.categories?.filter(cat => cat.startsWith('Commander')).length,
        ),
      );
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer) return;
    let { files } = event.dataTransfer;
    if (files.length > 0) {
      let file = files[0];
      let name = file.name.slice(0, file.name.lastIndexOf('.')).replace(/^Deck\s\-\s/, '');
      setName(name);
      file.text().then(result => {
        updateCardList(result);
      });
    }
  }

  return (
    <div class={styles.container}>
      <div class={styles.innerContainer}>
        <div class={styles.formContainer}>
          <form class='gap-5' onSubmit={onSaveDeck} onDrop={handleDrop}>
            <input type='hidden' value={props?.deck?.id ?? nanoid()} name='id' />

            <TextField value={name()} onChange={name => setName(name)}>
              <TextFieldLabel for='name'>Name</TextFieldLabel>
              <TextFieldInput required type='text' id='name' name='name' placeholder='deck name' />
            </TextField>

            <NumberField defaultValue={props?.deck?.startingLife || '40'}>
              <NumberFieldLabel for='startingLife'>Starting Life Total</NumberFieldLabel>
              <div class='relative'>
                <NumberFieldInput required id='startingLife' name='startingLife' />
                <NumberFieldIncrementTrigger />
                <NumberFieldDecrementTrigger />
              </div>
            </NumberField>

            <TextField
              class='flex flex-col grow gap-1'
              defaultValue={props?.deck?.cardList}
              value={cardListText()}>
              <div class='flex flex-row flex-start items-end gap-2'>
                <div>
                  <TextFieldLabel for='cardList'>Card List</TextFieldLabel>
                  <TextFieldDescription>
                    Supports text based decklist formats and drag and drop
                  </TextFieldDescription>
                </div>
                <HoverCard openDelay={100}>
                  <HoverCardTrigger>
                    <CircleInfoIcon class='text-sky-500 hover:text-sky-400' />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <p>Supported cardlist formats:</p>
                    <ul class='list-disc list-inside'>
                      <li>Archidekt</li>
                      <li>MTG Goldfish</li>
                      <li>mtg.wtf</li>
                      <li>MTGO</li>
                      <li>Text</li>
                    </ul>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <TextFieldTextArea
                style='white-space: pre;'
                class='grow'
                onInput={e => {
                  updateCardList(e.currentTarget.value);
                }}
                required
                id='cardList'
                name='cardList'
                placeholder='1x Sol Ring'
              />
            </TextField>
            <div>
              <label class={cn(labelVariants())}>Start in play</label>
              <Combobox
                multiple
                options={cardList()}
                value={cardsInPlay()}
                optionValue={card => {
                  return card.name;
                }}
                onChange={value => {
                  setCardsInPlay(value);
                  setIsCardsInPlayDirty(true);
                }}
                optionTextValue={(card: DetailedC)=> {
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
            <div>
              <label class={cn(labelVariants())}>Deck Tags</label>
              <Combobox
                multiple
                triggerMode='focus'
                options={FORMATS}
                onChange={value => setTags(value)}
                value={tags()}
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
            <DialogFooter>
              <Show when={isEditing()}>
                <Button
                  variant='secondary'
                  onClick={() => {
                    props.onDelete(props?.deck?.id);
                    props.onClose();
                  }}>
                  Delete Deck
                </Button>
              </Show>
              <Button variant='secondary' type='button' onClick={props.onClose}>
                Cancel
              </Button>
              <Button type='submit'>{isEditing() ? 'Update Deck' : 'Create Deck'}</Button>
            </DialogFooter>
          </form>
        </div>
        <div class={styles.cardListScrollContainer} aria-hidden='false'>
          <div style='position: relative'>
            <div class={styles.cardList}>
              <For each={cardList()}>
                {card => (
                  <div style='position: relative;'>
                    <img crossOrigin='' src={getCardImage(card)} />
                    <div
                      class='text-xl font-bold rounded-md px-4 py-1'
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        'background-color': 'black',
                        color: 'white',
                      }}>
                      {card.qty ?? 1}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
