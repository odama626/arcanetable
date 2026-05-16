import { createEffect, createMemo, For, Show } from 'solid-js';
import { DetailedCardEntry } from '~/lib/constants';
import AddIcon from 'lucide-solid/icons/plus';
import SubIcon from 'lucide-solid/icons/minus';
import { capitalize } from 'lodash-es';
import { Button } from '~/components/ui/button';
import { cardSystem } from '~/lib/globals';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '~/components/ui/hover-card';
import { getCardImage } from '~/lib/card';

interface Props {
  entries: DetailedCardEntry[];
  addCard(entry: DetailedCardEntry): void;
  removeCard(entry: DetailedCardEntry): void;
}

interface GroupedEntry {
  name: string;
  items: DetailedCardEntry[];
  count: number;
}

interface Grouped {
  types: Record<string, GroupedEntry>;
  unsorted: GroupedEntry;
  totalCount: number;
}

export default function CardList(props: Props) {
  const lowerTypes = createMemo(() => cardSystem.types.map(type => type.toLowerCase()));

  const grouped = createMemo(() => {
    const types = lowerTypes().map(t => [t, { items: [], name: capitalize(t), count: 0 }]);
    const result = {
      types: Object.fromEntries(types),
      unsorted: {
        name: 'Unsorted',
        items: [],
        count: 0,
      },
      totalCount: 0,
    } as Grouped;

    for (const entry of props.entries) {
      const simpleType = getSimpleType(entry);
      const type = lowerTypes().find(type => simpleType?.endsWith(type));
      if (type) {
        result.types[type].items.push(entry);
        result.types[type].count += entry.qty;
      } else {
        result.unsorted.items.push(entry);
        result.unsorted.count += entry.qty;
      }
      result.totalCount += entry.qty;
    }

    return result;
  });

  return (
    <>
      <div class='flex flex-col gap-1 overflow-y-auto slim-scroll'>
        <For each={lowerTypes()}>
          {cardType => {
            let group = () => grouped().types[cardType];
            return (
              <Show when={group().count > 0}>
                <h2 class='text-muted-foreground flex gap-1 justify-between mt-4 px-4'>
                  <span>{capitalize(cardType)}</span>
                  <span class='pr-4'>{group().count}</span>
                </h2>
                <hr class='mx-4' />

                <For each={group().items}>
                  {entry => (
                    <CardEntry
                      entry={entry}
                      addCard={() => props.addCard(entry)}
                      removeCard={() => props.removeCard(entry)}
                    />
                  )}
                </For>
              </Show>
            );
          }}
        </For>
        <Show when={grouped().unsorted.count > 0}>
          <h2 class='text-muted-foreground flex gap-1 justify-between mt-4 px-4'>
            <span class='pr-4'>Unsorted</span>
            <span>{grouped().unsorted.count}</span>
          </h2>
          <hr />

          <For each={grouped().unsorted.items}>
            {entry => (
              <CardEntry
                entry={entry}
                addCard={() => props.addCard(entry)}
                removeCard={() => props.removeCard(entry)}
              />
            )}
          </For>
        </Show>
      </div>
      <hr class='mx-4 mt-auto' />
      <div class='flex flex-wrap gap-2 px-4 mt-4'>
        <div class='flex gap-1 border-1 px-2 py-1 rounded'>
          <span>Total</span>
          <span>{grouped().totalCount}</span>
        </div>
        <For each={lowerTypes()}>
          {cardType => (
            <Show when={grouped().types[cardType].count > 0}>
              <div class='flex gap-1 border-1 px-2 py-1 rounded'>
                <span>{capitalize(cardType)}</span>
                <span>{grouped().types[cardType].count}</span>
              </div>
            </Show>
          )}
        </For>
      </div>
    </>
  );
}

function CardEntry(props: { entry: DetailedCardEntry; addCard(): void; removeCard(): void }) {
  return (
    <HoverCard placement='right'>
      <HoverCardTrigger>
        <div class='flex gap-2 items-center px-4 hover:bg-accent'>
          <span class='text-primary font-bold text-xl items-center'>{props.entry.qty}</span>
          <span class='truncate grow align-center'>{props.entry.name}</span>
          <Button size='sm' variant='ghost' type='button' onClick={props.removeCard}>
            <SubIcon class='text-muted-foreground' />
          </Button>
          <Button size='sm' variant='ghost' type='button' onClick={props.addCard}>
            <AddIcon class='text-muted-foreground' />
          </Button>
        </div>
      </HoverCardTrigger>
      <HoverCardContent class='w-128 fade-in'>
        <img src={getCardImage(props.entry)} />
      </HoverCardContent>
    </HoverCard>
  );
}

function getSimpleType(entry: DetailedCardEntry) {
  return entry?.detail?.type?.toLowerCase()?.split('—')?.[0]?.trim();
}
