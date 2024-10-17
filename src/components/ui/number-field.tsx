import type { JSX, ValidComponent } from 'solid-js';
import { splitProps } from 'solid-js';

import * as NumberFieldPrimitive from '@kobalte/core/number-field';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';

import { cn } from '~/lib/utils';
import ChevronDownIcon from '~/lib/icons/chevron-down-solid.svg';
import ChevronUpIcon from '~/lib/icons/chevron-up-solid.svg';

const NumberField = NumberFieldPrimitive.Root;

type NumberFieldLabelProps<T extends ValidComponent = 'label'> =
  NumberFieldPrimitive.NumberFieldLabelProps<T> & {
    class?: string | undefined;
  };

const NumberFieldLabel = <T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, NumberFieldLabelProps<T>>
) => {
  const [local, others] = splitProps(props as NumberFieldLabelProps, ['class']);
  return (
    <NumberFieldPrimitive.Label
      class={cn(
        'leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        local.class
      )}
      {...others}
    />
  );
};

type NumberFieldInputProps<T extends ValidComponent = 'input'> =
  NumberFieldPrimitive.NumberFieldInputProps<T> & {
    class?: string | undefined;
  };

const NumberFieldInput = <T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, NumberFieldInputProps<T>>
) => {
  const [local, others] = splitProps(props as NumberFieldInputProps, ['class']);
  return (
    <NumberFieldPrimitive.Input
      class={cn(
        'flex h-10 w-full rounded-md border border-input mt-1 bg-transparent px-3 py-2 pr-7 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-error-foreground data-[invalid]:text-error-foreground',
        local.class
      )}
      {...others}
    />
  );
};

type NumberFieldIncrementTriggerProps<T extends ValidComponent = 'button'> =
  NumberFieldPrimitive.NumberFieldIncrementTriggerProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const NumberFieldIncrementTrigger = <T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, NumberFieldIncrementTriggerProps<T>>
) => {
  const [local, others] = splitProps(props as NumberFieldIncrementTriggerProps, [
    'class',
    'children',
  ]);
  return (
    <NumberFieldPrimitive.IncrementTrigger
      class={cn(
        'absolute opacity-50 right-3 top-1 inline-flex size-4 items-center justify-center',
        local.class
      )}
      {...others}>
      {local.children ?? <ChevronUpIcon />}
    </NumberFieldPrimitive.IncrementTrigger>
  );
};

type NumberFieldDecrementTriggerProps<T extends ValidComponent = 'button'> =
  NumberFieldPrimitive.NumberFieldDecrementTriggerProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const NumberFieldDecrementTrigger = <T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, NumberFieldDecrementTriggerProps<T>>
) => {
  const [local, others] = splitProps(props as NumberFieldDecrementTriggerProps, [
    'class',
    'children',
  ]);
  return (
    <NumberFieldPrimitive.DecrementTrigger
      class={cn(
        'absolute bottom-1 right-3 inline-flex size-4 items-center opacity-50 justify-center',
        local.class
      )}
      {...others}>
      {local.children ?? <ChevronDownIcon />}
    </NumberFieldPrimitive.DecrementTrigger>
  );
};

type NumberFieldDescriptionProps<T extends ValidComponent = 'div'> =
  NumberFieldPrimitive.NumberFieldDescriptionProps<T> & {
    class?: string | undefined;
  };

const NumberFieldDescription = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, NumberFieldDescriptionProps<T>>
) => {
  const [local, others] = splitProps(props as NumberFieldDescriptionProps, ['class']);
  return (
    <NumberFieldPrimitive.Description
      class={cn('text-sm text-muted-foreground', local.class)}
      {...others}
    />
  );
};

type NumberFieldErrorMessageProps<T extends ValidComponent = 'div'> =
  NumberFieldPrimitive.NumberFieldErrorMessageProps<T> & {
    class?: string | undefined;
  };

const NumberFieldErrorMessage = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, NumberFieldErrorMessageProps<T>>
) => {
  const [local, others] = splitProps(props as NumberFieldErrorMessageProps, ['class']);
  return (
    <NumberFieldPrimitive.ErrorMessage
      class={cn('text-sm text-error-foreground', local.class)}
      {...others}
    />
  );
};

export {
  NumberField,
  NumberFieldLabel,
  NumberFieldInput,
  NumberFieldIncrementTrigger,
  NumberFieldDecrementTrigger,
  NumberFieldDescription,
  NumberFieldErrorMessage,
};
