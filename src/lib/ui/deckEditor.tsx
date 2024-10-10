import { nanoid } from "nanoid";
import {
  Component,
  createEffect,
  createSignal,
  For,
  on,
  Setter,
  Show,
  splitProps,
} from "solid-js";
import { Button } from "~/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemLabel,
  ComboboxTrigger,
} from "~/components/ui/combobox";
import { DialogFooter } from "~/components/ui/dialog";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from "~/components/ui/text-field";
import { getCardArtImage, getCardImage } from "../card";
import { fetchCardInfo, loadCardList } from "../deck";
import styles from "./deckEditor.module.css";

type Deck = any;

interface Props {
  open: boolean;
  setOpen: Setter<boolean>;
  onChange(deck: Deck): void;
  onDelete(id: string): void;
  deck?: Deck;
}

export const DeckEditor: Component<Props> = (props) => {
  const [cardList, setCardList] = createSignal([]);
  const [cardsInPlay, setCardsInPlay] = createSignal(props?.deck?.inPlay ?? []);
  const [isCardsInPlayDirty, setIsCardsInPlayDirty] = createSignal(false);
  let isEditing = () => !!props?.deck?.id;
  let cache = new Map();

  function onCreateDeck(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    let cards = cardList();
    let inPlayCards = cardsInPlay();
    data.deck = cards.filter((card) => !inPlayCards.includes(card));
    data.inPlay = inPlayCards.map((card) => splitProps(card, "detail")[1]);

    let cardForArt =
      inPlayCards[0] ??
      cards.sort((a, b) => a.detail.edhrec_rank - b.detail.edhrec_rank)[0];

    data.coverImage = getCardArtImage(cardForArt);

    props.onChange(data);
    props.setOpen(false);
    e.currentTarget.reset();
  }

  createEffect(
    on(
      () => props.open,
      () => {
        if (!props.deck.cardList) {
          setCardList([]);
          setCardsInPlay([]);
          setIsCardsInPlayDirty(false);
          return;
        }
        if (props.deck.inPlay) {
          setCardsInPlay(props.deck.inPlay);
        }
        updateCardList(props.deck.cardList);
      },
    ),
  );

  async function updateCardList(cardList: string) {
    let newCardEntries = loadCardList(cardList);
    let newCardList = await Promise.all(
      newCardEntries.map((entry) => fetchCardInfo(entry, cache)),
    );
    setCardList(newCardList);

    if (!isCardsInPlayDirty() && !cardsInPlay().length) {
      setCardsInPlay(
        newCardList.filter(
          (card) =>
            card.categories?.filter((cat) => cat.startsWith("Commander"))
              .length,
        ),
      );
    }
  }

  return (
    <Show when={props.open}>
      <div class={styles.container}>
        <div class={styles.innerContainer}>
          <div class={styles.formContainer}>
            <form class="gap-5" onSubmit={onCreateDeck}>
              <input
                type="hidden"
                value={props?.deck?.id ?? nanoid()}
                name="id"
              />

              <TextField defaultValue={props?.deck?.name}>
                <TextFieldLabel for="name">Name</TextFieldLabel>
                <TextFieldInput required type="text" id="name" name="name" />
              </TextField>

              <TextField
                class="flex flex-col grow"
                defaultValue={props?.deck?.cardList}
              >
                <TextFieldLabel for="cardList">Card List</TextFieldLabel>
                <TextFieldTextArea
                  style="white-space: pre;"
                  class="grow"
                  onInput={(e) => {
                    updateCardList(e.currentTarget.value);
                  }}
                  required
                  id="cardList"
                  name="cardList"
                  placeholder="1x Sol Ring"
                />
                {/* <TextFieldDescription>
                  Card list or drag and drop .dek or text file
                </TextFieldDescription> */}
              </TextField>
              <h2>Start in play</h2>
              <Combobox
                multiple
                options={cardList()}
                value={cardsInPlay()}
                optionValue={(card) => {
                  return card.name;
                }}
                onChange={(value) => {
                  setCardsInPlay(value);
                  setIsCardsInPlayDirty(true);
                }}
                optionTextValue={(card) => {
                  return card.name;
                }}
                optionLabel={(card) => card.name}
                placeholder="Card in play"
                itemComponent={(props) => (
                  <ComboboxItem item={props.item}>
                    <ComboboxItemLabel>
                      {props.item.rawValue.name}
                    </ComboboxItemLabel>
                  </ComboboxItem>
                )}
              >
                <ComboboxControl>
                  {(state) => (
                    <>
                      <div class={styles.multiSelectControl}>
                        <For each={state.selectedOptions()}>
                          {(option) => (
                            <span
                              class={styles.multiSelectItem}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="secondary"
                                onClick={() => state.remove(option)}
                              >
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
                <ComboboxContent />
              </Combobox>
              <DialogFooter>
                <Show when={isEditing()}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      props.onDelete(props?.deck?.id);
                      props.setOpen(false);
                    }}
                  >
                    Delete Deck
                  </Button>
                </Show>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    props.setOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing() ? "Update Deck" : "Create Deck"}
                </Button>
              </DialogFooter>
            </form>
          </div>
          <div class={styles.cardListScrollContainer} aria-hidden="false">
            <div style="position: relative">
              <div class={styles.cardList}>
                <For each={cardList()}>
                  {(card) => <img crossOrigin="" src={getCardImage(card)} />}
                </For>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
