import { updateModifiers } from './card';
import { Card, CardZone } from './constants';
import { cardsById, sendEvent } from './globals';

export async function transferCard<AddOptions extends {}>(
  card: Card,
  fromZone: CardZone<any>,
  toZone?: CardZone<AddOptions>,
  addOptions: AddOptions = {} as AddOptions,
  cardUserData?: any,
  preventTransmit?: boolean
) {
  await fromZone.removeCard?.(card.mesh);
  if (toZone?.zone !== 'battlefield') {
    if (card.mesh.userData.isToken) {
      addOptions.destroy = true;
    }
    card.mesh.userData.modifiers = undefined;
    updateModifiers(card);
  }
  if (cardUserData) {
    Object.assign(card.mesh.userData, cardUserData);
  }

  if (!toZone) {
    card.mesh.geometry.dispose();
    cardsById.delete(card.id);
  } else {
    await toZone.addCard(card, addOptions);
  }

  if (!preventTransmit) {
    sendEvent({
      type: 'transferCard',
      payload: {
        userData: card.mesh.userData,
        fromZoneId: fromZone.id,
        toZoneId: toZone?.id,
        addOptions,
        cardUserData,
      },
    });
  }
}
