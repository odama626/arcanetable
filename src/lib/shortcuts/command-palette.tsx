import hotkeys from 'hotkeys-js';
import { createSignal, onMount, Show } from 'solid-js';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '~/components/ui/command';
import style from './command-palette.module.css'

export default function CommandPalette(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  onMount(() => {
    hotkeys('ctrl+space', function (event, handler) {
      event.preventDefault();
      setIsOpen(open => !open);
    });
    return () => {
      hotkeys.unbind('ctrl+space');
    };
  });

  return (
    <Show when={isOpen()}>
      <Command class={style.container}>
        <CommandInput autofocus placeholder='Type a command or search...' />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading='Deck'>
            <CommandItem>Draw</CommandItem>
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
      </Command>
    </Show>
  );
}
