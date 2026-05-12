import { createEffect, For, Show } from 'solid-js';
import { DetailedCardEntry } from '~/lib/constants';
import AddIcon from 'lucide-solid/icons/plus';
import SubIcon from 'lucide-solid/icons/minus';
import { capitalize } from 'lodash-es';

interface Props {
  entries: DetailedCardEntry[];
}

export default function CardList(props: Props) {
  const CARD_TYPES = ['structure', 'policy', 'trade lane', 'land'];

  console.log(props.entries);

  createEffect(() => {
    console.log(props.entries);
  });

  return (
    <div class='flex flex-col gap-1 overflow-y-auto'>
      <For each={CARD_TYPES}>
        {cardType => {
          let cardList = () => props.entries.filter(entry => filterByType(entry, cardType));
          console.log({ cardList: cardList(), cardType });
          return (
            <Show when={cardList().length > 0}>
              <h2 class='text-gray-400 flex gap-1 justify-between mt-2 pr-2'>
                <span>{capitalize(cardType)}</span>
                <span>{cardList().reduce((a, b) => a + b.qty, 0)}</span>
              </h2>
              <hr />

              <For each={cardList()}>
                {entry => (
                  <div class='flex gap-2'>
                    <span class='text-indigo-300 font-bold text-xl items-center'>{entry.qty}</span>
                    <span class='flex-grow'>{entry.name}</span>
                    <button class='cursor: pointer; p-1' type='button'>
                      <AddIcon class='text-gray-400' />
                    </button>
                    <button class='cursor: pointer; p-1' type='button'>
                      <SubIcon class='text-gray-400' />
                    </button>
                  </div>
                )}
              </For>
            </Show>
          );
        }}
      </For>
    </div>
  );
}

function filterByType(entry: DetailedCardEntry, type) {
  return entry?.detail?.type?.toLowerCase() === type;
}
