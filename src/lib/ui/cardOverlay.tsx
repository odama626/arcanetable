import { Match } from 'solid-js';
import { Switch } from 'solid-js';
import { PlayArea } from '../playArea';
import { Mesh } from 'three';
import { cardsById } from '../globals';
import { Menubar, MenubarItem, MenubarMenu } from '~/components/ui/menubar';
import CardBattlefieldMenu from './cardBattlefieldMenu';
import DeckMenu from './deckMenu';
import MoveMenu from './moveMenu';

interface Props {
  playArea: PlayArea;
  cardMesh: Mesh;
}

export default function CardOverlay(props: Props) {
  const userData = () => props.cardMesh?.userData;
  const getCard = () => {
    const card = cardsById.get(userData().id);
    if (!card) console.error(`card not in cardsById map`, JSON.stringify(userData()));
    return card;
  };

  return (
    <Switch>
      <Match when={userData()?.location === 'deck'}>
        <DeckMenu playArea={props.playArea} />
      </Match>
      <Match when={userData()?.location === 'battlefield'}>
        <CardBattlefieldMenu playArea={props.playArea} cardMesh={props.cardMesh} />
      </Match>
      <Match when={userData()?.location === 'hand'}>
        <Menubar class='flex-col' style='height: auto; margin-left: -10px;'>
          <MenubarMenu>
            <MenubarItem
              onClick={() => {
                props.playArea.reveal(getCard());
              }}>
              Reveal
            </MenubarItem>
            <MoveMenu
              text='Move To'
              cards={[getCard()]}
              playArea={props.playArea}
              fromZone={props.playArea.hand}
            />
          </MenubarMenu>
        </Menubar>
      </Match>
      <Match when={userData()?.location === 'graveyard'}>
        <div
          class='flex-col bg-card px-3 py-2 rounded-sm'
          style='height: auto; margin-left: -10px;'>
          graveyard | {props.playArea.graveyardZone.observable.cardCount} cards
        </div>
      </Match>
      <Match when={userData()?.location === 'exile'}>
        <div
          class='flex-col bg-card px-3 py-2 rounded-sm'
          style='height: auto; margin-left: -10px;'>
          exile | {props.playArea.exileZone.observable.cardCount} cards
        </div>
      </Match>
    </Switch>
  );
}
