import { createSignal } from 'solid-js';
import { Button, ButtonProps } from './button';
import { PolymorphicProps } from '@kobalte/core/polymorphic';

export default function CopyLinkButton<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, ButtonProps<T>>,
) {
  const [copied, setCopied] = createSignal(false);

  return (
    <Button
      {...props}
      onClick={() => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      }}>
      {copied() ? 'Copied!' : 'Copy Invite Link'}
    </Button>
  );
}
