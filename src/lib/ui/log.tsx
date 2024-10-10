import { Component, For, Show } from 'solid-js';
import { cardsById, logs, players, zonesById } from '../globals';
import style from './overlay.module.css';

const Log: Component = props => {
  return (
    <div class={`${style.log} bg-slate-800 text-white p-4 bg-opacity-75`}>
      <For each={logs}>
        {log => {
          let player = players().find(p => p.id === log.clientID);
          let text = () => parseLogEntry(log);
          return (
            <Show when={text()}>
              <p>
                {player.entry.name} {text()}
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
  if (previous.type === 'draw' && next.type === 'draw') return true;
  let prevUserData = previous.payload?.userData;
  let nextUserData = next.payload?.userData;
  if (!prevUserData || !nextUserData) return false;

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
    if (userData?.isPublic || userData?.wasPublic) return card.detail.name;
    if (entry.count > 1) return `${entry.count} cards`;
    return 'a card';
  };

  console.log({ entry, card });

  switch (entry.type) {
    case 'join':
      return 'Joined';
    case 'draw':
      return `drew ${cardReference()}`;
    case 'transferCard': {
      let fromZone = zonesById.get(data.fromZoneId);
      let toZone = zonesById.get(data.toZoneId);

      return (
        <>
          moved <strong>{cardReference()}</strong> from{' '}
          <strong>{fromZone?.mesh.userData.zone}</strong> to{' '}
          <strong>{toZone?.mesh.userData.zone}</strong>
        </>
      );
    }
    case 'peek': {
      return (
        <>
          peeked at <strong>{cardReference()}</strong> from{' '}
          <strong>{userData?.previousLocation}</strong>
        </>
      );
    }
    case 'animateObject':
    case 'removeFromHand':
      return null;
    case 'tap':
      return `${userData.isTapped ? 'tapped' : 'untapped'} ${card.detail.name}`;
    case 'addToHand':
    case 'destroy':
    case 'exileCard':
    case 'addToBattlefield':
      return (
        <>
          moved <strong>{cardReference()}</strong> from <strong>{userData.previousLocation}</strong>{' '}
          to <strong>{userData.location}</strong>
        </>
      );
    case 'addCardBottomDeck':
      return (
        <>
          moved <strong>{cardReference()}</strong> from <strong>{userData.previousLocation}</strong>{' '}
          to <strong>Bottom of {userData.location}</strong>
        </>
      );
    case 'shuffleDeck':
      return 'shuffled';
    case 'mulligan':
      return `mulliganed and drew ${entry.payload.drawCount} cards`;
    case 'createCounter':
      return null;

    default:
      return `${entry.type} ${cardReference()}`;
  }
}

export default Log;
