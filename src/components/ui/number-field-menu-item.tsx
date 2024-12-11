import CheckIcon from 'lucide-solid/icons/check';
import { Button } from './button';
import { MenubarItem } from './menubar';
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
  NumberFieldIncrementTrigger,
  NumberFieldDecrementTrigger,
} from './number-field';
import { createSignal } from 'solid-js';

interface Props {
  defaultValue?: number;
  onSubmit(value: number): void;
}

export default function NumberFieldMenuItem(props: Props) {
  const [value, setValue] = createSignal(props.defaultValue?.toString() ?? '1');

  function onSubmit(e) {
    e.preventDefault();
    let parsedValue = parseInt(value().replace(/\,/g, ''), 10);
    props.onSubmit(parsedValue);
  }

  return (
    <MenubarItem closeOnSelect={false}>
      <form onSubmit={onSubmit} class='flex gap-2'>
        <NumberField value={value()} onChange={setValue}>
          <NumberFieldGroup>
            <NumberFieldInput />
            <NumberFieldIncrementTrigger />
            <NumberFieldDecrementTrigger />
          </NumberFieldGroup>
        </NumberField>
        <Button type='submit' variant='ghost' size='icon'>
          <CheckIcon />
        </Button>
      </form>
    </MenubarItem>
  );
}
