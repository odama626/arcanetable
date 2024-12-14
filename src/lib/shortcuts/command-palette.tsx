import { createSignal, onMount } from 'solid-js';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '~/components/ui/command';
import { PlayArea } from '../playArea';
import * as deckCommands from './commands/deck';
import { sendEvent } from '../globals';

export default function CommandPalette(props: { playArea: PlayArea }) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  let inputRef;
  let regexMap = new Map<string, RegExp>();

  function getRegex(value: string) {
    if (!regexMap.has(value)) {
      regexMap.set(value, new RegExp(value.slice(6)));
    }
    return regexMap.get(value);
  }

  onMount(() => {
    function listener(event) {
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        setIsOpen(open => !open);
        if (isOpen() && inputRef) {
          inputRef.focus();
        }
      }
    }
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  });

  function onFilter(value: string, search: string, keywords = []) {
    if (value.startsWith('regex:')) {
      const regex = getRegex(value);
      let matches = regex.test(search);
      if (matches) return 1;
    }

    let extendedSearch = [value, ...keywords].join('|');

    if (extendedSearch.toLowerCase().includes(search.toLowerCase().trim())) return 1;
    return 0;
  }

  function onValueChange(value, search) {
    console.log(value, search);
  }

  function onActionComplete() {
    setSearch('');
    setIsOpen(false);
  }

  function getRegexMatches(value: string) {
    let regex = new RegExp(value.slice(6), 'g');
    let matches = [];
    let match;
    while ((match = regex.exec(search()))) {
      matches.push(match.slice(1));
    }
    return matches;
  }

  return (
    <CommandDialog
      open={isOpen()}
      onOpenChange={setIsOpen}
      commandProps={{ filter: onFilter, onValueChange }}>
      <CommandInput
        value={search()}
        onValueChange={setSearch}
        ref={inputRef}
        placeholder='Type a command or search...'
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Deck'>
          <CommandItem
            onSelect={value => {
              const [countString] = getRegexMatches(value);
              let count = countString ? parseInt(countString, 10) : 1;
              deckCommands.drawCards(props.playArea, count);
              onActionComplete();
            }}
            keywords={['draw ']}
            value={'regex:draw\\s+(\\d+)'}>
            Draw [# of cards] from deck
          </CommandItem>
          <CommandItem
            onSelect={() => {
              deckCommands.searchDeck(props.playArea);
              onActionComplete();
            }}>
            Search Deck
          </CommandItem>
          <CommandItem
            value={'regex:(discard)\\s(\\d+)'}
            keywords={['discard']}
            onSelect={value => {
              const [[_, countString]] = getRegexMatches(value);
              let count = countString ? parseInt(countString, 10) : 1;
              deckCommands.discardFromTop(props.playArea, count);
              onActionComplete();
            }}>
            Discard [# of cards] from deck
          </CommandItem>
          <CommandItem
            keywords={['discard land']}
            onSelect={value => {
              deckCommands.discardFromTop(
                props.playArea,
                deckCommands.getNextLandIndex(props.playArea.deck.cards) + 1
              );
              onActionComplete();
            }}>
            Discard to next land from deck
          </CommandItem>
          <CommandItem
            value={'regex:exile\\s(\\d+)'}
            keywords={['exile ']}
            onSelect={value => {
              const [countString] = getRegexMatches(value);
              let count = countString ? parseInt(countString, 10) : 1;
              deckCommands.exileFromTop(props.playArea, count);
              onActionComplete();
            }}>
            Exile [# of cards] from deck
          </CommandItem>
          <CommandItem
            keywords={['exile land', 'exile to next land']}
            onSelect={value => {
              deckCommands.exileFromTop(
                props.playArea,
                deckCommands.getNextLandIndex(props.playArea.deck.cards) + 1
              );
              onActionComplete();
            }}>
            Exile to next land from deck
          </CommandItem>
          <CommandItem
            value={'regex:peek\\s(\\d+)'}
            keywords={['peek']}
            onSelect={value => {
              const [countString] = getRegexMatches(value);
              let count = countString ? parseInt(countString, 10) : 1;
              deckCommands.peekFromTop(props.playArea, count);
              onActionComplete();
            }}>
            Peek [# of cards] from deck
          </CommandItem>
          <CommandItem
            keywords={['peek all']}
            onSelect={value => {
              deckCommands.peekFromTop(props.playArea, props.playArea.deck.cards.length);
              onActionComplete();
            }}>
            Peek All from deck
          </CommandItem>
          <CommandItem
            value={'regex:reveal\\s(\\d+)'}
            keywords={['reveal']}
            onSelect={value => {
              const [countString] = getRegexMatches(value);
              let count = countString ? parseInt(countString, 10) : 1;
              deckCommands.revealFromTop(props.playArea, count);
              onActionComplete();
            }}>
            Reveal [# of cards] from deck
          </CommandItem>
          <CommandItem
            keywords={['reveal all']}
            onSelect={value => {
              deckCommands.revealFromTop(props.playArea, props.playArea.deck.cards.length);
              onActionComplete();
            }}>
            Reveal All from deck
          </CommandItem>
          <CommandItem
            value={'regex:mulligan\\s(\\d+)'}
            keywords={['mulligan']}
            onSelect={value => {
              const [countString] = getRegexMatches(value);
              let count = countString ? parseInt(countString, 10) : 7;
              props.playArea.mulligan(count);
              onActionComplete();
            }}>
            Mulligan [# of cards] from deck
          </CommandItem>
          <CommandItem
            onSelect={() => {
              props.playArea.shuffleDeck();
              onActionComplete();
            }}>
            Shuffle deck
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='hand'>
          
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Dice'>
          <CommandItem
            value={'regex:roll\\s(\\d*[dD]?\\d*\\s*)+'}
            onSelect={value => {
              const regex = /((\d+)[dD](\d+))/g;
              let matches = [];
              let match;
              while ((match = regex.exec(search()))) {
                matches.push(match.slice(1));
              }
              let roll = matches
                .map(match => {
                  let length = parseInt(match[1], 10);
                  let sides = parseInt(match[2], 10);
                  console.log({ length, sides });
                  return new Array(length).fill(0).map(() => ({
                    sides,
                    result: ((Math.random() * sides) | 0) + 1,
                  }));
                })
                .flat();

              sendEvent({ type: 'roll', payload: { roll } });
              onActionComplete();
            }}>
            Roll [1d6] [2d4]
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
