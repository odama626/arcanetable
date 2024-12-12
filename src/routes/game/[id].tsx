import { useBeforeLeave } from '@solidjs/router';
import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { cleanup, isInitialized, isSpectating, players, selectedDeckIndex, setSelectedDeckIndex } from '~/lib/globals';
import DeckPicker from '~/lib/ui/deckPicker';
import Overlay from '~/lib/ui/overlay';
import { loadDeckAndJoin, localInit } from '~/main3d';

const GamePage: Component = props => {
  const [inviteDismissed, setInviteDismissed] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  let url = new URL(document.location);
  url.pathname = props.location.pathname;
  url.searchParams.forEach((value, key) => {
    url.searchParams.delete(key);
  });

  onMount(() => {
    localInit({ gameId: props.params.gameId, deckIndex: selectedDeckIndex() });
  });

  useBeforeLeave(() => {
    cleanup();
  });

  onCleanup(() => {
    cleanup();
  });

  return (
    <>
      <Show when={isInitialized()}>
        <Overlay />
      </Show>
      <Show when={selectedDeckIndex() === undefined && !isSpectating()}>
        <DeckPicker
          onSelectDeck={settings => {
            setSelectedDeckIndex(settings.deckIndex);
            loadDeckAndJoin(settings);
          }}
        />
      </Show>
      <Show when={selectedDeckIndex() !== undefined && players().length < 2 && !inviteDismissed()}>
        <Dialog open onOpenChange={open => setInviteDismissed(!open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Friend</DialogTitle>
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
