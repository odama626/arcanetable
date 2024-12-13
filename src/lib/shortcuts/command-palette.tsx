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
import { doXTimes } from '../globals';
import { PlayArea } from '../playArea';

export default function CommandPalette(props: { playArea: PlayArea }) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  let inputRef;
  let regexMap = new Map();

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

  function onFilter(value, search, keywords = []) {
    if (value.startsWith('regex:')) {
      const regex = getRegex(value);
      let matches = regex.test(search);
      console.log({ matches, regex });
      if (matches) return 1;
    }

    console.log({ value, search, includes: value.includes(search) });
    let extendedSearch = [value, ...keywords].join('|');

    if (extendedSearch.includes(search)) return 1;
    return 0;
  }

  function onValueChange(value, search) {
    console.log(value, search);
  }

  function onActionComplete() {
    setSearch('');
    setIsOpen(false);
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
              console.log('selected', value, search());
              let regex = getRegex(value);
              const matches = regex.exec(search());
              let count = parseInt(matches[1], 10);
              doXTimes(count, () => props.playArea.draw());
              onActionComplete();
            }}
            keywords={['draw ']}
            value={'regex:draw\\s+(\\d+)'}>
            Draw [number of cards]
          </CommandItem>
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Settings'>
          <CommandItem>Profile</CommandItem>
          <CommandItem>Billing</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
