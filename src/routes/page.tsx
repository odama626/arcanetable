import { A, useNavigate } from '@solidjs/router';
import { nanoid } from 'nanoid';
import { createSignal, For, onMount } from 'solid-js';
import GithubIcon from '~/lib/icons/github.svg';
import PatreonIcon from '~/lib/icons/patreon.svg';
import DiscordIcon from '~/lib/icons/discord-brands-solid.svg';
import MetaTags from '~/lib/meta-tags';
import { SHORTCUTS, BATTLEFIELD_SHORTCUTS, OVERLAY_SHORTCUTS } from '~/lib/shortcuts/hotkeys-table';
import { Button } from '~/components/ui/button';
import { useCardSystemContext } from '~/lib/deckStore';

export default function Page(props) {
  const [startUrl, setStartUrl] = createSignal(`/game/${nanoid()}`);

  onMount(() => {
    setStartUrl(`/game/${nanoid()}`);
  });

  return (
    <div class='bg-gray-900 text-white font-sans'>
      <MetaTags />
      <div class='mx-auto flex flex-col'>
        <Hero startUrl={startUrl()} />
        <CardSystems startUrl={startUrl()} />
        <TheTable startUrl={startUrl()} />
        <Multiplayer />
        <DeckEditor />
        <WhyPosters />
        <FeaturesGrid />
        <KeyboardShortcuts />
        <GettingStartedVideo />
        <Sparkstone />
        <Footer />
      </div>
    </div>
  );
}
const posterStyle = `
  background-image: linear-gradient(transparent, transparent 65%, black), var(--image);
  background-size: cover;
  background-position: center;
  aspect-ratio: 2/3;
`;

function Hero(props: { startUrl: string }) {
  return (
    <header
      class='relative bg-cover bg-center bg-gray-800 rounded-lg'
      style="background-image: url('/hero.jpeg');">
      <div class='absolute inset-0 bg-black opacity-60'></div>
      <div class='relative flex items-center justify-between p-6'>
        <div class='flex items-center space-x-4'>
          <img src='/icon.svg' alt='Arcanetable' class='w-12 h-12' />
          <span class='text-xl font-bold text-white'>Arcanetable</span>
        </div>
        <nav class='space-x-4 flex'>
          <a href='https://discord.gg/wzdj2W9vvf' target='__blank' aria-label='Discord'>
            <DiscordIcon style='fill: currentColor;' class='h-8 w-8' />
          </a>
          <a href='https://github.com/odama626/arcanetable/' target='__blank' aria-label='GitHub'>
            <GithubIcon style='fill: currentColor;' class='h-8 w-8' />
          </a>
          <a href='https://patreon.com/arcanetable' target='__blank' aria-label='Patreon'>
            <PatreonIcon style='fill: currentColor' class='h-8 w-8' />
          </a>
        </nav>
      </div>
      <div class='relative flex flex-col items-center justify-center py-60 text-center'>
        <h1 class='text-4xl font-bold text-white mb-4'>Playtest your deck.</h1>
        <p class='text-xl text-gray-300 mb-8 max-w-md'>
          A 3D card table in your browser. No installs, no accounts. Just share a link and play.
        </p>
        <A
          href={props.startUrl}
          class='bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition'>
          Start Now
        </A>
      </div>
    </header>
  );
}

function CardSystems(props: { startUrl: string }) {
  const [_, { initCardSystem }] = useCardSystemContext();
  const navigate = useNavigate();
  const games = [
    {
      name: 'Magic: The Gathering',
      systemUri: `https://scr-server-mtg.arcanetable.app`,
      image: 'combo.jpeg',
      label: 'Play MTG',
    },
    {
      name: 'Pokémon',
      systemUri: `https://scry-server-pokemon.arcanetable.app`,
      image: 'anyone.jpeg',
      label: 'Play Pokémon',
    },
    {
      name: 'Yu-Gi-Oh',
      systemUri: `https://scry-server-yugioh.arcanetable.app`,
      image: 'own-cards.jpeg',
      label: 'Play Yu-Gi-Oh',
    },
  ];

  return (
    <section class='py-20 bg-gray-950 border-t border-gray-800'>
      <div class='max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-8'>
        <div class='text-center'>
          <h2 class='text-3xl font-bold text-white'>Pick your game</h2>
          <p class='text-gray-400 mt-3 max-w-xl mx-auto'>
            MTG, Pokémon, and Yu-Gi-Oh are ready to go. Click one to start a table right now.
          </p>
        </div>
        <div class='grid gap-6 lg:grid-cols-3'>
          <For each={games}>
            {game => (
              <button
                onClick={() => {
                  initCardSystem(game.systemUri);
                  navigate(props.startUrl);
                }}
                class='group relative rounded-xl overflow-hidden flex flex-col justify-end cursor-pointer'
                style={`${posterStyle}  --image: url('${game.image}'); min-height: 420px;`}>
                <div class='absolute inset-0 bg-black opacity-30 group-hover:opacity-20 transition' />
                <div class='relative py-6 px-3 flex items-end justify-between'>
                  <h3 class='text-2xl font-bold text-white'>{game.name}</h3>
                  <span class='bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg group-hover:bg-indigo-500 transition shrink-0 ml-4'>
                    {game.label}
                  </span>
                </div>
              </button>
            )}
          </For>
          <a
            target='_blank'
            href='https://github.com/odama626/arcanetable#-custom-card-systems'
            class='group relative rounded-xl overflow-hidden flex flex-col justify-end'
            style={`${posterStyle} aspect-ratio: initial; --image: url('${'own-cards.jpeg'}'); grid-column: 1/-1; min-height: 200px;`}>
            <div class='absolute inset-0 bg-black opacity-30 group-hover:opacity-20 transition' />
            <div class='relative py-6 px-3 flex items-end justify-between'>
              <h3 class='text-2xl font-bold text-white'>Bring your own game</h3>
              <span class='bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg group-hover:bg-indigo-500 transition shrink-0 ml-4'>
                Read the docs
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

function TheTable(props: { startUrl: string }) {
  return (
    <section class='py-20 bg-gray-900'>
      <div class='max-w-7xl mx-auto px-6 lg:px-8'>
        <div class='flex gap-12 max-lg:flex-col-reverse'>
          <div class='flex flex-col gap-6 justify-center' style='min-width: 50%;'>
            <h2 class='text-3xl font-bold'>A real table, in your browser</h2>
            <p class='text-gray-400'>
              Tap, flip, counter, exile, stack. Everything you'd do at a kitchen table, rendered in
              3D. Double-sided cards flip correctly. Tokens spawn from the right source. Counters
              track per-card and stay visible across the table.
            </p>
            <p class='text-gray-400'>
              Zone counts for hand, battlefield, graveyard, exile, and deck are always visible.
              Search your hand or battlefield mid-game. Select multiple cards at once and move them
              together.
            </p>
            <div>
              <a
                href={props.startUrl}
                class='inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition'>
                Try it now
              </a>
            </div>
          </div>
          <img
            src='/table.webp'
            alt='Arcanetable 3D card table'
            style='aspect-ratio: 1;'
            class='mx-auto rounded-lg object-cover min-w-0'
          />
        </div>
      </div>
    </section>
  );
}

function Multiplayer() {
  return (
    <section class='py-20 bg-gray-950 border-t border-gray-800'>
      <div class='max-w-7xl mx-auto px-6 lg:px-8'>
        <div class='flex gap-12 max-lg:flex-col'>
          <img
            src='/friend.webp'
            alt='Multiplayer game in progress'
            style='aspect-ratio: 1;'
            class='mx-auto rounded-lg object-cover min-w-0 max-lg:hidden'
          />
          <div class='flex flex-col gap-6 justify-center'>
            <h2 class='text-3xl font-bold'>Grab a friend. Share a link.</h2>
            <p class='text-gray-400'>
              Copy an invite link straight from the deck picker and send it. No account needed on
              either end. You're in the same game the moment they click it.
            </p>
            <p class='text-gray-400'>
              When you're done, concede and move to spectator, or wait for everyone else to finish.
              The table handles the transition automatically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckEditor() {
  return (
    <section class='py-20 bg-gray-900 border-t border-gray-800'>
      <div class='max-w-7xl mx-auto px-6 lg:px-8'>
        <div class='flex gap-12 max-lg:flex-col-reverse'>
          <div class='flex flex-col gap-6 justify-center' style='min-width: 50%;'>
            <h2 class='text-3xl font-bold'>Build and edit decks without leaving the app</h2>
            <p class='text-gray-400'>
              The deck editor is built in. Search for cards, adjust quantities, paste in a list, or
              download your list as a text file when you're done. No spreadsheet, no third-party
              site.
            </p>
            <p class='text-gray-400'>
              Search supports multiple terms separated by commas, and searches across card faces, so
              split cards and double-faced cards show up when you expect them to.
            </p>
          </div>
          <img
            src='/deck-builder.webp'
            alt='Deck editor'
            style='aspect-ratio: 1;'
            class='mx-auto rounded-lg object-cover min-w-0'
          />
        </div>
      </div>
    </section>
  );
}

function WhyPosters() {
  const posters = [
    {
      image: 'combo.jpeg',
      title: 'Does the combo actually go off?',
      body: 'Goldfish it in 3D and find out before you sleeve up.',
    },
    {
      image: 'anyone.jpeg',
      title: 'Playtest with anyone',
      body: "Send a link. They click it. You're at the same table.",
    },
    {
      image: 'own-cards.jpeg',
      title: 'Bring your own cards',
      body: 'Proxies, custom cubes, a completely different TCG. Point Arcanetable at your card server and go.',
    },
  ];

  return (
    <section class='py-16 bg-gray-950 border-t border-gray-800'>
      <div class='max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-8'>
        <div class='text-center'>
          <h2 class='text-3xl font-bold text-white'>Built for the way you actually play</h2>
          <p class='text-gray-400 mt-3 max-w-xl mx-auto'>
            No client to download. No account wall. Just a table, your deck, and whoever you want to
            play against.
          </p>
        </div>
        <div class='grid gap-8 lg:grid-cols-3'>
          <For each={posters}>
            {poster => (
              <div
                class='relative bg-gray-900 rounded-lg overflow-hidden flex items-end p-6'
                style={`${posterStyle} --image: url('${poster.image}');`}>
                <div class='absolute inset-0 bg-black opacity-10'></div>
                <div class='relative'>
                  <h3 class='text-2xl font-bold text-white'>{poster.title}</h3>
                  <p class='text-white mt-2'>{poster.body}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const features = [
    {
      title: 'Deck search',
      desc: 'Search your deck mid-game. Find the card you need without revealing your hand.',
      media: '/features/deck-search.webm', //null, // swap for gif: '/gifs/deck-search.gif'
    },
    {
      title: 'Multi-select',
      desc: 'Drag to select multiple cards at once. Move, tap, or exile a whole board state in one action.',
      media: '/features/multi-select.webm', // swap for gif: '/gifs/multi-select.gif'
    },
    {
      title: 'Counters',
      desc: 'Per-card counters always visible while a card is selected. Left-click to add, right-click to remove.',
      media: '/features/counters.webm',
    },
    {
      title: 'Tokens',
      desc: 'Spawn tokens from the right source. Cloned cards are tagged as tokens automatically.',
      media: '/features/tokens.webm',
    },
    {
      title: 'Double-sided cards',
      desc: 'Transform and flip correctly. Tapping a flipped card works in the right direction.',
      media: '/features/multi-sided.webm',
    },
    {
      title: 'Command palette',
      desc: 'Every action is a keystroke away. Open the command palette and search for anything without touching your mouse.',
      media: '/features/command.webm',
    },
  ];

  return (
    <section class='py-20 bg-gray-900 border-t border-gray-800'>
      <div class='max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-10'>
        <div class='text-center'>
          <h2 class='text-3xl font-bold text-white'>Everything you need at the table</h2>
          <p class='text-gray-400 mt-3 max-w-xl mx-auto'>
            The details that matter when you're actually playing.
          </p>
        </div>
        <div class='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          <For each={features}>
            {feature => (
              <div class='bg-gray-800 rounded-xl overflow-hidden flex flex-col'>
                {feature.media ? (
                  <video
                    autoplay
                    loop
                    muted
                    playsinline
                    src={feature.media}
                    class='w-full object-cover'
                    style='aspect-ratio: 16/9;'
                  />
                ) : (
                  <div
                    class='bg-gray-700 w-full flex items-center justify-center text-gray-500 text-sm'
                    style='aspect-ratio: 16/9;'>
                    gif coming soon
                  </div>
                )}
                <div class='p-5 flex flex-col gap-2'>
                  <h3 class='text-white font-semibold text-lg'>{feature.title}</h3>
                  <p class='text-gray-400 text-sm'>{feature.desc}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}

function KeyboardShortcuts() {
  const groups = [
    { group: 'General', shortcuts: SHORTCUTS },
    { group: 'Battlefield', shortcuts: BATTLEFIELD_SHORTCUTS },
    { group: 'Card search overlay', shortcuts: OVERLAY_SHORTCUTS },
  ];

  return (
    <section class='py-20 bg-gray-950 border-t border-gray-800'>
      <div class='max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-10'>
        <div class='text-center'>
          <h2 class='text-3xl font-bold text-white'>Keyboard shortcuts</h2>
          <p class='text-gray-400 mt-3 max-w-xl mx-auto'>
            Every common action is one key away. Or open the command palette and search for
            anything.
          </p>
        </div>
        <div class='grid gap-8 md:grid-cols-3'>
          <For each={groups}>
            {group => (
              <div class='flex flex-col gap-4'>
                <p class='text-gray-500 text-sm uppercase tracking-widest'>{group.group}</p>
                <div class='flex flex-col gap-2'>
                  <For each={group.shortcuts}>
                    {entry => (
                      <div class='flex items-center justify-between gap-4'>
                        <span class='text-gray-300 text-sm'>{entry.action}</span>
                        <div class='flex items-center gap-1 shrink-0'>
                          <For each={entry.shortcuts}>
                            {(keys, i) => (
                              <>
                                <kbd class='bg-gray-800 border border-gray-700 text-gray-300 text-xs px-2 py-1 rounded font-mono'>
                                  {keys.join(' ')}
                                </kbd>
                                {i() < entry.shortcuts.length - 1 && (
                                  <span class='text-gray-500 text-xs'>or</span>
                                )}
                              </>
                            )}
                          </For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}

function GettingStartedVideo() {
  return (
    <section class='py-20 bg-gray-900 border-t border-gray-800'>
      <div class='max-w-4xl mx-auto px-6 lg:px-8 flex flex-col gap-8'>
        <div class='text-center'>
          <h2 class='text-3xl font-bold text-white'>See it in action</h2>
          <p class='text-gray-400 mt-3'>
            Watch the getting started guide and be up and running in minutes.
          </p>
        </div>
        <div class='rounded-xl overflow-hidden' style='aspect-ratio: 16/9;'>
          <iframe
            width='100%'
            height='100%'
            src='https://www.youtube.com/embed/W-MgOhw-4vU'
            title='Arcanetable getting started'
            frameborder='0'
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            allowfullscreen
          />
        </div>
      </div>
    </section>
  );
}

function Sparkstone() {
  return (
    <section class='py-20 bg-gray-950 border-t border-gray-800'>
      <div class='max-w-4xl mx-auto px-6 text-center flex flex-col gap-6'>
        <h2 class='text-3xl font-bold text-white'>Built by Sparkstone</h2>
        <p class='text-gray-400 max-w-2xl mx-auto'>
          Arcanetable is an open source project from Sparkstone, a small independent studio building
          tools for people who take their hobbies seriously. If you want to follow along, report a
          bug, or contribute, the GitHub is always open.
        </p>
        <div class='flex justify-center gap-4 flex-wrap'>
          <a
            href='https://sparkstonepdx.com'
            target='_blank'
            rel='noopener noreferrer'
            class='inline-flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-xl border border-gray-700 hover:bg-gray-700 transition'>
            Visit Sparkstone →
          </a>
          <a
            href='https://github.com/odama626/arcanetable/'
            target='_blank'
            rel='noopener noreferrer'
            class='inline-flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-xl border border-gray-700 hover:bg-gray-700 transition'>
            GitHub →
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer class='py-12 bg-gray-800 text-center'>
      <p class='text-gray-400 mb-4'>
        Found a bug or want to help?{' '}
        <a
          href='https://github.com/odama626/arcanetable/'
          target='_blank'
          rel='noopener noreferrer'
          class='text-indigo-400 hover:text-indigo-300 underline'>
          Open an issue on GitHub
        </a>{' '}
        or{' '}
        <a
          href='https://discord.gg/wzdj2W9vvf'
          target='_blank'
          rel='noopener noreferrer'
          class='text-indigo-400 hover:text-indigo-300 underline'>
          join the Discord
        </a>
        .
      </p>
      <p class='text-gray-500 text-sm'>
        Built by{' '}
        <a
          href='https://sparkstonepdx.com'
          target='_blank'
          rel='noopener noreferrer'
          class='text-gray-300 hover:text-white underline'>
          Sparkstone
        </a>
      </p>
    </footer>
  );
}
