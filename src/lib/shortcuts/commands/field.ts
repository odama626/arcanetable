import { Mesh } from 'three';
import { PlayArea } from '~/lib/playArea';

export function untapAll(playArea: PlayArea) {
  let tappedCards = playArea.battlefieldZone.mesh.children.filter(
    mesh => mesh.userData.isTapped
  ) as Mesh[];

  tappedCards.forEach(card => playArea.tap(card));
}
