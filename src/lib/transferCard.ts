import { Card, CardZone } from './constants';
import { sendEvent } from './globals';

export async function transferCard<AddOptions>(
  card: Card,
  fromZone: CardZone<any>,
  toZone: CardZone<AddOptions>,
  addOptions?: AddOptions
) {
  await fromZone.removeCard?.(card.mesh);
  await toZone.addCard(card, addOptions);
  sendEvent({
    type: 'transferCard',
    payload: {
      userData: card.mesh.userData,
      fromZoneId: fromZone.id,
      toZoneId: toZone.id,
      addOptions,
    },
  });
}
