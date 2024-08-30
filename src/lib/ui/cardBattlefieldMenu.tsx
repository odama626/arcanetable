import { Component } from 'solid-js';
import { PlayArea } from '../playArea';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '~/components/ui/menubar';
import { Mesh } from 'three';
import { setHoverSignal } from '../globals';
import { TextField, TextFieldInput } from '~/components/ui/text-field';

const CardBattlefieldMenu: Component<{ playArea: PlayArea; cardMesh?: Mesh }> = props => {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Actions</MenubarTrigger>
        <MenubarContent>
          <MenubarItem
            onClick={() => {
              props.playArea.flip(props.cardMesh);
            }}>
            Flip
          </MenubarItem>
          <MenubarItem
            onClick={() => {
              props.playArea.destroy(props.cardMesh);
              setHoverSignal();
            }}>
            Destroy
          </MenubarItem>
          <MenubarItem
            onClick={() => {
              props.playArea.exileCard(props.cardMesh);
              setHoverSignal();
            }}>
            Exile
          </MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>Counters</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>+1/+1</MenubarItem>
              <MenubarItem>-1/-1</MenubarItem>
              <MenubarItem>New</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem
            onClick={() => {
              props.playArea.clone(props.cardMesh?.userData.id);
            }}>
            Clone
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
};

export default CardBattlefieldMenu;
