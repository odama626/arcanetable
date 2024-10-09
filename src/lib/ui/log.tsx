import { Component, createEffect, For, Show } from 'solid-js';
import style from './overlay.module.css';
import { cardsById, logs, players, zonesById } from '../globals';

const Log: Component = props => {
  createEffect(() => {
    console.log(logs);
  });
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

  if (
    previous.type === next.type &&
    !prevUserData.isPublic &&
    !nextUserData.isPublic &&
    prevUserData.location === nextUserData.location &&
    prevUserData.previousLocation === nextUserData.previousLocation
  )
    return true;
}

export function parseLogEntry(entry) {
  let card = cardsById.get(entry.payload?.userData?.id);
  let { userData, ...data } = entry?.payload || {};
  let cardReference = () => {
    if (userData?.isPublic) return card.detail.name;
    if (entry.count > 1) return `${entry.count} cards`;
    return 'a card';
  };

  console.log(entry);
  switch (entry.type) {
    case 'join':
      return 'Joined';
    case 'draw':
      console.log(entry);
      return `drew ${cardReference()}`;
    case 'transferCard': {
      let fromZone = zonesById.get(data.fromZoneId);
      let toZone = zonesById.get(data.toZoneId);

      console.log('entry public', { userData, isPublic: userData.isPublic });

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

    default:
      return `${entry.type} ${cardReference()}`;
  }
}

export default Log;
