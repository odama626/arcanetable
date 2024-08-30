import { useBeforeLeave } from '@solidjs/router';
import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import DeckPicker from '~/lib/ui/deckPicker';
import Overlay from '~/lib/ui/overlay';
import { animate, loadDeckAndJoin, localInit } from '~/main3d';
import { cleanup, players } from '~/lib/globals';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';

const GamePage: Component = props => {
  const [deckIndex, setDeckIndex] = createSignal(props.location.query.deck);
  const [inviteDismissed, setInviteDismissed] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  console.log({ props });
  let url = new URL(document.location);
  url.pathname = props.location.pathname
  url.searchParams.forEach((value, key) => {
    console.log({ key });
    url.searchParams.delete(key);
  });


  onMount(() => {
    localInit({ gameId: props.params.gameId, deckIndex: deckIndex() });
  });

  useBeforeLeave(() => {
    cleanup();
  });

  onCleanup(() => {
    cleanup();
  });

  return (
    <>
      <Overlay />
      <Show when={deckIndex() === undefined}>
        <DeckPicker
          onSelectDeck={index => {
            setDeckIndex(index);
            loadDeckAndJoin(index);
          }}
        />
      </Show>
      <Show when={deckIndex() !== undefined && players().length < 2 && !inviteDismissed()}>
        <Dialog open onOpenChange={open => setInviteDismissed(!open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite A Friend</DialogTitle>
            </DialogHeader>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(url.toString());
                setCopied(true);
                setTimeout(() => setCopied(false), 1000);
              }}>
              {copied() ? 'Copied!' : 'Copy Link'}
            </Button>
          </DialogContent>
        </Dialog>
      </Show>
    </>
  );
};

export default GamePage;
