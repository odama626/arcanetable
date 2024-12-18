import { Component, For, Show } from 'solid-js';
import { cardsById, logs, players, zonesById } from '../globals';
import style from './overlay.module.css';

const Log: Component = props => {
  return (
    <div class={`${style.log} bg-slate-800 text-white p-4 bg-opacity-75`}>
      <For each={logs}>
        {log => {
          let player = players().find(p => p.id === log.clientID);
          let text = parseLogEntry(log);
          return (
            <Show when={text}>
              <p>
                {player.entry.name} {text}
              </p>
            </Show>
          );
        }}
      </For>
      <div class={style.anchor} />
    </div>
  );
};

export function isLogMessageStackable(previous, next) {
  if (!previous) return false;
  if (previous.clientID !== next.clientID) return false;
  let prevUserData = previous.payload?.userData;
  let nextUserData = next.payload?.userData;
  if (!prevUserData || !nextUserData) return false;
  if (next.type === 'reveal') return false;

  let isCardNameVisible = userData => userData.isPublic || userData.wasPublic;

  if (
    previous.type === next.type &&
    !isCardNameVisible(prevUserData) &&
    !isCardNameVisible(next) &&
    prevUserData.location === nextUserData.location &&
    prevUserData.previousLocation === nextUserData.previousLocation
  )
    return true;
}

export function parseLogEntry(entry) {
  let card = cardsById.get(entry.payload?.userData?.id);
  let { userData, ...data } = entry?.payload || {};
  let cardReference = () => {
    if (userData?.isPublic || userData?.wasPublic) return card?.detail?.name;
    if (entry.count > 1) return `${entry.count} cards`;
    return 'a card';
  };

  switch (entry.type) {
    case 'join':
      return 'Joined';
    case 'transferCard': {
      let fromZone = zonesById.get(data.fromZoneId);
      let toZone = zonesById.get(data.toZoneId);
      let destination = toZone.zone;
      if (
        toZone?.mesh.userData.zone === 'deck' &&
        entry.extendedOptions?.addOptions?.location === 'bottom'
      )
        destination = `Bottom of ${destination}`;

      return (
        <>
          moved <strong>{cardReference()}</strong> from{' '}
          <strong>{fromZone?.mesh.userData.zone}</strong> to <strong>{destination}</strong>
        </>
      );
    }
    case 'concede':
      return 'conceded';
    case 'animateObject':
      return null;
    case 'tap':
      return `${userData.isTapped ? 'tapped' : 'untapped'} ${card?.detail.name}`;
    case 'shuffleDeck':
      return 'shuffled';
    case 'mulligan':
      return `mulliganed and drew ${entry.payload.drawCount} cards`;
    case 'createCounter':
      return null;
    case 'reveal':
      return (
        <>
          revealed <strong>{card?.detail.name}</strong>
        </>
      );
    case 'roll':
      console.log(entry.payload);
      return (
        <>
          rolled{' '}
          <For each={entry.payload.roll}>
            {die => (
              <>
                [d{die.sides}] <strong>{die.result}</strong>{' '}
              </>
            )}
          </For>
          Total: <strong>{entry.payload.roll.reduce((a, b) => a + b.result, 0)}</strong>
        </>
      );

    default:
      return `${entry.type} ${cardReference()}`;
  }
}

export default Log;
