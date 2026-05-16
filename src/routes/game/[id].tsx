import { useBeforeLeave, useSearchParams } from '@solidjs/router';
import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { hydrate } from 'solid-js/web';
import { Button } from '~/components/ui/button';
import CopyLinkButton from '~/components/ui/copy-link-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { getDeckStore, useCardSystemContext } from '~/lib/deckStore';
import {
  cleanup,
  isInitialized,
  isSpectating,
  players,
  selectedDeckId,
  setSelectedDeckId,
} from '~/lib/globals';
import { HotKeys } from '~/lib/shortcuts/hotkeys';
import StackTraceDialog from '~/lib/stack-trace-dialog';
import DeckPicker from '~/lib/ui/deckPicker';
import Overlay from '~/lib/ui/overlay';
import { loadDeckAndJoin, localInit } from '~/main3d';

const GamePage: Component = props => {
  const [inviteDismissed, setInviteDismissed] = createSignal(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cardSystemStore, { setCardSystem }] = useCardSystemContext();

  onMount(() => {
    localInit({ gameId: props.params.gameId });
  });

  onCleanup(() => {
    cleanup();
  });

  return (
    <>
      <Show when={isInitialized()}>
        <Overlay />
        <HotKeys />
      </Show>
      <Show when={!selectedDeckId() && !isSpectating()}>
        <DeckPicker
          onStart={async settings => {
            setSelectedDeckId(settings.deckId);
            const deckStore = getDeckStore();
            let deck = structuredClone(unwrap(deckStore.decks[settings.deckId]));
            const cardSystem = await setCardSystem(deck.system);
            setSearchParams({ system: cardSystem.uri }, { replace: true });

            settings.deck = deck;
            settings.cardSystem = cardSystem;
            loadDeckAndJoin(settings);
          }}
        />
      </Show>
      <Show when={selectedDeckId() && players().length < 2 && !inviteDismissed()}>
        <Dialog open onOpenChange={open => setInviteDismissed(!open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Friend</DialogTitle>
            </DialogHeader>
            <CopyLinkButton />
          </DialogContent>
        </Dialog>
      </Show>
      <StackTraceDialog />
    </>
  );
};

export default GamePage;
