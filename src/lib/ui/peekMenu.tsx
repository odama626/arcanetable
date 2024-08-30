import { Component, Show } from 'solid-js';
import { Command, CommandInput } from '~/components/ui/command';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '~/components/ui/menubar';
import {
  cardsById,
  hoverSignal,
  playAreas,
  provider,
  setHoverSignal,
  setPeekFilterText,
} from '../globals';
import styles from './peekMenu.module.css';

const PeekMenu: Component = props => {
  let userData = () => hoverSignal()?.mesh?.userData;
  const isPublic = () => userData()?.isPublic;
  const isOwner = () => userData()?.clientId === provider.awareness.clientID;
  const location = () => userData()?.location;
  const cardMesh = () => hoverSignal()?.mesh;
  const tether = () => hoverSignal()?.tether;
  const playArea = () => playAreas.get(provider.awareness.clientID)!;

  return (
    <>
      <Show when={location() === 'peek' && isOwner()}>
        <Show when={tether()}>
          <div class={styles.peekActions} style={`--x: ${tether().x}px; --y: ${tether().y}px;`}>
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>Draw</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem
                    onClick={() => {
                      let card = cardsById.get(cardMesh().userData.id);
                      playArea().peekZone.removeCard(cardMesh());
                      playArea().addToHand(card);
                      playArea().reveal(card);
                      if (!playArea().peekZone.cards.length) {
                        setHoverSignal();
                      }
                    }}>
                    After Revealing
                  </MenubarItem>
                  <MenubarItem
                    onClick={() => {
                      let card = cardsById.get(cardMesh().userData.id);
                      playArea().peekZone.removeCard(cardMesh());
                      playArea().addToHand(card);
                      if (!playArea().peekZone.cards.length) {
                        setHoverSignal();
                      }
                    }}>
                    Without Revealing
                  </MenubarItem>
                </MenubarContent>
                <MenubarItem
                  onClick={() => {
                    playArea().peekZone.removeCard(cardMesh());
                    playArea().destroy(cardMesh());
                    if (!playArea().peekZone.cards.length) {
                      setHoverSignal();
                    }
                  }}>
                  Discard
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    playArea().peekZone.removeCard(cardMesh());
                    playArea().exileCard(cardMesh());
                    if (!playArea().peekZone.cards.length) {
                      setHoverSignal();
                    }
                  }}>
                  Exile
                </MenubarItem>
                <MenubarMenu overlap>
                  <MenubarTrigger>Deck</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem
                      onClick={() => {
                        let card = cardsById.get(cardMesh().userData.id);
                        playArea().peekZone.removeCard(cardMesh());
                        playArea().addCardTopDeck(card);
                        if (!playArea().peekZone.cards.length) {
                          setHoverSignal();
                        }
                      }}>
                      Put on Top
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => {
                        let card = cardsById.get(cardMesh().userData.id);
                        playArea().peekZone.removeCard(cardMesh());
                        playArea().addCardBottomDeck(card);
                        if (!playArea().peekZone.cards.length) {
                          setHoverSignal();
                        }
                      }}>
                      Put on Bottom
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </MenubarMenu>
            </Menubar>
          </div>
        </Show>
        <div class={styles.search}>
          <Command>
            <CommandInput
              placeholder='Search'
              onValueChange={value => {
                setPeekFilterText(value);
              }}
            />
            <Menubar>
              <MenubarMenu>
                <MenubarItem
                  onClick={async () => {
                    function doOne() {
                      let card = playArea().peekZone.cards[0];
                      playArea().peekZone.removeCard(card.mesh);
                      playArea().addCardBottomDeck(card);
                      if (playArea().peekZone.cards.length) {
                        setTimeout(doOne, 50);
                      } else {
                        setTimeout(() => playArea().shuffleDeck(), 100);
                      }
                    }
                    doOne();
                    setHoverSignal();
                  }}>
                  Shuffle
                </MenubarItem>
                <MenubarTrigger>Draw All</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem
                    onClick={() => {
                      function doOne() {
                        let card = playArea().peekZone.cards[0];
                        playArea().peekZone.removeCard(card.mesh);
                        playArea().addToHand(card);
                        playArea().reveal(card);
                        if (playArea().peekZone.cards.length) {
                          setTimeout(doOne, 50);
                        }
                      }
                      doOne();
                      setHoverSignal();
                    }}>
                    After Revealing
                  </MenubarItem>
                  <MenubarItem
                    onClick={() => {
                      function doOne() {
                        let card = playArea().peekZone.cards[0];
                        playArea().peekZone.removeCard(card.mesh);
                        playArea().addToHand(card);
                        if (playArea().peekZone.cards.length) {
                          setTimeout(doOne, 50);
                        }
                      }
                      doOne();
                      setHoverSignal();
                    }}>
                    Without Revealing
                  </MenubarItem>
                </MenubarContent>
                <MenubarItem
                  onClick={() => {
                    function doOne() {
                      let card = playArea().peekZone.cards[0];
                      playArea().peekZone.removeCard(card.mesh);
                      playArea().destroy(card.mesh);
                      if (playArea().peekZone.cards.length) {
                        setTimeout(doOne, 50);
                      }
                    }
                    doOne();
                    setHoverSignal();
                  }}>
                  Discard All
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    function doOne() {
                      let card = playArea().peekZone.cards[0];
                      playArea().peekZone.removeCard(card.mesh);
                      playArea().exileCard(card.mesh);
                      if (playArea().peekZone.cards.length) {
                        setTimeout(doOne, 50);
                      }
                    }
                    doOne();
                    setHoverSignal();
                  }}>
                  Exile All
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    function doOne() {
                      let card = playArea().peekZone.cards[0];
                      playArea().peekZone.removeCard(card.mesh);
                      playArea().addCardTopDeck(card);
                      if (playArea().peekZone.cards.length) {
                        setTimeout(doOne, 50);
                      }
                    }
                    doOne();
                    setHoverSignal();
                  }}>
                  Put on Top
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    function doOne() {
                      let card = playArea().peekZone.cards[0];
                      playArea().peekZone.removeCard(card.mesh);
                      playArea().addCardBottomDeck(card);
                      if (playArea().peekZone.cards.length) {
                        setTimeout(doOne, 50);
                      }
                    }
                    doOne();
                    setHoverSignal();
                  }}>
                  Put on Bottom
                </MenubarItem>
              </MenubarMenu>
            </Menubar>
          </Command>
        </div>
      </Show>
    </>
  );
};

export default PeekMenu;
