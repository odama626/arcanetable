import { updateModifiers } from './card';
import { Card, CardZone } from './constants';
import { sendEvent } from './globals';

export async function transferCard<AddOptions>(
  card: Card,
  fromZone: CardZone<any>,
  toZone: CardZone<AddOptions>,
  addOptions?: AddOptions,
  cardUserData?: any,
  isRemote?: boolean
) {
  await fromZone.removeCard?.(card.mesh);
  if (toZone.zone !== 'battlefield') {
    if (card.mesh.userData.isToken) {
      addOptions.destroy = true;
    }
    card.mesh.userData.modifiers = undefined;
    updateModifiers(card);
  }
  if (cardUserData) {
    Object.assign(card.mesh.userData, cardUserData);
  }
  await toZone.addCard(card, addOptions);

  if (!isRemote) {
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
}
