import { Accessor, onCleanup } from 'solid-js';

interface Opts {
  rootMargin?: string;
  threshold?: number | number[];
  onIntersect(entry: IntersectionObserverEntry): void;
}

export default function intersectionObserver(element: HTMLElement, opts: Accessor<Opts>) {
  const { rootMargin, threshold, onIntersect } = opts();

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onIntersect(entry);
        }
      });
    },
    {
      threshold,
      rootMargin,
    },
  );

  observer.observe(element);
  onCleanup(() => {
    observer.disconnect();
  });
}
