import { Card, CardZone } from './constants';
import { sendEvent } from './globals';

export async function transferCard<AddOptions>(
  card: Card,
  fromZone: CardZone<any>,
  toZone: CardZone<AddOptions>,
  addOptions?: AddOptions,
  cardUserData?: any
) {
  await fromZone.removeCard?.(card.mesh);
  if (card.mesh.userData.isToken) {
    if (toZone.zone !== 'battlefield') {
      addOptions.destroy = true;
    }
  }

  if (cardUserData) {
    Object.assign(card.mesh.userData, cardUserData);
  }
  await toZone.addCard(card, addOptions);

  sendEvent({
    type: 'transferCard',
    payload: {
      userData: card.mesh.userData,
      fromZoneId: fromZone.id,
      toZoneId: toZone.id,
      addOptions,
      cardUserData,
    },
  });
}
