import { useLocation } from '@solidjs/router';
import { createSignal } from 'solid-js';
import { Button, ButtonProps } from './button';
import { PolymorphicProps } from '@kobalte/core/polymorphic';

export default function CopyLinkButton<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, ButtonProps<T>>,
) {
  const location = useLocation();
  const [copied, setCopied] = createSignal(false);

  let url = new URL(document.location);
  url.pathname = location.pathname;
  url.searchParams.forEach((value, key) => {
    url.searchParams.delete(key);
  });
  return (
    <Button
      {...props}
      onClick={() => {
        navigator.clipboard.writeText(url.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      }}>
      {copied() ? 'Copied!' : 'Copy Invite Link'}
    </Button>
  );
}
